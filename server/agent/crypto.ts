import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { ENV } from "../_core/env";

const ALGORITHM = "aes-256-gcm";

function encryptionKey() {
  if (!ENV.cookieSecret) throw new Error("Segredo de servidor não configurado para proteger credenciais.");
  return createHash("sha256").update(`lunex-provider-v1:${ENV.cookieSecret}`).digest();
}

export function encryptProviderSecret(plainText: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64url"), tag.toString("base64url"), encrypted.toString("base64url")].join(".");
}

export function decryptProviderSecret(cipherText: string) {
  const [ivEncoded, tagEncoded, contentEncoded] = cipherText.split(".");
  if (!ivEncoded || !tagEncoded || !contentEncoded) throw new Error("Configuração de provedor corrompida.");
  const decipher = createDecipheriv(ALGORITHM, encryptionKey(), Buffer.from(ivEncoded, "base64url"));
  decipher.setAuthTag(Buffer.from(tagEncoded, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(contentEncoded, "base64url")), decipher.final()]).toString("utf8");
}

export function keyFingerprint(secret: string) {
  return createHash("sha256").update(secret).digest("hex").slice(0, 16);
}
