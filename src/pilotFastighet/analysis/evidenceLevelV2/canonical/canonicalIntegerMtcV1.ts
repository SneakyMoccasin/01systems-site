export function parseBoundedIntegerMtcV1(
  value: unknown,
  bounds: Readonly<{ min: number; max: number }>,
): number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    Object.is(value, -0) ||
    !Number.isSafeInteger(bounds.min) ||
    !Number.isSafeInteger(bounds.max) ||
    bounds.min > bounds.max ||
    value < bounds.min ||
    value > bounds.max
  ) {
    throw new RangeError("Value must be a safe integer inside the declared bounds");
  }

  return value;
}
