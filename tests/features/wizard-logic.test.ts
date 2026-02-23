import { describe, expect, it } from "vitest";
import { createEmptyHoshinDocument } from "@/src/domain/hoshin/factory";
import { FIXED_CONNECTION_PAIRS, toConnectionPairId } from "@/src/domain/hoshin/models";
import {
  getPairsWithNullDirection,
  setConnectionDirection
} from "@/src/features/hoshin/wizard-logic";

describe("wizard-logic", () => {
  describe("getPairsWithNullDirection", () => {
    it("returns all ten pairs when no direction is set", () => {
      const document = createEmptyHoshinDocument();
      const pairs = getPairsWithNullDirection(document);
      expect(pairs).toHaveLength(FIXED_CONNECTION_PAIRS.length);
      expect(pairs).toEqual([...FIXED_CONNECTION_PAIRS]);
    });

    it("returns only pairs with null direction when some are set", () => {
      const document = createEmptyHoshinDocument();
      const pairId = toConnectionPairId("s1", "s2");
      document.connections = document.connections.map((c) =>
        c.id === pairId ? { ...c, direction: { from: "s1", to: "s2" } } : c
      );
      const pairs = getPairsWithNullDirection(document);
      expect(pairs).toHaveLength(9);
      expect(pairs.some(([a, b]) => (a === "s1" && b === "s2") || (a === "s2" && b === "s1"))).toBe(
        false
      );
    });

    it("returns empty when all directions are set", () => {
      const document = createEmptyHoshinDocument();
      for (const pair of FIXED_CONNECTION_PAIRS) {
        const pairId = toConnectionPairId(pair[0], pair[1]);
        document.connections = document.connections.map((c) =>
          c.id === pairId ? { ...c, direction: { from: pair[0], to: pair[1] } } : c
        );
      }
      const pairs = getPairsWithNullDirection(document);
      expect(pairs).toHaveLength(0);
    });
  });

  describe("setConnectionDirection", () => {
    it("sets direction for the given pair and leaves others unchanged", () => {
      const document = createEmptyHoshinDocument();
      const pairId = toConnectionPairId("s1", "s2");
      const updated = setConnectionDirection(document, pairId, "s1", "s2");
      const conn = updated.connections.find((c) => c.id === pairId);
      expect(conn?.direction).toEqual({ from: "s1", to: "s2" });
      const otherNullCount = updated.connections.filter(
        (c) => c.id !== pairId && c.direction === null
      ).length;
      expect(otherNullCount).toBe(9);
    });

    it("can set reverse direction (B enables A)", () => {
      const document = createEmptyHoshinDocument();
      const pairId = toConnectionPairId("s1", "s2");
      const updated = setConnectionDirection(document, pairId, "s2", "s1");
      const conn = updated.connections.find((c) => c.id === pairId);
      expect(conn?.direction).toEqual({ from: "s2", to: "s1" });
    });

    it("partial save: applying three answers leaves seven connections unchanged", () => {
      let document = createEmptyHoshinDocument();
      const firstThree = FIXED_CONNECTION_PAIRS.slice(0, 3);
      for (const pair of firstThree) {
        const pairId = toConnectionPairId(pair[0], pair[1]);
        document = setConnectionDirection(document, pairId, pair[0], pair[1]);
      }
      const withDirection = document.connections.filter((c) => c.direction !== null);
      expect(withDirection).toHaveLength(3);
      const stillNull = getPairsWithNullDirection(document);
      expect(stillNull).toHaveLength(7);
    });

    it("sequence of ten choices yields all connections set", () => {
      let document = createEmptyHoshinDocument();
      for (const pair of FIXED_CONNECTION_PAIRS) {
        const pairId = toConnectionPairId(pair[0], pair[1]);
        document = setConnectionDirection(document, pairId, pair[0], pair[1]);
      }
      expect(document.connections.every((c) => c.direction !== null)).toBe(true);
      expect(getPairsWithNullDirection(document)).toHaveLength(0);
    });
  });
});
