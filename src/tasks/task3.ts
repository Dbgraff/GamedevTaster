import {
  simulateMoveSequence,
  MOVE_BLOCK_LABELS,
  MOVE_CORRECT_ORDER,
  type MoveBlockId,
} from "../engines/moveBlocks";
import {
  render,
  renderTaskListPanel,
  renderMobileHeader,
  renderResizeHandle,
  renderHintBlock,
  renderNextButton,
  setupHints,
  setupNextButtons,
  TASK_TITLES,
} from "../ui/shell";
import { setupSequenceBuilder } from "../ui/sequenceBuilder";
import { renderConsoleDrawer, setupConsole } from "../ui/console";
import { renderReflection } from "./reflection";

// Порядок в палитре — намеренно перемешан, чтобы не подсказывать решение расположением.
const PALETTE_ORDER: MoveBlockId[] = ["physics", "multiply", "input", "assign", "direction"];

export function renderTask3() {
  render(`
    <div class="editor-shell">
      <div class="editor-main">
        ${renderMobileHeader(3)}

        <div class="hierarchy">
          ${renderTaskListPanel(3)}

          <div class="task-info">
            <p class="eyebrow">Задача 3 из ${TASK_TITLES.length}</p>
            <h2>Кубик учится двигаться</h2>
            <p class="lead">Прыгать кубик уже умеет. Теперь научим его двигаться влево-вправо — собери шаги в правильном порядке и нажми Play.</p>
            <p class="lead keyboard-hint">🎮 Управление: стрелки или A/D — движение (заработает после Play), пробел — прыжок (работает сразу, независимо от сборки).</p>
            ${renderHintBlock([
              "Подумай: что должно случиться раньше — движок должен понять, что вообще нажал игрок, или сразу применить скорость?",
              "Порядок такой: сначала считать ввод, потом посчитать направление, потом умножить на скорость, потом применить — и только в конце физика двигает объект.",
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
            <div class="deco-scene" id="scene-view">
              <div class="deco-ground"></div>
              <div class="deco-player" id="cube3"></div>
            </div>
            ${renderConsoleDrawer()}
          </div>
          <div class="viewport-status" id="viewport-status">Собери шаги и нажми Play.</div>
        </div>

        ${renderResizeHandle("right")}

        <div class="inspector">
          <div class="inspector-header">
            <p>Player</p>
            <p>Tag: Player · Layer: Default</p>
          </div>
          <div class="section-card">
            <p class="section-title">Шаги</p>
            <div id="palette" class="palette">
              ${PALETTE_ORDER.map(
                (id) => `<div class="block" draggable="true" data-block="${id}">${MOVE_BLOCK_LABELS[id]}</div>`
              ).join("")}
            </div>
          </div>
          <div class="section-card">
            <p class="section-title">Сборка (порядок важен)</p>
            <div id="sequence" class="sequence"></div>
            <button id="clear-btn" class="text-btn">Очистить сборку</button>
          </div>
          <div class="action-bar">
            <button id="run-btn" class="primary full">▶ Play</button>
            ${renderNextButton()}
          </div>
        </div>
      </div>
    </div>
  `);

  const viewportStatus = document.querySelector<HTMLDivElement>("#viewport-status")!;
  const runBtn = document.querySelector<HTMLButtonElement>("#run-btn")!;
  const cube = document.querySelector<HTMLDivElement>("#cube3")!;

  const builder = setupSequenceBuilder<MoveBlockId>({
    labels: MOVE_BLOCK_LABELS,
    emptyText: `<span class="only-desktop">Перетащи сюда шаги из списка выше (или кликни по шагу)</span><span class="only-mobile">Нажимай на шаги выше — они встанут сюда по порядку</span>`,
  });

  const consoleUi = setupConsole();

  // ---------- Ручное управление (только с физической клавиатуры) ----------
  // Прыжок работает всегда, независимо от сборки — кубик "уже умеет" это с задачи 1.
  // Движение разблокируется только после первого Play и честно воспроизводит баг:
  // если сборка не работает, стрелки просто не двигают кубик — как в автопрогоне.
  let controlsUnlocked = false;
  let animating = false;
  let posX = 50; // % от ширины сцены
  const heldKeys = new Set<"left" | "right">();
  let lastControlTime = 0;
  let isJumping = false;
  const JUMP_MS = 500; // должно совпадать с длительностью .deco-player.jumping в CSS

  // A/D определяем по физическому коду клавиши (KeyA/KeyD), а не по e.key —
  // иначе при включённой русской раскладке (ф/в вместо a/d) движение не сработает.
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.code === "Space") {
      e.preventDefault();
      if (!isJumping) {
        isJumping = true;
        cube.classList.remove("jumping");
        void cube.offsetWidth;
        cube.classList.add("jumping");
        window.setTimeout(() => {
          isJumping = false;
        }, JUMP_MS);
      }
      return;
    }
    if (!controlsUnlocked) return;
    if (e.key === "ArrowLeft" || e.code === "KeyA") heldKeys.add("left");
    if (e.key === "ArrowRight" || e.code === "KeyD") heldKeys.add("right");
  };
  const onKeyUp = (e: KeyboardEvent) => {
    if (e.key === "ArrowLeft" || e.code === "KeyA") heldKeys.delete("left");
    if (e.key === "ArrowRight" || e.code === "KeyD") heldKeys.delete("right");
  };
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);

  const controlLoop = (time: number) => {
    const dt = Math.min((time - lastControlTime) / 1000, 0.05);
    lastControlTime = time;
    if (controlsUnlocked && !animating && heldKeys.size > 0) {
      // Пересчитываем прямо здесь и сейчас — если игрок поменял блоки местами,
      // это сразу отражается на том, реагирует кубик на стрелки или нет.
      const worksNow = simulateMoveSequence(builder.get()).velocityAtPhysics !== 0;
      if (worksNow) {
        const speed = 45; // %/сек
        if (heldKeys.has("left")) posX -= speed * dt;
        if (heldKeys.has("right")) posX += speed * dt;
        posX = Math.max(6, Math.min(94, posX));
        cube.style.left = `${posX}%`;
      }
    }
    controlLoopId = requestAnimationFrame(controlLoop);
  };
  let controlLoopId = requestAnimationFrame(controlLoop);

  const next = setupNextButtons(() => {
    cancelAnimationFrame(controlLoopId);
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
    renderReflection();
  });

  const runSequence = () => {
    const sequence = builder.get();
    const hasAll = MOVE_CORRECT_ORDER.every((id) => sequence.includes(id));
    if (!hasAll) {
      viewportStatus.textContent = "В сборке не хватает шагов — тут нужны все пять, ни один не лишний.";
      viewportStatus.className = "viewport-status warn";
      return;
    }

    consoleUi.close(); // чтобы было видно, что сделает кубик

    // Настоящий пошаговый прогон, а не сверка с эталонным массивом — интерпретатор
    // сам вычисляет, что реально произойдёт при таком порядке шагов.
    const result = simulateMoveSequence(sequence);
    const ok = result.velocityAtPhysics !== 0 && JSON.stringify(sequence) === JSON.stringify(MOVE_CORRECT_ORDER);
    const moved = result.velocityAtPhysics !== 0;

    animating = true;
    heldKeys.clear();
    cube.style.left = "";
    posX = 50;
    cube.classList.remove("moving", "stuck");
    void cube.offsetWidth; // перезапуск CSS-анимации
    cube.classList.add(moved ? "moving" : "stuck");

    let verdict: string;
    if (!result.ranPhysics) {
      verdict = "Физика так и не применилась — без неё кубик никогда не сдвинется, что бы ни было посчитано до этого.";
    } else if (!moved) {
      verdict = "Кубик не сдвинулся — velocity в момент, когда физика её прочитала, оказался нулевым.";
    } else if (ok) {
      verdict = "Точно! Обрати внимание: то же самое разбиение на шаги — считать ввод, посчитать значение, применить к объекту — повторяется почти в любой механике движка, не только в прыжке.";
    } else {
      verdict = "Кубик сдвинулся, но порядок всё равно не тот эталонный — в реальном коде так тоже бывает: вроде работает, а на деле собрано не так, как задумано.";
    }

    const entry = {
      ok,
      text: verdict,
      meta: `шагов в сборке: ${sequence.length}`,
      details: `
        <div style="margin-top:10px"><span class="muted">// что реально выполнилось по шагам</span></div>
        ${result.log.map((line) => `<div><span class="info">[i]</span> ${line}</div>`).join("")}
      `,
    };

    const animationMs = moved ? 1800 : 400;
    window.setTimeout(() => {
      animating = false;
      cube.classList.remove("moving", "stuck");
      controlsUnlocked = true;
      consoleUi.push(entry);

      viewportStatus.innerHTML = ok
        ? `Готово — порядок верный.<span class="only-desktop">&nbsp;Можешь ещё погонять кубик стрелками.</span>`
        : moved
        ? `Двигается, но не так, как задумано.<span class="only-desktop">&nbsp;Попробуй стрелками — баг проявится и вручную.</span>`
        : `Не двигается — открой разбор в Console.<span class="only-desktop">&nbsp;Стрелки честно повторят тот же результат.</span>`;
      viewportStatus.className = "viewport-status " + (ok ? "ok" : "warn");

      if (ok) next.enable();
    }, animationMs);
  };

  runBtn.addEventListener("click", runSequence);
  setupHints();
}