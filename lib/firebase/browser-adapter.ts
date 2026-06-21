import { signOut } from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  orderBy,
  limit as firestoreLimit,
  type DocumentData,
  type QueryConstraint
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";

import { firebaseAuth, firebaseDb, firebaseStorage } from "@/lib/firebase/client";

type Filter = {
  field: string;
  op: "==" | "!=" | "<" | "<=" | ">" | ">=" | "in";
  value: unknown;
};

type Order = {
  field: string;
  ascending: boolean;
};

type Result<T = unknown> = {
  data: T | null;
  error: { message: string } | null;
  count?: number | null;
};

function nowIso() {
  return new Date().toISOString();
}

function collectionRef(table: string) {
  return collection(firebaseDb, table);
}

function normalizeRow(table: string, id: string, data: DocumentData) {
  return { id, ...data, ...defaultTimestamps(table, data) };
}

function defaultTimestamps(table: string, data: DocumentData) {
  if (table === "memberships") {
    return { joined_at: data.joined_at ?? data.created_at ?? null };
  }

  if (table === "handovers") {
    return { updated_at: data.updated_at ?? data.created_at ?? null };
  }

  return { created_at: data.created_at ?? null };
}

function makeDocumentId(table: string, payload: Record<string, unknown>) {
  if (typeof payload.id === "string" && payload.id) return payload.id;
  if (table === "memberships" && typeof payload.organization_id === "string" && typeof payload.user_id === "string") {
    return `${payload.organization_id}_${payload.user_id}`;
  }
  return null;
}

function withDefaults(table: string, payload: Record<string, unknown>) {
  const next = { ...payload };
  const timestamp = nowIso();

  if (!("created_at" in next)) next.created_at = timestamp;
  if (table === "memberships" && !("joined_at" in next)) next.joined_at = timestamp;
  if (table === "handovers" && !("updated_at" in next)) next.updated_at = timestamp;
  if (table === "meeting_notes" && !("updated_at" in next)) next.updated_at = timestamp;

  return next;
}

async function fetchUser(userId: string | null | undefined) {
  if (!userId) return null;
  const snap = await getDoc(doc(firebaseDb, "users", userId));
  if (!snap.exists()) return null;
  return normalizeRow("users", snap.id, snap.data());
}

async function hydrateJoins(table: string, row: Record<string, unknown>) {
  if (table === "tasks") {
    return { ...row, assignee: await fetchUser(row.assigned_to as string | null | undefined) };
  }

  if (table === "resources") {
    return { ...row, uploader: await fetchUser(row.uploaded_by as string | null | undefined) };
  }

  if (table === "announcements") {
    return { ...row, author: await fetchUser(row.created_by as string | null | undefined) };
  }

  if (table === "activity_logs") {
    return { ...row, actor: await fetchUser(row.actor_user_id as string | null | undefined) };
  }

  if (table === "memberships") {
    return { ...row, user: await fetchUser(row.user_id as string | null | undefined) };
  }

  if (table === "meeting_attendees") {
    return { ...row, user: await fetchUser(row.user_id as string | null | undefined) };
  }

  return row;
}

function matchesFilter(row: Record<string, unknown>, filter: Filter) {
  const value = row[filter.field];

  if (filter.op === "==") return value === filter.value;
  if (filter.op === "!=") return value !== filter.value;
  if (filter.op === "<") return String(value ?? "") < String(filter.value ?? "");
  if (filter.op === "<=") return String(value ?? "") <= String(filter.value ?? "");
  if (filter.op === ">") return String(value ?? "") > String(filter.value ?? "");
  if (filter.op === ">=") return String(value ?? "") >= String(filter.value ?? "");
  if (filter.op === "in") return Array.isArray(filter.value) && filter.value.includes(value);

  return true;
}

function compareRows(left: Record<string, unknown>, right: Record<string, unknown>, order: Order) {
  const leftValue = left[order.field];
  const rightValue = right[order.field];
  const comparison = String(leftValue ?? "").localeCompare(String(rightValue ?? ""));
  return order.ascending ? comparison : -comparison;
}

class FirebaseQueryBuilder<T = unknown> implements PromiseLike<Result<T>> {
  private filters: Filter[] = [];
  private orders: Order[] = [];
  private rowLimit: number | null = null;
  private mode: "select" | "insert" | "update" | "delete" = "select";
  private payload: Record<string, unknown> | Array<Record<string, unknown>> | null = null;
  private expectSingle = false;
  private expectMaybeSingle = false;

