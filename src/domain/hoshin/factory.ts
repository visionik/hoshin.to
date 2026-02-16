import {
  DEFAULT_ARROW_INPUT_MODE,
  FIXED_CONNECTION_PAIRS,
  type HoshinDocument
} from "@/src/domain/hoshin/models";
import { toConnectionPairId } from "@/src/domain/hoshin/models";

function nowIso(): string {
  return new Date().toISOString();
}

function newDocumentId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `hoshin-${Date.now()}`;
}

export function createEmptyHoshinDocument(): HoshinDocument {
  return createEmptyHoshinDocumentWithName("Hoshin 1");
}

export function createEmptyHoshinDocumentWithName(name: string): HoshinDocument {
  const createdAt = nowIso();
  return {
    id: newDocumentId(),
    name,
    promptQuestion:
      "What are the key issues that must be addressed in order for me/us to ________?",
    statements: [
      { id: "s1", text: "", initialOrder: null },
      { id: "s2", text: "", initialOrder: null },
      { id: "s3", text: "", initialOrder: null },
      { id: "s4", text: "", initialOrder: null },
      { id: "s5", text: "", initialOrder: null }
    ],
    connections: FIXED_CONNECTION_PAIRS.map((pair) => ({
      id: toConnectionPairId(pair[0], pair[1]),
      pair,
      direction: null
    })),
    settings: {
      arrowInputMode: DEFAULT_ARROW_INPUT_MODE
    },
    createdAt,
    updatedAt: createdAt
  };
}
