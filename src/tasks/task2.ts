import { BlockJumpSimulator, referencePeakHeight, type BlockId } from "../engines/jumpBlocks";
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
import { state } from "../state";
import { renderTask3 } from "./task3";

const BLOCK_DEFS: Record<BlockId, { label: string; code: string }> = {
  "check-grounded": {
    label: "Проверить, стоит ли персонаж на земле",
    code: "if (isGrounded) { … }",
  },
  "reset-velocity": {
    label: "Сбросить скорость по Y",
    code: "rb.velocity = new Vector2(rb.velocity.x, 0);",
  },
  "declare-jump-var": {
    label: "Создать переменную force = 20",
    code: "float force = 20f;",
  },
  "log-jump": {
    label: "Написать в консоль «Прыжок!»",
    code: 'Debug.Log("Прыжок!");',
  },
  "apply-force": {
    label: "Приложить силу вверх",
    code: "rb.AddForce(Vector2.up * jumpForce);",
  },
  wait: {
    label: "Подождать 0.3 сек",
    code: "yield return new WaitForSeconds(0.3f);",
  },
  "repeat-3x": {
    label: "Повторить следующий блок 3 раза",
    code: "for (int i = 0; i < 3; i++) { … }",
  },
};

const BLOCK_LABELS = Object.fromEntries(
  (Object.keys(BLOCK_DEFS) as BlockId[]).map((id) => [id, BLOCK_DEFS[id].label])
) as Record<BlockId, string>;

