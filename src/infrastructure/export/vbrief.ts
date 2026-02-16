import { calculateRanking } from "@/src/domain/hoshin/ranking";
import {
  VBRIEF_CORE_VERSION,
  VBRIEF_PINNED_RELEASE_TAG,
  type HoshinDocument
} from "@/src/domain/hoshin/models";
import { validateForCalculation } from "@/src/domain/hoshin/validation";

interface VbriefPlanItem {
  id: string;
  title: string;
  status: "pending" | "completed";
  priority: "high" | "medium";
  narrative: Record<string, string>;
}

interface VbriefEdge {
  from: string;
  to: string;
  type: "blocks";
}

interface VbriefDocument {
  vBRIEFInfo: {
    version: string;
    description: string;
    metadata: Record<string, unknown>;
    created: string;
    updated: string;
  };
  plan: {
    id: string;
    title: string;
    status: "running";
    items: VbriefPlanItem[];
    edges: VbriefEdge[];
    narratives: Record<string, string>;
    metadata: Record<string, unknown>;
  };
}

export class VbriefExportError extends Error {}

export function toVbrief(document: HoshinDocument): VbriefDocument {
  const validation = validateForCalculation(document);
  if (!validation.isValid) {
    /* c8 ignore next */
    throw new VbriefExportError(
      `Strict export failed: ${validation.issues[0]?.message ?? "document is invalid"}`
    );
  }

  const ranking = calculateRanking(document);
  const rankByStatementId = new Map(
    ranking.ranking.map((row) => [row.statementId, row.rank] as const)
  );

  return {
    vBRIEFInfo: {
      version: VBRIEF_CORE_VERSION,
      description: "Hoshin Success Compass export",
      metadata: {
        profile: "hoshin-success-compass",
        pinnedReleaseTag: VBRIEF_PINNED_RELEASE_TAG
      },
      created: document.createdAt,
      updated: document.updatedAt
    },
    plan: {
      id: document.id,
      title: document.promptQuestion.trim() || "Hoshin Compass",
      status: "running",
      items: document.statements.map((statement) => ({
        id: statement.id,
        title: statement.text,
        status: "pending",
        priority: rankByStatementId.get(statement.id)! <= 2 ? "high" : "medium",
        narrative: {
          InitialOrder: String(statement.initialOrder),
          FinalRank: String(rankByStatementId.get(statement.id)),
          ArrowsOut: String(ranking.arrowsOutByStatement[statement.id])
        }
      })),
      edges: document.connections.map((connection) => ({
        from: connection.direction!.from,
        to: connection.direction!.to,
        type: "blocks" as const
      })),
      narratives: {
        Overview:
          "Ranking follows the Hoshin PDF rule: count outgoing driver arrows and tie-break by direct driver relationship.",
        Action: "Focus execution on final rank #1 and #2 statements to maximize cascading impact."
      },
      metadata: {
        source: "hoshin-web",
        pinnedReleaseTag: VBRIEF_PINNED_RELEASE_TAG,
        finalRanking: ranking.ranking.map((row) => ({
          statementId: row.statementId,
          rank: row.rank,
          arrowsOut: row.arrowsOut
        }))
      }
    }
  };
}

export function buildVbriefFilename(document: HoshinDocument): string {
  const safeBase = (document.promptQuestion || "hoshin")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 64);
  return `${safeBase || "hoshin"}.vbrief.json`;
}
