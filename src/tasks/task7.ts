import { Scene2D, CORRECT_COMPONENTS, type ObjectSpec } from "../engines/scene2d";
import { render, setupHints, setupNextButtons } from "../ui/shell";
import { renderTaskLayout, codeBlock, setStatus } from "../ui/taskLayout";
import { setupSequenceBuilder } from "../ui/sequenceBuilder";
import { setupConsole } from "../ui/console";
import { registerAttempt } from "../state";
import { showCheckpointModal } from "./checkpoint";

type LineId = "inc" | "label" | "assignWrong" | "textWrong";

const LINES: Record<LineId, { code: string; comment: string }> = {
  inc: { code: "score += 1;", comment: "увеличиваем внутреннюю переменную" },
  label: { code: "scoreLabel.text = score.ToString();", comment: "показываем счёт в текстовом поле" },
  assignWrong: { code: "score = scoreLabel;", comment: "кладём текстовое поле в счёт" },
  textWrong: { code: 'Text.score = "0";', comment: "обновляем текст на экране" },
};
const LABELS = Object.fromEntries(
  (Object.keys(LINES) as LineId[]).map((id) => [id, codeBlock(LINES[id].code, LINES[id].comment)])
) as Record<LineId, string>;
const PALETTE: LineId[] = ["label", "textWrong", "inc", "assignWrong"];

const SPECS: ObjectSpec[] = [
  { id: "player", kind: "player", name: "Кубик", x: 30, cfg: CORRECT_COMPONENTS.player },
  { id: "coin1", kind: "coin", name: "Монетка", x: 170, cfg: CORRECT_COMPONENTS.coin },
  { id: "coin2", kind: "coin", name: "Монетка", x: 280, cfg: CORRECT_COMPONENTS.coin },
  { id: "coin3", kind: "coin", name: "Монетка", x: 390, cfg: CORRECT_COMPONENTS.coin },
  { id: "wall", kind: "wall", name: "Стена", x: 520, cfg: CORRECT_COMPONENTS.wall },
];

// "Компиляция": две строки-ловушки дают настоящие ошибки C#
function compile(lines: LineId[]): string | null {
  for (let i = 0; i < lines.length; i++) {
    if (lines[i] === "assignWrong")
      return `error CS0029 (строка ${i + 1}): нельзя превратить Text в int — score хранит число, а scoreLabel — текстовое поле. Это перепутанные типы данных.`;
    if (lines[i] === "textWrong")
      return `error CS0117 (строка ${i + 1}): у Text нет поля score — Text это тип (вид объекта), а наш конкретный объект на экране называется scoreLabel.`;
  }
  return null;
}

