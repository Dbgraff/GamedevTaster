import { PlatformerDemo, type PlayOutcome } from "../engines/platformerDemo";
import {
  render,
  renderTaskListPanel,
  renderMobileHeader,
  renderResizeHandle,
  renderHintBlock,
  renderNextButton,
  setupHints,
  setupNextButtons,
  showIntroModal,
  isModalOpen,
  TASK_TITLES,
} from "../ui/shell";
import { renderConsoleDrawer, setupConsole } from "../ui/console";
import { state } from "../state";
import { renderCodeTask } from "./task2";

// withIntro — показать приветственную модалку поверх задания
// (при первом заходе в приложение и после "Пройти пробу заново").
export function renderNumbersTask(opts: { withIntro?: boolean } = {}) {
  render(`
    <div class="editor-shell">
      <div class="editor-main">
        ${renderMobileHeader(1)}

        <div class="hierarchy">
          ${renderTaskListPanel(1)}

          <div class="task-info">
            <p class="eyebrow">Задача 1 из ${TASK_TITLES.length}</p>
            <h2>Почини прыжок цифрами</h2>
            <p class="lead">Персонаж не прыгает как надо. Подбери параметры <span class="only-desktop">справа</span><span class="only-mobile">ниже</span> так, чтобы прыжок выглядел естественно.</p>
            <p class="lead keyboard-hint">🎮 Прыжок работает и на пробел — попробуй нажать и посмотреть, что будет.</p>
            ${renderHintBlock([
              "Подумай: сможет ли персонаж вообще оторваться от земли, если сила прыжка почти нулевая?",
              "Подними Jump Force и опусти Gravity Scale, чтобы добиться заметной высоты — а потом подними Ground Check Distance, если персонаж проваливается под пол.",
            ])}
          </div>
          ${renderNextButton()}
        </div>

        ${renderResizeHandle("left")}

        <div class="scene-col">
          <div class="scene-tabs">
            <button type="button" class="tab-btn active" data-tab="scene">Scene</button>
            <button type="button" class="tab-btn" data-tab="console">Console</button>
          </div>
          <div class="viewport-stage">
            <div class="viewport" id="scene-view">
              <canvas id="canvas"></canvas>
            </div>
            ${renderConsoleDrawer()}
          </div>
          <div class="viewport-status" id="status">Готово к запуску.</div>
        </div>

        ${renderResizeHandle("right")}

        <div class="inspector">
          <div class="inspector-header">
            <p>Player</p>
            <p>Tag: Player · Layer: Default</p>
          </div>
          <div class="section-card">
            <p class="section-title">PlayerController (Script)</p>
            <div class="field-row">
              <label for="jf">Jump Force</label>
              <input id="jf" type="number" inputmode="numeric" min="0" max="15" step="1" value="2" />
            </div>
            <div class="field-row">
              <label for="gs">Gravity Scale</label>
              <input id="gs" type="number" inputmode="numeric" min="1" max="30" step="1" value="26" />
            </div>
            <div class="field-row">
              <label for="gc">Ground Check Distance</label>
              <input id="gc" type="number" inputmode="decimal" min="0.02" max="0.30" step="0.01" value="0.03" />
            </div>
          </div>
          <div class="action-bar">
            <button id="play-btn" class="primary full">▶ Play</button>
            ${renderNextButton()}
          </div>
        </div>
      </div>
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
  const consoleUi = setupConsole();

  // valueAsNumber — основной путь; запасной разбор с заменой запятой нужен
  // для iPhone с русской клавиатурой, где в десятичное поле вводится "0,05".
  const readNum = (el: HTMLInputElement, fallback: number) => {
    const v = Number.isFinite(el.valueAsNumber) ? el.valueAsNumber : parseFloat(el.value.replace(",", "."));
    return Number.isFinite(v) && v !== 0 ? v : fallback;
  };
  const syncParams = () => {
    demo.setParams({
      jumpForce: readNum(jf, 0),
      gravityScale: readNum(gs, 1),
      groundCheckDistance: readNum(gc, 0.02),
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

  const next = setupNextButtons(() => {
    window.removeEventListener("keydown", onKeyDown);
    renderCodeTask();
  });

  demo.onOutcome = (outcome, meta) => {
    state.numbersAttempts += 1;
    const text = messages[outcome](meta.dip);
    const ok = outcome === "good-jump";

    status.textContent = text;
    status.className = "viewport-status " + (ok ? "ok" : outcome === "idle" ? "" : "warn");

    const p = demo.getParams();
    consoleUi.push({
      ok,
      text,
      meta: `Jump Force ${p.jumpForce} · Gravity ${p.gravityScale} · Ground Check ${p.groundCheckDistance}`,
    });

    if (ok) next.enable();
  };

  const runJump = () => {
    // консоль перекрывает низ сцены, где стоит кубик — на время прыжка прячем её
    consoleUi.close();
    demo.reset();
    demo.tryJump();
  };

  document.querySelector("#play-btn")?.addEventListener("click", runJump);

  // Пробел — та же команда, что и Play, чтобы не тянуться к кнопке каждый раз.
  // На мобильном физической клавиатуры обычно нет, так что это чисто
  // десктопное удобство — на экране для него есть отдельная подсказка.
  const onKeyDown = (e: KeyboardEvent) => {
    // Пока открыта приветственная модалка, пробел принадлежит ей (жмёт "Начать"),
    // а не сцене под ней.
    if (isModalOpen()) return;
    if (e.code === "Space") {
      e.preventDefault();
      runJump();
    }
  };
  window.addEventListener("keydown", onKeyDown);

  setupHints();

  if (opts.withIntro) showIntroModal();
}