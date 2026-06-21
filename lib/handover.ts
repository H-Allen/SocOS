import type { HandoverRow, Json } from "@/types";

export const DEFAULT_HANDOVER_ROLES = ["President", "Secretary", "Treasurer"] as const;

export const HANDOVER_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
] as const;

export type HandoverDocument = {
  id: string;
  title: string;
  url: string;
};

export type HandoverContact = {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
};

export type HandoverChecklistItem = {
  id: string;
  text: string;
  completed: boolean;
  dueDate: string;
};

export type HandoverContent = {
  rolePurpose: string;
  recurringResponsibilities: string[];
  annualTimeline: Record<string, string[]>;
  importantDocuments: HandoverDocument[];
  keyContacts: HandoverContact[];
  adviceFromPreviousHolder: string;
  mistakesToAvoid: string[];
  handoverChecklist: HandoverChecklistItem[];
};

const DEFAULT_CHECKLIST_ITEMS = [
  "Transfer email account access",
  "Share passwords via secure method",
  "Complete 1-hour handover call with successor",
  "Transfer all financial records"
];

function isObject(value: Json | null | undefined): value is Record<string, Json | undefined> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asString(value: Json | null | undefined) {
  return typeof value === "string" ? value : "";
}

function asStringArray(value: Json | null | undefined) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

function parseLegacyList(value: string | null | undefined) {
  if (!value) {
    return [];
  }

  return value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function createDefaultTimeline() {
  return HANDOVER_MONTHS.reduce<Record<string, string[]>>((timeline, month) => {
    timeline[month] = [];
    return timeline;
  }, {});
}

export function createLocalId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function slugifyRole(roleName: string) {
  return roleName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function deslugifyRole(roleSlug: string) {
  return roleSlug
    .split("-")
    .filter(Boolean)
    .map((segment) => segment[0]?.toUpperCase() + segment.slice(1))
    .join(" ");
}

export function createEmptyHandoverContent(): HandoverContent {
  return {
    rolePurpose: "",
    recurringResponsibilities: [],
    annualTimeline: createDefaultTimeline(),
    importantDocuments: [],
    keyContacts: [],
    adviceFromPreviousHolder: "",
    mistakesToAvoid: [],
    handoverChecklist: DEFAULT_CHECKLIST_ITEMS.map((text) => ({
      id: createLocalId(),
      text,
      completed: false,
      dueDate: ""
    }))
  };
}

function normalizeDocuments(value: Json | null | undefined) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((entry): entry is Record<string, Json | undefined> => isObject(entry))
    .map((entry) => ({
      id: asString(entry.id) || createLocalId(),
      title: asString(entry.title),
      url: asString(entry.url)
    }));
}

function normalizeContacts(value: Json | null | undefined) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((entry): entry is Record<string, Json | undefined> => isObject(entry))
    .map((entry) => ({
      id: asString(entry.id) || createLocalId(),
      name: asString(entry.name),
      role: asString(entry.role),
      email: asString(entry.email),
      phone: asString(entry.phone)
    }));
}

function normalizeChecklist(value: Json | null | undefined) {
  if (!Array.isArray(value) || value.length === 0) {
    return createEmptyHandoverContent().handoverChecklist;
  }

  return value
    .filter((entry): entry is Record<string, Json | undefined> => isObject(entry))
    .map((entry) => ({
      id: asString(entry.id) || createLocalId(),
      text: asString(entry.text),
      completed: entry.completed === true,
      dueDate: asString(entry.dueDate)
    }));
}

function normalizeTimeline(value: Json | null | undefined, legacyTimeline: string | null | undefined) {
  const timeline = createDefaultTimeline();

  if (isObject(value)) {
    for (const month of HANDOVER_MONTHS) {
      timeline[month] = asStringArray(value[month]);
    }

    return timeline;
  }

  if (legacyTimeline) {
    timeline.January = parseLegacyList(legacyTimeline);
  }

  return timeline;
}

export function normalizeHandoverContent(row?: HandoverRow | null): HandoverContent {
  const empty = createEmptyHandoverContent();
  const content = isObject(row?.content) ? row.content : {};

  return {
    rolePurpose: asString(content.rolePurpose) || row?.responsibilities || "",
    recurringResponsibilities: asStringArray(content.recurringResponsibilities),
    annualTimeline: normalizeTimeline(content.annualTimeline, row?.annual_timeline),
    importantDocuments: normalizeDocuments(content.importantDocuments),
    keyContacts: normalizeContacts(content.keyContacts),
    adviceFromPreviousHolder: asString(content.adviceFromPreviousHolder) || row?.advice || "",
    mistakesToAvoid: asStringArray(content.mistakesToAvoid).length
      ? asStringArray(content.mistakesToAvoid)
      : parseLegacyList(row?.mistakes),
    handoverChecklist: normalizeChecklist(content.handoverChecklist ?? row?.checklist ?? empty.handoverChecklist)
  };
}

export function serializeHandoverContent(content: HandoverContent) {
  return {
    rolePurpose: content.rolePurpose,
    recurringResponsibilities: content.recurringResponsibilities,
    annualTimeline: content.annualTimeline,
    importantDocuments: content.importantDocuments,
    keyContacts: content.keyContacts,
    adviceFromPreviousHolder: content.adviceFromPreviousHolder,
    mistakesToAvoid: content.mistakesToAvoid,
    handoverChecklist: content.handoverChecklist
  } satisfies Json;
}

export function calculateHandoverCompletion(content: HandoverContent) {
  const completedSections = [
    content.rolePurpose.trim().length >= 50,
    content.recurringResponsibilities.filter((item) => item.trim().length > 0).length >= 1,
    Object.values(content.annualTimeline).flat().filter((item) => item.trim().length > 0).length >= 3,
    content.importantDocuments.filter((item) => item.title.trim() && item.url.trim()).length >= 1,
    content.keyContacts.filter((item) => item.name.trim() && item.role.trim() && item.email.trim()).length >= 1,
    content.adviceFromPreviousHolder.trim().length >= 50,
    content.mistakesToAvoid.filter((item) => item.trim().length > 0).length >= 1,
    content.handoverChecklist.filter((item) => item.text.trim().length > 0).length >= 4
  ].filter(Boolean).length;

  return Math.round((completedSections / 8) * 100);
}

export function getHandoverStatus(completionPercent: number) {
  if (completionPercent >= 100) {
    return "Complete";
  }

  if (completionPercent <= 0) {
    return "Empty";
  }

  return "In Progress";
}

export function getChecklistProgress(checklist: HandoverChecklistItem[]) {
  const definedItems = checklist.filter((item) => item.text.trim().length > 0);
  const completedItems = definedItems.filter((item) => item.completed).length;

  return {
    completedItems,
    totalItems: definedItems.length
  };
}
