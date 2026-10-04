import { render, renderTaskListPanel, renderResizeHandle, TASKS_BUILT, TASK_TITLES } from "../ui/shell";
import { state, progress, resetSession } from "../state";
import { buildProfile } from "../feedback";
import { renderNumbersTask } from "./task1";
import { getTaskRenderer, HARD_TASKS_FROM } from "./registry";
import { research } from "../research";
import { renderSurvey } from "./survey";

// "с 1-й попытки", "со 2-й попытки" — по-русски порядковые с "с/со"
const ordinal = (n: number) => `${n === 2 ? "со" : "с"} ${n}-й попытки`;
const minutes = (sec: number) => (sec < 60 ? "меньше минуты" : `${Math.round(sec / 60)} мин`);

export function renderFeedback() {
  const profile = buildProfile(progress, state.reflection);

  // Если человек на развилке выбрал опросник, к сложным заданиям можно вернуться отсюда
  const hardTask = getTaskRenderer(HARD_TASKS_FROM);
  const canContinue = Boolean(hardTask) && progress.solvedOn[HARD_TASKS_FROM] === undefined;

  const taskLines = TASK_TITLES.slice(0, TASKS_BUILT)
    .map((title, i) => {
      const n = i + 1;
      if (progress.enteredAt[n] === undefined) return "";
      const solved = progress.solvedOn[n];
      const hints = progress.hints[n] ?? 0;
      const extra = [
        hints ? `подсказок: ${hints}` : "",
        progress.times[n] !== undefined ? minutes(progress.times[n]) : "",
      ].filter(Boolean).join(" · ");
      return `<div><span class="${solved ? "info" : "warn"}">[${solved ? "i" : "!"}]</span> Задача ${n} «${title}»: ${
        solved ? `решена ${ordinal(solved)}` : "не решена"
      }${extra ? ` <span class="muted">· ${extra}</span>` : ""}</div>`;
    })
    .join("");

  const section = (title: string, lines: string[]) =>
    lines.length
      ? `<div class="profile-section"><div class="muted">// ${title}</div>${lines.map((l) => `<div class="profile-line">${l}</div>`).join("")}</div>`
      : "";

  render(`
    <div class="editor-shell">
      <div class="task-banner">
        <div>
          <p class="eyebrow">Результат</p>
          <h2>Вот что мы заметили</h2>
        </div>
        <button id="banner-restart" class="secondary">Пройти пробу заново</button>
      </div>

      <div class="editor-main">
        <div class="hierarchy">
          ${renderTaskListPanel(0)} <!-- 0: на итоговых экранах ни одно задание не "текущее" -->
        </div>

        ${renderResizeHandle("left")}

        <div class="scene-col scene-col--static">
          <div class="scene-tabs">
            <button type="button" class="tab-btn active">Console</button>
          </div>
          <div class="deco-scene" style="background-image:none;">
            <div class="console">
              <div><span class="muted">&gt;</span> Анализирую прохождение…</div>
              ${taskLines}
              <div><span class="ok">[✓]</span> Профиль собран <span class="muted">· всё прохождение — около ${profile.totalMinutes} мин</span></div>

              <div class="profile-summary">${profile.summary}</div>
              ${section("что получалось", profile.strengths)}
              ${section(
                "где было сложно — и что это значит",
                profile.difficulties.map((d) => `<b>«${d.title}»</b>: ${d.lessons.join("; ")}.`)
              )}
              ${section("как ты работал(а)", [...profile.workStyle, ...(profile.interestNote ? [profile.interestNote] : [])])}
            </div>
          </div>
          <div class="viewport-status">Разбор собран наставником на правилах — по тому, как ты решал(а) задания.</div>
        </div>

        ${renderResizeHandle("right")}

        <div class="inspector">
          ${
            research.consent
              ? `<div class="section-card survey-cta">
                  <p class="section-title">Последний шаг</p>
                  <p class="next-step">Ответь на короткий опрос — это займёт несколько минут и очень поможет исследованию.</p>
                  <button type="button" id="open-survey" class="primary">Пройти опрос →</button>
                </div>`
              : `<div class="section-card"><p class="next-step">Спасибо, что попробовал(а) курс! Опрос не показывается — ты решил(а) не участвовать в исследовании, и это нормально.</p></div>`
          }
          <div class="section-card">
            <p class="section-title">Твой профиль</p>
            <div class="direction-badge">${profile.directionTitle}</div>
            ${profile.axes
              .map(
                (a) => `
              <div class="axis-row">
                <div class="axis-head"><span>${a.title}</span><span>${a.value === null ? "—" : `${a.value}%`}</span></div>
                <div class="axis-track"><div class="axis-fill" style="width:${a.value ?? 0}%"></div></div>
              </div>`
              )
              .join("")}
            <p class="axis-note">Чем увереннее решены задания этой темы — с первой попытки и без подсказок, — тем выше значение.</p>
          </div>
          <div class="section-card">
            <p class="section-title">Что попробовать дальше</p>
            ${profile.next.map((n) => `<p class="next-step">${n}</p>`).join("")}
            ${canContinue ? `<button type="button" id="continue-hard" class="primary button-link">Продолжить: сложные задания →</button>` : ""}
          </div>
        </div>
      </div>
    </div>
  `);

  document.querySelector("#continue-hard")?.addEventListener("click", () => hardTask?.());
  document.querySelector("#open-survey")?.addEventListener("click", renderSurvey);
  document.querySelector("#banner-restart")?.addEventListener("click", () => {
    resetSession();
    research.pass += 1;
    renderNumbersTask({ withIntro: true });
  });
}