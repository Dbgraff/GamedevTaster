import { render, renderToolbar, renderTaskListPanel, TASKS_BUILT } from "../ui/shell";
import { state } from "../state";
import { renderFeedback } from "./resultScreen";

export function renderReflection() {
  render(`
    <div class="editor-shell">
      ${renderToolbar()}

      <div class="task-banner">
        <div>
          <p class="eyebrow">Последний шаг</p>
          <h2>Что было интереснее?</h2>
          <p class="lead">Пара вопросов о тебе — это поможет собрать честный разбор.</p>
        </div>
      </div>

      <div class="editor-main">
        <div class="hierarchy">
          ${renderTaskListPanel(TASKS_BUILT + 1)}
        </div>

        <div class="reflection-panel">
          <form id="reflection-form" class="reflection">
            <fieldset>
              <legend>Что понравилось больше?</legend>
              <label><input type="radio" name="moreInteresting" value="numbers" checked /> Подбирать цифры на ощущение</label>
              <label><input type="radio" name="moreInteresting" value="code" /> Собирать логику из блоков</label>
            </fieldset>
            <fieldset>
              <legend>Где было сложнее?</legend>
              <label><input type="radio" name="hardestPart" value="numbers" /> На моменте с цифрами</label>
              <label><input type="radio" name="hardestPart" value="code" /> На моменте с блоками</label>
              <label><input type="radio" name="hardestPart" value="neither" checked /> Было несложно</label>
            </fieldset>
            <fieldset>
              <legend>Хотелось понять «почему это работает именно так», или просто получить результат?</legend>
              <label><input type="radio" name="wantedWhy" value="yes" /> Хотелось разобраться, почему</label>
              <label><input type="radio" name="wantedWhy" value="no" checked /> Главное — результат</label>
            </fieldset>
            <button type="submit" class="primary full">Получить фидбэк</button>
          </form>
        </div>
      </div>

      <div class="status-bar"><span>Ready</span><span>Console: 0 errors</span></div>
    </div>
  `);

  document.querySelector("#reflection-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const data = new FormData(form);
    state.reflection = {
      moreInteresting: data.get("moreInteresting") as "numbers" | "code",
      hardestPart: data.get("hardestPart") as "numbers" | "code" | "neither",
      wantedWhy: data.get("wantedWhy") === "yes",
    };
    renderFeedback();
  });
}