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

// ---------- Учёт попыток по всем заданиям (для итогового экрана) ----------
// attempts — сколько раз нажимали Play; solvedOn — с какой попытки решено
// (запоминается только первый успех, дальнейшие эксперименты не портят цифру).
export const progress = {
  attempts: {} as Record<number, number>,
  solvedOn: {} as Record<number, number>,
};

export function registerAttempt(task: number, ok: boolean) {
  progress.attempts[task] = (progress.attempts[task] ?? 0) + 1;
  if (ok && progress.solvedOn[task] === undefined) progress.solvedOn[task] = progress.attempts[task];
}

export function resetSession() {
  state.numbersAttempts = 0;
  state.codeAttempts = 0;
  progress.attempts = {};
  progress.solvedOn = {};
}