  constructor(private readonly table: string) {}

  select(_columns?: string, _options?: Record<string, unknown>) {
    return this;
  }

  returns<U>() {
    return this as unknown as FirebaseQueryBuilder<U>;
  }

  insert(payload: Record<string, unknown> | Array<Record<string, unknown>>) {
    this.mode = "insert";
    this.payload = payload;
    return this;
  }

  upsert(payload: Record<string, unknown> | Array<Record<string, unknown>>) {
    this.mode = "insert";
    this.payload = payload;
    return this;
  }

  update(payload: Record<string, unknown>) {
    this.mode = "update";
    this.payload = payload;
    return this;
  }

  delete() {
    this.mode = "delete";
    return this;
  }

  eq(field: string, value: unknown) {
    this.filters.push({ field, op: "==", value });
    return this;
  }

  not(field: string, op: string, value: unknown) {
    if (op === "eq") {
      this.filters.push({ field, op: "!=", value });
    }
    return this;
  }

  lt(field: string, value: unknown) {
    this.filters.push({ field, op: "<", value });
    return this;
  }

  lte(field: string, value: unknown) {
    this.filters.push({ field, op: "<=", value });
    return this;
  }

  gte(field: string, value: unknown) {
    this.filters.push({ field, op: ">=", value });
    return this;
  }

  in(field: string, value: unknown[]) {
    this.filters.push({ field, op: "in", value });
    return this;
  }

  contains(field: string, value: Record<string, unknown>) {
    Object.entries(value).forEach(([key, nestedValue]) => {
      this.filters.push({ field: `${field}.${key}`, op: "==", value: nestedValue });
    });
    return this;
  }

  order(field: string, options?: { ascending?: boolean }) {
    this.orders.push({ field, ascending: options?.ascending ?? true });
    return this;
  }

  limit(limit: number) {
    this.rowLimit = limit;
    return this;
  }

  single() {
    this.expectSingle = true;
    return this;
  }

  maybeSingle() {
    this.expectMaybeSingle = true;
    return this;
  }

