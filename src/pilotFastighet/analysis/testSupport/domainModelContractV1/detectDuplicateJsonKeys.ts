import { DOMAIN_MODEL_CONTRACT_V1_LIMITS as LIMITS } from "./contractV1Limits";
import { jsonPointer, type ContractIssue } from "./contractV1Issues";

type ScanResult = Readonly<{ syntaxValid: boolean; issues: readonly ContractIssue[] }>;

/** Token-aware JSON scan. Object scopes own independent decoded-key sets. */
export function detectDuplicateJsonKeys(input: string): ScanResult {
  const depthLimitSignal = Symbol("depth-limit");
  let index = 0;
  const issues: ContractIssue[] = [];
  let depthExceeded: ContractIssue | undefined;

  const whitespace = () => { while (/\s/.test(input[index] ?? "") && /[\t\n\r ]/.test(input[index] ?? "")) index += 1; };
  const stringToken = (): string | undefined => {
    if (input[index] !== '"') return undefined;
    const start = index++;
    while (index < input.length) {
      const character = input[index++];
      if (character === '"') {
        try { return JSON.parse(input.slice(start, index)) as string; } catch { return undefined; }
      }
      if (character === "\\") {
        const escaped = input[index++];
        if (escaped === "u") {
          if (!/^[0-9a-fA-F]{4}$/.test(input.slice(index, index + 4))) return undefined;
          index += 4;
        } else if (!'"\\/bfnrt'.includes(escaped ?? "")) return undefined;
      } else if (character.charCodeAt(0) < 0x20) return undefined;
    }
    return undefined;
  };
  const value = (path: string, depth: number): boolean => {
    whitespace();
    if (depth > LIMITS.maxNestingDepth) {
      depthExceeded = { code: "nesting-depth-limit-exceeded", path, message: `Nesting depth must not exceed ${LIMITS.maxNestingDepth}.` };
      throw depthLimitSignal;
    }
    if (input[index] === "{") return object(path, depth);
    if (input[index] === "[") return array(path, depth);
    if (input[index] === '"') return stringToken() !== undefined;
    for (const literal of ["true", "false", "null"]) if (input.startsWith(literal, index)) { index += literal.length; return true; }
    const match = input.slice(index).match(/^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?/);
    if (!match) return false;
    index += match[0].length; return true;
  };
  const object = (path: string, depth: number): boolean => {
    index += 1; whitespace(); const keys = new Set<string>();
    if (input[index] === "}") { index += 1; return true; }
    while (index < input.length) {
      const key = stringToken(); if (key === undefined) return false;
      const keyPath = jsonPointer(path, key);
      if (keys.has(key)) issues.push({ code: "duplicate-object-key", path: keyPath, message: "Object key must be unique within its object." });
      keys.add(key); whitespace(); if (input[index++] !== ":") return false;
      if (!value(keyPath, depth + 1)) return false;
      whitespace(); const separator = input[index++];
      if (separator === "}") return true;
      if (separator !== ",") return false;
      whitespace();
    }
    return false;
  };
  const array = (path: string, depth: number): boolean => {
    index += 1; whitespace(); let item = 0;
    if (input[index] === "]") { index += 1; return true; }
    while (index < input.length) {
      if (!value(jsonPointer(path, item), depth + 1)) return false;
      item += 1; whitespace(); const separator = input[index++];
      if (separator === "]") return true;
      if (separator !== ",") return false;
      whitespace();
    }
    return false;
  };

  let syntaxValid: boolean;
  try { syntaxValid = value("", 0); whitespace(); }
  catch (error) {
    if (error === depthLimitSignal && depthExceeded) return { syntaxValid: true, issues: [depthExceeded] };
    throw error;
  }
  if (!syntaxValid || index !== input.length) return { syntaxValid: false, issues: [] };
  return { syntaxValid: true, issues };
}
