import { render, renderToolbar, renderTaskListPanel } from "../ui/shell";
import { renderNumbersTask } from "./task1";

export function renderIntro() {
  render(`
    <div class="editor-shell">
      ${renderToolbar({ id: "toolbar-play", icon: "play", label: "Начать" })}

      <div class="editor-main">
        <div class="hierarchy">
          ${renderTaskListPanel(1)}
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
            <div class="info-row"><span class="info-dot"></span>🎮 В заданиях с этим значком можно порулить персонажем самому</div>
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