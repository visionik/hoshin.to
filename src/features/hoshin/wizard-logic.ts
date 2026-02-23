import {
  FIXED_CONNECTION_PAIRS,
  type ConnectionPairId,
  type HoshinDocument,
  type StatementId,
  toConnectionPairId
} from "@/src/domain/hoshin/models";

/**
 * Pairs that still have no direction set (wizard "continue" shows only these).
 */
export function getPairsWithNullDirection(
  document: HoshinDocument
): readonly (readonly [StatementId, StatementId])[] {
  return FIXED_CONNECTION_PAIRS.filter((pair) => {
    const pairId = toConnectionPairId(pair[0], pair[1]);
    const connection = document.connections.find((c) => c.id === pairId);
    return connection ? connection.direction === null : false;
  });
}

/**
 * Returns a new document with the given connection direction set.
 * Other connections are unchanged (partial save leaves them as-is).
 */
export function setConnectionDirection(
  document: HoshinDocument,
  pairId: ConnectionPairId,
  from: StatementId,
  to: StatementId
): HoshinDocument {
  return {
    ...document,
    updatedAt: new Date().toISOString(),
    connections: document.connections.map((c) =>
      c.id === pairId ? { ...c, direction: { from, to } } : c
    )
  };
}