export function renderTask7() {
  render(
    renderTaskLayout({
      n: 7,
      title: "Счёт на экране",
      leads: [
        "Монетки подбираются, переменная score растёт — а на экране всё ещё 0.",
        "Собери метод AddScore так, чтобы число на экране всегда совпадало с настоящим счётом. Фиолетовым на сцене показано, что хранится в памяти, — сравнивай.",
      ],
      hints: [
        "Переменная score и текст на экране — две разные вещи. Что должно случиться раньше: счёт вырасти или текст обновиться?",
        "Сначала score += 1, потом scoreLabel.text = score.ToString() — тогда текст берёт уже новое значение.",
      ],
      sceneTabLabel: "Game",
      sceneHtml: `<canvas id="canvas"></canvas>`,
      initialStatus: "Собери метод AddScore и нажми Play.",
      wideInspector: true,
      inspectorHtml: `
        <div class="section-card">
          <p class="section-title">Строки кода</p>
          <div id="palette" class="palette palette--code">
            ${PALETTE.map((id) => `<div class="block block--code" draggable="true" data-block="${id}">${LABELS[id]}</div>`).join("")}
          </div>
        </div>
        <div class="section-card">
          <p class="section-title">Player.cs</p>
          <div class="code-frame">
            <div class="code-static"><span class="kw">public class</span> Player : MonoBehaviour {</div>
            <div class="code-static code-indent"><span class="kw">public int</span> score = 0; <span class="code-comment">// хранит текущий счёт</span></div>
            <div class="code-static code-indent"><span class="kw">public</span> Text scoreLabel; <span class="code-comment">// текстовое поле на экране</span></div>
            <div class="code-static code-indent code-gap"><span class="kw">void</span> OnTriggerEnter(Collider other) {</div>
            <div class="code-static code-indent2">Destroy(other.gameObject); <span class="code-comment">// убрать монетку</span></div>
            <div class="code-static code-indent2">AddScore();</div>
            <div class="code-static code-indent">}</div>
            <div class="code-static code-indent code-gap"><span class="kw">void</span> AddScore() {</div>
            <div id="sequence" class="sequence sequence--code"></div>
            <div class="code-static code-indent">}</div>
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
  const next = setupNextButtons(showCheckpointModal);

  let score = 0;
  let labelText = "0";
  const hud = () => ({ right: `Счёт: ${labelText}`, left: `score в памяти = ${score}` });
  const scene = new Scene2D(canvas, SPECS);
  scene.setHandlers({ hud });
  new ResizeObserver(() => scene.resize()).observe(canvas);

  const builder = setupSequenceBuilder<LineId>({
    labels: LABELS,
    emptyText: `<span class="only-desktop">Перетащи строки сюда (или кликни по строке)</span><span class="only-mobile">Нажимай на строки выше — они встанут сюда по порядку</span>`,
  });

  const runScene = async () => {
    const lines = builder.get();
    if (lines.length === 0) {
      setStatus(status, "Метод AddScore пустой — добавь в него строки.", "warn");
      return;
    }
    consoleUi.close();
    const code = `void AddScore() {<br>${lines.map((id) => `&nbsp;&nbsp;${LINES[id].code}`).join("<br>")}<br>}`;

    const error = compile(lines);
    if (error) {
      registerAttempt(7, false);
      setStatus(status, "Ошибка компиляции — игра не запустилась. Открой Console.", "warn");
      consoleUi.push({
        ok: false,
        text: `${error} В Unity с ошибками компиляции игра вообще не запускается.`,
        details: `<div style="margin-top:10px"><span class="muted">// твой метод</span></div><div class="console-code">${code}</div>`,
      });
      return;
    }

    score = 0;
    labelText = "0";
    scene.setHandlers({
      hud,
      onTriggerEnter: (other, api) => {
        api.destroy(other);
        for (const id of lines) {
          if (id === "inc") score += 1;
          else if (id === "label") labelText = String(score);
        }
        api.log(`AddScore(): score = ${score}, на экране «${labelText}»`);
      },
    });

    runBtn.disabled = true;
    setStatus(status, "Кубик собирает монетки…");
    const result = await scene.run();
    runBtn.disabled = false;

    const ok = score === 3 && labelText === "3";
    registerAttempt(7, ok);
    const incIdx = lines.indexOf("inc");
    const labelIdx = lines.indexOf("label");

    let verdict: string;
    if (ok) {
      verdict = "Точно! Частый момент путаницы у новичков: сама переменная score и то, что видно на экране, — две разные вещи, и их нужно синхронизировать вручную каждый раз.";
    } else if (incIdx === -1) {
      verdict = "Счёт не растёт вообще — в методе нет score += 1, увеличивать нечему.";
    } else if (labelIdx === -1) {
      verdict = `В памяти score = ${score}, а на экране всё ещё «${labelText}»: текст в интерфейсе сам не обновляется — его нужно явно записать в scoreLabel.text.`;
    } else if (labelIdx < incIdx && score === 3) {
      verdict = `На экране «${labelText}», а монеток собрано ${score} — текст обновляется ДО того, как score вырос, и всё время показывает старое значение.`;
    } else if (score !== 3) {
      verdict = `Монеток было 3, а score = ${score} — score += 1 срабатывает больше одного раза за монетку.`;
    } else {
      verdict = `В памяти ${score}, на экране «${labelText}» — значения разошлись. Проверь порядок строк.`;
    }

    setStatus(
      status,
      ok ? "Готово — на экране ровно столько, сколько монеток собрано." : "Счёт на экране не совпадает с настоящим — открой Console.",
      ok ? "ok" : "warn"
    );
    consoleUi.push({
      ok,
      text: verdict,
      meta: `в памяти ${score} · на экране «${labelText}»`,
      details: `
        <div style="margin-top:10px"><span class="muted">// твой метод</span></div>
        <div class="console-code">${code}</div>
        <div style="margin-top:10px"><span class="muted">// что произошло на сцене</span></div>
        ${result.log.map((l) => `<div><span class="info">[i]</span> ${l}</div>`).join("")}
      `,
    });
    if (ok) next.enable();
  };

  runBtn.addEventListener("click", runScene);
  setupHints();
}