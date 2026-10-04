import { GameOverDemo, GUARD_LINES, type GuardId } from "../engines/gameOverSim";
import { render, setupHints, setupNextButtons } from "../ui/shell";
import { renderTaskLayout, setStatus, whileLocked } from "../ui/taskLayout";
import { setupConsole } from "../ui/console";
import { registerAttempt, enterTask } from "../state";
import { setupFinishButton } from "./finish";
import { renderTask10 } from "./task10";

const OPTIONS: GuardId[] = ["setOver", "returnIfNotOver", "jumpIfOver", "returnIfOver", "resetFlag", "returnAlways"];
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

const VERDICTS: Record<GuardId, { mistake: string; text: string }> = {
  returnIfOver: {
    mistake: "",
    text: "Точно! return в самом начале Update() при isGameOver прерывает метод на этом кадре — код прыжка и движения ниже просто не выполняется. А сам код при этом удалять не пришлось.",
  },
  setOver: {
    mistake: "set-over",
    text: "GAME OVER горит с первой секунды, а кубик спокойно играет дальше: строка только меняет переменную, но ничего не прерывает — код ввода ниже всё равно выполняется.",
  },
  returnIfNotOver: {
    mistake: "inverted",
    text: "Кубик даже не тронулся: условие перевёрнуто. Пока игра идёт, isGameOver = false, значит !isGameOver истинно — и Update выходит сразу, ещё до движения.",
  },
  returnAlways: {
    mistake: "always-return",
    text: "Кубик не двигается вообще: return без условия прерывает Update каждый кадр, и весь код ниже не выполняется никогда.",
  },
  resetFlag: {
    mistake: "reset-flag",
    text: "Кубик врезался, но игра продолжилась: OnCollisionEnter ставит isGameOver = true, а в начале следующего кадра эта строка снова сбрасывает его в false.",
  },
  jumpIfOver: {
    mistake: "jump-loop",
    text: "После столкновения кубик улетел в небо: при isGameOver он вызывает Jump() каждый кадр, а остальной код при этом продолжает работать.",
  },
};

export function renderTask9() {
  let choice: GuardId | null = null;

  render(
    renderTaskLayout({
      n: 9,
      title: "Game Over",
      leads: [
        "Кубик врезался в препятствие — и как ни в чём не бывало бежит и прыгает дальше. Нужно, чтобы после столкновения игра останавливалась.",
        "OnCollisionEnter уже ставит isGameOver = true. Выбери, какую строку поставить в самое начало Update(), чтобы кубик перестал реагировать на управление. Кубиком управляет автопилот: держит «вправо» и жмёт пробел.",
      ],
      hints: [
        "Подумай, как «выключить» реакцию на нажатия, не удаляя сам код прыжка и движения.",
        "return внутри Update() прерывает метод на этом кадре — если поставить его в начале при условии isGameOver, весь код ниже просто не выполнится.",
        "Похожее было в задании 2: прыжок выполнялся только при условии «пробел нажат и персонаж на земле». Здесь нужно условие, при котором не выполняется вообще ничего.",
      ],
      sceneTabLabel: "Game",
      sceneHtml: `<canvas id="canvas"></canvas>`,
      initialStatus: "Выбери строку и нажми Play.",
      wideInspector: true,
      finishButton: true,
      inspectorHtml: `
        <div class="section-card">
          <p class="section-title">Строка для начала Update()</p>
          <div class="choice-list" id="choices" role="radiogroup" aria-label="Строка">
            ${OPTIONS.map(
              (id) => `<button type="button" class="choice-btn" role="radio" aria-checked="false" data-choice="${id}"><code class="code-line">${esc(GUARD_LINES[id])}</code></button>`
            ).join("")}
          </div>
        </div>
        <div class="section-card">
          <p class="section-title">Player.cs</p>
          <div class="code-frame">
            <div class="code-static"><span class="kw">bool</span> isGameOver = <span class="kw">false</span>;</div>
            <div class="code-static code-gap"><span class="kw">void</span> Update() {</div>
            <div class="code-static code-indent code-slot" id="slot">// сюда — выбранная строка</div>
            <div class="code-static code-indent"><span class="kw">if</span> (Input.GetKeyDown(KeyCode.Space)) Jump();</div>
            <div class="code-static code-indent">rb.velocity = <span class="kw">new</span> Vector2(speed, rb.velocity.y);</div>
            <div class="code-static">}</div>
            <div class="code-static code-gap"><span class="kw">void</span> OnCollisionEnter(Collision other) {</div>
            <div class="code-static code-indent"><span class="kw">if</span> (other.gameObject.tag == "Obstacle") isGameOver = <span class="kw">true</span>;</div>
            <div class="code-static">}</div>
          </div>
        </div>
      `,
    })
  );

  const canvas = document.querySelector<HTMLCanvasElement>("#canvas")!;
  const status = document.querySelector<HTMLDivElement>("#viewport-status")!;
  const runBtn = document.querySelector<HTMLButtonElement>("#run-btn")!;
  const slot = document.querySelector<HTMLDivElement>("#slot")!;
  const consoleUi = setupConsole();
  const next = setupNextButtons(renderTask10);
  const demo = new GameOverDemo(canvas);
  new ResizeObserver(() => demo.resize()).observe(canvas);

  document.querySelectorAll<HTMLButtonElement>(".choice-btn").forEach((btn) =>
    btn.addEventListener("click", () => {
      choice = btn.dataset.choice as GuardId;
      document.querySelectorAll<HTMLButtonElement>(".choice-btn").forEach((b) => {
        b.classList.toggle("active", b === btn);
        b.setAttribute("aria-checked", String(b === btn));
      });
      slot.textContent = GUARD_LINES[choice];
      slot.classList.add("filled");
    })
  );

  const runScript = async () => {
    if (!choice) {
      setStatus(status, "Сначала выбери строку для начала Update().", "warn");
      return;
    }
    const picked = choice;
    consoleUi.close();
    setStatus(status, "Автопилот играет…");
    const result = await whileLocked(runBtn, () => demo.run(picked));

    const ok = picked === "returnIfOver" && result.stoppedAfterHit;
    const v = VERDICTS[picked];
    registerAttempt(9, ok, v.mistake);
    setStatus(status, ok ? "Готово — после столкновения игра остановилась." : "Игра ведёт себя не так — открой Console.", ok ? "ok" : "warn");
    consoleUi.push({
      ok,
      text: v.text,
      meta: GUARD_LINES[picked],
      details: `
        <div style="margin-top:10px"><span class="muted">// что произошло</span></div>
        ${result.log.map((l) => `<div><span class="info">[i]</span> ${l}</div>`).join("")}
        ${result.overAtStart ? `<div><span class="info">[i]</span> isGameOver = true уже на первом кадре</div>` : ""}
        ${result.stoppedAfterHit ? `<div><span class="info">[i]</span> После столкновения кубик замер — управление отключено</div>` : ""}
      `,
    });
    if (ok) next.enable();
  };

  runBtn.addEventListener("click", runScript);
  setupFinishButton();
  setupHints(9);
  enterTask(9);
}