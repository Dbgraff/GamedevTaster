import { render, renderTaskListPanel, renderResizeHandle, TASKS_BUILT } from "../ui/shell";
import { state } from "../state";
import { getFeedback } from "../feedback";
import { renderNumbersTask } from "./task1";

export function renderFeedback() {
  const feedback = getFeedback(state);
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
              <div><span class="info">[i]</span> Задача 1: ${state.numbersAttempts} попыт${state.numbersAttempts === 1 ? "ка" : "ки"}, последняя — успешная</div>
              <div><span class="info">[i]</span> Задача 2: ${state.codeAttempts === 0 ? "правильная последовательность блоков с первой попытки" : `${state.codeAttempts} неверн${state.codeAttempts === 1 ? "ая попытка" : "ые попытки"} перед успехом`}</div>
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
            <a class="primary button-link" href="#">Полноценный мини-курс →</a>
            <a class="secondary button-link" href="#">Другая профессия (арт/дизайн) →</a>
          </div>
        </div>
      </div>
    </div>
  `);

  document.querySelector("#banner-restart")?.addEventListener("click", () => {
    state.numbersAttempts = 0;
    state.codeAttempts = 0;
    renderNumbersTask({ withIntro: true });
  });
}