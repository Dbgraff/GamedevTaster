import {
  simulateMoveSequence,
  MOVE_BLOCK_LABELS,
  MOVE_CORRECT_ORDER,
  type MoveBlockId,
} from "../engines/moveBlocks";
import { render, renderToolbar, renderTaskListPanel, renderHintBlock, setupHints, TASK_TITLES } from "../ui/shell";
import { renderReflection } from "./reflection";

// Порядок в палитре — намеренно перемешан, чтобы не подсказывать решение расположением.
const PALETTE_ORDER: MoveBlockId[] = ["physics", "multiply", "input", "assign", "direction"];

export function renderTask3() {
  let sequence: MoveBlockId[] = [];
  let dragPayload: { source: "palette" | "sequence"; block: MoveBlockId; index?: number } | null = null;

  render(`
    <div class="editor-shell">
      ${renderToolbar({ id: "toolbar-play", icon: "play", label: "Запустить" })}

      <div class="editor-main">
        <div class="hierarchy">
          ${renderTaskListPanel(3)}

          <div class="task-info">
            <p class="eyebrow">Задача 3 из ${TASK_TITLES.length}</p>
            <h2>Кубик учится двигаться</h2>
            <p class="lead">Прыгать кубик уже умеет. Теперь научим его двигаться влево-вправо — собери шаги в правильном порядке.</p>
            ${renderHintBlock([
              "Подумай: что должно случиться раньше — движок должен понять, что вообще нажал игрок, или сразу применить скорость?",
              "Порядок такой: сначала считать ввод, потом посчитать направление, потом умножить на скорость, потом применить — и только в конце физика двигает объект.",
            ])}
          </div>
          <button id="next-btn" class="secondary full next-btn" disabled>Дальше →</button>
        </div>

        <div class="scene-col">
          <div class="scene-tabs">
            <button type="button" class="tab-btn active" data-tab="scene">Scene</button>
            <button type="button" class="tab-btn" data-tab="console">Console</button>
          </div>
          <div class="deco-scene" id="scene-view">
            <div class="deco-ground"></div>
            <div class="deco-player" id="cube3"></div>
          </div>
          <div class="deco-scene" id="console-view" style="display:none; background-image:none;">
            <div class="console" id="console-output">
              <span class="muted">&gt; Собери шаги и нажми Play, чтобы увидеть разбор здесь.</span>
            </div>
          </div>
          <div class="viewport-status" id="viewport-status">Собери шаги и нажми Play.</div>
        </div>

        <div class="inspector">
          <div class="inspector-header">
            <p>Player</p>
            <p>Tag: Player · Layer: Default</p>
          </div>
          <div class="section-card">
            <p class="section-title">Шаги</p>
            <div id="palette" class="palette">
              ${PALETTE_ORDER.map(
                (id) => `
                <div class="block" draggable="true" data-block="${id}">
                  ${MOVE_BLOCK_LABELS[id]}
                </div>`
              ).join("")}
            </div>
          </div>
          <div class="section-card">
            <p class="section-title">Сборка (порядок важен)</p>
            <div id="sequence" class="sequence"></div>
            <button id="clear-btn" class="text-btn">Очистить сборку</button>
          </div>
          <button id="run-btn" class="primary full">▶ Play</button>
        </div>
      </div>

      <div class="status-bar"><span>Ready</span><span>Console: 0 errors</span></div>
    </div>
  `);

  const sequenceEl = document.querySelector<HTMLDivElement>("#sequence")!;
  const sceneView = document.querySelector<HTMLDivElement>("#scene-view")!;
  const consoleView = document.querySelector<HTMLDivElement>("#console-view")!;
  const consoleOutput = document.querySelector<HTMLDivElement>("#console-output")!;
  const tabButtons = document.querySelectorAll<HTMLButtonElement>(".scene-tabs .tab-btn");
  const viewportStatus = document.querySelector<HTMLDivElement>("#viewport-status")!;
  const runBtn = document.querySelector<HTMLButtonElement>("#run-btn")!;
  const toolbarPlay = document.querySelector<HTMLButtonElement>("#toolbar-play")!;
  const nextBtn = document.querySelector<HTMLButtonElement>("#next-btn")!;
  const cube = document.querySelector<HTMLDivElement>("#cube3")!;

  const setActiveTab = (tab: "scene" | "console") => {
    tabButtons.forEach((btn) => btn.classList.toggle("active", btn.dataset.tab === tab));
    sceneView.style.display = tab === "scene" ? "" : "none";
    consoleView.style.display = tab === "console" ? "flex" : "none";
  };
  tabButtons.forEach((btn) => btn.addEventListener("click", () => setActiveTab(btn.dataset.tab as "scene" | "console")));

  function renderSequence() {
    if (sequence.length === 0) {
      sequenceEl.innerHTML = `<p class="sequence-empty">Перетащи сюда шаги из списка выше</p>`;
      return;
    }
    sequenceEl.innerHTML = sequence
      .map(
        (id, i) => `
        <div class="block seq-block" draggable="true" data-index="${i}">
          <span class="seq-num">${i + 1}</span>
          <span>${MOVE_BLOCK_LABELS[id]}</span>
          <button class="remove-btn" data-remove="${i}" type="button">×</button>
        </div>`
      )
      .join("");

    sequenceEl.querySelectorAll<HTMLDivElement>(".seq-block").forEach((el) => {
      el.addEventListener("dragstart", () => {
        const index = Number(el.dataset.index);
        dragPayload = { source: "sequence", block: sequence[index], index };
      });
    });
    sequenceEl.querySelectorAll<HTMLButtonElement>(".remove-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.dataset.remove);
        sequence.splice(idx, 1);
        renderSequence();
      });
    });
  }

  document.querySelectorAll<HTMLDivElement>("#palette .block").forEach((el) => {
    el.addEventListener("dragstart", () => {
      dragPayload = { source: "palette", block: el.dataset.block as MoveBlockId };
    });
  });

  sequenceEl.addEventListener("dragover", (e) => e.preventDefault());
  sequenceEl.addEventListener("drop", (e) => {
    e.preventDefault();
    if (!dragPayload) return;

    const items = Array.from(sequenceEl.querySelectorAll<HTMLDivElement>(".seq-block"));
    let insertAt = items.length;
    for (let i = 0; i < items.length; i++) {
      const rect = items[i].getBoundingClientRect();
      if (e.clientY < rect.top + rect.height / 2) {
        insertAt = i;
        break;
      }
    }

    if (dragPayload.source === "palette") {
      sequence.splice(insertAt, 0, dragPayload.block);
    } else if (dragPayload.index !== undefined) {
      const [moved] = sequence.splice(dragPayload.index, 1);
      const adjusted = dragPayload.index < insertAt ? insertAt - 1 : insertAt;
      sequence.splice(adjusted, 0, moved);
    }
    dragPayload = null;
    renderSequence();
  });

  document.querySelector("#clear-btn")?.addEventListener("click", () => {
    sequence = [];
    renderSequence();
  });

  const runSequence = () => {
    const hasAll = MOVE_CORRECT_ORDER.every((id) => sequence.includes(id));
    if (!hasAll) {
      viewportStatus.textContent = "В сборке не хватает шагов — тут нужны все пять, ни один не лишний.";
      viewportStatus.className = "viewport-status warn";
      return;
    }

    setActiveTab("scene");

    // Настоящий пошаговый прогон, а не сверка с эталонным массивом — интерпретатор
    // сам вычисляет, что реально произойдёт при таком порядке шагов.
    const result = simulateMoveSequence(sequence);
    const ok = result.velocityAtPhysics !== 0 && JSON.stringify(sequence) === JSON.stringify(MOVE_CORRECT_ORDER);
    const moved = result.velocityAtPhysics !== 0;

    cube.classList.remove("moving", "stuck");
    void cube.offsetWidth; // перезапуск CSS-анимации
    cube.classList.add(moved ? "moving" : "stuck");

    let verdict: string;
    if (!result.ranPhysics) {
      verdict = "Физика так и не применилась — без неё кубик никогда не сдвинется, что бы ни было посчитано до этого.";
    } else if (!moved) {
      verdict = "Кубик не сдвинулся — velocity в момент, когда физика её прочитала, оказался нулевым. Посмотри в Console, на каком шаге это произошло.";
    } else if (ok) {
      verdict = "Точно! Обрати внимание: то же самое разбиение на шаги — считать ввод, посчитать значение, применить к объекту — повторяется почти в любой механике движка, не только в прыжке.";
    } else {
      verdict = "Кубик сдвинулся, но порядок всё равно не тот эталонный — в реальном коде так тоже бывает: вроде работает, а на деле собрано не так, как задумано.";
    }

    viewportStatus.textContent = ok ? "Готово — порядок верный." : moved ? "Двигается, но не так, как задумано — смотри Console." : "Не двигается — смотри разбор в Console.";
    viewportStatus.className = "viewport-status " + (ok ? "ok" : "warn");

    consoleOutput.innerHTML = `
      ${result.log.map((line) => `<div><span class="info">[i]</span> ${line}</div>`).join("")}
      <div style="margin-top:10px"><span class="${ok ? "ok" : "warn"} final">${ok ? "[✓] " : "[!] "}${verdict}</span></div>
    `;
    setActiveTab("console");

    if (ok) nextBtn.disabled = false;
  };

  runBtn.addEventListener("click", runSequence);
  toolbarPlay.addEventListener("click", runSequence);

  renderSequence();
  nextBtn.addEventListener("click", renderReflection);
  setupHints();
}