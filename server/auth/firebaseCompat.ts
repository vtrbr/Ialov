import type { User } from "../../drizzle/schema";

export type FirebaseIdentity = {
  uid: string;
  email?: string | null;
  displayName?: string | null;
};

export type FirebaseCompatibility = {
  enabled: boolean;
  reason?: "missing_project_id" | "missing_admin_credentials";
};

/**
 * Contrato de borda para uma futura verificação com Firebase Admin.
 * A aplicação continua autenticando por sessão OAuth até que o administrador
 * forneça a credencial de serviço exclusivamente no servidor.
 */
export function getFirebaseCompatibility(projectId?: string | null, adminCredentialJson?: string): FirebaseCompatibility {
  if (!projectId) return { enabled: false, reason: "missing_project_id" };
  if (!adminCredentialJson) return { enabled: false, reason: "missing_admin_credentials" };
  return { enabled: true };
}

/** Deriva um diagnóstico público a partir de sinais do servidor, sem retornar nenhuma credencial. */
export function getFirebaseServerCompatibility(input: { projectId?: string | null; clientEmail?: string | null; privateKey?: string | null }) {
  return getFirebaseCompatibility(input.projectId, input.clientEmail && input.privateKey ? "configured" : undefined);
}

/** Evita que uma conta Firebase seja ligada a uma conta Lunex de e-mail divergente. */
export function canLinkFirebaseIdentity(user: Pick<User, "email" | "firebaseUid">, identity: FirebaseIdentity) {
  if (!identity.uid.trim() || user.firebaseUid) return false;
  if (!user.email || !identity.email) return true;
  return user.email.trim().toLowerCase() === identity.email.trim().toLowerCase();
}
