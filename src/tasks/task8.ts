import { SpawnDemo, SPAWN_LINES, TARGET_SPAWNS, simulateSpawns, type SpawnLineId } from "../engines/spawnTimeline";
import { render, setupHints, setupNextButtons } from "../ui/shell";
import { renderTaskLayout, codeBlock, setStatus, whileLocked } from "../ui/taskLayout";
import { setupSequenceBuilder } from "../ui/sequenceBuilder";
import { setupConsole } from "../ui/console";
import { registerAttempt, enterTask } from "../state";
import { setupFinishButton } from "./finish";
import { renderTask9 } from "./task9";

// Уровень C: строки без комментариев-пояснений
const LABELS = Object.fromEntries(
  (Object.keys(SPAWN_LINES) as SpawnLineId[]).map((id) => [id, codeBlock(SPAWN_LINES[id])])
) as Record<SpawnLineId, string>;
const PALETTE: SpawnLineId[] = ["callNow", "repeat32", "instantiate", "invoke2", "repeat23"];
const fmt = (ts: number[]) => (ts.length ? ts.map((t) => `${+t.toFixed(1)}`).join(", ") + " с" : "—");

export function renderTask8() {
  render(
    renderTaskLayout({
      n: 8,
      title: "Препятствия появляются сами",
      leads: [
        "Дальше — задания без пояснений: код тот же, но комментариев-подсказок больше нет. Вспоминай, что уже знаешь.",
        "Пусть препятствия появляются сами: <b>первое — через 2 секунды после старта, дальше — каждые 3 секунды</b>. Собери два метода скрипта Spawner.",
        "Зелёные кружки на шкале под сценой — когда препятствия должны появиться, красные точки — когда появились на самом деле.",
      ],
      hints: [
        "Вспомни задание 1: там было два числа — сила прыжка и гравитация, и каждое отвечало за своё. Здесь тоже два числа отвечают за разное.",
        "Первое число в InvokeRepeating — когда метод сработает первый раз, второе — как часто повторять дальше. А то, что создаёт само препятствие, должно лежать внутри SpawnObstacle.",
        "Похожий пример из жизни: будильник «первый раз через 2 минуты, потом каждые 3» — это InvokeRepeating(\"Будильник\", 2f, 3f) в Start(). А сам звонок, то есть то, что происходит при каждом срабатывании, записывается внутри метода.",
      ],
      sceneTabLabel: "Game",
      sceneHtml: `<canvas id="canvas"></canvas>`,
      initialStatus: "Собери оба метода и нажми Play.",
      wideInspector: true,
      finishButton: true,
      inspectorHtml: `
        <div class="section-card">
          <p class="section-title">Spawner.cs</p>
          <div class="code-frame">
            <div class="code-static"><span class="kw">public class</span> Spawner : MonoBehaviour {</div>
            <div class="code-static code-indent"><span class="kw">public</span> GameObject obstaclePrefab;</div>
            <div class="code-static code-indent"><span class="kw">public</span> Transform spawnPoint;</div>
          </div>
        </div>
        ${[
          { id: "start", header: "void Start()" },
          { id: "body", header: "void SpawnObstacle()" },
        ]
          .map(
            (m) => `
          <div class="section-card method-card">
            <p class="section-title"><code>${m.header}</code></p>
            <div id="palette-${m.id}" class="palette palette--code">
              ${PALETTE.map((id) => `<div class="block block--code" draggable="true" data-block="${id}">${LABELS[id]}</div>`).join("")}
            </div>
            <div class="code-frame code-frame--tight">
              <div class="code-static">{</div>
              <div id="sequence-${m.id}" class="sequence sequence--code"></div>
              <div class="code-static">}</div>
            </div>
            <button id="clear-${m.id}" class="text-btn">Очистить метод</button>
          </div>`
          )
          .join("")}
      `,
    })
  );

  const canvas = document.querySelector<HTMLCanvasElement>("#canvas")!;
  const status = document.querySelector<HTMLDivElement>("#viewport-status")!;
  const runBtn = document.querySelector<HTMLButtonElement>("#run-btn")!;
  const consoleUi = setupConsole();
  const next = setupNextButtons(renderTask9);
  const demo = new SpawnDemo(canvas);
  new ResizeObserver(() => demo.resize()).observe(canvas);

  const empty = `<span class="only-desktop">Перетащи строки сюда (или кликни по строке)</span><span class="only-mobile">Нажимай на строки выше</span>`;
  const start = setupSequenceBuilder<SpawnLineId>({ labels: LABELS, emptyText: empty, paletteSelector: "#palette-start", sequenceSelector: "#sequence-start", clearSelector: "#clear-start" });
  const body = setupSequenceBuilder<SpawnLineId>({ labels: LABELS, emptyText: empty, paletteSelector: "#palette-body", sequenceSelector: "#sequence-body", clearSelector: "#clear-body" });

  const runScript = async () => {
    const s = start.get();
    const b = body.get();
    if (s.length === 0 && b.length === 0) {
      setStatus(status, "Оба метода пустые — добавь в них строки.", "warn");
      return;
    }
    consoleUi.close();
    const result = simulateSpawns(s, b);
    setStatus(status, "Идёт время…");
    await whileLocked(runBtn, () => demo.run(result));

    const sp = result.spawns;
    const exact = JSON.stringify(sp) === JSON.stringify(TARGET_SPAWNS);
    let verdict: string;
    let mistake = "";
    if (result.crashed) {
      mistake = "recursion";
      verdict = "StackOverflowException: SpawnObstacle() вызывает сам себя, тот — снова себя, и так без конца. Стек вызовов переполнился, игра упала.";
    } else if (result.avalanche) {
      mistake = "avalanche";
      verdict = "Лавина препятствий: каждый вызов SpawnObstacle запускает ещё одну серию повторов — и вызовов становится всё больше и больше.";
    } else if (sp.length === 0) {
      mistake = result.calls === 0 ? "never-called" : "no-instantiate";
      verdict =
        result.calls === 0
          ? "Ничего не появилось: SpawnObstacle так ни разу и не вызвался. Кто-то должен запустить его при старте игры."
          : `SpawnObstacle вызвался ${result.calls} раз, но внутри ничего не создаёт — препятствию неоткуда взяться.`;
    } else if (exact) {
      verdict = "Верно! Первое препятствие — через 2 секунды, дальше — каждые 3. InvokeRepeating сам ведёт расписание, а SpawnObstacle только создаёт препятствие при каждом вызове.";
    } else if (sp.includes(0)) {
      mistake = "spawn-at-start";
      verdict = "Препятствие появилось сразу в момент старта — что-то срабатывает прямо в Start(), без задержки.";
    } else if (sp.length === 1) {
      mistake = "once";
      verdict = `Появилось одно препятствие (в ${fmt(sp)}) — и всё. Invoke вызывает метод один раз; для повторов нужна другая команда.`;
    } else if (s.includes("repeat32") || b.includes("repeat32")) {
      mistake = "swapped";
      verdict = `Ритм не тот: препятствия появились в ${fmt(sp)}, а нужно в ${fmt(TARGET_SPAWNS)}. Проверь, какое из двух чисел отвечает за первый вызов, а какое — за интервал.`;
    } else if (TARGET_SPAWNS.every((t) => sp.includes(t)) && sp.length > TARGET_SPAWNS.length) {
      mistake = "double";
      verdict = `Препятствий больше, чем нужно: ${sp.length} вместо ${TARGET_SPAWNS.length} — какое-то действие выполняется дважды.`;
    } else {
      mistake = "wrong-rhythm";
      verdict = `Препятствия появились в ${fmt(sp)}, а нужно в ${fmt(TARGET_SPAWNS)}.`;
    }
    const ok = exact;
    registerAttempt(8, ok, mistake);

    setStatus(status, ok ? "Готово — препятствия идут ровно по расписанию." : "Расписание не то — открой Console.", ok ? "ok" : "warn");
    const code = (header: string, lines: SpawnLineId[]) =>
      `${header} {<br>${lines.map((id) => `&nbsp;&nbsp;${SPAWN_LINES[id]}`).join("<br>") || "&nbsp;&nbsp;<span class='muted'>// пусто</span>"}<br>}`;
    consoleUi.push({
      ok,
      text: verdict,
      meta: `появилось: ${sp.length > 40 ? "40+" : sp.length}`,
      details: `
        <div style="margin-top:10px"><span class="muted">// твой код</span></div>
        <div class="console-code">${code("void Start()", s)}<br>${code("void SpawnObstacle()", b)}</div>
        <div style="margin-top:10px"><span class="muted">// расписание</span></div>
        <div><span class="info">[i]</span> Нужно: ${fmt(TARGET_SPAWNS)}</div>
        <div><span class="info">[i]</span> Получилось: ${result.crashed ? "игра упала" : result.avalanche ? `лавина — ${sp.length > 40 ? "40+" : sp.length} препятствий` : fmt(sp)}</div>
        <div><span class="info">[i]</span> SpawnObstacle вызывался: ${result.crashed ? "бесконечно" : result.calls} раз</div>
      `,
    });
    if (ok) next.enable();
  };

  runBtn.addEventListener("click", runScript);
  setupFinishButton();
  setupHints(8);
  enterTask(8);
}