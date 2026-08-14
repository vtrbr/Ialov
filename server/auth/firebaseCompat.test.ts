import { describe, expect, it } from "vitest";
import { canLinkFirebaseIdentity, getFirebaseCompatibility } from "./firebaseCompat";

describe("firebase compatibility", () => {
  it("não habilita a ponte sem projeto e credenciais administrativas", () => {
    expect(getFirebaseCompatibility()).toEqual({ enabled: false, reason: "missing_project_id" });
    expect(getFirebaseCompatibility("lunex-dev")).toEqual({ enabled: false, reason: "missing_admin_credentials" });
    expect(getFirebaseCompatibility("lunex-dev", "{\"type\":\"service_account\"}")).toEqual({ enabled: true });
  });

  it("aceita vínculo somente para UID novo e e-mail compatível", () => {
    const user = { email: "manys@example.com", firebaseUid: null };
    expect(canLinkFirebaseIdentity(user, { uid: "firebase-1", email: "MANYS@example.com" })).toBe(true);
    expect(canLinkFirebaseIdentity(user, { uid: "firebase-1", email: "other@example.com" })).toBe(false);
    expect(canLinkFirebaseIdentity({ ...user, firebaseUid: "already-linked" }, { uid: "firebase-1" })).toBe(false);
  });
});