export function renderCodeTask() {
  render(`
    <div class="editor-shell">
      <div class="editor-main">
        ${renderMobileHeader(2)}

        <div class="hierarchy">
          ${renderTaskListPanel(2)}

          <div class="task-info">
            <p class="eyebrow">Задача 2 из ${TASK_TITLES.length}</p>
            <h2>Собери прыжок из блоков кода</h2>
            <p class="lead"><span class="only-desktop">Перетащи блоки в область сборки (или просто кликни по ним)</span><span class="only-mobile">Нажимай на блоки — они встанут в сборку, порядок меняй стрелками ↑↓</span>. Затем жми Play — проверим сборку дважды: с ровного места и сразу после падения.</p>
            ${renderHintBlock([
              "Подумай, в каком порядке реально происходят вещи: сначала нужно избавиться от старой скорости, а уже потом добавлять новую.",
              "«Сбросить скорость по Y» должен стоять ПЕРЕД «Приложить силу вверх» — иначе новая сила просто сложится со старой скоростью.",
            ])}
          </div>
          ${renderNextButton()}
        </div>

        ${renderResizeHandle("left")}

        <div class="scene-col">
          <div class="scene-tabs">
            <button type="button" class="tab-btn active" data-tab="game">Game</button>
            <button type="button" class="tab-btn" data-tab="console">Console</button>
          </div>
          <div class="viewport-stage">
            <div class="viewport" id="game-view">
              <canvas id="canvas"></canvas>
            </div>
            ${renderConsoleDrawer()}
          </div>
          <div class="viewport-status" id="viewport-status">Собери блоки и нажми Play.</div>
        </div>

        ${renderResizeHandle("right")}

        <div class="inspector">
          <div class="inspector-header">
            <p>Player</p>
            <p>Tag: Player · Layer: Default</p>
          </div>
          <div class="section-card">
            <p class="section-title">Блоки</p>
            <div id="palette" class="palette">
              ${(Object.keys(BLOCK_DEFS) as BlockId[])
                .map((id) => `<div class="block" draggable="true" data-block="${id}">${BLOCK_DEFS[id].label}</div>`)
                .join("")}
            </div>
          </div>
          <div class="section-card">
            <p class="section-title">Сборка (порядок важен)</p>
            <div class="frame-label">void Update() — каждый кадр</div>
            <div class="frame-label frame-label--nested">если пробел нажат и персонаж на земле</div>
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

  const canvas = document.querySelector<HTMLCanvasElement>("#canvas")!;
  const simulator = new BlockJumpSimulator(canvas);
  const resizeObserver = new ResizeObserver(() => simulator.resize());
  resizeObserver.observe(canvas);
  const runBtn = document.querySelector<HTMLButtonElement>("#run-btn")!;
  const viewportStatus = document.querySelector<HTMLDivElement>("#viewport-status")!;
  const next = setupNextButtons(renderTask3);

  const builder = setupSequenceBuilder<BlockId>({
    labels: BLOCK_LABELS,
    emptyText: `<span class="only-desktop">Перетащи сюда блоки из списка выше (или кликни по блоку)</span><span class="only-mobile">Нажимай на блоки выше — они встанут сюда по порядку</span>`,
  });

  const consoleUi = setupConsole();

  const runSequence = async () => {
    const sequence = builder.get();
    if (sequence.length === 0) {
      viewportStatus.textContent = "Сначала собери хотя бы один блок.";
      viewportStatus.className = "viewport-status warn";
      return;
    }
    runBtn.disabled = true;
    viewportStatus.textContent = "Запускаю проверку…";
    viewportStatus.className = "viewport-status";
    consoleUi.close(); // чтобы были видны оба прыжка

    const logs1: string[] = [];
    const logs2: string[] = [];

    const trial1 = await simulator.runTrial(sequence, 0, 8, 15, (line) => logs1.push(line));
    await new Promise((r) => setTimeout(r, 250));
    const trial2 = await simulator.runTrial(sequence, 180, 8, 15, (line) => logs2.push(line)); // как будто персонаж только что падал

    runBtn.disabled = false;

    const maxH = Math.max(trial1.peakHeight, trial2.peakHeight, 1);
    const bar = (h: number) => Math.min(100, Math.round((h / maxH) * 100));
    // Эталон считаем напрямую по формуле, без анимации — иначе на канвасе
    // проигрывался бы третий, никак не объяснённый прыжок.
    const refPeak = Math.max(referencePeakHeight(8, 15), 1);
    const tooHigh = trial1.peakHeight > refPeak * 1.6 || trial2.peakHeight > refPeak * 1.6;

    const forceIndex = sequence.indexOf("apply-force");
    const resetIndex = sequence.indexOf("reset-velocity");
    const forceGetsCancelled = forceIndex !== -1 && resetIndex !== -1 && resetIndex > forceIndex;
    const missingForce = forceIndex === -1;

    let verdict: string;
    let ok: boolean;
    if (!trial1.didJump && !trial2.didJump) {
      if (forceGetsCancelled) {
        verdict = "Оба нужных блока есть, но «Сбросить скорость по Y» стоит ПОСЛЕ «Приложить силу вверх» — и полностью гасит то, что ты только что применил. Поменяй их местами.";
      } else if (missingForce) {
        verdict = "Персонаж вообще не прыгает — в сборке нет блока «Приложить силу вверх», прыгать просто нечем.";
      } else {
        verdict = "Персонаж вообще не прыгает — проверь, что «Приложить силу вверх» вообще есть в сборке и ничего не гасит его после.";
      }
      ok = false;
    } else if (trial1.didJump && !trial2.didJump) {
      verdict = "Первый прыжок сработал, а второй — нет! Если персонаж уже падал, сила добавляется к остаточной скорости — без сброса результат непредсказуем.";
      ok = false;
    } else if (tooHigh) {
      verdict = "Прыжок подозрительно высокий по сравнению с эталоном — похоже, «Приложить силу вверх» выполняется несколько раз за одно нажатие (например, из-за «Повторить»). Update() и так уже крутится каждый кадр сам — оборачивать разовое действие в ещё один цикл не нужно.";
      ok = false;
    } else {
      const diff = Math.abs(trial1.peakHeight - trial2.peakHeight);
      if (diff > 8) {
        verdict = `Прыжки разной высоты (${trial1.peakHeight}px и ${trial2.peakHeight}px) — классический баг: сила прыжка складывается с той скоростью, что уже была у персонажа.`;
        ok = false;
      } else {
        verdict = "Оба прыжка одинаковой высоты, независимо от того, падал ли персонаж до этого — правильная последовательность!";
        ok = true;
        next.enable();
      }
    }

    if (!ok) state.codeAttempts += 1;

    viewportStatus.textContent = ok
      ? "Готово — последовательность стабильна. Разбор — во вкладке Console."
      : "Есть баг — открой Console, чтобы понять почему.";
    viewportStatus.className = "viewport-status " + (ok ? "ok" : "warn");

    const logLines = (label: string, lines: string[]) =>
      lines.length
        ? `<div style="margin-top:8px"><span class="muted">// ${label}</span></div>` +
          lines.map((l) => `<div><span class="info">[i]</span> ${l}</div>`).join("")
        : "";

    consoleUi.push({
      ok,
      text: verdict,
      meta: `блоков в сборке: ${sequence.length}`,
      details: `
        <div class="muted" style="margin-top:8px">// сборка: ${sequence.map((id, i) => `${i + 1}. ${BLOCK_LABELS[id]}`).join(" → ")}</div>
        <div class="trial-bars" style="margin: 14px 0;">
          <div class="trial-bar">
            <div class="bar-track"><div class="bar-fill" style="height:${bar(trial1.peakHeight)}%"></div></div>
            <span>Прыжок 1</span>
          </div>
          <div class="trial-bar">
            <div class="bar-track"><div class="bar-fill" style="height:${bar(trial2.peakHeight)}%"></div></div>
            <span>Прыжок 2</span>
          </div>
        </div>
        <div><span class="muted">&gt;</span> Прыжок 1 (с пола): пик ${trial1.peakHeight}px${trial1.didJump ? "" : " — прыжка не было"}</div>
        ${logLines("что реально выполнилось", logs1)}
        <div style="margin-top:10px"><span class="muted">&gt;</span> Прыжок 2 (после падения): пик ${trial2.peakHeight}px${trial2.didJump ? "" : " — прыжка не было"}</div>
        ${logLines("что реально выполнилось", logs2)}
      `,
    });
  };

  runBtn.addEventListener("click", runSequence);
  setupHints();
}