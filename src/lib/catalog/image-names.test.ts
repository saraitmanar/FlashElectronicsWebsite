import { describe, expect, it } from "vitest";
import { parseImageName } from "./image-names";

const options = [
  { id: "color", values: [{ id: "navy" }, { id: "light-blue" }, { id: "light" }] },
  { id: "bed-size", values: [{ id: "queen" }, { id: "king" }] },
];

describe("parseImageName", () => {
  it("tags a photo with one option value and an order", () => {
    expect(parseImageName("navy-2.jpg", options)).toEqual({
      base: "navy-2",
      order: 2,
      kind: "tagged",
      optionValues: { color: "navy" },
    });
  });

  it("handles value ids that contain dashes", () => {
    expect(parseImageName("light-blue-1.jpg", options).optionValues).toEqual({
      color: "light-blue",
    });
  });

  it("matches several options in any order", () => {
    expect(parseImageName("king-navy-1.jpg", options).optionValues).toEqual({
      color: "navy",
      "bed-size": "king",
    });
  });

  it("backtracks when a shorter value id is a prefix of a longer one", () => {
    // "light" is also a color; "light-blue-queen" must still resolve.
    expect(parseImageName("light-blue-queen-1.jpg", options).optionValues).toEqual({
      color: "light-blue",
      "bed-size": "queen",
    });
  });

  it("recognizes main and general photos", () => {
    expect(parseImageName("main-1.jpg", options).kind).toBe("main");
    expect(parseImageName("detail.jpg", options)).toMatchObject({ kind: "generic", order: 1 });
    expect(parseImageName("size-chart-1.jpg", options).kind).toBe("generic");
  });

  it("flags names that match nothing", () => {
    expect(parseImageName("naavy-1.jpg", options).kind).toBe("unknown");
  });
});
