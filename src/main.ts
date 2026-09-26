import "./style.css";
import { PlatformerDemo, type PlayOutcome } from "./game";
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

let demo: PlatformerDemo | null = null;

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

// ---------- Экран 1: задача с числами ----------
function renderNumbersTask() {
  render(`
    <div class="screen">
      <p class="eyebrow">Задача 1 из 2 · Настрой физику</p>
      <h2>Персонаж не прыгает как надо. Почини это цифрами.</h2>
      <p class="lead">
        Это реальные параметры, которые крутят разработчики в Unity. Подбери
        значения так, чтобы прыжок выглядел естественно — не слишком вялым и
        без «провала» сквозь пол.
      </p>
      <canvas id="canvas" width="480" height="260"></canvas>
      <div class="controls">
        <label>
          Jump Force: <span id="jf-val">0</span>
          <input id="jf" type="range" min="0" max="15" step="1" value="0" />
        </label>
        <label>
          Gravity Scale: <span id="gs-val">15</span>
          <input id="gs" type="range" min="1" max="30" step="1" value="15" />
        </label>
        <label>
          Ground Check Distance: <span id="gc-val">0.10</span>
          <input id="gc" type="range" min="0.02" max="0.30" step="0.01" value="0.10" />
        </label>
      </div>
      <div class="actions">
        <button id="play-btn" class="primary">▶ Play (пробел)</button>
        <button id="next-btn" class="secondary" disabled>Дальше →</button>
      </div>
      <p id="status" class="status"></p>
    </div>
  `);

  const canvas = document.querySelector<HTMLCanvasElement>("#canvas")!;
  demo = new PlatformerDemo(canvas, {
    jumpForce: 0,
    gravityScale: 15,
    groundCheckDistance: 0.1,
  });

  const jf = document.querySelector<HTMLInputElement>("#jf")!;
  const gs = document.querySelector<HTMLInputElement>("#gs")!;
  const gc = document.querySelector<HTMLInputElement>("#gc")!;
  const jfVal = document.querySelector("#jf-val")!;
  const gsVal = document.querySelector("#gs-val")!;
  const gcVal = document.querySelector("#gc-val")!;
  const status = document.querySelector<HTMLParagraphElement>("#status")!;
  const nextBtn = document.querySelector<HTMLButtonElement>("#next-btn")!;

  const syncParams = () => {
    jfVal.textContent = jf.value;
    gsVal.textContent = gs.value;
    gcVal.textContent = Number(gc.value).toFixed(2);
    demo?.setParams({
      jumpForce: Number(jf.value),
      gravityScale: Number(gs.value),
      groundCheckDistance: Number(gc.value),
    });
  };
  [jf, gs, gc].forEach((el) => el.addEventListener("input", syncParams));
  syncParams();

  const messages: Record<PlayOutcome, string> = {
    idle: "",
    "no-jump": "Ничего не произошло — Jump Force сейчас равен нулю, силе просто неоткуда взяться.",
    "clipped-floor":
      "Персонаж прыгнул, но на секунду «провалился» ниже пола — Ground Check Distance слишком маленький, игра не успевает вовремя понять, что персонаж приземлился.",
    "good-jump": "Похоже на нормальный прыжок! Можно идти дальше, либо ещё поэкспериментировать.",
  };

  demo.onOutcome = (outcome) => {
    state.numbersAttempts += 1;
    status.textContent = messages[outcome];
    status.className = "status " + (outcome === "good-jump" ? "ok" : "warn");
    if (outcome === "good-jump") {
      nextBtn.disabled = false;
    }
  };

  document.querySelector("#play-btn")?.addEventListener("click", () => {
    demo?.reset();
    demo?.tryJump();
  });

  nextBtn.addEventListener("click", renderCodeTask);
}

// ---------- Экран 2: задача с кодом ----------
const CODE_OPTIONS = [
  { id: "a", code: "rb.AddForce(Vector2.up * jumpForce);", correct: true },
  { id: "b", code: "transform.position += Vector2.up;", correct: false },
  { id: "c", code: "jumpForce = jumpForce + 1;", correct: false },
] as const;

function renderCodeTask() {
  render(`
    <div class="screen">
      <p class="eyebrow">Задача 2 из 2 · Напиши строчку кода</p>
      <h2>Теперь почини это не цифрами, а логикой.</h2>
      <p class="lead">Вот настоящий (упрощённый) кусок кода на C#. Выбери, какую строчку нужно вставить внутрь <code>if</code>, чтобы персонаж прыгал по нажатию пробела.</p>
      <pre class="code-block"><code>void Update() {
    if (Input.GetKeyDown(KeyCode.Space) &amp;&amp; isGrounded) {
        <span id="blank">/* твой выбор здесь */</span>
    }
}</code></pre>
      <canvas id="canvas" width="480" height="260"></canvas>
      <div class="options" id="options">
        ${CODE_OPTIONS.map(
          (o) => `
          <label class="option">
            <input type="radio" name="code-option" value="${o.id}" />
            <code>${o.code}</code>
          </label>`
        ).join("")}
      </div>
      <div class="actions">
        <button id="check-btn" class="primary">Проверить</button>
        <button id="next-btn" class="secondary" disabled>Дальше →</button>
      </div>
      <p id="status" class="status"></p>
    </div>
  `);

  const canvas = document.querySelector<HTMLCanvasElement>("#canvas")!;
  demo = new PlatformerDemo(canvas, {
    jumpForce: 8,
    gravityScale: 15,
    groundCheckDistance: 0.1,
  });

  const status = document.querySelector<HTMLParagraphElement>("#status")!;
  const nextBtn = document.querySelector<HTMLButtonElement>("#next-btn")!;
  const blank = document.querySelector("#blank")!;

  document.querySelector("#check-btn")?.addEventListener("click", () => {
    const picked = document.querySelector<HTMLInputElement>(
      'input[name="code-option"]:checked'
    );
    if (!picked) {
      status.textContent = "Сначала выбери один из вариантов.";
      status.className = "status warn";
      return;
    }
    const option = CODE_OPTIONS.find((o) => o.id === picked.value)!;

    if (option.correct) {
      blank.textContent = option.code;
      demo?.reset();
      demo?.tryJump();
      status.textContent = "Верно! rb.AddForce толкает персонажа вверх силой jumpForce — это и есть прыжок.";
      status.className = "status ok";
      nextBtn.disabled = false;
    } else {
      state.codeAttempts += 1;
      status.textContent =
        option.id === "b"
          ? "Это просто телепортирует персонажа вверх без физики — прыжок будет выглядеть неестественно, и это не то, что нужно."
          : "Это увеличивает саму переменную jumpForce, а не толкает персонажа — прыжка не произойдёт.";
      status.className = "status warn";
    }
  });

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
          <label><input type="radio" name="moreInteresting" value="code" /> Разбираться с логикой кода</label>
        </fieldset>
        <fieldset>
          <legend>Где было сложнее?</legend>
          <label><input type="radio" name="hardestPart" value="numbers" /> На моменте с цифрами</label>
          <label><input type="radio" name="hardestPart" value="code" /> На моменте с кодом</label>
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
