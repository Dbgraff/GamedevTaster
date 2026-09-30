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
            ${renderHintBlock([
              "Подумай: сможет ли персонаж вообще оторваться от земли, если сила прыжка почти нулевая?",
              "Подними Jump Force и опусти Gravity Scale, чтобы добиться заметной высоты — а потом подними Ground Check Distance, если персонаж проваливается под пол.",
            ])}
          </div>
          <button id="next-btn" class="secondary full next-btn" disabled>Дальше →</button>
        </div>

        <div class="scene-col">
          <div class="scene-tabs">
            <button type="button" class="tab-btn active">Scene</button>
            <button type="button" class="tab-btn">Game</button>
          </div>
          <div class="viewport">
            <canvas id="canvas"></canvas>
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
    status.textContent = messages[outcome](meta.dip);
    status.className = "viewport-status " + (outcome === "good-jump" ? "ok" : outcome === "idle" ? "" : "warn");
    if (outcome === "good-jump") nextBtn.disabled = false;
  };

  const runJump = () => {
    demo.reset();
    demo.tryJump();
  };

  // Оба Play — и в тулбаре, и в инспекторе — запускают одно и то же действие.
  document.querySelector("#play-btn")?.addEventListener("click", runJump);
  document.querySelector("#toolbar-play")?.addEventListener("click", runJump);

  nextBtn.addEventListener("click", renderCodeTask);
  setupHints();
}