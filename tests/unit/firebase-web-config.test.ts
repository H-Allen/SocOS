import { describe, expect, it } from "vitest";
import { parseFirebaseWebConfig, runtimeFirebaseWebConfig } from "@/domain/firebase-web-config";

const config = { apiKey: "public-api-key", appId: "web-app-id", projectId: "socos", authDomain: "socos.firebaseapp.com" };
describe("public Firebase web configuration", () => {
  it("accepts App Hosting build JSON and strips non-public fields", () => {
    expect(parseFirebaseWebConfig(JSON.stringify({ ...config, private_key: "never-embed", client_email: "service-account" }))).toEqual(config);
  });
  it("rejects malformed or incomplete configuration", () => {
    for (const value of [null, "{", {}, { ...config, apiKey: "" }, { ...config, authDomain: "https://invalid/path" }]) expect(parseFirebaseWebConfig(value)).toBeNull();
  });
  it("supports explicit local configuration without requiring build-only variables at runtime", () => {
    expect(runtimeFirebaseWebConfig({ FIREBASE_WEB_API_KEY: config.apiKey, FIREBASE_WEB_APP_ID: config.appId, FIREBASE_PROJECT_ID: config.projectId, FIREBASE_AUTH_DOMAIN: config.authDomain })).toEqual(config);
  });
});
