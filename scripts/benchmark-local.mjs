// Production-mode HTTP smoke load test, deliberately restricted to loopback.
// Start `npm start -- --port 3100` first. No editor cookies are sent.
const origin = new URL(process.env.BENCHMARK_ORIGIN ?? "http://127.0.0.1:3100");
if (!["127.0.0.1", "localhost", "[::1]"].includes(origin.hostname)) throw new Error("This benchmark only targets local servers");
const concurrency = 200;
const count = 600;
const paths = ["/", "/wiki?page=Home", "/api/public/search?q=git"];
const measurements = [];
let next = 0;
const start = performance.now();
await Promise.all(Array.from({ length: concurrency }, async () => {
  while (next < count) {
    const index = next++;
    const began = performance.now();
    const response = await fetch(new URL(paths[index % paths.length], origin), { signal: AbortSignal.timeout(30_000) });
    const body = await response.text();
    if (!response.ok || !body.length) throw new Error(`Request ${index}: HTTP ${response.status}`);
    measurements.push(performance.now() - began);
  }
}));
measurements.sort((a, b) => a - b);
console.log(JSON.stringify({ requests: count, concurrency, elapsedMs: Math.round(performance.now() - start), medianMs: Math.round(measurements[Math.floor(count * .5)]), p95Ms: Math.round(measurements[Math.floor(count * .95)]), maxMs: Math.round(measurements[count - 1]) }, null, 2));
