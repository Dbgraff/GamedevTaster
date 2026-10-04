import { Scene2D, CORRECT_COMPONENTS, type ObjectSpec, type SceneObject, type SceneApi } from "../engines/scene2d";
import { render, setupHints, setupNextButtons } from "../ui/shell";
import { renderTaskLayout, codeBlock, setStatus, whileLocked } from "../ui/taskLayout";
import { setupSequenceBuilder } from "../ui/sequenceBuilder";
import { setupConsole } from "../ui/console";
import { registerAttempt, enterTask } from "../state";
import { renderTask7 } from "./task7";

type LineId = "destroyOther" | "scoreInc" | "log" | "destroySelf";
type EventId = "collision" | "trigger";
type SlotId = "wall" | "coin";

const LINES: Record<LineId, { code: string; comment: string }> = {
  destroyOther: { code: "Destroy(other.gameObject);", comment: "удаляем объект, которого коснулись" },
  scoreInc: { code: "score += 1;", comment: "увеличиваем счёт" },
  log: { code: "Debug.Log(other.name);", comment: "пишем в консоль, кого коснулись" },
  destroySelf: { code: "Destroy(gameObject);", comment: "удаляем объект, на котором висит этот скрипт" },
};
const LABELS = Object.fromEntries(
  (Object.keys(LINES) as LineId[]).map((id) => [id, codeBlock(LINES[id].code, LINES[id].comment)])
) as Record<LineId, string>;
const PALETTE: LineId[] = ["log", "destroySelf", "scoreInc", "destroyOther"];

const EVENTS: Record<EventId, { header: string; note: string }> = {
  collision: { header: "void OnCollisionEnter(Collision other)", note: "// при столкновении с твёрдым объектом" },
  trigger: { header: "void OnTriggerEnter(Collider other)", note: "// когда зашли в зону с Is Trigger" },
};

const SLOTS: { id: SlotId; title: string }[] = [
  { id: "wall", title: "Метод 1 — для стены" },
  { id: "coin", title: "Метод 2 — для монетки" },
];

const SPECS: ObjectSpec[] = [
  { id: "player", kind: "player", name: "Кубик", x: 40, cfg: CORRECT_COMPONENTS.player },
  { id: "coin", kind: "coin", name: "Монетка", x: 260, cfg: CORRECT_COMPONENTS.coin },
  { id: "wall", kind: "wall", name: "Стена", x: 470, cfg: CORRECT_COMPONENTS.wall },
];

