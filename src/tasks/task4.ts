import { Scene2D, type BodyConfig, type ObjectSpec } from "../engines/scene2d";
import { render, setupHints, setupNextButtons } from "../ui/shell";
import { renderTaskLayout, setStatus } from "../ui/taskLayout";
import { setupConsole } from "../ui/console";
import { registerAttempt } from "../state";
import { renderTask5 } from "./task5";

type ObjId = "player" | "wall" | "coin";
type CompId = keyof BodyConfig;

const OBJECTS: { id: ObjId; name: string; icon: string; x: number }[] = [
  { id: "player", name: "Кубик", icon: "🟦", x: 40 },
  { id: "coin", name: "Монетка", icon: "🪙", x: 260 },
  { id: "wall", name: "Стена", icon: "🧱", x: 470 },
];

const COMPS: { id: CompId; label: string }[] = [
  { id: "rigidbody", label: "Rigidbody" },
  { id: "collider", label: "Collider" },
  { id: "isTrigger", label: "Is Trigger" },
];

export function renderTask4() {
  // Стартовая сборка намеренно сломана в нескольких местах (как в задании 1)
  const config: Record<ObjId, BodyConfig> = {
    player: { rigidbody: true, collider: false, isTrigger: false },
    coin: { rigidbody: false, collider: true, isTrigger: false },
    wall: { rigidbody: true, collider: true, isTrigger: false },
  };

  render(
    renderTaskLayout({
      n: 4,
      title: "Коллайдер или Rigidbody?",
      leads: [
        "На сцене появились стена и монетка. Со стеной кубик должен столкнуться и остановиться, а монетку — проехать насквозь.",
        "Включи каждому объекту нужные компоненты и нажми Play — физика честно отыграет то, что ты выбрал.",
      ],
      hints: [
        "Подумай, кто из трёх объектов должен двигаться сам, кто — просто стоять на месте, а сквозь кого кубик должен проезжать.",
        "Rigidbody нужен только тому, кого двигает физика, — кубику. Collider нужен всем, кто участвует в касаниях. А проходимой монетку делает Is Trigger.",
      ],
      sceneHtml: `<canvas id="canvas"></canvas>`,
      initialStatus: "Настрой компоненты и нажми Play.",
      inspectorHtml: `
        <div class="section-card">
          <p class="section-title">Что делают компоненты</p>
          <p class="comp-help"><b>Rigidbody</b> — объект двигает физика, на него действует гравитация.</p>
          <p class="comp-help"><b>Collider</b> — у объекта есть форма для касаний. На сцене — зелёная рамка.</p>
          <p class="comp-help"><b>Is Trigger</b> — сквозь объект можно пройти, но движок сообщит о касании. На сцене — пунктир.</p>
        </div>
        ${OBJECTS.map(
          (o) => `
          <div class="section-card">
            <p class="section-title">${o.icon} ${o.name}</p>
            <div class="comp-toggles">
              ${COMPS.map(
                (c) => `<button type="button" class="comp-toggle" data-obj="${o.id}" data-comp="${c.id}" aria-pressed="false">${c.label}</button>`
              ).join("")}
            </div>
          </div>`
        ).join("")}
      `,
    })
  );

  const canvas = document.querySelector<HTMLCanvasElement>("#canvas")!;
  const status = document.querySelector<HTMLDivElement>("#viewport-status")!;
  const runBtn = document.querySelector<HTMLButtonElement>("#run-btn")!;
  const consoleUi = setupConsole();
  const next = setupNextButtons(renderTask5);

  const specs = (): ObjectSpec[] => OBJECTS.map((o) => ({ id: o.id, kind: o.id, name: o.name, x: o.x, cfg: { ...config[o.id] } }));
  const scene = new Scene2D(canvas, specs());
  new ResizeObserver(() => scene.resize()).observe(canvas);

  // ---------- Переключатели компонентов ----------
  const syncToggles = () => {
    document.querySelectorAll<HTMLButtonElement>(".comp-toggle").forEach((btn) => {
      const cfg = config[btn.dataset.obj as ObjId];
      const comp = btn.dataset.comp as CompId;
      btn.setAttribute("aria-pressed", String(cfg[comp]));
      // Is Trigger — это галочка самого коллайдера: без коллайдера её нет
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

  // ---------- Разбор: что не так с компонентами (по смыслу, не "сверка с ответом") ----------
  const diagnose = (): string[] => {
    const issues: string[] = [];
    const { player, wall, coin } = config;
    if (!player.rigidbody)
      issues.push("Кубик не сдвинулся: скрипт задаёт ему скорость, но двигает объекты физика — а она работает только с теми, у кого есть Rigidbody.");
    else if (!player.collider || player.isTrigger)
      issues.push("Кубик провалился сквозь пол — Rigidbody тянет его вниз, а держаться за пол нечем: нужен обычный коллайдер, без Is Trigger.");
    if (wall.rigidbody)
      issues.push("Если добавить Rigidbody стене, физика начнёт считать её движущимся объектом — она сдвигается от удара, а нам нужна неподвижная преграда.");
    if (!wall.collider || wall.isTrigger)
      issues.push("Сквозь стену можно проехать — у неё нет твёрдого коллайдера (без Is Trigger), остановить кубик нечему.");
    if (!coin.collider)
      issues.push("Монетка без коллайдера: кубик проезжает сквозь неё, но движок даже не узнаёт о касании — подобрать её будет невозможно.");
    else if (!coin.isTrigger)
      issues.push("Без Is Trigger монетка ведёт себя как стена — кубик об неё спотыкается, а не проходит сквозь неё.");
    if (coin.rigidbody)
      issues.push("Монетке не нужен Rigidbody — ей не нужно двигаться. С ним её тянет гравитация, и вместе с триггером она проваливается сквозь пол.");
    return issues;
  };

  const runScene = async () => {
    runBtn.disabled = true;
    consoleUi.close();
    setStatus(status, "Запускаю сцену…");
    const result = await scene.run();
    runBtn.disabled = false;

    const issues = diagnose();
    const ok = issues.length === 0;
    registerAttempt(4, ok);

    const verdict = ok
      ? "Именно так! Rigidbody — то, что двигает физика, Collider — форма для касаний, а Is Trigger — переключатель между «твёрдым» и «проходимым» объектом."
      : issues[0];

    setStatus(
      status,
      ok
        ? "Готово — кубик проехал сквозь монетку и остановился у стены."
        : `${issues.length > 1 ? `Найдено проблем: ${issues.length}. ` : ""}Открой Console, чтобы понять, что произошло.`,
      ok ? "ok" : "warn"
    );

    const summary = (Object.keys(config) as ObjId[])
      .map((id) => {
        const c = config[id];
        const parts = [c.rigidbody && "Rigidbody", c.collider && (c.isTrigger ? "Collider (Trigger)" : "Collider")].filter(Boolean);
        return `${OBJECTS.find((o) => o.id === id)!.name}: ${parts.length ? parts.join(" + ") : "—"}`;
      })
      .join(" · ");

    consoleUi.push({
      ok,
      text: verdict,
      meta: summary,
      details: `
        ${issues.length > 1 ? `<div style="margin-top:8px"><span class="muted">// другие проблемы:</span></div>${issues.slice(1).map((i) => `<div><span class="warn">[!]</span> ${i}</div>`).join("")}` : ""}
        <div style="margin-top:10px"><span class="muted">// что произошло на сцене</span></div>
        ${result.log.map((l) => `<div><span class="info">[i]</span> ${l}</div>`).join("") || `<div><span class="info">[i]</span> Ничего не произошло</div>`}
        ${ok ? `<div style="margin-top:8px"><span class="muted">// монетка сработала как триггер, но осталась на месте — подбирать её мы научим кубик в задании 6</span></div>` : ""}
      `,
    });

    if (ok) next.enable();
  };

  runBtn.addEventListener("click", runScene);
  setupHints();
}