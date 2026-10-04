// Общая консоль для всех заданий — одинаковое поведение везде:
//   • сама НЕ открывается — только когда игрок нажал вкладку Console;
//   • каждая попытка добавляет запись в историю: свежая сверху и целиком,
//     старые приглушены и свёрнуты до вердикта (детали прячутся);
//   • если консоль закрыта, на вкладке загорается точка "есть новое".

export interface AttemptEntry {
  ok: boolean;
  text: string; // главный вердикт — виден и у старых записей
  meta?: string; // короткая строка рядом с номером попытки (параметры и т.п.)
  details?: string; // подробный разбор (HTML) — только у свежей записи
}

const MAX_HISTORY = 10;

export function renderConsoleDrawer(): string {
  return `
    <div class="console-drawer" id="console-drawer">
      <div class="console-drawer-header">
        <span>Console</span>
        <button type="button" id="console-close" class="console-drawer-close" aria-label="Закрыть консоль">✕</button>
      </div>
      <div class="console" id="console-output">
        <span class="muted">&gt; Здесь будут результаты твоих попыток.</span>
      </div>
    </div>
  `;
}

export interface ConsolePanel {
  open(): void;
  close(): void;
  push(entry: AttemptEntry): void;
}

export function setupConsole(): ConsolePanel {
  const drawer = document.querySelector<HTMLDivElement>("#console-drawer")!;
  const output = document.querySelector<HTMLDivElement>("#console-output")!;
  const tabs = document.querySelectorAll<HTMLButtonElement>(".scene-tabs .tab-btn");
  const consoleTab = document.querySelector<HTMLButtonElement>('.scene-tabs .tab-btn[data-tab="console"]')!;

  const entries: (AttemptEntry & { n: number })[] = [];
  let attempt = 0;

  const open = () => {
    drawer.classList.add("open");
    consoleTab.classList.remove("has-new");
    tabs.forEach((btn) => btn.classList.toggle("active", btn.dataset.tab === "console"));
  };
  const close = () => {
    drawer.classList.remove("open");
    tabs.forEach((btn) => btn.classList.toggle("active", btn.dataset.tab !== "console"));
  };

  tabs.forEach((btn) => btn.addEventListener("click", () => (btn.dataset.tab === "console" ? open() : close())));
  document.querySelector("#console-close")?.addEventListener("click", close);

  const renderEntries = () => {
    output.innerHTML = entries
      .map(
        (e, i) => `
        <div class="attempt${i > 0 ? " attempt--old" : ""}">
          <div class="attempt-head">
            <span class="${e.ok ? "ok" : "warn"}">${e.ok ? "[✓]" : "[!]"}</span>
            Попытка ${e.n}${e.meta ? ` <span class="muted">· ${e.meta}</span>` : ""}
          </div>
          <div class="attempt-text">${e.text}</div>
          ${e.details ? `<div class="attempt-details">${e.details}</div>` : ""}
        </div>`
      )
      .join("");
    output.scrollTop = 0; // свежая запись всегда сверху — показываем её
  };

  const push = (entry: AttemptEntry) => {
    attempt += 1;
    entries.unshift({ ...entry, n: attempt });
    if (entries.length > MAX_HISTORY) entries.length = MAX_HISTORY;
    renderEntries();
    if (!drawer.classList.contains("open")) consoleTab.classList.add("has-new");
  };

  return { open, close, push };
}