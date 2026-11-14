export interface Theme {
  name: string;
  guidance: string;
}

/** Indexed by weekday, 0 = Sunday. */
export const THEMES: Theme[] = [
  {
    name: "Wholesome Sunday",
    guidance:
      "A warm proverb, piece of folk wisdom, or gentle encouraging thing someone might say to a friend.",
  },
  {
    name: "Idiom Monday",
    guidance:
      "A well-known English idiom or expression, possibly with a few extra everyday words around it.",
  },
  {
    name: "Workplace Tuesday",
    guidance:
      "Something people say at work: in meetings, on calls, in office small talk, or about their boss or inbox.",
  },
  {
    name: "Group Chat Wednesday",
    guidance:
      "A casual message someone would text a close friend, with everyday slang-free wording, like 'i dont even care if you did that though'.",
  },
  {
    name: "Dramatic Thursday",
    guidance:
      "An ORIGINAL over-the-top dramatic line that sounds like it could be from a movie or TV show. It must not be a real quote from any film, show, song or book.",
  },
  {
    name: "Weekend Friday",
    guidance: "Something people say about weekend plans, going out, parties, or finally relaxing after a long week.",
  },
  {
    name: "Parent Saturday",
    guidance:
      "A classic thing parents say to their kids, like 'money doesnt grow on trees' or 'were not stopping until we get there'.",
  },
];

export function themeFor(weekday: number): Theme {
  return THEMES[((weekday % 7) + 7) % 7];
}
