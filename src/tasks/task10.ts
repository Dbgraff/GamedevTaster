import { Scene2D, type BodyConfig, type ObjectSpec } from "../engines/scene2d";
import { CAM_LINES } from "../engines/cameraFollow";
import { render, setupHints, setupNextButtons } from "../ui/shell";
import { renderTaskLayout, codeBlock, setStatus, whileLocked } from "../ui/taskLayout";
import { setupSequenceBuilder } from "../ui/sequenceBuilder";
import { setupConsole } from "../ui/console";
import { registerAttempt, enterTask, progress } from "../state";
import { setupFinishButton } from "./finish";
import { renderReflection } from "./reflection";

type ObjId = "player" | "coin" | "wall";
type CompId = keyof BodyConfig;
type ScoreLine = "inc" | "label" | "assignWrong" | "textWrong";
type CamMethod = "Update" | "LateUpdate";

const SCORE_LINES: Record<ScoreLine, string> = {
  inc: "score += 1;",
  label: "scoreLabel.text = score.ToString();",
  assignWrong: "score = scoreLabel;",
  textWrong: 'Text.score = "0";',
};
const LABELS = Object.fromEntries(
  (Object.keys(SCORE_LINES) as ScoreLine[]).map((id) => [id, codeBlock(SCORE_LINES[id])])
) as Record<ScoreLine, string>;
const PALETTE: ScoreLine[] = ["textWrong", "label", "assignWrong", "inc"];

const OBJECTS: { id: ObjId; name: string; icon: string }[] = [
  { id: "player", name: "Кубик", icon: "🟦" },
  { id: "coin", name: "Монетки", icon: "🪙" },
  { id: "wall", name: "Стена", icon: "🧱" },
];
const COMPS: { id: CompId; label: string }[] = [
  { id: "rigidbody", label: "Rigidbody" },
  { id: "collider", label: "Collider" },
  { id: "isTrigger", label: "Is Trigger" },
];

