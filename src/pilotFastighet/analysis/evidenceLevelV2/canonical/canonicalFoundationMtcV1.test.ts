import test from "node:test";
import assert from "node:assert/strict";

import { parseCanonicalDecimalMtcV1 } from "./canonicalDecimalMtcV1";
import { parseCanonicalSemanticIdMtcV1 } from "./canonicalIdMtcV1";
import { parseBoundedIntegerMtcV1 } from "./canonicalIntegerMtcV1";
import { canonicalJsonBytesMtcV1, canonicalJsonTextMtcV1 } from "./canonicalJsonMtcV1";
import { canonicalizeSemanticSetMtcV1 } from "./canonicalOrderMtcV1";
import { hashCanonicalMtcV1 } from "../identity/hashCanonicalMtcV1";

test("equivalent object content has identical canonical UTF-8 bytes", () => {
  const first = { z: 2, a: { yes: true, text: "Å" } };
  const second = { a: { text: "Å", yes: true }, z: 2 };

  assert.deepEqual(canonicalJsonBytesMtcV1(first), canonicalJsonBytesMtcV1(second));
  assert.equal(canonicalJsonTextMtcV1(first), '{"a":{"text":"Å","yes":true},"z":2}');
});

test("arrays preserve semantic order", () => {
  assert.notEqual(
    canonicalJsonTextMtcV1(["first", "second"]),
    canonicalJsonTextMtcV1(["second", "first"]),
  );
});

test("semantic sets sort by UTF-8 identity, detach, freeze, and reject duplicates", () => {
  const input = ["z", "a"];
  const canonical = canonicalizeSemanticSetMtcV1(input, (id) => id);
  input[0] = "changed-after-call";
  input.push("later");

  assert.deepEqual(canonical, ["a", "z"]);
  assert.equal(Object.isFrozen(canonical), true);
  assert.throws(
    () => canonicalizeSemanticSetMtcV1(["same", "same"], (id) => id),
    /Duplicate/,
  );
});

test("canonical bytes are detached from later input mutation", () => {
  const input = { nested: { value: 1 } };
  const bytes = canonicalJsonBytesMtcV1(input);
  input.nested.value = 2;
  assert.equal(new TextDecoder().decode(bytes), '{"nested":{"value":1}}');
});

test("strings and keys must already be NFC", () => {
  assert.equal(canonicalJsonTextMtcV1("é"), '"é"');
  assert.throws(() => canonicalJsonBytesMtcV1("e\u0301"), /NFC/);
  assert.throws(() => canonicalJsonBytesMtcV1({ ["e\u0301"]: true }), /NFC/);
});

test("semantic IDs use the strict bounded ASCII grammar", () => {
  assert.equal(parseCanonicalSemanticIdMtcV1("initiative:alpha-1"), "initiative:alpha-1");
  for (const invalid of ["", "has space", "é", "-leading", "two..dots"]) {
    assert.throws(() => parseCanonicalSemanticIdMtcV1(invalid), /ASCII ID grammar/);
  }
});

test("protocol integers are safe, bounded, finite, and never negative zero", () => {
  assert.equal(parseBoundedIntegerMtcV1(239, { min: 0, max: 239 }), 239);
  for (const invalid of [-0, 240, Number.MAX_SAFE_INTEGER + 1, NaN, Infinity, 1.5]) {
    assert.throws(() => parseBoundedIntegerMtcV1(invalid, { min: 0, max: 239 }));
  }
});

test("canonical JSON rejects unsafe and unsupported values", () => {
  for (const invalid of [
    undefined,
    NaN,
    Infinity,
    -Infinity,
    -0,
    1.5,
    Number.MAX_SAFE_INTEGER + 1,
    null,
    BigInt(1),
    new Date(0),
    { value: undefined },
  ]) {
    assert.throws(() => canonicalJsonBytesMtcV1(invalid));
  }
  const sparse = Array(1);
  assert.throws(() => canonicalJsonBytesMtcV1(sparse));
  const arrayWithExtra = [1] as number[] & { extra?: boolean };
  arrayWithExtra.extra = true;
  assert.throws(() => canonicalJsonBytesMtcV1(arrayWithExtra), /extra properties/);
  const arrayWithGetter = [1];
  Object.defineProperty(arrayWithGetter, "0", { enumerable: true, get: () => 1 });
  assert.throws(() => canonicalJsonBytesMtcV1(arrayWithGetter), /Sparse/);
});

test("repeated canonicalization is byte-identical", () => {
  const value = { periods: [0, 1], enabled: true };
  const expected = canonicalJsonBytesMtcV1(value);
  for (let index = 0; index < 100; index += 1) {
    assert.deepEqual(canonicalJsonBytesMtcV1(value), expected);
  }
});

test("domain-separated SHA-256 is repeatable and separates domain and version", () => {
  const bytes = canonicalJsonBytesMtcV1({ value: 1 });
  const hash = hashCanonicalMtcV1("CE:MTC:FIXTURE", "mtc-fixture-v1", bytes);
  assert.equal(hash, hashCanonicalMtcV1("CE:MTC:FIXTURE", "mtc-fixture-v1", bytes));
  assert.notEqual(hash, hashCanonicalMtcV1("CE:MTC:OTHER", "mtc-fixture-v1", bytes));
  assert.notEqual(hash, hashCanonicalMtcV1("CE:MTC:FIXTURE", "mtc-fixture-v2", bytes));
  assert.match(hash, /^[0-9a-f]{64}$/);
});

test("canonical decimals are exact bounded strings and reject noncanonical forms", () => {
  for (const valid of ["0", "1", "-1", "12.34", "-1.25", "999999999999999999"]) {
    assert.equal(parseCanonicalDecimalMtcV1(valid), valid);
  }
  for (const invalid of [
    "-0", "-0.25", "+1", "01", ".5", "1.", "1.0", "1e3", "0.0",
    "1234567890123456789", "0.1234567890123456789", 1.25,
  ]) {
    assert.throws(() => parseCanonicalDecimalMtcV1(invalid));
  }
  assert.equal(
    parseCanonicalDecimalMtcV1("1234567890123456.123456789012345678"),
    "1234567890123456.123456789012345678",
  );
  assert.throws(() => parseCanonicalDecimalMtcV1("12345678901234567.123456789012345678"));
});
