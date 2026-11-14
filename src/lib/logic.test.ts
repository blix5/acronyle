import { describe, expect, it } from "vitest";
import { acronymOf, normalizeWord, splitPhrase } from "./normalize";
import { scoreGuess, isSolved } from "./scoring";
import { maxGuesses, validateGuess } from "./rules";
import { decodeAnswer, encodeAnswer } from "./obfuscate";
import { addDays, isDateKey, isServableDate, puzzleNumber, weekdayOf } from "./dates";

describe("normalize", () => {
  it("ignores case and punctuation", () => {
    expect(normalizeWord("Don't")).toBe("dont");
    expect(normalizeWord("THOUGH...")).toBe("though");
    expect(normalizeWord("café")).toBe("cafe");
  });
  it("splits phrases and builds the acronym", () => {
    const words = splitPhrase("I don't even care if you did that though...");
    expect(words).toEqual(["i", "dont", "even", "care", "if", "you", "did", "that", "though"]);
    expect(acronymOf(words)).toBe("IDECIYDTT");
    expect(splitPhrase("a well-known  fact")).toEqual(["a", "well", "known", "fact"]);
  });
});

describe("scoreGuess", () => {
  const answer = ["i", "dont", "even", "care", "if", "you", "did", "that", "though"];
  it("marks exact matches green", () => {
    expect(isSolved(scoreGuess(answer, answer))).toBe(true);
    expect(scoreGuess(["I", "Don't", ...answer.slice(2)], answer).every((m) => m === "correct")).toBe(true);
  });
  it("marks a word from another slot yellow", () => {
    const guess = [...answer];
    guess[8] = "that"; // 'that' belongs in slot 7
    guess[7] = "though"; // 'though' belongs in slot 8
    const marks = scoreGuess(guess, answer);
    expect(marks[7]).toBe("present");
    expect(marks[8]).toBe("present");
  });
  it("does not double-count repeated words", () => {
    // answer has one 'the'; guess uses 'the' twice in wrong slots
    const ans = ["the", "cat", "sat", "on", "a", "mat"];
    const marks = scoreGuess(["tea", "the", "sat", "on", "a", "the"], ans);
    expect(marks).toEqual(["absent", "present", "correct", "correct", "correct", "absent"]);
  });
  it("prefers green over yellow for the same word", () => {
    const ans = ["to", "be", "or", "not", "to", "be"];
    const marks = scoreGuess(["to", "to", "or", "not", "to", "be"], ans);
    // both 'to's in the answer are used: slot 0 and 4 green, slot 1 has no copy left
    expect(marks).toEqual(["correct", "absent", "correct", "correct", "correct", "correct"]);
  });
});

describe("rules", () => {
  it("scales chances with length", () => {
    expect(maxGuesses(6)).toBe(5);
    expect(maxGuesses(9)).toBe(7);
    expect(maxGuesses(16)).toBe(10);
    expect(maxGuesses(2)).toBe(4);
  });
  it("validates guesses", () => {
    expect(validateGuess(["it", "is"], "II")).toBeNull();
    expect(validateGuess(["it", ""], "II")).toBe("Fill in every word");
    expect(validateGuess(["it", "as"], "II")).toMatch(/must start with/);
    expect(validateGuess(["It", "is"], "II", [["it", "IS"]])).toBe("You already tried that");
  });
});

describe("obfuscate", () => {
  it("round-trips and hides the phrase", () => {
    const phrase = "I don't even care — if you did that though…";
    const enc = encodeAnswer(phrase, "2026-11-14");
    expect(enc).not.toContain("care");
    expect(decodeAnswer(enc, "2026-11-14")).toBe(phrase);
    expect(decodeAnswer(enc, "2026-11-15")).not.toBe(phrase);
  });
});

describe("dates", () => {
  it("numbers puzzles from launch", () => {
    expect(puzzleNumber("2026-11-14")).toBe(1);
    expect(puzzleNumber("2026-12-14")).toBe(31);
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(weekdayOf("2026-11-14")).toBe(6); // Saturday
  });
  it("only serves yesterday/today/tomorrow (UTC)", () => {
    const now = new Date("2026-11-20T12:00:00Z");
    expect(isServableDate("2026-11-19", now)).toBe(true);
    expect(isServableDate("2026-11-21", now)).toBe(true);
    expect(isServableDate("2026-11-22", now)).toBe(false);
    expect(isServableDate("2026-11-18", now)).toBe(false);
    expect(isServableDate("2026-02-30", now)).toBe(false);
    expect(isDateKey("2026-1-1")).toBe(false);
  });
});
