import { CameraFollowDemo, CAM_LINES, compileCameraScript, type CamLineId, type CamMethod, type CamRunStats } from "../engines/cameraFollow";
import { render, setupHints, setupNextButtons } from "../ui/shell";
import { renderTaskLayout, codeBlock, setStatus } from "../ui/taskLayout";
import { setupSequenceBuilder } from "../ui/sequenceBuilder";
import { setupConsole } from "../ui/console";
import { registerAttempt } from "../state";
import { renderTask6 } from "./task6";

const PALETTE: CamLineId[] = ["assign", "recalcOffset", "calc", "direct", "lockY"];
const CORRECT: CamLineId[] = ["calc", "lockY", "assign"];
const LABELS = Object.fromEntries(
  (Object.keys(CAM_LINES) as CamLineId[]).map((id) => [id, codeBlock(CAM_LINES[id].code, CAM_LINES[id].comment)])
) as Record<CamLineId, string>;

export function renderTask5() {
  let method: CamMethod | null = null;

  render(
    renderTaskLayout({
      n: 5,
      title: "Камера следует за кубиком",
      leads: [
        "Кубик научился ездить — и тут же убегает за край экрана, потому что камера стоит на месте. Научим её следовать за ним.",
        "Это уже настоящий C#. Выбери, в каком методе работает скрипт камеры, и расставь строки по порядку — комментарии после <code>//</code> подсказывают, что делает каждая. Лишние строки тоже есть.",
      ],
      hints: [
        "Камера должна сначала понять, куда ей встать, и только потом туда переместиться. И подумай: в какой момент кадра кубик уже точно закончил двигаться?",
        "Метод — LateUpdate: он вызывается после всех Update. Порядок строк: посчитать targetPosition → зафиксировать y → присвоить transform.position.",
      ],
      sceneTabLabel: "Game",
      sceneHtml: `<canvas id="canvas"></canvas>`,
      initialStatus: "Выбери метод, собери строки и нажми Play.",
      wideInspector: true,
      inspectorHtml: `
        <div class="section-card">
          <p class="section-title">Строки кода</p>
          <div id="palette" class="palette palette--code">
            ${PALETTE.map((id) => `<div class="block block--code" draggable="true" data-block="${id}">${LABELS[id]}</div>`).join("")}
          </div>
        </div>
        <div class="section-card">
          <p class="section-title">CameraFollow.cs</p>
          <div class="code-frame">
            <div class="code-static"><span class="kw">public class</span> CameraFollow : MonoBehaviour {</div>
            <div class="code-static code-indent"><span class="kw">public</span> Transform player; <span class="code-comment">// за кем следим</span></div>
            <div class="code-static code-indent"><span class="kw">public</span> Vector3 offset; <span class="code-comment">// на сколько камера правее и выше кубика</span></div>
            <div class="code-indent method-pick">
              <div class="seg" id="method-seg" role="radiogroup" aria-label="Метод">
                <button type="button" class="seg-btn" data-value="Update" role="radio" aria-checked="false"><code>void Update()</code></button>
                <button type="button" class="seg-btn" data-value="LateUpdate" role="radio" aria-checked="false"><code>void LateUpdate()</code></button>
              </div>
              <span class="code-comment method-note" id="method-note">// выбери метод</span>
            </div>
            <div class="code-static code-indent">{</div>
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
  const methodNote = document.querySelector<HTMLSpanElement>("#method-note")!;
  const consoleUi = setupConsole();
  const next = setupNextButtons(renderTask6);
  const demo = new CameraFollowDemo(canvas);
  new ResizeObserver(() => demo.resize()).observe(canvas);

  const builder = setupSequenceBuilder<CamLineId>({
    labels: LABELS,
    emptyText: `<span class="only-desktop">Перетащи строки сюда (или кликни по строке)</span><span class="only-mobile">Нажимай на строки выше — они встанут сюда по порядку</span>`,
  });

  const NOTES: Record<CamMethod, string> = {
    Update: "// вызывается каждый кадр",
    LateUpdate: "// вызывается каждый кадр, после всех Update",
  };
  document.querySelectorAll<HTMLButtonElement>("#method-seg .seg-btn").forEach((btn) =>
    btn.addEventListener("click", () => {
      method = btn.dataset.value as CamMethod;
      document.querySelectorAll<HTMLButtonElement>("#method-seg .seg-btn").forEach((b) => {
        const on = b === btn;
        b.classList.toggle("active", on);
        b.setAttribute("aria-checked", String(on));
      });
      methodNote.textContent = NOTES[method];
    })
  );

  // Вердикт опирается на то, что реально сняла камера (stats), а не только на
  // порядок строк: например, пересчёт offset ломает камеру, только если стоит
  // ДО расчёта targetPosition, — после него он просто лишний.
  const verdictFor = (m: CamMethod, lines: CamLineId[], stats: CamRunStats): string => {
    const idx = (id: CamLineId) => lines.indexOf(id);
    if (!stats.cameraMoved) {
      if (lines.includes("recalcOffset") && idx("recalcOffset") < idx("calc"))
        return "Камера не двигается: offset пересчитывается из того места, где камера уже стоит, ещё до расчёта targetPosition — и targetPosition каждый раз получается ровно там же.";
      if (!lines.includes("assign") && !lines.includes("direct"))
        return "Позиция посчитана, но камере её так никто и не присвоил — transform.position не меняется, и кубик уезжает из кадра.";
      return "Камера так и не сдвинулась — проверь, что в методе есть строка, которая меняет transform.position, и что её ничего не отменяет.";
    }
    if (lines.includes("direct"))
      return "Камера прилипла к кубику: transform.position = player.position выкидывает offset, поэтому кубик в центре кадра, а камера повторяет каждый его прыжок.";
    if (stats.bob > 4)
      return "Камера прыгает вместе с кубиком: высоту нужно зафиксировать ДО того, как присвоить позицию — строка про y должна стоять перед transform.position = targetPosition.";
    if (m === "Update" && stats.jitter > 0.8)
      return "Порядок строк верный, но камера подёргивается: в Update нет гарантии, что кубик уже сдвинулся в этом кадре — иногда камера смотрит на его старую позицию. Для камеры есть LateUpdate.";
    if (JSON.stringify(lines) !== JSON.stringify(CORRECT))
      return "Камера следует нормально, но в методе есть лишние строки — например, offset не нужно пересчитывать каждый кадр, он задаётся один раз. Лишний код — лишний шанс что-то сломать.";
    return "Верно! Важен не только порядок строк, но и то, что код лежит в LateUpdate: он вызывается после всех Update, поэтому камера всегда смотрит на кубик, который уже закончил двигаться в этом кадре.";
  };

  const runScript = async () => {
    const lines = builder.get();
    if (!method) {
      setStatus(status, "Сначала выбери метод: Update или LateUpdate.", "warn");
      return;
    }
    if (lines.length === 0) {
      setStatus(status, "Метод пустой — добавь в него строки.", "warn");
      return;
    }
    consoleUi.close();

    const compiled = compileCameraScript(lines);
    const code = lines.map((id, i) => `${i + 1}. ${CAM_LINES[id].code}`).join("<br>");

    if (!compiled.ok) {
      // В Unity с ошибками компиляции игра вообще не запускается
      registerAttempt(5, false);
      demo.reset();
      setStatus(status, "Ошибка компиляции — игра не запустилась. Открой Console.", "warn");
      consoleUi.push({
        ok: false,
        text: `${compiled.error}. В Unity с ошибками компиляции игра вообще не запускается — сначала нужно исправить код.`,
        meta: `${method}()`,
        details: `<div style="margin-top:10px"><span class="muted">// твой метод</span></div><div class="console-code">${code}</div>`,
      });
      return;
    }

    runBtn.disabled = true;
    setStatus(status, "Камера снимает…");
    const stats = await demo.run(method, lines);
    runBtn.disabled = false;

    const ok = method === "LateUpdate" && JSON.stringify(lines) === JSON.stringify(CORRECT);
    registerAttempt(5, ok);
    const verdict = verdictFor(method, lines, stats);

    setStatus(
      status,
      ok ? "Готово — камера плавно едет за кубиком и не прыгает." : "Камера ведёт себя не так — открой Console, чтобы понять почему.",
      ok ? "ok" : "warn"
    );
    consoleUi.push({
      ok,
      text: verdict,
      meta: `${method}() · строк: ${lines.length}`,
      details: `
        <div style="margin-top:10px"><span class="muted">// твой метод</span></div>
        <div class="console-code">${code}</div>
        <div style="margin-top:10px"><span class="muted">// что увидел игрок</span></div>
        <div><span class="info">[i]</span> Камера ${stats.cameraMoved ? "двигалась" : "стояла на месте"}${stats.playerLeftScreen ? ", кубик уехал из кадра" : ""}</div>
        <div><span class="info">[i]</span> Вертикальная качка кадра: ${Math.round(stats.bob)}px${stats.bob > 4 ? " — картинка прыгает вместе с кубиком" : ""}</div>
        <div><span class="info">[i]</span> Подёргивание: ${stats.jitter.toFixed(1)}px/кадр${stats.jitter > 0.8 ? " — камера то отстаёт, то догоняет" : ""}</div>
      `,
    });
    if (ok) next.enable();
  };

  runBtn.addEventListener("click", runScript);
  setupHints();
}