import { describe, expect, it } from "vitest";
import { createEmptyHoshinDocument } from "@/src/domain/hoshin/factory";
import { toConnectionPairId } from "@/src/domain/hoshin/models";
import {
  canCalculate,
  canRunWizard,
  validateDraft,
  validateWizardReady
} from "@/src/domain/hoshin/validation";

function validDocument() {
  const document = createEmptyHoshinDocument();
  document.statements = [
    { id: "s1", text: "I/We must establish weekly planning rituals", initialOrder: 1 },
    { id: "s2", text: "I/We must define measurable revenue goals", initialOrder: 2 },
    { id: "s3", text: "I/We must improve cross-team communication cadence", initialOrder: 3 },
    { id: "s4", text: "I/We must automate repetitive reporting tasks", initialOrder: 4 },
    { id: "s5", text: "I/We must reduce blocked dependency handoffs", initialOrder: 5 }
  ];
  for (const connection of document.connections) {
    const [a, b] = connection.pair;
    connection.id = toConnectionPairId(a, b);
    connection.direction = { from: a, to: b };
  }
  return document;
}

describe("validateDraft", () => {
  it("accepts a fully valid document", () => {
    const result = validateDraft(validDocument());
    expect(result.isValid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it("rejects statements that do not start with the required prefix", () => {
    const document = validDocument();
    document.statements[0]!.text = "We should establish weekly planning rituals";
    const result = validateDraft(document);
    expect(result.isValid).toBe(false);
    expect(result.issues.some((issue) => issue.code === "statement-prefix-invalid")).toBe(true);
  });

  it("accepts We must as a valid prefix", () => {
    const document = validDocument();
    document.statements[0]!.text = "We must establish weekly planning rituals today";
    const result = validateDraft(document);
    expect(result.issues.some((issue) => issue.code === "statement-prefix-invalid")).toBe(false);
  });

  it("accepts lowercase we must as a valid prefix", () => {
    const document = validDocument();
    document.statements[1]!.text = "we must define measurable revenue goals now";
    const result = validateDraft(document);
    expect(result.issues.some((issue) => issue.code === "statement-prefix-invalid")).toBe(false);
  });

  it("rejects when additional word count is outside 3-7 range", () => {
    const document = validDocument();
    document.statements[0]!.text = "I/We must do this";
    const result = validateDraft(document);
    expect(result.issues.some((issue) => issue.code === "statement-word-count-invalid")).toBe(true);
  });

  it("rejects statements with no words after prefix", () => {
    const document = validDocument();
    document.statements[1]!.text = "I/We must";
    const result = validateDraft(document);
    expect(result.issues.some((issue) => issue.code === "statement-word-count-invalid")).toBe(true);
  });

  it("rejects duplicate initial orders", () => {
    const document = validDocument();
    document.statements[4]!.initialOrder = 1;
    const result = validateDraft(document);
    expect(result.issues.some((issue) => issue.code === "initial-order-duplicate")).toBe(true);
  });

  it("rejects missing connection directions", () => {
    const document = validDocument();
    document.connections[0]!.direction = null;
    const result = validateDraft(document);
    expect(result.issues.some((issue) => issue.code === "connection-direction-missing")).toBe(true);
  });

  it("rejects invalid statement count", () => {
    const document = validDocument();
    document.statements = document.statements.slice(0, 4);
    const result = validateDraft(document);
    expect(result.issues.some((issue) => issue.code === "statement-count-invalid")).toBe(true);
  });

  it("rejects invalid initial order range", () => {
    const document = validDocument();
    document.statements[2]!.initialOrder = 7;
    const result = validateDraft(document);
    expect(result.issues.some((issue) => issue.code === "initial-order-invalid")).toBe(true);
  });

  it("rejects invalid connection pair ids and missing fixed pairs", () => {
    const document = validDocument();
    document.connections[0]!.id = "s1-s1";
    const result = validateDraft(document);
    expect(result.issues.some((issue) => issue.code === "connection-pair-invalid")).toBe(true);
    expect(result.issues.some((issue) => issue.code === "connection-pair-missing")).toBe(true);
  });

  it("rejects connection count that does not include all fixed pairs", () => {
    const document = validDocument();
    document.connections = document.connections.slice(0, 9);
    const result = validateDraft(document);
    expect(result.issues.some((issue) => issue.code === "connection-count-invalid")).toBe(true);
  });

  it("rejects direction mismatches against pair endpoints", () => {
    const document = validDocument();
    document.connections[0]!.direction = { from: "s3", to: "s4" };
    const result = validateDraft(document);
    expect(result.issues.some((issue) => issue.code === "connection-direction-invalid")).toBe(true);
  });

  it("rejects missing fixed statement ids", () => {
    const document = validDocument();
    document.statements[0] = {
      id: "s2",
      text: "I/We must align cross-team planning outcomes",
      initialOrder: 1
    };
    const result = validateDraft(document);
    expect(result.issues.some((issue) => issue.code === "statement-id-missing")).toBe(true);
  });

  it("supports canCalculate helper for valid and invalid documents", () => {
    const valid = validDocument();
    const invalid = validDocument();
    invalid.connections[0]!.direction = null;
    expect(canCalculate(valid)).toBe(true);
    expect(canCalculate(invalid)).toBe(false);
  });
});

function wizardReadyDocument() {
  const document = createEmptyHoshinDocument();
  document.statements = [
    { id: "s1", text: "I/We must establish weekly planning rituals", initialOrder: 1 },
    { id: "s2", text: "I/We must define measurable revenue goals", initialOrder: 2 },
    { id: "s3", text: "I/We must improve cross-team communication cadence", initialOrder: 3 },
    { id: "s4", text: "I/We must automate repetitive reporting tasks", initialOrder: 4 },
    { id: "s5", text: "I/We must reduce blocked dependency handoffs", initialOrder: 5 }
  ];
  return document;
}

describe("validateWizardReady / canRunWizard", () => {
  it("accepts document with valid statements and orders when connections have no direction", () => {
    const document = wizardReadyDocument();
    const result = validateWizardReady(document);
    expect(result.isValid).toBe(true);
    expect(result.issues).toHaveLength(0);
    expect(canRunWizard(document)).toBe(true);
  });

  it("accepts document that is also calculation-ready", () => {
    const document = validDocument();
    const result = validateWizardReady(document);
    expect(result.isValid).toBe(true);
    expect(canRunWizard(document)).toBe(true);
  });

  it("rejects when statement count is not five", () => {
    const document = wizardReadyDocument();
    document.statements = document.statements.slice(0, 4);
    const result = validateWizardReady(document);
    expect(result.isValid).toBe(false);
    expect(result.issues.some((issue) => issue.code === "statement-count-invalid")).toBe(true);
    expect(canRunWizard(document)).toBe(false);
  });

  it("rejects when statement prefix is invalid", () => {
    const document = wizardReadyDocument();
    document.statements[0]!.text = "We should establish weekly planning rituals";
    expect(canRunWizard(document)).toBe(false);
    expect(
      validateWizardReady(document).issues.some((i) => i.code === "statement-prefix-invalid")
    ).toBe(true);
  });

  it("rejects when word count is outside 3-7", () => {
    const document = wizardReadyDocument();
    document.statements[0]!.text = "I/We must do this";
    expect(canRunWizard(document)).toBe(false);
  });

  it("rejects when initial order is missing or duplicate", () => {
    const document = wizardReadyDocument();
    document.statements[0]!.initialOrder = null;
    expect(canRunWizard(document)).toBe(false);
    document.statements[0]!.initialOrder = 1;
    document.statements[1]!.initialOrder = 1;
    expect(canRunWizard(document)).toBe(false);
  });

  it("does not require connection directions", () => {
    const document = wizardReadyDocument();
    expect(document.connections.every((c) => c.direction === null)).toBe(true);
    expect(validateWizardReady(document).isValid).toBe(true);
    expect(canRunWizard(document)).toBe(true);
  });
});