export function renderTask10() {
  // Почти готовая игра с тремя багами из пройденных заданий:
  // стене лишний Rigidbody (задание 4), камера в Update (задание 5),
  // в AddScore нет обновления текста (задание 7). Остальное — исправно.
  const config: Record<ObjId, BodyConfig> = {
    player: { rigidbody: true, collider: true, isTrigger: false },
    coin: { rigidbody: false, collider: true, isTrigger: true },
    wall: { rigidbody: true, collider: true, isTrigger: false },
  };
  let camMethod: CamMethod = "Update";

  render(
    renderTaskLayout({
      n: 10,
      title: "Финальный баг",
      leads: [
        "Вот почти готовая игра: кубик едет, собирает монетки, камера следует за ним, счёт на экране. Но в ней сразу <b>три бага</b> — и каждый из них ты уже чинил(а) раньше в этом курсе.",
        "Нажми Play, посмотри, что ведёт себя не так, и найди все три. Подсветки, где искать, нет — как в настоящей отладке.",
      ],
      hints: [
        "Каждый из этих багов ты уже чинил(а) раньше. Посмотри, что на сцене ведёт себя не так, — и вспомни, где было похожее.",
        "Баг 1: кубик не останавливается у стены. Вспомни задание 4 — какие компоненты нужны неподвижной преграде?",
        "Баг 2: камера подёргивается, пока едет. Вспомни задание 5 — в каком методе должна работать камера?",
        "Баг 3: счёт на экране не совпадает с настоящим. Вспомни задание 7 — какой строки не хватает в AddScore?",
      ],
      sceneTabLabel: "Game",
      sceneHtml: `<canvas id="canvas"></canvas>`,
      initialStatus: "Нажми Play и посмотри, что не так.",
      wideInspector: true,
      finishButton: true,
      playLabel: "▶ Play",
      inspectorHtml: `
        <div class="section-card">
          <p class="section-title">Компоненты</p>
          ${OBJECTS.map(
            (o) => `
            <p class="comp-obj">${o.icon} ${o.name}</p>
            <div class="comp-toggles">
              ${COMPS.map((c) => `<button type="button" class="comp-toggle" data-obj="${o.id}" data-comp="${c.id}" aria-pressed="false">${c.label}</button>`).join("")}
            </div>`
          ).join("")}
        </div>
        <div class="section-card">
          <p class="section-title">CameraFollow.cs</p>
          <div class="code-frame">
            <div class="method-pick">
              <div class="seg" id="method-seg" role="radiogroup" aria-label="Метод камеры">
                <button type="button" class="seg-btn" data-value="Update" role="radio"><code>void Update()</code></button>
                <button type="button" class="seg-btn" data-value="LateUpdate" role="radio"><code>void LateUpdate()</code></button>
              </div>
            </div>
            <div class="code-static">{</div>
            ${(["calc", "lockY", "assign"] as const).map((id) => `<div class="code-static code-indent">${CAM_LINES[id].code}</div>`).join("")}
            <div class="code-static">}</div>
          </div>
        </div>
        <div class="section-card">
          <p class="section-title">Player.cs</p>
          <div id="palette" class="palette palette--code">
            ${PALETTE.map((id) => `<div class="block block--code" draggable="true" data-block="${id}">${LABELS[id]}</div>`).join("")}
          </div>
          <div class="code-frame">
            <div class="code-static"><span class="kw">void</span> OnTriggerEnter(Collider other) {</div>
            <div class="code-static code-indent">Destroy(other.gameObject);</div>
            <div class="code-static code-indent">AddScore();</div>
            <div class="code-static">}</div>
            <div class="code-static code-gap"><span class="kw">void</span> AddScore() {</div>
            <div id="sequence" class="sequence sequence--code"></div>
            <div class="code-static">}</div>
          </div>
          <button id="clear-btn" class="text-btn">Очистить метод</button>
        </div>
      `,
    })
  );

  const canvas = document.querySelector<HTMLCanvasElement>("#canvas")!;
  const status = document.querySelector<HTMLDivElement>("#viewport-status")!;
  const runBtn = document.querySelector<HTMLButtonElement>("#run-btn")!;
  const consoleUi = setupConsole();
  const next = setupNextButtons(() => {
    progress.exitPoint = "completed";
    renderReflection();
  });

  let score = 0;
  let labelText = "0";
  const hud = () => ({ right: `Счёт: ${labelText}`, left: `score в памяти = ${score}` });
  const specs = (): ObjectSpec[] => [
    { id: "player", kind: "player", name: "Кубик", x: 40, cfg: { ...config.player } },
    { id: "coin1", kind: "coin", name: "Монетка", x: 220, cfg: { ...config.coin } },
    { id: "coin2", kind: "coin", name: "Монетка", x: 340, cfg: { ...config.coin } },
    { id: "coin3", kind: "coin", name: "Монетка", x: 460, cfg: { ...config.coin } },
    { id: "wall", kind: "wall", name: "Стена", x: 640, cfg: { ...config.wall } },
  ];
  const scene = new Scene2D(canvas, specs(), { worldWidth: 760, duration: 4.6, camera: camMethod });
  scene.setHandlers({ hud });
  new ResizeObserver(() => scene.resize()).observe(canvas);

  const builder = setupSequenceBuilder<ScoreLine>({
    labels: LABELS,
    initial: ["inc"], // баг 3: строку обновления текста "забыли"
    emptyText: `<span class="only-desktop">Перетащи строки сюда (или кликни по строке)</span><span class="only-mobile">Нажимай на строки выше</span>`,
  });

  // ---------- Компоненты ----------
  const syncToggles = () => {
    document.querySelectorAll<HTMLButtonElement>(".comp-toggle").forEach((btn) => {
      const cfg = config[btn.dataset.obj as ObjId];
      const comp = btn.dataset.comp as CompId;
      btn.setAttribute("aria-pressed", String(cfg[comp]));
      if (comp === "isTrigger") btn.disabled = !cfg.collider;
    });
    scene.setSpecs(specs());
  };
  document.querySelectorAll<HTMLButtonElement>(".comp-toggle").forEach((btn) =>
    btn.addEventListener("click", () => {
      const cfg = config[btn.dataset.obj as ObjId];
      const comp = btn.dataset.comp as CompId;
      cfg[comp] = !cfg[comp];
      if (!cfg.collider) cfg.isTrigger = false;
      syncToggles();
    })
  );
  syncToggles();

  // ---------- Метод камеры ----------
  const syncMethod = () => {
    document.querySelectorAll<HTMLButtonElement>("#method-seg .seg-btn").forEach((b) => {
      const on = b.dataset.value === camMethod;
      b.classList.toggle("active", on);
      b.setAttribute("aria-checked", String(on));
    });
    scene.setOptions({ camera: camMethod });
  };
  document.querySelectorAll<HTMLButtonElement>("#method-seg .seg-btn").forEach((b) =>
    b.addEventListener("click", () => {
      camMethod = b.dataset.value as CamMethod;
      syncMethod();
    })
  );
  syncMethod();

  // ---------- Прогон ----------
  const runScene = async () => {
    const lines = builder.get();
    consoleUi.close();

    // ошибки компиляции — игра не запускается (как в задании 7)
    const badIdx = lines.findIndex((l) => l === "assignWrong" || l === "textWrong");
    if (badIdx !== -1) {
      registerAttempt(10, false, "compile");
      setStatus(status, "Ошибка компиляции — игра не запустилась. Открой Console.", "warn");
      consoleUi.push({
        ok: false,
        text:
          lines[badIdx] === "assignWrong"
            ? `error CS0029 (AddScore, строка ${badIdx + 1}): нельзя превратить Text в int. В Unity с ошибками компиляции игра вообще не запускается.`
            : `error CS0117 (AddScore, строка ${badIdx + 1}): у Text нет поля score. В Unity с ошибками компиляции игра вообще не запускается.`,
      });
      return;
    }

    score = 0;
    labelText = "0";
    scene.setHandlers({
      hud,
      onTriggerEnter: (other, api) => {
        if (other.kind !== "coin") return;
        api.destroy(other);
        for (const id of lines) {
          if (id === "inc") score += 1;
          else if (id === "label") labelText = String(score);
        }
      },
    });
    setStatus(status, "Игра идёт…");
    const result = await whileLocked(runBtn, () => scene.run());

    // Симптомы — что видно на сцене, а не готовые решения
    const symptoms: { code: string; text: string }[] = [];
    const add = (code: string, text: string) => symptoms.push({ code, text });
    const { player, coin, wall } = config;
    if (!player.rigidbody) add("player-no-rb", "Кубик вообще не едет.");
    else if (!player.collider || player.isTrigger) add("player-falls", "Кубик провалился сквозь пол.");
    if (wall.rigidbody) add("wall-rb", "Кубик не остановился у стены — её сносит ударом.");
    if (!wall.collider || wall.isTrigger) add("wall-no-collider", "Кубик проехал сквозь стену.");
    if (!coin.collider) add("coin-no-collider", "Монетки не подбираются — кубик проезжает сквозь них, будто их нет.");
    else if (!coin.isTrigger) add("coin-not-trigger", "Кубик спотыкается о монетки.");
    if (coin.rigidbody) add("coin-rb", "Монетки проваливаются сквозь пол.");
    if (camMethod === "Update") add("camera-update", "Камера подёргивается, пока едет за кубиком.");
    const collected = result.destroyed.filter((id) => id.startsWith("coin")).length;
    if (collected > 0 && score !== collected) add("score-extra", `Монеток собрано ${collected}, а score = ${score}.`);
    if (collected > 0 && labelText !== String(score))
      add(lines.includes("label") ? "label-before-inc" : "no-label", `На экране «${labelText}», а монеток собрано ${collected}.`);

    const ok = symptoms.length === 0 && collected === 3 && labelText === "3";
    registerAttempt(10, ok, symptoms.map((x) => x.code));

    setStatus(
      status,
      ok ? "Все баги найдены — игра работает как надо!" : `Что-то ещё не так: ${symptoms.length} ${symptoms.length === 1 ? "симптом" : symptoms.length < 5 ? "симптома" : "симптомов"}. Открой Console.`,
      ok ? "ok" : "warn"
    );
    consoleUi.push({
      ok,
      text: ok
        ? "Ты прошёл(прошла) весь путь от пустой сцены до рабочей мини-игры с движением, столкновениями, счётом и камерой. Это и есть день из жизни геймплей-программиста — только обычно на это уходит не 20 минут, а несколько недель."
        : symptoms[0]?.text ?? "Что-то пошло не так.",
      meta: `симптомов: ${symptoms.length}`,
      details: symptoms.length > 1
        ? `<div style="margin-top:10px"><span class="muted">// что ещё видно на сцене</span></div>${symptoms.slice(1).map((x) => `<div><span class="warn">[!]</span> ${x.text}</div>`).join("")}`
        : "",
    });
    if (ok) next.enable();
  };

  runBtn.addEventListener("click", runScene);
  setupFinishButton();
  setupHints(10);
  enterTask(10);
}