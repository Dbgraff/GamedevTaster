import type { SessionState } from "./feedback";

export const state: SessionState = {
  numbersAttempts: 0,
  codeAttempts: 0,
  reflection: null,
};

// ---------- Журнал прохождения (основа для разбора и для будущего ИИ-наставника) ----------
// attempts — сколько раз нажимали Play; solvedOn — с какой попытки решено (только первый успех);
// mistakes — какие именно ошибки были в неудачных попытках (коды, см. MISTAKES в feedback.ts);
// hints — сколько уровней подсказки открыто; times — сколько секунд ушло до решения;
// flags — эксперименты после решения и т.п.; checkpoint — выбор на развилке после задания 7.
export const progress = {
  attempts: {} as Record<number, number>,
  solvedOn: {} as Record<number, number>,
  mistakes: {} as Record<number, string[]>,
  hints: {} as Record<number, number>,
  enteredAt: {} as Record<number, number>,
  times: {} as Record<number, number>,
  flags: new Set<string>(),
  checkpoint: null as null | "survey" | "continue",
  startedAt: Date.now(),
};

// Вызывается, когда открывается экран задания (только первый вход засчитывается)
export function enterTask(task: number) {
  if (progress.enteredAt[task] === undefined) progress.enteredAt[task] = Date.now();
}

// Одна попытка = один вызов. mistake — код ошибки или несколько кодов сразу
// (в задании 4 одна сборка может содержать несколько проблем, но это всё равно одна попытка).
export function registerAttempt(task: number, ok: boolean, mistake?: string | string[]) {
  progress.attempts[task] = (progress.attempts[task] ?? 0) + 1;
  const codes = !ok && mistake ? (Array.isArray(mistake) ? mistake : [mistake]) : [];
  if (codes.length) {
    const list = (progress.mistakes[task] ??= []);
    for (const code of codes) if (code && !list.includes(code)) list.push(code);
  }
  if (ok && progress.solvedOn[task] === undefined) {
    progress.solvedOn[task] = progress.attempts[task];
    const entered = progress.enteredAt[task];
    if (entered !== undefined) progress.times[task] = Math.round((Date.now() - entered) / 1000);
  }
}

export function registerHint(task: number) {
  progress.hints[task] = (progress.hints[task] ?? 0) + 1;
}

export function markFlag(flag: string) {
  progress.flags.add(flag);
}

export function resetSession() {
  state.numbersAttempts = 0;
  state.codeAttempts = 0;
  state.reflection = null;
  progress.attempts = {};
  progress.solvedOn = {};
  progress.mistakes = {};
  progress.hints = {};
  progress.enteredAt = {};
  progress.times = {};
  progress.flags = new Set();
  progress.checkpoint = null;
  progress.startedAt = Date.now();
}