import assert from "node:assert/strict";
import test from "node:test";
import { canonicalizeBaselineValueV1, hashBaselineValueV1 } from "./baselineCanonicalizationV1";

test("canonicalizes recursively with lexical object keys and preserved array order", () => {
  const input = { z: [3, { b: true, a: null }], a: "text", nested: { y: 2, x: 1 } };
  const before = structuredClone(input);
  const expected = '{"a":"text","nested":{"x":1,"y":2},"z":[3,{"a":null,"b":true}]}';
  assert.equal(canonicalizeBaselineValueV1(input), expected);
  assert.equal(canonicalizeBaselineValueV1(input), expected);
  assert.deepEqual(input, before);
});

test("object insertion order is neutral but array order and values are semantic", () => {
  const left = { alpha: 1, beta: { first: "a", second: "b" } };
  const right = { beta: { second: "b", first: "a" }, alpha: 1 };
  assert.equal(canonicalizeBaselineValueV1(left), canonicalizeBaselineValueV1(right));
  assert.equal(hashBaselineValueV1(left), hashBaselineValueV1(right));
  assert.notEqual(hashBaselineValueV1([1, 2]), hashBaselineValueV1([2, 1]));
  assert.notEqual(hashBaselineValueV1({ value: 1 }), hashBaselineValueV1({ value: 2 }));
});

test("hashes exact UTF-8 canonical bytes as lowercase SHA-256", () => {
  const value = { message: "räksmörgås", enabled: true };
  const actual = hashBaselineValueV1(value);
  assert.equal(actual, "4928c7e3882cea70dafc7ce7eebf50c373a07143a9d771c3e1fef4e3e1bd9250");
  assert.match(actual, /^[0-9a-f]{64}$/);
});

test("rejects every unsupported primitive with its path", () => {
  const cases: readonly [unknown, RegExp][] = [
    [undefined, /\$: undefined/],
    [{ nested: undefined }, /\$\.nested: undefined/],
    [[undefined], /\$\[0\]: undefined/],
    [[Number.NaN], /\$\[0\]: number must be finite/],
    [{ value: Infinity }, /\$\.value: number must be finite/],
    [{ value: -Infinity }, /\$\.value: number must be finite/],
    [{ value: -0 }, /\$\.value: negative zero/],
    [{ value: BigInt(1) }, /\$\.value: bigint/],
    [{ value: () => undefined }, /\$\.value: functions/],
    [{ value: Symbol("x") }, /\$\.value: symbols/],
  ];
  for (const [value, pattern] of cases) assert.throws(() => canonicalizeBaselineValueV1(value), pattern);
});

test("rejects cycles, sparse arrays, symbol keys, accessors, and class instances", () => {
  const cyclic: Record<string, unknown> = {};
  cyclic.self = cyclic;
  assert.throws(() => canonicalizeBaselineValueV1(cyclic), /\$\.self: cyclic reference/);
  const cyclicArray: unknown[] = [];
  cyclicArray.push(cyclicArray);
  assert.throws(() => canonicalizeBaselineValueV1(cyclicArray), /\$\[0\]: cyclic reference/);
  assert.throws(() => canonicalizeBaselineValueV1(new Array(1)), /\$\[0\]: sparse array/);
  assert.throws(() => canonicalizeBaselineValueV1({ [Symbol("hidden")]: 1 }), /\$: symbol keys/);
  const accessor = Object.defineProperty({}, "value", { enumerable: true, get: () => 1 });
  assert.throws(() => canonicalizeBaselineValueV1(accessor), /\$\.value: accessor properties/);
  assert.throws(() => canonicalizeBaselineValueV1(new Date(0)), /\$: unsupported class instance/);
});

test("does not silently omit non-enumerable or extra array properties", () => {
  const hidden = Object.defineProperty({}, "hidden", { value: 1, enumerable: false });
  assert.throws(() => canonicalizeBaselineValueV1(hidden), /\$\.hidden: non-enumerable properties/);
  const array = [1] as unknown[] & { note?: string };
  array.note = "not JSON";
  assert.throws(() => canonicalizeBaselineValueV1(array), /\$\.note: non-index array properties/);
});
