import {
  FIXED_CONNECTION_PAIRS,
  STATEMENT_IDS,
  type HoshinDocument,
  type ValidationIssue,
  type ValidationResult,
  toConnectionPairId
} from "@/src/domain/hoshin/models";

const REQUIRED_PREFIX_LABEL = "I/We must";
const REQUIRED_PREFIX_PATTERNS = [/^i\/we must\b/i, /^i must\b/i, /^we must\b/i];

function tokenizeWords(value: string): string[] {
  return value.match(/[A-Za-z0-9'-]+/g) ?? [];
}
function extractSuffixAfterPrefix(text: string): string | null {
  const trimmed = text.trim();
  for (const pattern of REQUIRED_PREFIX_PATTERNS) {
    const match = pattern.exec(trimmed);
    if (match) {
      return trimmed.slice(match[0].length).trim();
    }
  }
  return null;
}

function additionalWordCount(text: string): number {
  const suffix = extractSuffixAfterPrefix(text);
  if (suffix === null) {
    return -1;
  }
  if (!suffix) {
    return 0;
  }

  return tokenizeWords(suffix).length;
}

function formatStatementPath(statementId: string): string {
  return `Card ${statementId.toUpperCase()}`;
}

function formatConnectionPath(connectionId: string): string {
  const [a, b] = connectionId.split("-");
  return `Link ${a?.toUpperCase()}-${b?.toUpperCase()}`;
}

export function validateDraft(document: HoshinDocument): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (document.statements.length !== 5) {
    issues.push({
      code: "statement-count-invalid",
      message: "A Hoshin MUST contain exactly five statements.",
      path: "Statements"
    });
  }

  const seenOrders = new Set<number>();
  for (const statement of document.statements) {
    const path = formatStatementPath(statement.id);
    const trimmed = statement.text.trim();
    if (extractSuffixAfterPrefix(trimmed) === null) {
      issues.push({
        code: "statement-prefix-invalid",
        message: `Each statement MUST begin with '${REQUIRED_PREFIX_LABEL}', 'I must', or 'We must'.`,
        path
      });
    }

    const count = additionalWordCount(trimmed);
    if (count < 3 || count > 7) {
      issues.push({
        code: "statement-word-count-invalid",
        message: `Each statement MUST include 3-7 additional words after '${REQUIRED_PREFIX_LABEL}'.`,
        path
      });
    }

    if (
      statement.initialOrder === null ||
      statement.initialOrder < 1 ||
      statement.initialOrder > 5
    ) {
      issues.push({
        code: "initial-order-invalid",
        message: "Each statement MUST include an initial order value from 1 to 5.",
        path
      });
    } else if (seenOrders.has(statement.initialOrder)) {
      issues.push({
        code: "initial-order-duplicate",
        message: "Initial order values MUST be unique from 1 to 5.",
        path
      });
    } else {
      seenOrders.add(statement.initialOrder);
    }
  }

  if (seenOrders.size !== 5) {
    issues.push({
      code: "initial-order-coverage-invalid",
      message: "Initial order values MUST cover all 1 through 5 exactly once.",
      path: "Order"
    });
  }

  if (document.connections.length !== FIXED_CONNECTION_PAIRS.length) {
    issues.push({
      code: "connection-count-invalid",
      message: "The Hoshin template MUST include all ten fixed connections.",
      path: "Links"
    });
  }

  const requiredPairs = new Set(
    FIXED_CONNECTION_PAIRS.map((pair) => toConnectionPairId(pair[0], pair[1]))
  );
  for (const connection of document.connections) {
    const path = formatConnectionPath(connection.id);
    if (!requiredPairs.has(connection.id)) {
      issues.push({
        code: "connection-pair-invalid",
        message: "Connection pair is not part of the fixed Hoshin template.",
        path
      });
    }

    if (!connection.direction) {
      issues.push({
        code: "connection-direction-missing",
        message: "All fixed connection lines MUST have a selected direction.",
        path
      });
      continue;
    }

    const [first, second] = connection.pair;
    const direction = connection.direction;
    const validForward = direction.from === first && direction.to === second;
    const validReverse = direction.from === second && direction.to === first;
    if (!validForward && !validReverse) {
      issues.push({
        code: "connection-direction-invalid",
        message: "Direction MUST point between the two statements in the connection pair.",
        path
      });
    }
  }

  for (const requiredPair of requiredPairs) {
    const present = document.connections.some((connection) => connection.id === requiredPair);
    if (!present) {
      issues.push({
        code: "connection-pair-missing",
        message: `Missing fixed connection pair: ${requiredPair}.`,
        path: formatConnectionPath(requiredPair)
      });
    }
  }

  for (const id of STATEMENT_IDS) {
    const exists = document.statements.some((statement) => statement.id === id);
    if (!exists) {
      issues.push({
        code: "statement-id-missing",
        message: `Missing fixed statement slot: ${id}.`,
        path: formatStatementPath(id)
      });
    }
  }

  return {
    isValid: issues.length === 0,
    issues
  };
}

export function validateForCalculation(document: HoshinDocument): ValidationResult {
  return validateDraft(document);
}

export function canCalculate(document: HoshinDocument): boolean {
  return validateForCalculation(document).isValid;
}
