import { createHash } from "node:crypto";

const ASCII_TOKEN = /^[\x21-\x7e]+$/;
const NUL = Uint8Array.of(0);
const UTF8 = new TextEncoder();

export function hashCanonicalMtcV1(
  domain: string,
  schemaVersion: string,
  canonicalBytes: Uint8Array,
): string {
  if (!ASCII_TOKEN.test(domain) || !ASCII_TOKEN.test(schemaVersion)) {
    throw new TypeError("Hash domain and schema version must be nonempty printable ASCII");
  }

  return createHash("sha256")
    .update(UTF8.encode(domain))
    .update(NUL)
    .update(UTF8.encode(schemaVersion))
    .update(NUL)
    .update(canonicalBytes)
    .digest("hex");
}
