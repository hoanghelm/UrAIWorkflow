import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import * as path from "path";

const SCHEME = "enc:v1:";
const ALGO = "aes-256-gcm";

let cachedKey: Buffer | null = null;

function keyPath(): string {
  return process.env.VCC_KEY_PATH ?? path.join(process.cwd(), "data", "encryption.key");
}

function masterKey(): Buffer {
  if (cachedKey) {
    return cachedKey;
  }
  const fromEnv = process.env.VCC_ENCRYPTION_KEY;
  if (fromEnv) {
    const buf = Buffer.from(fromEnv, fromEnv.length === 64 ? "hex" : "base64");
    if (buf.length !== 32) {
      throw new Error("VCC_ENCRYPTION_KEY must decode to 32 bytes");
    }
    cachedKey = buf;
    return buf;
  }
  const file = keyPath();
  if (existsSync(file)) {
    cachedKey = Buffer.from(readFileSync(file, "utf8").trim(), "hex");
    return cachedKey;
  }
  const generated = randomBytes(32);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, generated.toString("hex"), { mode: 0o600 });
  cachedKey = generated;
  return generated;
}

export function isEncrypted(value: string): boolean {
  return value.startsWith(SCHEME);
}

export function encryptSecret(plain: string): string {
  if (!plain) {
    return plain;
  }
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, masterKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${SCHEME}${iv.toString("hex")}:${tag.toString("hex")}:${enc.toString("hex")}`;
}

export function decryptSecret(value: string): string {
  if (!value || !isEncrypted(value)) {
    return value;
  }
  const [ivHex, tagHex, dataHex] = value.slice(SCHEME.length).split(":");
  const decipher = createDecipheriv(ALGO, masterKey(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()]).toString(
    "utf8",
  );
}
