import { parseCanonicalDecimalMtcV1, type CanonicalDecimalMtcV1 } from "../canonical/canonicalDecimalMtcV1";

type Parts = Readonly<{ coefficient: bigint; scale: number }>;

function parts(value: CanonicalDecimalMtcV1): Parts {
  const negative = value.startsWith("-");
  const unsigned = negative ? value.slice(1) : value;
  const [integer, fraction = ""] = unsigned.split(".");
  const coefficient = BigInt(`${integer}${fraction}`) * (negative ? BigInt(-1) : BigInt(1));
  return { coefficient, scale: fraction.length };
}

function align(left: Parts, right: Parts): readonly [bigint, bigint, number] {
  const scale = Math.max(left.scale, right.scale);
  return [
    left.coefficient * (BigInt(10) ** BigInt(scale - left.scale)),
    right.coefficient * (BigInt(10) ** BigInt(scale - right.scale)),
    scale,
  ];
}

function canonical(coefficient: bigint, scale: number): CanonicalDecimalMtcV1 {
  if (coefficient === BigInt(0)) return parseCanonicalDecimalMtcV1("0");
  const negative = coefficient < BigInt(0);
  const digits = (negative ? -coefficient : coefficient).toString().padStart(scale + 1, "0");
  let value = scale === 0 ? digits : `${digits.slice(0, -scale)}.${digits.slice(-scale)}`;
  if (value.includes(".")) value = value.replace(/0+$/, "").replace(/\.$/, "");
  return parseCanonicalDecimalMtcV1(`${negative ? "-" : ""}${value}`);
}

export function addDecimalMtcV1(left: CanonicalDecimalMtcV1, right: CanonicalDecimalMtcV1): CanonicalDecimalMtcV1 {
  const [a, b, scale] = align(parts(left), parts(right));
  return canonical(a + b, scale);
}

export function subtractDecimalMtcV1(left: CanonicalDecimalMtcV1, right: CanonicalDecimalMtcV1): CanonicalDecimalMtcV1 {
  const [a, b, scale] = align(parts(left), parts(right));
  return canonical(a - b, scale);
}

export function compareDecimalMtcV1(left: CanonicalDecimalMtcV1, right: CanonicalDecimalMtcV1): number {
  const [a, b] = align(parts(left), parts(right));
  return a < b ? -1 : a > b ? 1 : 0;
}
