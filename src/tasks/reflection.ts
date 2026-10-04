import { render, renderTaskListPanel, renderResizeHandle } from "../ui/shell";
import { state } from "../state";
import type { Interest } from "../feedback";
import { renderFeedback } from "./resultScreen";

export function renderReflection() {
  render(`
    <div class="editor-shell">
      <div class="task-banner">
        <div>
          <p class="eyebrow">Последний шаг</p>
          <h2>Что было интереснее?</h2>
          <p class="lead">Пара вопросов о тебе — это поможет собрать честный разбор.</p>
        </div>
      </div>

      <div class="editor-main">
        <div class="hierarchy">
          ${renderTaskListPanel(0)} <!-- 0: на итоговых экранах ни одно задание не "текущее" -->
        </div>

        ${renderResizeHandle("left")}

        <div class="reflection-panel">
          <form id="reflection-form" class="reflection">
            <!-- Без ответов по умолчанию: иначе кто просто нажмёт кнопку, "ответит" предвыбранным вариантом -->
            <fieldset>
              <legend>Что понравилось больше всего?</legend>
              <label><input type="radio" name="moreInteresting" value="numbers" required /> Подбирать числа и баланс (прыжок)</label>
              <label><input type="radio" name="moreInteresting" value="logic" /> Собирать логику из блоков</label>
              <label><input type="radio" name="moreInteresting" value="engine" /> Разбираться, как устроен движок (компоненты, события)</label>
              <label><input type="radio" name="moreInteresting" value="code" /> Работать с настоящим кодом</label>
            </fieldset>
            <fieldset>
              <legend>Где было сложнее всего?</legend>
              <label><input type="radio" name="hardestPart" value="numbers" required /> С числами и балансом</label>
              <label><input type="radio" name="hardestPart" value="logic" /> С логикой из блоков</label>
              <label><input type="radio" name="hardestPart" value="engine" /> С устройством движка</label>
              <label><input type="radio" name="hardestPart" value="code" /> С кодом</label>
              <label><input type="radio" name="hardestPart" value="neither" /> Нигде не было сложно</label>
            </fieldset>
            <fieldset>
              <legend>Хотелось понять «почему это работает именно так», или просто получить результат?</legend>
              <label><input type="radio" name="wantedWhy" value="yes" required /> Хотелось разобраться, почему</label>
              <label><input type="radio" name="wantedWhy" value="no" /> Главное — результат</label>
            </fieldset>
            <button type="submit" class="primary full">Получить фидбэк</button>
          </form>
        </div>
      </div>
    </div>
  `);

  document.querySelector("#reflection-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const data = new FormData(form);
    state.reflection = {
      moreInteresting: data.get("moreInteresting") as Interest,
      hardestPart: data.get("hardestPart") as Interest | "neither",
      wantedWhy: data.get("wantedWhy") === "yes",
    };
    renderFeedback();
  });
}