export type ContractIssue = Readonly<{
  code: string;
  path: string;
  message: string;
}>;

export function jsonPointer(path: string, segment: string | number): string {
  const encoded = String(segment).replaceAll("~", "~0").replaceAll("/", "~1");
  return `${path}/${encoded}`;
}

export function sortContractIssues(issues: readonly ContractIssue[]): readonly ContractIssue[] {
  return [...issues].sort((left, right) =>
    compare(left.path, right.path) || compare(left.code, right.code) || compare(left.message, right.message));
}

function compare(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
