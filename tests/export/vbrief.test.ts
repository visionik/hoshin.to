import { describe, expect, it } from "vitest";
import { createEmptyHoshinDocument } from "@/src/domain/hoshin/factory";
import { VBRIEF_CORE_VERSION, VBRIEF_PINNED_RELEASE_TAG } from "@/src/domain/hoshin/models";
import {
  buildVbriefFilename,
  toVbrief,
  VbriefExportError
} from "@/src/infrastructure/export/vbrief";

function validDocument() {
  const document = createEmptyHoshinDocument();
  document.statements = [
    { id: "s1", text: "I/We must align our quarterly operating cadence", initialOrder: 1 },
    { id: "s2", text: "I/We must publish dependency maps every sprint", initialOrder: 2 },
    { id: "s3", text: "I/We must standardize project handoff criteria", initialOrder: 3 },
    { id: "s4", text: "I/We must reduce unplanned escalations each week", initialOrder: 4 },
    { id: "s5", text: "I/We must improve customer issue triage speed", initialOrder: 5 }
  ];
  for (const connection of document.connections) {
    const [a, b] = connection.pair;
    connection.direction = { from: a, to: b };
  }
  return document;
}

describe("toVbrief", () => {
  it("exports valid vbrief shape with pinned version metadata", () => {
    const exported = toVbrief(validDocument());
    expect(exported.vBRIEFInfo.version).toBe(VBRIEF_CORE_VERSION);
    expect(exported.vBRIEFInfo.metadata.pinnedReleaseTag).toBe(VBRIEF_PINNED_RELEASE_TAG);
    expect(exported.plan.items).toHaveLength(5);
    expect(exported.plan.edges).toHaveLength(10);
  });

  it("fails strict export for invalid documents", () => {
    const document = validDocument();
    document.statements[0]!.text = "invalid statement";
    expect(() => toVbrief(document)).toThrow(VbriefExportError);
  });

  it("creates sanitized export file names", () => {
    const document = validDocument();
    document.promptQuestion = "What are the key issues for FY27 growth?";
    expect(buildVbriefFilename(document)).toBe(
      "what-are-the-key-issues-for-fy27-growth.vbrief.json"
    );
  });

  it("uses default export title and filename for blank prompts", () => {
    const document = validDocument();
    document.promptQuestion = "   ";
    const exported = toVbrief(document);
    expect(exported.plan.title).toBe("Hoshin Compass");
    expect(buildVbriefFilename(document)).toBe("hoshin.vbrief.json");
  });
});
