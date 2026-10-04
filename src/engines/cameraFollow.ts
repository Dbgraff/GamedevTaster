// Движок задания 5 («Камера следует за кубиком»).
//
// Собранные строки C# сначала "компилируются" (проверка порядка объявления
// переменной — как настоящая ошибка CS0841 в Unity), а потом каждый кадр
// выполняются по порядку. Кубик сам едет вправо и подпрыгивает.
//
// Почему Update дёргается: в Unity порядок вызова Update у разных объектов
// не гарантирован — камера иногда читает позицию кубика ДО того, как он
// сдвинулся в этом кадре. LateUpdate вызывается после всех Update, поэтому
// всегда видит актуальную позицию. Здесь это смоделировано: в Update камера
// случайно получает позицию на 0–2 кадра старее.

export type CamLineId = "calc" | "lockY" | "assign" | "direct" | "recalcOffset";
export type CamMethod = "Update" | "LateUpdate";

export const CAM_LINES: Record<CamLineId, { code: string; comment: string }> = {
  calc: { code: "Vector3 targetPosition = player.position + offset;", comment: "считаем, где должна встать камера" },
  lockY: { code: "targetPosition.y = transform.position.y;", comment: "не даём камере двигаться по высоте" },
  assign: { code: "transform.position = targetPosition;", comment: "перемещаем саму камеру" },
  direct: { code: "transform.position = player.position;", comment: "ставим камеру прямо на кубик" },
  recalcOffset: { code: "offset = transform.position - player.position;", comment: "пересчитываем отступ от кубика" },
};

export interface CompileResult {
  ok: boolean;
  error?: string;
}

const USES_TARGET: CamLineId[] = ["lockY", "assign"];

export function compileCameraScript(lines: CamLineId[]): CompileResult {
  let declared = false;
  for (let i = 0; i < lines.length; i++) {
    const id = lines[i];
    if (USES_TARGET.includes(id) && !declared) {
      return {
        ok: false,
        error: `error CS0841 (строка ${i + 1}): нельзя использовать переменную 'targetPosition' до того, как она объявлена`,
      };
    }
    if (id === "calc") {
      if (declared) {
        return {
          ok: false,
          error: `error CS0128 (строка ${i + 1}): переменная 'targetPosition' уже объявлена выше — второй раз объявить её нельзя`,
        };
      }
      declared = true;
    }
  }
  return { ok: true };
}

interface Vec {
  x: number;
  y: number;
}

const FPS = 60;
const DURATION = 4.2;
const SPEED = 190;
const JUMP_PERIOD = 1.1;
const JUMP_TIME = 0.55;
const JUMP_H = 70;
const START_OFFSET: Vec = { x: 140, y: 100 }; // камера правее и выше кубика
const CAM_BASE_Y = START_OFFSET.y;

function playerAt(frame: number): Vec {
  const t = frame / FPS;
  const x = 40 + SPEED * t;
  const phase = t % JUMP_PERIOD;
  const u = phase / JUMP_TIME;
  const y = u < 1 ? 4 * JUMP_H * u * (1 - u) : 0;
  return { x, y };
}

// детерминированный ГСЧ, чтобы прогон был одинаковым каждый раз
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export interface CamRunStats {
  playerLeftScreen: boolean;
  cameraMoved: boolean;
  bob: number; // насколько гулял пол по вертикали, px
  jitter: number; // средний "рывок" позиции кубика на экране, px
}

export class CameraFollowDemo {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width = 0;
  private height = 0;
  private cam: Vec = { x: 40 + START_OFFSET.x, y: CAM_BASE_Y };
  private player: Vec = { x: 40, y: 0 };

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context not available");
    this.canvas = canvas;
    this.ctx = ctx;
    this.resize();
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.width = Math.max(1, Math.round(rect.width));
    this.height = Math.max(1, Math.round(rect.height));
    this.canvas.width = Math.round(this.width * dpr);
    this.canvas.height = Math.round(this.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.draw();
  }

  reset() {
    this.cam = { x: 40 + START_OFFSET.x, y: CAM_BASE_Y };
    this.player = { x: 40, y: 0 };
    this.draw();
  }

