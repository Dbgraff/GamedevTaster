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
// Задания, где после проверки можно ещё и самому порулить персонажем с клавиатуры.
const KEYBOARD_CONTROL_TASKS = new Set([1, 3]);

export function renderTaskListPanel(currentIndex: number): string {
  return `
    <div class="task-roadmap">
      <p class="section-title" style="margin-bottom:12px">Задания</p>
      ${TASK_TITLES.map((title, i) => {
        const n = i + 1;
        const done = n < currentIndex;
        const current = n === currentIndex;
        const locked = n > TASKS_BUILT;
        const cls = current ? "hierarchy-item selected" : locked ? "hierarchy-item locked" : "hierarchy-item";
        const marker = done ? "✓" : String(n);
        const gamepad = KEYBOARD_CONTROL_TASKS.has(n) ? ` <span title="Можно управлять с клавиатуры">🎮</span>` : "";
        return `<div class="${cls}"><span class="task-marker">${marker}</span>${title}${gamepad}</div>`;
      }).join("")}
    </div>
  `;
}

// ---------- Приветственная модалка (заменила отдельный экран интро) ----------
// Показывается поверх задания 1 при первом заходе и после "Пройти заново".
// Числа берутся из TASK_TITLES / TASKS_BUILT, чтобы текст не устаревал,
// когда добавятся новые задания (как было с "2 коротких задачи").
export function isModalOpen(): boolean {
  return document.querySelector(".modal-backdrop") !== null;
}

export function showIntroModal(onClose?: () => void) {
  if (isModalOpen()) return;

  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.innerHTML = `
    <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="intro-modal-title">
      <p class="eyebrow">Попробуй профессию · программист в геймдеве</p>
      <h1 id="intro-modal-title">Сейчас ты побудешь геймплей-программистом</h1>
      <p class="lead">
        Ты будешь чинить и собирать поведение кубика в редакторе, похожем на Unity:
        сначала подкручивать числа, потом собирать логику из блоков, а ближе к концу —
        работать с настоящим кодом. Никакой теории заранее — сразу практика.
      </p>
      <ul class="modal-list">
        <li><span class="info-dot"></span>Сейчас доступно ${TASKS_BUILT} из ${TASK_TITLES.length} заданий, каждое — на несколько минут</li>
        <li><span class="info-dot"></span>Застрял — жми «💡 Подсказка», у каждого задания их две</li>
        <li><span class="info-dot"></span>Что пошло не так и почему — во вкладке Console рядом со сценой</li>
        <li><span class="info-dot"></span>В конце — короткий разбор: что тебе зашло больше</li>
        <li class="keyboard-hint"><span class="info-dot"></span>🎮 В заданиях с этим значком можно управлять кубиком с клавиатуры</li>
      </ul>
      <button type="button" class="primary" data-modal-close>▶ Начать</button>
    </div>
  `;

  const close = () => {
    window.removeEventListener("keydown", onKey);
    backdrop.remove();
    onClose?.();
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") close();
  };

  backdrop.querySelector("[data-modal-close]")!.addEventListener("click", close);
  window.addEventListener("keydown", onKey);
  document.body.appendChild(backdrop);
  // Фокус на кнопке — чтобы Enter/пробел закрывали окно, а не уходили в сцену
  backdrop.querySelector<HTMLButtonElement>("[data-modal-close]")!.focus();
}

// ---------- Мобильная шапка (из макета №3): "Задача N из 10" + ☰ ----------
// На десктопе скрыта через CSS. ☰ раскрывает список заданий, который на узких
// экранах по умолчанию спрятан, чтобы не отодвигать само задание вниз.
export function renderMobileHeader(currentIndex: number): string {
  return `
    <div class="mobile-header">
      <span class="mobile-header-title">Задача ${currentIndex} из ${TASK_TITLES.length}</span>
      <button type="button" class="mobile-header-menu" data-roadmap-toggle aria-label="Список заданий" aria-expanded="false">☰</button>
    </div>
  `;
}