export function renderTask6() {
  const events: Record<SlotId, EventId | null> = { wall: null, coin: null };

  render(
    renderTaskLayout({
      n: 6,
      title: "Столкновение или прохождение?",
      leads: [
        "Компоненты теперь на месте: кубик упирается в стену и проезжает сквозь монетку. Но больше ничего не происходит — монетка так и остаётся висеть, а счёт стоит на нуле.",
        "Допиши скрипт кубика: выбери, на какое событие движка отвечает каждый метод, и собери, что в нём должно происходить.",
      ],
      hints: [
        "Монетка помечена как Is Trigger, а стена — обычный твёрдый коллайдер. Для них движок вызывает два разных события.",
        "Для стены — OnCollisionEnter, и его можно оставить пустым: остановит физика. Для монетки — OnTriggerEnter с Destroy(other.gameObject) и score += 1.",
      ],
      sceneHtml: `<canvas id="canvas"></canvas>`,
      initialStatus: "Выбери события, собери методы и нажми Play.",
      wideInspector: true,
      inspectorHtml: `
        <div class="section-card">
          <p class="section-title">Player.cs</p>
          <div class="code-frame">
            <div class="code-static"><span class="kw">public class</span> Player : MonoBehaviour {</div>
            <div class="code-static code-indent"><span class="kw">int</span> score = 0; <span class="code-comment">// счёт</span></div>
          </div>
        </div>
        ${SLOTS.map(
          (slot) => `
          <div class="section-card method-card">
            <p class="section-title">${slot.title}</p>
            <div class="seg" data-slot="${slot.id}" role="radiogroup" aria-label="Событие">
              ${(Object.keys(EVENTS) as EventId[])
                .map(
                  (ev) =>
                    `<button type="button" class="seg-btn" data-value="${ev}" role="radio" aria-checked="false"><code>${EVENTS[ev].header}</code></button>`
                )
                .join("")}
            </div>
            <p class="code-comment method-note" data-note="${slot.id}">// выбери событие</p>
            <div id="palette-${slot.id}" class="palette palette--code">
              ${PALETTE.map((id) => `<div class="block block--code" draggable="true" data-block="${id}">${LABELS[id]}</div>`).join("")}
            </div>
            <div class="code-frame code-frame--tight">
              <div class="code-static">{</div>
              <div id="sequence-${slot.id}" class="sequence sequence--code"></div>
              <div class="code-static">}</div>
            </div>
            <button id="clear-${slot.id}" class="text-btn">Очистить метод</button>
          </div>`
        ).join("")}
      `,
    })
  );

  const canvas = document.querySelector<HTMLCanvasElement>("#canvas")!;
  const status = document.querySelector<HTMLDivElement>("#viewport-status")!;
  const runBtn = document.querySelector<HTMLButtonElement>("#run-btn")!;
  const consoleUi = setupConsole();
  const next = setupNextButtons(renderTask7);

  let score = 0;
  const scene = new Scene2D(canvas, SPECS);
  scene.setHandlers({ hud: () => ({ right: `Счёт: ${score}` }) });
  new ResizeObserver(() => scene.resize()).observe(canvas);

  const empty = `<span class="only-desktop">Перетащи строки сюда (или кликни) — или оставь пустым</span><span class="only-mobile">Нажимай на строки выше — или оставь пустым</span>`;
  const builders = {
    wall: setupSequenceBuilder<LineId>({ labels: LABELS, emptyText: empty, paletteSelector: "#palette-wall", sequenceSelector: "#sequence-wall", clearSelector: "#clear-wall" }),
    coin: setupSequenceBuilder<LineId>({ labels: LABELS, emptyText: empty, paletteSelector: "#palette-coin", sequenceSelector: "#sequence-coin", clearSelector: "#clear-coin" }),
  };

  document.querySelectorAll<HTMLDivElement>(".seg[data-slot]").forEach((seg) => {
    const slot = seg.dataset.slot as SlotId;
    seg.querySelectorAll<HTMLButtonElement>(".seg-btn").forEach((btn) =>
      btn.addEventListener("click", () => {
        events[slot] = btn.dataset.value as EventId;
        seg.querySelectorAll<HTMLButtonElement>(".seg-btn").forEach((b) => {
          b.classList.toggle("active", b === btn);
          b.setAttribute("aria-checked", String(b === btn));
        });
        document.querySelector<HTMLElement>(`[data-note="${slot}"]`)!.textContent = EVENTS[events[slot]!].note;
      })
    );
  });

  const runBody = (lines: LineId[], other: SceneObject, api: SceneApi) => {
    for (const id of lines) {
      if (id === "destroyOther") api.destroy(other);
      else if (id === "scoreInc") score += 1;
      else if (id === "log") api.log(other.name);
      else if (id === "destroySelf") api.destroy(api.self);
    }
  };

  const runScene = async () => {
    if (!events.wall || !events.coin) {
      setStatus(status, "Выбери событие для обоих методов.", "warn");
      return;
    }
    consoleUi.close();
    const code = SLOTS.map(
      (s) =>
        `${EVENTS[events[s.id]!].header} {<br>${builders[s.id].get().map((id) => `&nbsp;&nbsp;${LINES[id].code}`).join("<br>") || "&nbsp;&nbsp;<span class='muted'>// пусто</span>"}<br>}`
    ).join("<br>");

    if (events.wall === events.coin) {
      registerAttempt(6, false, "compile-dup");
      setStatus(status, "Ошибка компиляции — игра не запустилась. Открой Console.", "warn");
      consoleUi.push({
        ok: false,
        text: `error CS0111: метод ${EVENTS[events.wall].header.replace("void ", "").split("(")[0]} объявлен дважды. В классе не может быть двух одинаковых методов — у каждого события свой. В Unity с ошибками компиляции игра вообще не запускается.`,
        details: `<div style="margin-top:10px"><span class="muted">// твой скрипт</span></div><div class="console-code">${code}</div>`,
      });
      return;
    }

    // Движок вызывает метод по ТИПУ события — неважно, как мы его назвали у себя в голове
    const bodyFor = (ev: EventId) => builders[(events.wall === ev ? "wall" : "coin") as SlotId].get();
    score = 0;
    scene.setHandlers({
      hud: () => ({ right: `Счёт: ${score}` }),
      onCollisionEnter: (other, api) => runBody(bodyFor("collision"), other, api),
      onTriggerEnter: (other, api) => runBody(bodyFor("trigger"), other, api),
    });

    setStatus(status, "Запускаю сцену…");
    const result = await whileLocked(runBtn, () => scene.run());

    const wallGone = result.destroyed.includes("wall");
    const coinGone = result.destroyed.includes("coin");
    const playerGone = result.destroyed.includes("player");
    const ok = coinGone && score === 1 && !wallGone && !playerGone && result.stoppedAtWall;
    let verdict: string;
    let mistake = "";
    if (playerGone) {
      mistake = "destroy-self";
      verdict = "Пропал сам кубик: Destroy(gameObject) без other удаляет объект, на котором висит скрипт, — то есть кубика. Удалять нужно other.gameObject — то, чего коснулись.";
    } else if (wallGone || (events.coin === "collision" && score > 0)) {
      mistake = "wrong-event";
      verdict =
        events.coin === "collision"
          ? "Монетка помечена как Is Trigger — а для триггеров движок вызывает не OnCollisionEnter, а OnTriggerEnter. OnCollisionEnter пришёл от стены, поэтому то, что ты задумывал для монетки, случилось со стеной."
          : "Стена исчезла: Destroy(other.gameObject) стоит в OnCollisionEnter, а это событие приходит от твёрдых объектов — то есть от стены.";
    } else if (!coinGone) {
      mistake = "coin-left";
      verdict = "Монетка осталась висеть — её никто не удалил. В методе, который срабатывает на триггер, нужен Destroy(other.gameObject).";
    } else if (score === 0) {
      mistake = "no-score";
      verdict = "Монетка исчезла, но счёт не вырос — не хватает score += 1 там же, где её удаляют.";
    } else if (score > 1) {
      mistake = "score-extra";
      verdict = `Счёт вырос до ${score}, а монетка была одна — score += 1 срабатывает лишний раз.`;
    } else {
      verdict = "Отлично! Запомни это на будущее: твёрдые столкновения и триггеры — это два параллельных, не взаимозаменяемых набора событий движка.";
    }
    registerAttempt(6, ok, mistake);

    setStatus(
      status,
      ok ? "Готово — монетка подобрана, кубик остановился у стены." : "Что-то пошло не так — открой Console, чтобы понять почему.",
      ok ? "ok" : "warn"
    );
    consoleUi.push({
      ok,
      text: verdict,
      meta: `счёт: ${score}`,
      details: `
        <div style="margin-top:10px"><span class="muted">// твой скрипт</span></div>
        <div class="console-code">${code}</div>
        <div style="margin-top:10px"><span class="muted">// что произошло на сцене</span></div>
        ${result.log.map((l) => `<div><span class="info">[i]</span> ${l}</div>`).join("")}
      `,
    });
    if (ok) next.enable();
  };

  runBtn.addEventListener("click", runScene);
  setupHints(6);
  enterTask(6);
}