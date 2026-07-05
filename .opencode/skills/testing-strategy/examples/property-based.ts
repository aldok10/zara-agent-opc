import { describe, it, expect } from "vitest";
import fc from "fast-check";

function sortNumbers(arr: number[]): number[] {
  return [...arr].sort((a, b) => a - b);
}

function uniqueBy<T, K>(items: T[], keyFn: (item: T) => K): T[] {
  const seen = new Set<K>();
  return items.filter((item) => {
    const key = keyFn(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function parseQueryParams(query: string): Record<string, string> {
  if (!query || query === "?") return {};
  const cleaned = query.startsWith("?") ? query.slice(1) : query;
  const params: Record<string, string> = {};
  for (const pair of cleaned.split("&")) {
    const [key, value] = pair.split("=");
    if (key) params[decodeURIComponent(key)] = decodeURIComponent(value ?? "");
  }
  return params;
}

describe("Property-based tests", () => {
  describe("sortNumbers", () => {
    it("output is always sorted", () => {
      fc.assert(
        fc.property(fc.array(fc.integer()), (arr) => {
          const sorted = sortNumbers(arr);
          for (let i = 1; i < sorted.length; i++) {
            expect(sorted[i]).toBeGreaterThanOrEqual(sorted[i - 1]);
          }
        })
      );
    });

    it("preserves all elements", () => {
      fc.assert(
        fc.property(fc.array(fc.integer()), (arr) => {
          const sorted = sortNumbers(arr);
          expect(sorted).toHaveLength(arr.length);
          expect(sorted.sort()).toEqual([...arr].sort());
        })
      );
    });
  });

  describe("uniqueBy", () => {
    it("result has no duplicates by key", () => {
      fc.assert(
        fc.property(
          fc.array(fc.record({ id: fc.integer({ min: 1, max: 10 }), value: fc.string() })),
          (items) => {
            const result = uniqueBy(items, (x) => x.id);
            const ids = result.map((x) => x.id);
            expect(new Set(ids).size).toBe(ids.length);
          }
        )
      );
    });

    it("result is subset of input", () => {
      fc.assert(
        fc.property(fc.array(fc.integer()), (arr) => {
          const result = uniqueBy(arr, (x) => x);
          for (const item of result) {
            expect(arr).toContain(item);
          }
        })
      );
    });
  });

  describe("parseQueryParams", () => {
    it("roundtrips key-value pairs", () => {
      fc.assert(
        fc.property(
          fc.dictionary(fc.webSegment(), fc.webSegment()),
          (params) => {
            const query = Object.entries(params)
              .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
              .join("&");
            const parsed = parseQueryParams(query);
            for (const [k, v] of Object.entries(params)) {
              expect(parsed[k]).toBe(v);
            }
          }
        )
      );
    });
  });
});