  // Прогон уже скомпилированного скрипта. Все кадры считаются заранее
  // (детерминированно), потом проигрываются в реальном времени.
  run(method: CamMethod, lines: CamLineId[]): Promise<CamRunStats> {
    const total = Math.round(DURATION * FPS);
    const random = rng(42);
    let cam: Vec = { x: 40 + START_OFFSET.x, y: CAM_BASE_Y };
    let offset: Vec = { ...START_OFFSET };
    const frames: { cam: Vec; player: Vec }[] = [];

    for (let f = 0; f < total; f++) {
      const actual = playerAt(f);
      const stale = method === "Update" ? Math.floor(random() * 3) : 0;
      const p = playerAt(Math.max(0, f - stale)); // что "видит" скрипт камеры
      let target: Vec | undefined;
      for (const id of lines) {
        if (id === "calc") target = { x: p.x + offset.x, y: p.y + offset.y };
        else if (id === "lockY" && target) target.y = cam.y;
        else if (id === "assign" && target) cam = { ...target };
        else if (id === "direct") cam = { x: p.x, y: p.y };
        else if (id === "recalcOffset") offset = { x: cam.x - p.x, y: cam.y - p.y };
      }
      frames.push({ cam: { ...cam }, player: actual });
    }

    // статистика того, что увидит игрок
    const scale = this.scale();
    const screenX = frames.map((fr) => this.width / 2 + (fr.player.x - fr.cam.x) * scale);
    const camYs = frames.map((fr) => fr.cam.y);
    let jitterSum = 0;
    for (let i = 2; i < screenX.length; i++) {
      jitterSum += Math.abs(screenX[i] - 2 * screenX[i - 1] + screenX[i - 2]);
    }
    const stats: CamRunStats = {
      playerLeftScreen: screenX.some((x) => x > this.width + 20 || x < -60),
      cameraMoved: Math.abs(frames[frames.length - 1].cam.x - frames[0].cam.x) > 5,
      bob: (Math.max(...camYs) - Math.min(...camYs)) * scale,
      jitter: jitterSum / Math.max(1, screenX.length - 2),
    };

    return new Promise((resolve) => {
      const start = performance.now();
      const tick = (now: number) => {
        const f = Math.min(total - 1, Math.floor(((now - start) / 1000) * FPS));
        this.cam = frames[f].cam;
        this.player = frames[f].player;
        this.draw();
        if (f < total - 1) requestAnimationFrame(tick);
        else resolve(stats);
      };
      requestAnimationFrame(tick);
    });
  }

  private scale() {
    return Math.max(0.6, Math.min(1.5, this.height / 300));
  }

  private draw() {
    const { ctx, width, height } = this;
    const scale = this.scale();
    const sx = (x: number) => width / 2 + (x - this.cam.x) * scale;
    const sy = (y: number) => height / 2 + (this.cam.y - y) * scale - 10 * scale;
    const groundY = sy(0);

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#10131f";
    ctx.fillRect(0, 0, width, height);

    // "мир": столбики с номерами каждые 100 единиц — по ним видно, едет ли камера
    const step = 100;
    const left = this.cam.x - width / 2 / scale - step;
    const right = this.cam.x + width / 2 / scale + step;
    ctx.font = `${Math.round(11 * scale)}px ui-monospace, Consolas, monospace`;
    ctx.textAlign = "center";
    for (let wx = Math.floor(left / step) * step; wx < right; wx += step) {
      const x = sx(wx);
      ctx.fillStyle = "rgba(125,211,252,0.12)";
      ctx.fillRect(x - 2, sy(90), 4, 90 * scale);
      ctx.fillStyle = "rgba(200,210,230,0.45)";
      ctx.fillText(String(wx), x, sy(98));
    }

    ctx.fillStyle = "#2e3352";
    ctx.fillRect(0, groundY, width, height - groundY + 400);
    ctx.strokeStyle = "#4b5285";
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(width, groundY);
    ctx.stroke();

    // кубик — тот же префаб, что во всех заданиях
    const size = 40 * scale;
    const px = sx(this.player.x);
    const py = sy(this.player.y) - size;
    ctx.fillStyle = "#7dd3fc";
    ctx.beginPath();
    ctx.roundRect(px, py, size, size, 8 * scale);
    ctx.fill();
    ctx.fillStyle = "#0f1220";
    ctx.beginPath();
    ctx.arc(px + size / 2 - 8 * scale, py + 14 * scale, 3 * scale, 0, Math.PI * 2);
    ctx.arc(px + size / 2 + 8 * scale, py + 14 * scale, 3 * scale, 0, Math.PI * 2);
    ctx.fill();

    // рамка "Game view" — это то, что видит игрок через камеру
    ctx.strokeStyle = "rgba(125,211,252,0.25)";
    ctx.strokeRect(0.5, 0.5, width - 1, height - 1);
    ctx.textAlign = "left";
  }
}