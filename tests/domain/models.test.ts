import { describe, expect, it } from "vitest";
import { parseConnectionPairId, toConnectionPairId } from "@/src/domain/hoshin/models";

describe("hoshin models helpers", () => {
  it("sorts connection ids deterministically", () => {
    expect(toConnectionPairId("s4", "s1")).toBe("s1-s4");
    expect(toConnectionPairId("s2", "s5")).toBe("s2-s5");
  });

  it("parses connection pair ids into statement ids", () => {
    expect(parseConnectionPairId("s1-s3")).toEqual(["s1", "s3"]);
  });
});
