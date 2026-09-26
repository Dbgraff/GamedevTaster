import "./style.css";
import { PlatformerDemo, BlockJumpSimulator, type PlayOutcome, type BlockId } from "./game";
import { getFeedback, type SessionState } from "./feedback";

const app = document.querySelector<HTMLDivElement>("#app")!;

const state: SessionState = {
  numbersAttempts: 0,
  codeAttempts: 0,
  reflection: {
    moreInteresting: "numbers",
    hardestPart: "neither",
    wantedWhy: false,
  },
};

function render(html: string) {
  app.innerHTML = html;
}

// ---------- Экран 0: интро ----------
function renderIntro() {
  render(`
    <div class="editor-shell">
      <div class="toolbar">
        <div class="menu-group">
          <span class="menu-label">File</span>
          <span class="menu-label">Edit</span>
          <span class="menu-label">Assets</span>
          <span class="menu-label">GameObject</span>
          <span class="menu-label">Component</span>
        </div>
        <div class="transport-group">
          <button type="button" class="transport-btn" aria-label="Шаг назад" disabled>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 19V5l-9 7 9 7z"/><path d="M20 19V5l-9 7 9 7z"/></svg>
          </button>
          <button type="button" id="toolbar-play" class="transport-btn play" aria-label="Начать">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
          </button>
          <button type="button" class="transport-btn" aria-label="Пауза" disabled>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/></svg>
          </button>
        </div>
        <div class="toolbar-spacer"></div>
      </div>

      <div class="editor-main">
        <div class="hierarchy">
          <p class="section-title" style="margin-bottom:12px">Hierarchy</p>
          <div class="hierarchy-item"><span class="hierarchy-dot"></span>Main Camera</div>
          <div class="hierarchy-item"><span class="hierarchy-dot"></span>Directional Light</div>
          <div class="hierarchy-item"><span class="hierarchy-dot"></span>Ground</div>
          <div class="hierarchy-item selected"><span class="hierarchy-dot"></span>Player</div>
        </div>

        <div class="scene-col">
          <div class="scene-tabs">
            <button type="button" class="tab-btn active">Scene</button>
            <button type="button" class="tab-btn">Game</button>
          </div>
          <div class="deco-scene">
            <div class="deco-ground"></div>
            <div class="deco-player"></div>
            <div class="hero-overlay">
              <div class="hero-card">
                <p class="eyebrow">Попробуй профессию · 20 минут</p>
                <h1>Почему персонаж не прыгает?</h1>
                <p class="lead">Сейчас ты на 20 минут станешь программистом в геймдеве. Никакой теории — сразу разберёмся с живой проблемой, с которой сталкивается почти каждый разработчик игр.</p>
                <button id="hero-start-btn" class="primary">▶ Начать</button>
              </div>
            </div>
          </div>
          <div class="viewport-status">Готово к запуску.</div>
        </div>

        <div class="inspector">
          <div class="inspector-header">
            <p>Player</p>
            <p>Tag: Player · Layer: Default</p>
          </div>
          <div class="section-card">
            <p class="section-title">О пробе</p>
            <div class="info-row"><span class="info-dot"></span>2 коротких задачи</div>
            <div class="info-row"><span class="info-dot"></span>~20 минут целиком</div>
            <div class="info-row"><span class="info-dot"></span>Персональный разбор в конце</div>
          </div>
          <button id="inspector-start-btn" class="primary full">▶ Начать</button>
        </div>
      </div>

      <div class="status-bar"><span>Ready</span><span>Console: 0 errors</span></div>
    </div>
  `);

  // Все три Play — тулбар, кнопка поверх сцены и в инспекторе — стартуют одно и то же.
  document.querySelector("#toolbar-play")?.addEventListener("click", renderNumbersTask);
  document.querySelector("#hero-start-btn")?.addEventListener("click", renderNumbersTask);
  document.querySelector("#inspector-start-btn")?.addEventListener("click", renderNumbersTask);
}

