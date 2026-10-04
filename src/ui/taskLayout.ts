// Общий каркас экрана задания: шапка (мобильная), левая панель с описанием и
// подсказками, сцена с вкладкой Console, инспектор и нижняя панель с Play.
// Новые задания описывают только своё содержимое — разметка вокруг одна на всех.

import {
  renderTaskListPanel,
  renderMobileHeader,
  renderResizeHandle,
  renderHintBlock,
  renderNextButton,
  TASK_TITLES,
} from "./shell";
import { renderConsoleDrawer } from "./console";
import { research } from "../research";

export interface TaskLayout {
  n: number;
  title: string;
  leads: string[]; // абзацы описания (можно с HTML)
  hints: string[]; // от наводящего вопроса к прямому указанию; на уровне C их больше
  sceneTabLabel?: string; // "Scene" или "Game"
  sceneHtml: string; // что лежит в сцене под консолью (обычно canvas)
  inspectorHtml: string;
  wideInspector?: boolean; // для заданий с кодом строки длинные
  playLabel?: string;
  initialStatus: string;
  finishButton?: boolean; // задания 7–10: можно закончить курс и перейти к опросу
}

export function renderTaskLayout(t: TaskLayout): string {
  return `
    <div class="editor-shell">
      <div class="editor-main">
        ${renderMobileHeader(t.n)}

        <div class="hierarchy">
          ${renderTaskListPanel(t.n)}

          <div class="task-info">
            <p class="eyebrow">Задача ${t.n} из ${TASK_TITLES.length}</p>
            <h2>${t.title}</h2>
            ${t.leads.map((l) => `<p class="lead">${l}</p>`).join("")}
            ${renderHintBlock(t.hints)}
            ${t.finishButton ? `<button type="button" id="finish-btn" class="text-btn finish-btn">${research.consent ? "Закончить и пройти опрос" : "Закончить и получить разбор"}</button>` : ""}
          </div>
          ${renderNextButton()}
        </div>

        ${renderResizeHandle("left")}

        <div class="scene-col">
          <div class="scene-tabs">
            <button type="button" class="tab-btn active" data-tab="scene">${t.sceneTabLabel ?? "Scene"}</button>
            <button type="button" class="tab-btn" data-tab="console">Console</button>
          </div>
          <div class="viewport-stage">
            <div class="viewport" id="scene-view">${t.sceneHtml}</div>
            ${renderConsoleDrawer()}
          </div>
          <div class="viewport-status" id="viewport-status">${t.initialStatus}</div>
        </div>

        ${renderResizeHandle("right")}

        <div class="inspector${t.wideInspector ? " inspector--wide" : ""}">
          ${t.inspectorHtml}
          <div class="action-bar">
            <button id="run-btn" class="primary full">${t.playLabel ?? "▶ Play"}</button>
            ${renderNextButton()}
          </div>
        </div>
      </div>
    </div>
  `;
}

// Подсветка блока кода: сама строка + комментарий (на уровне B комментарии видны)
export function codeBlock(code: string, comment?: string): string {
  const esc = code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<code class="code-line">${esc}</code>${comment ? `<span class="code-comment">// ${comment}</span>` : ""}`;
}

export function setStatus(el: HTMLElement, text: string, kind: "ok" | "warn" | "" = "") {
  el.innerHTML = text;
  el.className = "viewport-status" + (kind ? ` ${kind}` : "");
}

// Блокирует кнопку на время прогона и ГАРАНТИРОВАННО разблокирует её после —
// даже если внутри что-то упало. Иначе одна ошибка посреди анимации оставляла
// Play заблокированной, и казалось, что курс завис.
export async function whileLocked<T>(btn: HTMLButtonElement, run: () => Promise<T>): Promise<T> {
  btn.disabled = true;
  try {
    return await run();
  } finally {
    btn.disabled = false;
  }
}