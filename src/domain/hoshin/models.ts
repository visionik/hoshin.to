export const STATEMENT_IDS = ["s1", "s2", "s3", "s4", "s5"] as const;
export type StatementId = (typeof STATEMENT_IDS)[number];

export type ArrowInputMode = "picker" | "drag";
export type ConnectionPairId = `${StatementId}-${StatementId}`;

export interface Statement {
  id: StatementId;
  text: string;
  initialOrder: number | null;
}

export interface ConnectionDirection {
  from: StatementId;
  to: StatementId;
}

export interface Connection {
  id: ConnectionPairId;
  pair: readonly [StatementId, StatementId];
  direction: ConnectionDirection | null;
}

export interface HoshinSettings {
  arrowInputMode: ArrowInputMode;
}

export interface HoshinDocument {
  id: string;
  name: string;
  promptQuestion: string;
  statements: Statement[];
  connections: Connection[];
  settings: HoshinSettings;
  createdAt: string;
  updatedAt: string;
}

export interface ValidationIssue {
  code: string;
  message: string;
  path: string;
}

export interface ValidationResult {
  isValid: boolean;
  issues: ValidationIssue[];
}

export interface RankedStatement {
  statementId: StatementId;
  statementText: string;
  initialOrder: number | null;
  arrowsOut: number;
  rank: number;
}

export interface RankingResult {
  arrowsOutByStatement: Record<StatementId, number>;
  ranking: RankedStatement[];
  focusTopTwo: [StatementId, StatementId];
}

export const FIXED_CONNECTION_PAIRS: ReadonlyArray<readonly [StatementId, StatementId]> = [
  ["s1", "s2"],
  ["s1", "s3"],
  ["s1", "s4"],
  ["s1", "s5"],
  ["s2", "s3"],
  ["s2", "s4"],
  ["s2", "s5"],
  ["s3", "s4"],
  ["s3", "s5"],
  ["s4", "s5"]
] as const;

export const DEFAULT_ARROW_INPUT_MODE: ArrowInputMode = "picker";
export const ARROW_INPUT_MODE_STORAGE_KEY = "hoshin-arrow-input-mode";
export const VBRIEF_CORE_VERSION = "0.5";
export const VBRIEF_PINNED_RELEASE_TAG = "v0.5-beta";

export function toConnectionPairId(a: StatementId, b: StatementId): ConnectionPairId {
  const [first, second] = [a, b].sort() as [StatementId, StatementId];
  return `${first}-${second}`;
}

export function parseConnectionPairId(pairId: ConnectionPairId): [StatementId, StatementId] {
  const [a, b] = pairId.split("-") as [StatementId, StatementId];
  return [a, b];
}
