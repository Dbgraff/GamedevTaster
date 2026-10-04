import { render } from "../ui/shell";
import { buildSurveyUrl } from "../research";
import { renderFeedback } from "./resultScreen";

// Экран опроса: Яндекс Форма внутри курса со скрытыми полями из журнала прохождения.
// Идёт ПОСЛЕ разбора, потому что вопрос 12 спрашивает про показанный профиль.
// Курс не может узнать, отправлена ли форма (iframe закрыт для нашего кода), —
// "спасибо" после отправки показывает сама форма.
export function renderSurvey() {
  const url = buildSurveyUrl();
  const esc = url.replace(/&/g, "&amp;").replace(/"/g, "&quot;");

  render(`
    <div class="editor-shell survey-shell">
      <div class="task-banner">
        <div>
          <p class="eyebrow">Опрос · несколько минут</p>
          <h2>Последний шаг — расскажи, как тебе</h2>
          <p class="lead">Ответы анонимные. Данные о прохождении курса подставятся в опрос сами — заполнять их не нужно.</p>
        </div>
        <button id="survey-back" class="secondary">← К разбору</button>
      </div>
      <div class="survey-frame">
        <iframe src="${esc}" title="Опрос после курса" loading="eager" referrerpolicy="no-referrer-when-downgrade"></iframe>
      </div>
      <div class="survey-fallback">
        Опрос не отображается? <a href="${esc}" target="_blank" rel="noopener">Открыть его в новой вкладке</a>
      </div>
    </div>
  `);

  document.querySelector("#survey-back")?.addEventListener("click", renderFeedback);
}