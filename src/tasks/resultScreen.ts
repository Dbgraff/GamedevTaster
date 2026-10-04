import { render, renderTaskListPanel, renderResizeHandle, TASKS_BUILT, TASK_TITLES } from "../ui/shell";
import { state, progress, resetSession } from "../state";
import { getFeedback } from "../feedback";
import { renderNumbersTask } from "./task1";
import { getTaskRenderer, HARD_TASKS_FROM } from "./registry";

// "с 1-й попытки", "со 2-й попытки" — по-русски порядковые с "с/со"
const ordinal = (n: number) => `${n === 2 ? "со" : "с"} ${n}-й попытки`;

export function renderFeedback() {
  const feedback = getFeedback(state);
  // Если человек на развилке выбрал опросник, к сложным заданиям можно вернуться отсюда
  const hardTask = getTaskRenderer(HARD_TASKS_FROM);
  const canContinue = Boolean(hardTask) && progress.solvedOn[HARD_TASKS_FROM] === undefined;
  const taskLines = TASK_TITLES.slice(0, TASKS_BUILT)
    .map((title, i) => {
      const n = i + 1;
      const solved = progress.solvedOn[n];
      return `<div><span class="${solved ? "info" : "warn"}">[${solved ? "i" : "!"}]</span> Задача ${n} «${title}»: ${
        solved ? `решена ${ordinal(solved)}` : "не решена"
      }</div>`;
    })
    .join("");
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
          ${renderTaskListPanel(TASKS_BUILT + 1)}
        </div>

        ${renderResizeHandle("left")}

        <div class="scene-col scene-col--static">
          <div class="scene-tabs">
            <button type="button" class="tab-btn">Scene</button>
            <button type="button" class="tab-btn">Game</button>
            <button type="button" class="tab-btn active">Console</button>
          </div>
          <div class="deco-scene" style="background-image:none;">
            <div class="console">
              <div><span class="muted">&gt;</span> Анализирую сессию…</div>
              ${taskLines}
              <div><span class="ok">[✓]</span> Профиль собран</div>
              <div style="margin-top:14px"><span class="muted">&gt;</span> Печатаю рекомендацию…</div>
              <span class="final">${feedback}</span>
            </div>
          </div>
          <div class="viewport-status">Сессия завершена.</div>
        </div>

        ${renderResizeHandle("right")}

        <div class="inspector">
          <div class="inspector-header">
            <p>Player</p>
            <p>Tag: Player · Layer: Default</p>
          </div>
          <div class="section-card">
            <p class="section-title">Что дальше</p>
            ${canContinue ? `<button type="button" id="continue-hard" class="primary button-link">Продолжить: сложные задания →</button>` : ""}
            <a class="primary button-link" href="#">Полноценный мини-курс →</a>
            <a class="secondary button-link" href="#">Другая профессия (арт/дизайн) →</a>
          </div>
        </div>
      </div>
    </div>
  `);

  document.querySelector("#continue-hard")?.addEventListener("click", () => hardTask?.());
  document.querySelector("#banner-restart")?.addEventListener("click", () => {
    resetSession();
    renderNumbersTask({ withIntro: true });
  });
}