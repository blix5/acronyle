import { describe, expect, it } from "vitest";
import { BACKUP_PUZZLES } from "./backup-puzzles";
import { checkCandidate } from "./generate";

describe("checkCandidate", () => {
  it("accepts every backup puzzle", () => {
    for (const p of BACKUP_PUZZLES) expect(checkCandidate(p.phrase, p.clue, []), p.phrase).toBeNull();
  });
  it("rejects bad candidates", () => {
    expect(checkCandidate("too short phrase", "a clue", [])).toMatch(/words/);
    expect(checkCandidate("I have 2 cats and a dog", "pets", [])).toMatch(/digit/);
    expect(checkCandidate("Money doesn't grow on trees you know", "about money", [])).toMatch(/gives away/);
    expect(checkCandidate("Money doesn't grow on trees you know", "checkout", ["money doesnt grow on trees, you know!"])).toMatch(/recently/);
  });
});
