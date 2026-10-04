// Всё, что касается исследования: согласие, ответы "до" и сборка ссылки на
// Яндекс Форму со скрытыми полями. Идентификаторы полей — ровно как в документе
// "Структура Яндекс Формы", раздел 3: если поменять здесь, нужно поменять и в форме.
//
// Это состояние НЕ сбрасывается при "Пройти пробу заново": согласие и ответы "до"
// не переспрашиваются. Номер сессии сохраняется, но к нему добавляется номер прохода
// ("…-2", "…-3"): в выгрузке сразу видно, что это повтор того же человека и какой по счёту.

import { progress, state } from "./state";
import { buildProfile } from "./feedback";

import { FORM_URL, COURSE_VERSION } from "./config";

export type Experience = "none" | "school" | "student" | "work";
export type AgeBand = "14-15" | "16-17" | "18-21" | "22-25" | "26+";

export const research = {
  answered: false, // приветствие с согласием уже пройдено
  consent: false,
  sessionBase: makeSession(),
  pass: 1, // какой это проход курса в этой вкладке
  age: null as AgeBand | null,
  experience: null as Experience | null,
  understandPre: null as number | null,
};

export function sessionId(): string {
  return research.pass > 1 ? `${research.sessionBase}-${research.pass}` : research.sessionBase;
}

// Случайный анонимный номер прохождения: 10 символов, не связан с личностью
function makeSession(): string {
  const alphabet = "abcdefghijkmnpqrstuvwxyz23456789";
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

const pairs = (rec: Record<number, number | string[]>, tasks: number[], fmt: (v: number | string[]) => string) =>
  tasks.filter((t) => rec[t] !== undefined).map((t) => `${t}:${fmt(rec[t])}`);

// Собирает ссылку на форму со всеми скрытыми полями из журнала прохождения
export function buildSurveyUrl(): string {
  const entered = Object.keys(progress.enteredAt).map(Number).sort((a, b) => a - b);
  const lastTask = entered.length ? entered[entered.length - 1] : 0;
  const finishedAll = progress.solvedOn[10] !== undefined;
  const profile = buildProfile(progress, state.reflection);

  const fields: Record<string, string> = {
    session: sessionId(),
    version: COURSE_VERSION,
    consent: research.consent ? "yes" : "no",
    age: research.age ?? "",
    experience: research.experience ?? "",
    understand_pre: research.understandPre !== null ? String(research.understandPre) : "",
    last_task: String(lastTask),
    finished_all: finishedAll ? "yes" : "no",
    exit_point: progress.exitPoint ?? (finishedAll ? "completed" : ""),
    // для каждого открытого задания: с какой попытки решено (0 — не решено)
    solved: entered.map((t) => `${t}:${progress.solvedOn[t] ?? 0}`).join(","),
    attempts: entered.map((t) => `${t}:${progress.attempts[t] ?? 0}`).join(","),
    hints: pairs(progress.hints, entered, (v) => String(v)).join(","),
    mistakes: pairs(progress.mistakes, entered, (v) => (v as string[]).join(".")).filter((p) => !p.endsWith(":")).join(";"),
    times: pairs(progress.times, entered, (v) => String(v)).join(","),
    time_total: String(Math.round((Date.now() - progress.startedAt) / 1000)),
    profile: profile.direction,
    axes: profile.axes.map((a) => `${a.id}:${a.value ?? "na"}`).join(","),
    refl_interest: state.reflection?.moreInteresting ?? "",
    refl_hardest: state.reflection?.hardestPart ?? "",
    refl_why: state.reflection ? (state.reflection.wantedWhy ? "yes" : "no") : "",
    device: window.matchMedia("(max-width: 760px)").matches ? "mobile" : "desktop",
  };

  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(fields)) if (v !== "") params.set(k, v);
  return `${FORM_URL}?${params.toString()}`;
}