import { PlatformerDemo, type PlayOutcome } from "../engines/platformerDemo";
import { render, renderToolbar, renderTaskListPanel, renderHintBlock, setupHints, TASK_TITLES } from "../ui/shell";
import { state } from "../state";
import { renderCodeTask } from "./task2";

export function renderNumbersTask() {
  render(`
    <div class="editor-shell">
      ${renderToolbar({ id: "toolbar-play", icon: "play", label: "Запустить" })}

      <div class="editor-main">
        <div class="hierarchy">
          ${renderTaskListPanel(1)}

          <div class="task-info">
            <p class="eyebrow">Задача 1 из ${TASK_TITLES.length}</p>
            <h2>Почини прыжок цифрами</h2>
            <p class="lead">Персонаж не прыгает как надо. Подбери параметры справа так, чтобы прыжок выглядел естественно.</p>
            <p class="lead">🎮 Прыжок работает и на пробел — попробуй нажать и посмотреть, что будет.</p>
            ${renderHintBlock([
              "Подумай: сможет ли персонаж вообще оторваться от земли, если сила прыжка почти нулевая?",
              "Подними Jump Force и опусти Gravity Scale, чтобы добиться заметной высоты — а потом подними Ground Check Distance, если персонаж проваливается под пол.",
            ])}
          </div>
          <button id="next-btn" class="secondary full next-btn" disabled>Дальше →</button>
        </div>

        <div class="scene-col">
          <div class="scene-tabs">
            <button type="button" class="tab-btn active" data-tab="scene">Scene</button>
            <button type="button" class="tab-btn" data-tab="console">Console</button>
          </div>
          <div class="viewport-stage">
            <div class="viewport" id="scene-view">
              <canvas id="canvas"></canvas>
            </div>
            <div class="console-drawer" id="console-drawer">
              <div class="console-drawer-header">
                <span>Console</span>
                <button type="button" id="console-close" class="console-drawer-close" aria-label="Закрыть">✕</button>
              </div>
              <div class="console" id="console-output">
                <span class="muted">&gt; Нажми Play, чтобы увидеть результат здесь.</span>
              </div>
            </div>
          </div>
          <div class="viewport-status" id="status">Готово к запуску.</div>
        </div>

        <div class="inspector">
          <div class="inspector-header">
            <p>Player</p>
            <p>Tag: Player · Layer: Default</p>
          </div>
          <div class="section-card">
            <p class="section-title">PlayerController (Script)</p>
            <div class="field-row">
              <label for="jf">Jump Force</label>
              <input id="jf" type="number" min="0" max="15" step="1" value="2" />
            </div>
            <div class="field-row">
              <label for="gs">Gravity Scale</label>
              <input id="gs" type="number" min="1" max="30" step="1" value="26" />
            </div>
            <div class="field-row">
              <label for="gc">Ground Check Distance</label>
              <input id="gc" type="number" min="0.02" max="0.30" step="0.01" value="0.03" />
            </div>
          </div>
          <button id="play-btn" class="primary full">▶ Play</button>
        </div>
      </div>

      <div class="status-bar"><span>Ready</span><span>Console: 0 errors</span></div>
    </div>
  `);

  const canvas = document.querySelector<HTMLCanvasElement>("#canvas")!;
  const demo = new PlatformerDemo(canvas, {
    jumpForce: 2,
    gravityScale: 26,
    groundCheckDistance: 0.03,
  });

  const resizeObserver = new ResizeObserver(() => demo.resize());
  resizeObserver.observe(canvas);

  const jf = document.querySelector<HTMLInputElement>("#jf")!;
  const gs = document.querySelector<HTMLInputElement>("#gs")!;
  const gc = document.querySelector<HTMLInputElement>("#gc")!;
  const status = document.querySelector<HTMLDivElement>("#status")!;
  const nextBtn = document.querySelector<HTMLButtonElement>("#next-btn")!;
  const consoleDrawer = document.querySelector<HTMLDivElement>("#console-drawer")!;
  const consoleOutput = document.querySelector<HTMLDivElement>("#console-output")!;
  const tabButtons = document.querySelectorAll<HTMLButtonElement>(".scene-tabs .tab-btn");

  const openConsole = () => {
    consoleDrawer.classList.add("open");
    tabButtons.forEach((btn) => btn.classList.toggle("active", btn.dataset.tab === "console"));
  };
  const closeConsole = () => {
    consoleDrawer.classList.remove("open");
    tabButtons.forEach((btn) => btn.classList.toggle("active", btn.dataset.tab === "scene"));
  };
  tabButtons.forEach((btn) =>
    btn.addEventListener("click", () => (btn.dataset.tab === "console" ? openConsole() : closeConsole()))
  );
  document.querySelector("#console-close")?.addEventListener("click", closeConsole);

  const syncParams = () => {
    demo.setParams({
      jumpForce: Number(jf.value) || 0,
      gravityScale: Number(gs.value) || 1,
      groundCheckDistance: Number(gc.value) || 0.02,
    });
  };
  [jf, gs, gc].forEach((el) => el.addEventListener("input", syncParams));
  syncParams();

  const messages: Record<PlayOutcome, (dip: number) => string> = {
    idle: () => "",
    "no-jump": () => "Ничего не произошло — Jump Force сейчас равен нулю, силе просто неоткуда взяться.",
    "too-weak": () => "Персонаж технически подпрыгнул, но это еле заметное дрожание — так не считается. Прибавь высоты.",
    "clipped-floor": (dip) =>
      `Персонаж провалился на ${dip}px ниже пола перед тем, как система это заметила — Ground Check Distance слишком маленький.`,
    "good-jump": () => "Похоже на нормальный прыжок! Можно идти дальше, либо ещё поэкспериментировать.",
  };

  demo.onOutcome = (outcome, meta) => {
    state.numbersAttempts += 1;
    const text = messages[outcome](meta.dip);
    const ok = outcome === "good-jump";

    status.textContent = text;
    status.className = "viewport-status " + (ok ? "ok" : outcome === "idle" ? "" : "warn");

    consoleOutput.innerHTML = `<div><span class="${ok ? "ok" : "warn"} final">${ok ? "[✓] " : "[!] "}${text}</span></div>`;
    openConsole();

    if (ok) nextBtn.disabled = false;
  };

  const runJump = () => {
    demo.reset();
    demo.tryJump();
  };

  // Оба Play — и в тулбаре, и в инспекторе — запускают одно и то же действие.
  document.querySelector("#play-btn")?.addEventListener("click", runJump);
  document.querySelector("#toolbar-play")?.addEventListener("click", runJump);

  // Пробел — та же команда, что и Play, чтобы не тянуться к кнопке каждый раз.
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.code === "Space") {
      e.preventDefault();
      closeConsole();
      runJump();
    }
  };
  window.addEventListener("keydown", onKeyDown);

  nextBtn.addEventListener("click", () => {
    window.removeEventListener("keydown", onKeyDown);
    renderCodeTask();
  });
  setupHints();
}