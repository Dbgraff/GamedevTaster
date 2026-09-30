import type { SessionState } from "./feedback";

export const state: SessionState = {
  numbersAttempts: 0,
  codeAttempts: 0,
  reflection: {
    moreInteresting: "numbers",
    hardestPart: "neither",
    wantedWhy: false,
  },
};