// Общий конструктор "палитра блоков → сборка" для заданий 2 и 3.
//
// HTML5 drag-and-drop (draggable/dragstart/drop) не работает на тач-экранах —
// ни на iPhone, ни в эмуляции DevTools. Поэтому помимо перетаскивания:
//   • тап/клик по блоку в палитре добавляет его в конец сборки;
//   • у каждого блока в сборке есть ↑ ↓ для перестановки и × для удаления.
// Перетаскивание на десктопе продолжает работать как раньше.

export interface SequenceBuilder<T extends string> {
  get(): T[];
  clear(): void;
}

interface Options<T extends string> {
  labels: Record<T, string>;
  emptyText: string;
  paletteSelector?: string;
  sequenceSelector?: string;
  clearSelector?: string;
}

export function setupSequenceBuilder<T extends string>(opts: Options<T>): SequenceBuilder<T> {
  const sequenceEl = document.querySelector<HTMLDivElement>(opts.sequenceSelector ?? "#sequence")!;
  const paletteBlocks = document.querySelectorAll<HTMLElement>(`${opts.paletteSelector ?? "#palette"} .block`);

  let sequence: T[] = [];
  let dragPayload: { source: "palette" | "sequence"; block: T; index?: number } | null = null;
  let flashIndex: number | null = null;

  const renderSequence = () => {
    if (sequence.length === 0) {
      sequenceEl.innerHTML = `<p class="sequence-empty">${opts.emptyText}</p>`;
      return;
    }
    sequenceEl.innerHTML = sequence
      .map(
        (id, i) => `
        <div class="block seq-block${i === flashIndex ? " just-added" : ""}" draggable="true" data-index="${i}">
          <span class="seq-num">${i + 1}</span>
          <span class="seq-label">${opts.labels[id]}</span>
          <span class="seq-actions">
            <button type="button" class="seq-move" data-move-up="${i}" aria-label="Переместить выше" ${i === 0 ? "disabled" : ""}>↑</button>
            <button type="button" class="seq-move" data-move-down="${i}" aria-label="Переместить ниже" ${i === sequence.length - 1 ? "disabled" : ""}>↓</button>
            <button type="button" class="remove-btn" data-remove="${i}" aria-label="Убрать из сборки">×</button>
          </span>
        </div>`
      )
      .join("");
    flashIndex = null;
  };

  // ---------- Палитра: перетаскивание + тап ----------
  paletteBlocks.forEach((el) => {
    const id = el.dataset.block as T;
    el.addEventListener("dragstart", (e) => {
      dragPayload = { source: "palette", block: id };
      // Firefox не начинает перетаскивание без setData
      e.dataTransfer?.setData("text/plain", id);
    });
    el.addEventListener("click", () => {
      sequence.push(id);
      flashIndex = sequence.length - 1;
      renderSequence();
    });
  });

  // ---------- Сборка: слушатели вешаются один раз, через делегирование ----------
  sequenceEl.addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>("button");
    if (!btn) return;
    const { remove, moveUp, moveDown } = btn.dataset;
    if (remove !== undefined) {
      sequence.splice(Number(remove), 1);
    } else if (moveUp !== undefined) {
      const i = Number(moveUp);
      if (i > 0) {
        [sequence[i - 1], sequence[i]] = [sequence[i], sequence[i - 1]];
        flashIndex = i - 1;
      }
    } else if (moveDown !== undefined) {
      const i = Number(moveDown);
      if (i < sequence.length - 1) {
        [sequence[i], sequence[i + 1]] = [sequence[i + 1], sequence[i]];
        flashIndex = i + 1;
      }
    } else {
      return;
    }
    renderSequence();
  });

  sequenceEl.addEventListener("dragstart", (e) => {
    const item = (e.target as HTMLElement).closest<HTMLElement>(".seq-block");
    if (!item) return;
    const index = Number(item.dataset.index);
    dragPayload = { source: "sequence", block: sequence[index], index };
    e.dataTransfer?.setData("text/plain", String(index));
  });

  sequenceEl.addEventListener("dragover", (e) => e.preventDefault());
  sequenceEl.addEventListener("drop", (e) => {
    e.preventDefault();
    if (!dragPayload) return;

    // индекс вставки — по позиции курсора относительно существующих блоков
    const items = Array.from(sequenceEl.querySelectorAll<HTMLDivElement>(".seq-block"));
    let insertAt = items.length;
    for (let i = 0; i < items.length; i++) {
      const rect = items[i].getBoundingClientRect();
      if (e.clientY < rect.top + rect.height / 2) {
        insertAt = i;
        break;
      }
    }

    if (dragPayload.source === "palette") {
      sequence.splice(insertAt, 0, dragPayload.block);
    } else if (dragPayload.index !== undefined) {
      const [moved] = sequence.splice(dragPayload.index, 1);
      const adjusted = dragPayload.index < insertAt ? insertAt - 1 : insertAt;
      sequence.splice(adjusted, 0, moved);
    }
    dragPayload = null;
    renderSequence();
  });

  const clear = () => {
    sequence = [];
    renderSequence();
  };
  document.querySelector(opts.clearSelector ?? "#clear-btn")?.addEventListener("click", clear);

  renderSequence();

  return { get: () => sequence, clear };
}