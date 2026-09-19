// A bounded process-local read cache for small shared settings. All concurrent
// misses share one operation; invalidation also fences in-flight old reads.
export function createAsyncCache<T>(load: () => Promise<T>, fallback: T, ttlMs: number, timeoutMs: number) {
  let value = fallback;
  let expiresAt = 0;
  let generation = 0;
  let pending: Promise<T> | undefined;
  return {
    read() {
      if (Date.now() < expiresAt) return Promise.resolve(value);
      if (pending) return pending;
      const version = generation;
      const operation = Promise.resolve().then(load);
      let timer: ReturnType<typeof setTimeout>;
      pending = Promise.race([
        operation,
        new Promise<T>((_, reject) => { timer = setTimeout(() => reject(new Error("Settings read timed out")), timeoutMs); }),
      ]).then((fresh) => {
        if (generation === version) { value = fresh; expiresAt = Date.now() + ttlMs; }
        return fresh;
      }).catch((error) => {
        if (generation === version) expiresAt = Date.now() + Math.min(ttlMs, 5000);
        console.warn("[settings-cache]", error instanceof Error ? error.message : "Read failed");
        return value;
      }).finally(() => {
        clearTimeout(timer);
        if (generation === version) pending = undefined;
      });
      return pending;
    },
    invalidate() { generation++; expiresAt = 0; pending = undefined; },
  };
}
