import {
  type HoshinDocument,
  type RankedStatement,
  type RankingResult,
  type StatementId,
  toConnectionPairId
} from "@/src/domain/hoshin/models";
import { validateForCalculation } from "@/src/domain/hoshin/validation";

function directionForPair(document: HoshinDocument, a: StatementId, b: StatementId) {
  const pairId = toConnectionPairId(a, b);
  /* c8 ignore next */
  return document.connections.find((connection) => connection.id === pairId)?.direction ?? null;
}

function statementIdsByRank(rows: RankedStatement[]): [StatementId, StatementId] {
  /* c8 ignore next 3 */
  if (rows.length < 2) {
    throw new Error("Ranking requires at least two statements.");
  }
  const first = rows[0];
  const second = rows[1];
  /* c8 ignore next 3 */
  if (!first || !second) {
    throw new Error("Ranking rows are unexpectedly missing.");
  }
  return [first.statementId, second.statementId];
}

export function calculateRanking(document: HoshinDocument): RankingResult {
  const validation = validateForCalculation(document);
  if (!validation.isValid) {
    const firstIssue = validation.issues[0];
    throw new Error(
      `Cannot calculate ranking: ${firstIssue?.message ?? "unknown validation error"}`
    );
  }

  const arrowsOutByStatement: Record<StatementId, number> = {
    s1: 0,
    s2: 0,
    s3: 0,
    s4: 0,
    s5: 0
  };

  for (const connection of document.connections) {
    /* c8 ignore next 3 */
    if (!connection.direction) {
      continue;
    }
    arrowsOutByStatement[connection.direction.from] += 1;
  }

  const ranking = [...document.statements]
    .sort((a, b) => {
      const arrowsDelta = arrowsOutByStatement[b.id] - arrowsOutByStatement[a.id];
      if (arrowsDelta !== 0) {
        return arrowsDelta;
      }

      const direction = directionForPair(document, a.id, b.id);
      if (direction) {
        if (direction.from === a.id && direction.to === b.id) {
          return -1;
        }
        if (direction.from === b.id && direction.to === a.id) {
          return 1;
        }
      }

      /* c8 ignore next 7 */
      const orderA = a.initialOrder ?? Number.MAX_SAFE_INTEGER;
      const orderB = b.initialOrder ?? Number.MAX_SAFE_INTEGER;
      if (orderA !== orderB) {
        return orderA - orderB;
      }

      return a.id.localeCompare(b.id);
    })
    .map<RankedStatement>((statement, index) => ({
      statementId: statement.id,
      statementText: statement.text,
      initialOrder: statement.initialOrder,
      arrowsOut: arrowsOutByStatement[statement.id],
      rank: index + 1
    }));

  return {
    arrowsOutByStatement,
    ranking,
    focusTopTwo: statementIdsByRank(ranking)
  };
}