// ---------- Экран 1: задача с числами (рабочая среда: задача + вьюпорт) ----------
function renderNumbersTask() {
  render(`
    <div class="editor-shell">
      <div class="toolbar">
        <div class="menu-group">
          <span class="menu-label">File</span>
          <span class="menu-label">Edit</span>
          <span class="menu-label">Assets</span>
          <span class="menu-label">GameObject</span>
          <span class="menu-label">Component</span>
        </div>
        <div class="transport-group">
          <button type="button" class="transport-btn" aria-label="Шаг назад" disabled>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 19V5l-9 7 9 7z"/><path d="M20 19V5l-9 7 9 7z"/></svg>
          </button>
          <button type="button" id="toolbar-play" class="transport-btn play" aria-label="Запустить">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
          </button>
          <button type="button" class="transport-btn" aria-label="Пауза" disabled>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/></svg>
          </button>
        </div>
        <div class="toolbar-spacer"></div>
      </div>

      <div class="task-banner">
        <div>
          <p class="eyebrow">Задача 1 из 2</p>
          <h2>Почини прыжок цифрами</h2>
          <p class="lead">Персонаж не прыгает как надо. Подбери параметры справа так, чтобы прыжок выглядел естественно.</p>
        </div>
        <button id="next-btn" class="secondary" disabled>Дальше →</button>
      </div>

      <div class="editor-main">
        <div class="hierarchy">
          <p class="section-title" style="margin-bottom:12px">Hierarchy</p>
          <div class="hierarchy-item"><span class="hierarchy-dot"></span>Main Camera</div>
          <div class="hierarchy-item"><span class="hierarchy-dot"></span>Directional Light</div>
          <div class="hierarchy-item"><span class="hierarchy-dot"></span>Ground</div>
          <div class="hierarchy-item selected"><span class="hierarchy-dot"></span>Player</div>
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
              <input id="jf" type="number" min="0" max="15" step="1" value="0" />
            </div>
            <div class="field-row">
              <label for="gs">Gravity Scale</label>
              <input id="gs" type="number" min="1" max="30" step="1" value="15" />
            </div>
            <div class="field-row">
              <label for="gc">Ground Check Distance</label>
              <input id="gc" type="number" min="0.02" max="0.30" step="0.01" value="0.10" />
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
    jumpForce: 0,
    gravityScale: 15,
    groundCheckDistance: 0.1,
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
    "clipped-floor": (dip) =>
      `Персонаж провалился на ${dip}px ниже пола перед тем, как система это заметила — Ground Check Distance слишком маленький.`,
    "good-jump": () => "Похоже на нормальный прыжок! Можно идти дальше, либо ещё поэкспериментировать.",
  };

  demo.onOutcome = (outcome, meta) => {
    state.numbersAttempts += 1;
    status.textContent = messages[outcome](meta.dip);
    status.className = "viewport-status " + (outcome === "good-jump" ? "ok" : outcome === "no-jump" || outcome === "clipped-floor" ? "warn" : "");
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
}

// ---------- Экран 2: задача с блоками кода ----------
const BLOCK_DEFS: Record<BlockId, { label: string; code: string }> = {
  "reset-velocity": {
    label: "Сбросить скорость по Y",
    code: "rb.velocity = new Vector2(rb.velocity.x, 0);",
  },
  "apply-force": {
    label: "Приложить силу вверх",
    code: "rb.AddForce(Vector2.up * jumpForce);",
  },
  wait: {
    label: "Подождать 0.3 сек",
    code: "yield return new WaitForSeconds(0.3f);",
  },
};

function renderCodeTask() {
  let sequence: BlockId[] = [];
  let dragPayload: { source: "palette" | "sequence"; block: BlockId; index?: number } | null = null;

  render(`
    <div class="editor-shell">
      <div class="toolbar">
        <div class="menu-group">
          <span class="menu-label">File</span>
          <span class="menu-label">Edit</span>
          <span class="menu-label">Assets</span>
          <span class="menu-label">GameObject</span>
          <span class="menu-label">Component</span>
        </div>
        <div class="transport-group">
          <button type="button" class="transport-btn" aria-label="Шаг назад" disabled>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 19V5l-9 7 9 7z"/><path d="M20 19V5l-9 7 9 7z"/></svg>
          </button>
          <button type="button" id="toolbar-play" class="transport-btn play" aria-label="Запустить">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
          </button>
          <button type="button" class="transport-btn" aria-label="Пауза" disabled>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/></svg>
          </button>
        </div>
        <div class="toolbar-spacer"></div>
      </div>

      <div class="task-banner">
        <div>
          <p class="eyebrow">Задача 2 из 2</p>
          <h2>Собери прыжок из блоков кода</h2>
          <p class="lead">Перетащи блоки в область сборки в нужном порядке, затем жми Play. Проверим последовательность дважды: с ровного места и сразу после падения.</p>
        </div>
        <button id="next-btn" class="secondary" disabled>Дальше →</button>
      </div>

      <div class="editor-main">
        <div class="hierarchy">
          <p class="section-title" style="margin-bottom:12px">Hierarchy</p>
          <div class="hierarchy-item"><span class="hierarchy-dot"></span>Main Camera</div>
          <div class="hierarchy-item"><span class="hierarchy-dot"></span>Ground</div>
          <div class="hierarchy-item selected"><span class="hierarchy-dot"></span>Player</div>
        </div>

        <div class="scene-col">
          <div class="scene-tabs">
            <button type="button" class="tab-btn">Scene</button>
            <button type="button" class="tab-btn active">Game</button>
          </div>
          <div class="viewport">
            <canvas id="canvas"></canvas>
          </div>
          <div class="viewport-status" id="viewport-status">Собери блоки и нажми Play.</div>
        </div>

        <div class="inspector">
          <div class="inspector-header">
            <p>Player</p>
            <p>Tag: Player · Layer: Default</p>
          </div>
          <div class="section-card">
            <p class="section-title">Блоки</p>
            <div id="palette" class="palette">
              ${(Object.keys(BLOCK_DEFS) as BlockId[])
                .map(
                  (id) => `
                <div class="block" draggable="true" data-block="${id}">
                  ${BLOCK_DEFS[id].label}
                </div>`
                )
                .join("")}
            </div>
          </div>
          <div class="section-card">
            <p class="section-title">Сборка (порядок важен)</p>
            <div id="sequence" class="sequence"></div>
            <button id="clear-btn" class="text-btn">Очистить сборку</button>
          </div>
          <button id="run-btn" class="primary full">▶ Play</button>
          <div id="result" class="result"></div>
        </div>
      </div>

      <div class="status-bar"><span>Ready</span><span>Console: 0 errors</span></div>
    </div>
  `);

  const canvas = document.querySelector<HTMLCanvasElement>("#canvas")!;
  const simulator = new BlockJumpSimulator(canvas);
  const resizeObserver = new ResizeObserver(() => simulator.resize());
  resizeObserver.observe(canvas);
  const sequenceEl = document.querySelector<HTMLDivElement>("#sequence")!;
  const resultEl = document.querySelector<HTMLDivElement>("#result")!;
  const runBtn = document.querySelector<HTMLButtonElement>("#run-btn")!;
  const toolbarPlay = document.querySelector<HTMLButtonElement>("#toolbar-play")!;
  const viewportStatus = document.querySelector<HTMLDivElement>("#viewport-status")!;
  const nextBtn = document.querySelector<HTMLButtonElement>("#next-btn")!;

  function renderSequence() {
    if (sequence.length === 0) {
      sequenceEl.innerHTML = `<p class="sequence-empty">Перетащи сюда блоки из списка выше</p>`;
      return;
    }
    sequenceEl.innerHTML = sequence
      .map(
        (id, i) => `
        <div class="block seq-block" draggable="true" data-index="${i}">
          <span class="seq-num">${i + 1}</span>
          <span>${BLOCK_DEFS[id].label}</span>
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
      dragPayload = { source: "palette", block: el.dataset.block as BlockId };
    });
  });

  sequenceEl.addEventListener("dragover", (e) => e.preventDefault());
  sequenceEl.addEventListener("drop", (e) => {
    e.preventDefault();
    if (!dragPayload) return;

    // определяем индекс вставки по позиции курсора относительно существующих блоков
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

  const runSequence = async () => {
    if (sequence.length === 0) {
      resultEl.innerHTML = `<p class="status warn">Сначала собери хотя бы один блок.</p>`;
      return;
    }
    runBtn.disabled = true;
    toolbarPlay.disabled = true;
    viewportStatus.textContent = "Запускаю проверку…";
    viewportStatus.className = "viewport-status";
    resultEl.innerHTML = "";

    const trial1 = await simulator.runTrial(sequence, 0);
    await new Promise((r) => setTimeout(r, 250));
    const trial2 = await simulator.runTrial(sequence, 180); // как будто персонаж только что падал

    runBtn.disabled = false;
    toolbarPlay.disabled = false;

    const maxH = Math.max(trial1.peakHeight, trial2.peakHeight, 1);
    const bar = (h: number) => Math.min(100, Math.round((h / maxH) * 100));

    let verdict: string;
    let ok: boolean;
    if (!trial1.didJump && !trial2.didJump) {
      verdict = "Персонаж вообще не прыгает — в сборке не хватает блока «Приложить силу вверх», либо сброс скорости стоит после него и обнуляет её.";
      ok = false;
    } else if (trial1.didJump && !trial2.didJump) {
      verdict = "Первый прыжок сработал, а второй — нет! Если персонаж уже падал, сила добавляется к остаточной скорости — без сброса результат непредсказуем.";
      ok = false;
    } else {
      const diff = Math.abs(trial1.peakHeight - trial2.peakHeight);
      if (diff > 8) {
        verdict = `Прыжки разной высоты (${trial1.peakHeight}px и ${trial2.peakHeight}px) — классический баг: сила прыжка складывается с той скоростью, что уже была у персонажа.`;
        ok = false;
      } else {
        verdict = "Оба прыжка одинаковой высоты, независимо от того, падал ли персонаж до этого — правильная последовательность!";
        ok = true;
        nextBtn.disabled = false;
      }
    }

    if (!ok) state.codeAttempts += 1;

    viewportStatus.textContent = ok ? "Готово — последовательность стабильна." : "Есть баг — смотри разбор справа.";
    viewportStatus.className = "viewport-status " + (ok ? "ok" : "warn");

    resultEl.innerHTML = `
      <p class="status ${ok ? "ok" : "warn"}">${verdict}</p>
      <div class="trial-bars">
        <div class="trial-bar">
          <div class="bar-track"><div class="bar-fill" style="height:${bar(trial1.peakHeight)}%"></div></div>
          <span>Прыжок 1 (с пола)</span>
        </div>
        <div class="trial-bar">
          <div class="bar-track"><div class="bar-fill" style="height:${bar(trial2.peakHeight)}%"></div></div>
          <span>Прыжок 2 (после падения)</span>
        </div>
      </div>
    `;
  };

  // Оба Play — и в тулбаре, и в инспекторе — запускают одну и ту же проверку.
  runBtn.addEventListener("click", runSequence);
  toolbarPlay.addEventListener("click", runSequence);

  renderSequence();
  nextBtn.addEventListener("click", renderReflection);
}

// ---------- Экран 3: рефлексия ----------
function renderReflection() {
  render(`
    <div class="editor-shell">
      <div class="toolbar">
        <div class="menu-group">
          <span class="menu-label">File</span>
          <span class="menu-label">Edit</span>
          <span class="menu-label">Assets</span>
          <span class="menu-label">GameObject</span>
          <span class="menu-label">Component</span>
        </div>
        <div class="transport-group">
          <button type="button" class="transport-btn" aria-label="Шаг назад" disabled>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 19V5l-9 7 9 7z"/><path d="M20 19V5l-9 7 9 7z"/></svg>
          </button>
          <button type="button" class="transport-btn" aria-label="Play" disabled>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
          </button>
          <button type="button" class="transport-btn" aria-label="Пауза" disabled>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/></svg>
          </button>
        </div>
        <div class="toolbar-spacer"></div>
      </div>

      <div class="task-banner">
        <div>
          <p class="eyebrow">Последний шаг</p>
          <h2>Что было интереснее?</h2>
          <p class="lead">Пара вопросов о тебе — это поможет собрать честный разбор.</p>
        </div>
      </div>

      <div class="editor-main">
        <div class="hierarchy">
          <p class="section-title" style="margin-bottom:12px">Hierarchy</p>
          <div class="hierarchy-item"><span class="hierarchy-dot"></span>Main Camera</div>
          <div class="hierarchy-item"><span class="hierarchy-dot"></span>Directional Light</div>
          <div class="hierarchy-item"><span class="hierarchy-dot"></span>Ground</div>
          <div class="hierarchy-item selected"><span class="hierarchy-dot"></span>Player</div>
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

// ---------- Экран 4: фидбэк ----------
function renderFeedback() {
  const feedback = getFeedback(state);
  render(`
    <div class="editor-shell">
      <div class="toolbar">
        <div class="menu-group">
          <span class="menu-label">File</span>
          <span class="menu-label">Edit</span>
          <span class="menu-label">Assets</span>
          <span class="menu-label">GameObject</span>
          <span class="menu-label">Component</span>
        </div>
        <div class="transport-group">
          <button type="button" class="transport-btn" aria-label="Шаг назад" disabled>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 19V5l-9 7 9 7z"/><path d="M20 19V5l-9 7 9 7z"/></svg>
          </button>
          <button type="button" id="toolbar-restart" class="transport-btn play" aria-label="Пройти заново">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.13-3.36L23 10M1 14l5.36 4.36A9 9 0 0020.49 15"/></svg>
          </button>
          <button type="button" class="transport-btn" aria-label="Пауза" disabled>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/></svg>
          </button>
        </div>
        <div class="toolbar-spacer"></div>
      </div>

      <div class="task-banner">
        <div>
          <p class="eyebrow">Результат</p>
          <h2>Вот что мы заметили</h2>
        </div>
        <button id="banner-restart" class="secondary">Пройти пробу заново</button>
      </div>

      <div class="editor-main">
        <div class="hierarchy">
          <p class="section-title" style="margin-bottom:12px">Hierarchy</p>
          <div class="hierarchy-item"><span class="hierarchy-dot"></span>Main Camera</div>
          <div class="hierarchy-item"><span class="hierarchy-dot"></span>Directional Light</div>
          <div class="hierarchy-item"><span class="hierarchy-dot"></span>Ground</div>
          <div class="hierarchy-item selected"><span class="hierarchy-dot"></span>Player</div>
        </div>

        <div class="scene-col">
          <div class="scene-tabs">
            <button type="button" class="tab-btn">Scene</button>
            <button type="button" class="tab-btn">Game</button>
            <button type="button" class="tab-btn active">Console</button>
          </div>
          <div class="deco-scene" style="background-image:none;">
            <div class="console">
              <div><span class="muted">&gt;</span> Анализирую сессию…</div>
              <div><span class="info">[i]</span> Задача 1: ${state.numbersAttempts} попыт${state.numbersAttempts === 1 ? "ка" : "ки"}, последняя — успешная</div>
              <div><span class="info">[i]</span> Задача 2: ${state.codeAttempts === 0 ? "правильная последовательность блоков с первой попытки" : `${state.codeAttempts} неверн${state.codeAttempts === 1 ? "ая попытка" : "ые попытки"} перед успехом`}</div>
              <div><span class="ok">[✓]</span> Профиль собран</div>
              <div style="margin-top:14px"><span class="muted">&gt;</span> Печатаю рекомендацию…</div>
              <span class="final">${feedback}</span>
            </div>
          </div>
          <div class="viewport-status">Сессия завершена.</div>
        </div>

        <div class="inspector">
          <div class="inspector-header">
            <p>Player</p>
            <p>Tag: Player · Layer: Default</p>
          </div>
          <div class="section-card">
            <p class="section-title">Что дальше</p>
            <a class="primary button-link" href="#">Полноценный мини-курс →</a>
            <a class="secondary button-link" href="#">Другая профессия (арт/дизайн) →</a>
          </div>
        </div>
      </div>

      <div class="status-bar"><span>Session complete</span><span>Console: 1 message</span></div>
    </div>
  `);

  const restart = () => {
    state.numbersAttempts = 0;
    state.codeAttempts = 0;
    renderIntro();
  };
  document.querySelector("#toolbar-restart")?.addEventListener("click", restart);
  document.querySelector("#banner-restart")?.addEventListener("click", restart);
}

renderIntro();