  then<TResult1 = Result<T>, TResult2 = never>(
    onfulfilled?: ((value: Result<T>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ) {
    return this.execute().then(onfulfilled, onrejected);
  }

  private async execute(): Promise<Result<T>> {
    try {
      if (this.mode === "insert") return await this.executeInsert();
      if (this.mode === "update") return await this.executeUpdate();
      if (this.mode === "delete") return await this.executeDelete();
      return await this.executeSelect();
    } catch (error) {
      return {
        data: null,
        error: { message: error instanceof Error ? error.message : "Firebase request failed." }
      };
    }
  }

  private async executeInsert(): Promise<Result<T>> {
    const payloads = Array.isArray(this.payload) ? this.payload : [this.payload as Record<string, unknown>];
    const rows = await Promise.all(
      payloads.map(async (payload) => {
        const withDates = withDefaults(this.table, payload);
        const id = makeDocumentId(this.table, withDates);

        if (id) {
          await setDoc(doc(firebaseDb, this.table, id), { ...withDates, id }, { merge: true });
          return normalizeRow(this.table, id, { ...withDates, id });
        }

        const ref = await addDoc(collectionRef(this.table), withDates);
        await updateDoc(ref, { id: ref.id });
        return normalizeRow(this.table, ref.id, { ...withDates, id: ref.id });
      })
    );
    const hydrated = await Promise.all(rows.map((row) => hydrateJoins(this.table, row)));

    return this.expectSingle
      ? { data: (hydrated[0] ?? null) as T, error: null }
      : { data: hydrated as T, error: null };
  }

  private async executeUpdate(): Promise<Result<T>> {
    const rows = await this.fetchRows();
    const payload = { ...(this.payload as Record<string, unknown>) };

    if (this.table === "handovers") payload.updated_at = nowIso();

    const updatedRows = await Promise.all(
      rows.map(async (row) => {
        await updateDoc(doc(firebaseDb, this.table, row.id as string), payload);
        return hydrateJoins(this.table, { ...row, ...payload });
      })
    );

    return this.expectSingle || this.expectMaybeSingle
      ? { data: (updatedRows[0] ?? null) as T, error: null }
      : { data: updatedRows as T, error: null };
  }

  private async executeDelete(): Promise<Result<T>> {
    const rows = await this.fetchRows();
    await Promise.all(rows.map((row) => deleteDoc(doc(firebaseDb, this.table, row.id as string))));
    return { data: rows as T, error: null };
  }

  private async executeSelect(): Promise<Result<T>> {
    const rows = await this.fetchRows();
    const hydrated = await Promise.all(rows.map((row) => hydrateJoins(this.table, row)));

    if (this.expectSingle && !hydrated[0]) {
      return { data: null, error: { message: "No rows found." } };
    }

    if (this.expectSingle || this.expectMaybeSingle) {
      return { data: (hydrated[0] ?? null) as T, error: null, count: hydrated.length };
    }

    return { data: hydrated as T, error: null, count: hydrated.length };
  }

  private async fetchRows() {
    const idFilter = this.filters.find((filter) => filter.field === "id" && filter.op === "==" && typeof filter.value === "string");

    if (idFilter) {
      const snap = await getDoc(doc(firebaseDb, this.table, idFilter.value as string));
      if (!snap.exists()) return [];
      const row = normalizeRow(this.table, snap.id, snap.data());
      return this.applyClientSideConstraints([row]);
    }

    const firestoreFilters = this.filters
      .filter((filter) => !filter.field.includes("."))
      .filter((filter) => ["==", "<", "<=", ">", ">=", "in"].includes(filter.op))
      .slice(0, 1)
      .map((filter) => where(filter.field, filter.op as any, filter.value));
    const constraints: QueryConstraint[] = [...firestoreFilters];

    if (this.orders.length === 1 && firestoreFilters.length === 0) {
      constraints.push(orderBy(this.orders[0].field, this.orders[0].ascending ? "asc" : "desc"));
    }

    if (this.rowLimit && firestoreFilters.length === 0) {
      constraints.push(firestoreLimit(this.rowLimit));
    }

    const snap = await getDocs(query(collectionRef(this.table), ...constraints));
    const rows = snap.docs.map((docSnap) => normalizeRow(this.table, docSnap.id, docSnap.data()));
    return this.applyClientSideConstraints(rows);
  }

  private applyClientSideConstraints(rows: Array<Record<string, unknown>>) {
    let next = rows.filter((row) => this.filters.every((filter) => {
      if (!filter.field.includes(".")) return matchesFilter(row, filter);
      const [parent, child] = filter.field.split(".");
      const nested = row[parent] as Record<string, unknown> | null | undefined;
      return matchesFilter({ [filter.field]: nested?.[child] }, filter);
    }));

    this.orders.forEach((order) => {
      next = next.sort((left, right) => compareRows(left, right, order));
    });

    if (this.rowLimit !== null) {
      next = next.slice(0, this.rowLimit);
    }

    return next;
  }
}

export function createBrowserFirebaseAdapter() {
  return {
    auth: {
      async signOut() {
        await signOut(firebaseAuth);
        await fetch("/api/auth/session", { method: "DELETE" });
        return { error: null };
      }
    },
    from(table: string) {
      return new FirebaseQueryBuilder(table);
    },
    storage: {
      from(bucket: string) {
        return {
          async upload(path: string, file: File, options?: { upsert?: boolean }) {
            try {
              const storageRef = ref(firebaseStorage, `${bucket}/${path}`);
              await uploadBytes(storageRef, file, {
                customMetadata: { upsert: String(options?.upsert ?? false) }
              });
              const downloadUrl = await getDownloadURL(storageRef);
              return { data: { path, publicUrl: downloadUrl, signedUrl: downloadUrl }, error: null };
            } catch (error) {
              return {
                data: null,
                error: { message: error instanceof Error ? error.message : "Upload failed." }
              };
            }
          },
          getPublicUrl(path: string) {
            const storageRef = ref(firebaseStorage, `${bucket}/${path}`);
            return {
              data: {
                publicUrl: `https://firebasestorage.googleapis.com/v0/b/${firebaseStorage.app.options.storageBucket}/o/${encodeURIComponent(storageRef.fullPath)}?alt=media`
              }
            };
          },
          async createSignedUrl(path: string) {
            const storageRef = ref(firebaseStorage, `${bucket}/${path}`);
            const signedUrl = await getDownloadURL(storageRef);
            return { data: { signedUrl }, error: null };
          }
        };
      }
    }
  };
}
