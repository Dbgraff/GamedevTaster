const app = document.querySelector<HTMLDivElement>("#app")!;

export function render(html: string) {
  app.innerHTML = html;
}

// ---------- Тулбар (одинаковый на всех экранах, меняется только центральная кнопка) ----------
const PLAY_SVG = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`;
const RESTART_SVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.13-3.36L23 10M1 14l5.36 4.36A9 9 0 0020.49 15"/></svg>`;

export function renderToolbar(center?: { id: string; icon: "play" | "restart"; label: string }): string {
  const centerBtn = center
    ? `<button type="button" id="${center.id}" class="transport-btn play" aria-label="${center.label}">${
        center.icon === "play" ? PLAY_SVG : RESTART_SVG
      }</button>`
    : `<button type="button" class="transport-btn" aria-label="Play" disabled>${PLAY_SVG}</button>`;

  return `
    <div class="toolbar">
      <div class="menu-group">
        <span class="menu-label">File</span>
        <span class="menu-label">Edit</span>
        <span class="menu-label">Assets</span>
        <span class="menu-label">GameObject</span>
        <span class="menu-label">Component</span>
      </div>
      <div class="transport-group">
        <button type="button" class="transport-btn" aria-label="Шаг назад" disabled>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 19V5l-9 7 9 7z"/><path d="M20 19V5l-9 7 9 7z"/></svg>
        </button>
        ${centerBtn}
        <button type="button" class="transport-btn" aria-label="Пауза" disabled>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/></svg>
        </button>
      </div>
      <div class="toolbar-spacer"></div>
    </div>
  `;
}

// ---------- Дорожная карта из 10 заданий (раньше тут была декоративная Hierarchy) ----------
export const TASK_TITLES = [
  "Почини прыжок цифрами",
  "Собери прыжок из блоков",
  "Кубик учится двигаться",
  "Коллайдер или Rigidbody?",
  "Камера следует за кубиком",
  "Столкновение или прохождение?",
  "Счёт на экране",
  "Препятствия появляются сами",
  "Game Over",
  "Финальный баг",
];
export const TASKS_BUILT = 3; // сколько заданий пока реально реализовано

export function renderTaskListPanel(currentIndex: number): string {
  return `
    <p class="section-title" style="margin-bottom:12px">Задания</p>
    ${TASK_TITLES.map((title, i) => {
      const n = i + 1;
      const done = n < currentIndex;
      const current = n === currentIndex;
      const locked = n > TASKS_BUILT;
      const cls = current ? "hierarchy-item selected" : locked ? "hierarchy-item locked" : "hierarchy-item";
      const marker = done ? "✓" : String(n);
      return `<div class="${cls}"><span class="task-marker">${marker}</span>${title}</div>`;
    }).join("")}
  `;
}

// ---------- Двухуровневые подсказки ----------
// hints: [текст 1 уровня (наводящий вопрос), текст 2 уровня (прямое указание)]
export function renderHintBlock(hints: [string, string]): string {
  return `
    <div class="hint-block">
      <button type="button" id="hint-btn" class="text-btn hint-btn">💡 Подсказка</button>
      <div id="hint-text-1" class="hint-text" style="display:none">${hints[0]}</div>
      <div id="hint-text-2" class="hint-text" style="display:none">${hints[1]}</div>
    </div>
  `;
}
export function setupHints() {
  let level = 0;
  const btn = document.querySelector<HTMLButtonElement>("#hint-btn");
  const t1 = document.querySelector<HTMLDivElement>("#hint-text-1");
  const t2 = document.querySelector<HTMLDivElement>("#hint-text-2");
  btn?.addEventListener("click", () => {
    level++;
    if (level === 1 && t1) {
      t1.style.display = "block";
      if (btn) btn.textContent = "💡 Ещё подсказка";
    } else if (level >= 2 && t2) {
      t2.style.display = "block";
      if (btn) btn.style.display = "none";
    }
  });
}