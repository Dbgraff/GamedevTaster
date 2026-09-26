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
    <div class="screen intro">
      <p class="eyebrow">Попробуй профессию · 20 минут</p>
      <h1>Почему персонаж не прыгает?</h1>
      <p class="lead">
        Сейчас ты на 20 минут станешь программистом в геймдеве. Никакой теории —
        сразу разберёмся с живой проблемой, с которой сталкивается почти каждый
        разработчик игр.
      </p>
      <button id="start-btn" class="primary">Начать</button>
    </div>
  `);
  document.querySelector("#start-btn")?.addEventListener("click", renderNumbersTask);
}

// ---------- Экран 1: задача с числами (рабочая среда: задача + вьюпорт) ----------
function renderNumbersTask() {
  render(`
    <div class="workbench">
      <div class="panel-task screen">
        <p class="eyebrow">Задача 1 из 2</p>
        <h2>Почини прыжок цифрами</h2>
        <p class="lead">
          Персонаж не прыгает как надо. Подбери параметры справа так, чтобы
          прыжок выглядел естественно.
        </p>
        <div class="inspector">
          <div class="inspector-row">
            <label for="jf">Jump Force</label>
            <input id="jf" type="number" min="0" max="15" step="1" value="0" />
          </div>
          <div class="inspector-row">
            <label for="gs">Gravity Scale</label>
            <input id="gs" type="number" min="1" max="30" step="1" value="15" />
          </div>
          <div class="inspector-row">
            <label for="gc">Ground Check Distance</label>
            <input id="gc" type="number" min="0.02" max="0.30" step="0.01" value="0.10" />
          </div>
        </div>
        <button id="play-btn" class="primary full">▶ Play</button>
        <p id="status" class="status"></p>
        <button id="next-btn" class="secondary full" disabled>Дальше →</button>
      </div>
      <div class="panel-viewport">
        <div class="viewport-chrome">
          <span class="dot"></span><span class="dot"></span><span class="dot"></span>
          <span class="viewport-tab active">Scene</span>
        </div>
        <canvas id="canvas" width="480" height="300"></canvas>
      </div>
    </div>
  `);

  const canvas = document.querySelector<HTMLCanvasElement>("#canvas")!;
  const demo = new PlatformerDemo(canvas, {
    jumpForce: 0,
    gravityScale: 15,
    groundCheckDistance: 0.1,
  });

  const jf = document.querySelector<HTMLInputElement>("#jf")!;
  const gs = document.querySelector<HTMLInputElement>("#gs")!;
  const gc = document.querySelector<HTMLInputElement>("#gc")!;
  const status = document.querySelector<HTMLParagraphElement>("#status")!;
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
    status.className = "status " + (outcome === "good-jump" ? "ok" : "warn");
    if (outcome === "good-jump") nextBtn.disabled = false;
  };

  document.querySelector("#play-btn")?.addEventListener("click", () => {
    demo.reset();
    demo.tryJump();
  });

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
    <div class="workbench">
      <div class="panel-task screen">
        <p class="eyebrow">Задача 2 из 2</p>
        <h2>Собери прыжок из блоков кода</h2>
        <p class="lead">
          Перетащи блоки в область сборки <b>в нужном порядке</b>, затем нажми «Запустить».
          Мы проверим твою последовательность дважды: один раз с ровного места,
          и один раз сразу после того, как персонаж уже падал — как в реальной игре.
        </p>
        <p class="section-label">Блоки:</p>
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
        <p class="section-label">Сборка (порядок важен):</p>
        <div id="sequence" class="sequence"></div>
        <button id="run-btn" class="primary full">▶ Запустить</button>
        <button id="clear-btn" class="text-btn">Очистить сборку</button>
        <div id="result" class="result"></div>
        <button id="next-btn" class="secondary full" disabled>Дальше →</button>
      </div>
      <div class="panel-viewport">
        <div class="viewport-chrome">
          <span class="dot"></span><span class="dot"></span><span class="dot"></span>
          <span class="viewport-tab active">Game</span>
        </div>
        <canvas id="canvas" width="480" height="300"></canvas>
      </div>
    </div>
  `);

  const canvas = document.querySelector<HTMLCanvasElement>("#canvas")!;
  const simulator = new BlockJumpSimulator(canvas);
  const sequenceEl = document.querySelector<HTMLDivElement>("#sequence")!;
  const resultEl = document.querySelector<HTMLDivElement>("#result")!;
  const runBtn = document.querySelector<HTMLButtonElement>("#run-btn")!;
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

  runBtn.addEventListener("click", async () => {
    if (sequence.length === 0) {
      resultEl.innerHTML = `<p class="status warn">Сначала собери хотя бы один блок.</p>`;
      return;
    }
    runBtn.disabled = true;
    resultEl.innerHTML = `<p class="status">Запускаю проверку…</p>`;

    const trial1 = await simulator.runTrial(sequence, 0);
    await new Promise((r) => setTimeout(r, 250));
    const trial2 = await simulator.runTrial(sequence, 180); // как будто персонаж только что падал

    runBtn.disabled = false;

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
        state.codeAttempts = Math.max(0, state.codeAttempts);
        nextBtn.disabled = false;
      }
    }

    if (!ok) state.codeAttempts += 1;

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
  });

  renderSequence();
  nextBtn.addEventListener("click", renderReflection);
}

// ---------- Экран 3: рефлексия ----------
function renderReflection() {
  render(`
    <div class="screen">
      <p class="eyebrow">Последний шаг · Пара вопросов о тебе</p>
      <h2>Что было интереснее?</h2>
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
        <button type="submit" class="primary">Получить фидбэк</button>
      </form>
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
    <div class="screen">
      <p class="eyebrow">Твой результат</p>
      <h2>Вот что мы заметили</h2>
      <p class="lead feedback-text">${feedback}</p>
      <div class="actions column">
        <a class="primary button-link" href="#">Хочу попробовать полноценный мини-курс →</a>
        <a class="secondary button-link" href="#">Хочу попробовать другую профессию (геймдизайн/арт) →</a>
      </div>
      <button id="restart-btn" class="text-btn">Пройти пробу заново</button>
    </div>
  `);
  document.querySelector("#restart-btn")?.addEventListener("click", () => {
    state.numbersAttempts = 0;
    state.codeAttempts = 0;
    renderIntro();
  });
}

renderIntro();