// Один делегированный слушатель на весь документ — переживает любые перерисовки экранов.
document.addEventListener("click", (e) => {
  const toggle = (e.target as HTMLElement).closest<HTMLElement>("[data-roadmap-toggle]");
  if (!toggle) return;
  const shell = toggle.closest<HTMLElement>(".editor-shell");
  const open = shell?.classList.toggle("roadmap-open") ?? false;
  toggle.setAttribute("aria-expanded", String(open));
  toggle.textContent = open ? "✕" : "☰";
});

// ---------- Кнопка "Дальше" — на мобильном дублируется рядом с Play ----------
// На узких экранах левая панель с описанием задания уходит наверх страницы,
// а Play — вниз и приклеена к экрану. Если "Дальше" жила бы только в левой
// панели, после решения задачи пришлось бы скроллить обратно наверх, чтобы
// её найти. Поэтому рендерим две кнопки с одним data-атрибутом и держим
// их disabled-состояние в синхроне.
export function renderNextButton(label = "Дальше →"): string {
  return `<button type="button" data-next-btn class="secondary full next-btn" disabled>${label}</button>`;
}
export function setupNextButtons(onClick: () => void) {
  const buttons = document.querySelectorAll<HTMLButtonElement>("[data-next-btn]");
  buttons.forEach((btn) => btn.addEventListener("click", onClick));
  return { enable: () => buttons.forEach((btn) => (btn.disabled = false)) };
}

// ---------- Растягиваемые боковые панели (Hierarchy слева, Inspector справа) ----------
export function renderResizeHandle(side: "left" | "right"): string {
  return `<div class="resize-handle resize-handle--${side}" data-resize-handle><div class="resize-grip"><span></span><span></span><span></span></div></div>`;
}

// Слушатели вешаются один раз на уровне модуля (document/window), а не при
// каждом рендере экрана — иначе при каждой навигации копился бы новый набор
// слушателей поверх уже отрисованных (и тут же удалённых) элементов.
interface DragState {
  target: HTMLElement;
  startX: number;
  startWidth: number;
  invert: boolean;
  min: number;
  max: number;
}
let dragState: DragState | null = null;

function beginResize(handle: HTMLElement, clientX: number) {
  const prevEl = handle.previousElementSibling as HTMLElement | null;
  const nextEl = handle.nextElementSibling as HTMLElement | null;
  let target: HTMLElement | null = null;
  let invert = false;
  if (prevEl?.classList.contains("hierarchy")) {
    target = prevEl;
    invert = false;
  } else if (nextEl?.classList.contains("inspector")) {
    target = nextEl;
    invert = true;
  }
  if (!target) return;
  const isHierarchy = target.classList.contains("hierarchy");
  dragState = {
    target,
    startX: clientX,
    startWidth: target.getBoundingClientRect().width,
    invert,
    min: isHierarchy ? 260 : 240,
    max: isHierarchy ? 520 : 460,
  };
  document.body.style.cursor = "col-resize";
  document.body.style.userSelect = "none";
}

function updateResize(clientX: number) {
  if (!dragState) return;
  const delta = dragState.invert ? dragState.startX - clientX : clientX - dragState.startX;
  const width = Math.max(dragState.min, Math.min(dragState.max, dragState.startWidth + delta));
  dragState.target.style.width = `${width}px`;
}

function endResize() {
  if (!dragState) return;
  dragState = null;
  document.body.style.cursor = "";
  document.body.style.userSelect = "";
}

document.addEventListener("mousedown", (e) => {
  const handle = (e.target as HTMLElement).closest<HTMLElement>("[data-resize-handle]");
  if (handle) beginResize(handle, e.clientX);
});
window.addEventListener("mousemove", (e) => updateResize(e.clientX));
window.addEventListener("mouseup", endResize);

document.addEventListener(
  "touchstart",
  (e) => {
    const handle = (e.target as HTMLElement).closest<HTMLElement>("[data-resize-handle]");
    if (handle) beginResize(handle, e.touches[0].clientX);
  },
  { passive: true }
);
window.addEventListener("touchmove", (e) => dragState && updateResize(e.touches[0].clientX), { passive: true });
window.addEventListener("touchend", endResize);

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