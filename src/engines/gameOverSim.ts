// Движок задания 9 («Game Over»).
//
// Каждый кадр выполняется Update() игрока: сначала строка, которую выбрал
// человек, потом обычный код — прыжок по пробелу и движение вправо. "Игрок"
// управляется автоматически: всё время держит вправо и жмёт пробел в заданные
// моменты. Физика (гравитация, столкновение с препятствием) идёт своим ходом —
// как в Unity, она не внутри Update, и return её не отключает. При касании
// препятствия срабатывает OnCollisionEnter, который ставит isGameOver = true.

export type GuardId = "returnIfOver" | "setOver" | "returnIfNotOver" | "returnAlways" | "resetFlag" | "jumpIfOver";

export const GUARD_LINES: Record<GuardId, string> = {
  returnIfOver: "if (isGameOver) return;",
  setOver: "isGameOver = true;",
  returnIfNotOver: "if (!isGameOver) return;",
  returnAlways: "return;",
  resetFlag: "isGameOver = false;",
  jumpIfOver: "if (isGameOver) Jump();",
};

const STEP = 1 / 120;
const DURATION = 4;
const SPEED = 170;
const GRAVITY = 1500;
const JUMP_V = 560;
const SIZE = 40;
const OBST = { x: 260, w: 30, h: 34 };
const JUMP_TIMES = [1.4, 2.6]; // когда "игрок" жмёт пробел (первый раз — уже после касания препятствия)

export interface GameOverResult {
  moved: boolean;
  collided: boolean;
  overAtStart: boolean; // GAME OVER на экране с первого кадра
  stoppedAfterHit: boolean; // после касания кубик замер
  passedObstacle: boolean; // перепрыгнул и поехал дальше
  flewAway: boolean; // улетел вверх
  log: string[];
}

interface Frame {
  x: number;
  y: number;
  over: boolean;
}

function simulate(guard: GuardId): { frames: Frame[]; result: GameOverResult } {
  let x = 40, y = 0, vx = 0, vy = 0, over = false;
  let touching = false;
  const frames: Frame[] = [];
  const log: string[] = [];
  const r: GameOverResult = { moved: false, collided: false, overAtStart: false, stoppedAfterHit: false, passedObstacle: false, flewAway: false, log };
  let hitX = 0;
  const pending = [...JUMP_TIMES];

  const jump = () => {
    vy = JUMP_V;
  };

  for (let t = 0; t < DURATION; t += STEP) {
    // ---------- Update() ----------
    let skip = false;
    if (guard === "returnIfOver") skip = over;
    else if (guard === "setOver") over = true;
    else if (guard === "returnIfNotOver") skip = !over;
    else if (guard === "returnAlways") skip = true;
    else if (guard === "resetFlag") over = false;
    else if (guard === "jumpIfOver" && over) jump();

    if (t < STEP && over) r.overAtStart = true;

    const spaceNow = pending.length > 0 && t >= pending[0];
    if (spaceNow) pending.shift();
    if (!skip) {
      if (spaceNow && y <= 0.5) jump(); // if (Input.GetKeyDown(KeyCode.Space)) Jump();
      vx = SPEED; // движение вправо
    } else {
      vx *= 0.88; // ввод не обрабатывается — кубик тормозит трением
    }

    // ---------- Физика ----------
    vy -= GRAVITY * STEP;
    y = Math.max(0, y + vy * STEP);
    if (y === 0 && vy < 0) vy = 0;
    const prevX = x;
    x += vx * STEP;
    if (Math.abs(x - prevX) > 0.01) r.moved = true;

    const overlap = x + SIZE > OBST.x && x < OBST.x + OBST.w && y < OBST.h;
    if (overlap) {
      x = Math.min(x, OBST.x - SIZE); // препятствие твёрдое
      vx = 0;
      if (!touching) {
        touching = true;
        r.collided = true;
        hitX = x;
        over = true; // OnCollisionEnter: if (other.tag == "Obstacle") isGameOver = true;
        log.push(`t=${t.toFixed(1)}с: OnCollisionEnter — кубик врезался в препятствие, isGameOver = true`);
      }
    } else touching = false;

    if (x > OBST.x + OBST.w && !r.passedObstacle) {
      r.passedObstacle = true;
      log.push(`t=${t.toFixed(1)}с: кубик перепрыгнул препятствие и поехал дальше`);
    }
    if (y > 260 && !r.flewAway) {
      r.flewAway = true;
      log.push(`t=${t.toFixed(1)}с: кубик улетел вверх — Jump() вызывается каждый кадр`);
    }
    frames.push({ x, y, over });
  }

  if (r.collided && !r.passedObstacle && !r.flewAway) {
    const lastX = frames[frames.length - 1].x;
    r.stoppedAfterHit = Math.abs(lastX - hitX) < 3;
  }
  if (!r.moved) log.push("Кубик так и не сдвинулся с места — код ввода ни разу не выполнился");
  return { frames, result: r };
}

export class GameOverDemo {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width = 0;
  private height = 0;
  private frame: Frame = { x: 40, y: 0, over: false };

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context not available");
    this.canvas = canvas;
    this.ctx = ctx;
    this.resize();
  }

  resize() {
    if (!this.canvas.isConnected) return;
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
    this.frame = { x: 40, y: 0, over: false };
    this.draw();
  }

  run(guard: GuardId): Promise<GameOverResult> {
    const { frames, result } = simulate(guard);
    return new Promise((resolve) => {
      let start: number | null = null;
      const tick = (now: number) => {
        if (start === null) start = now;
        const i = Math.max(0, Math.min(frames.length - 1, Math.floor((now - start) / 1000 / STEP)));
        this.frame = frames[i];
        this.draw();
        if (i < frames.length - 1) requestAnimationFrame(tick);
        else resolve(result);
      };
      requestAnimationFrame(tick);
    });
  }

  private draw() {
    const { ctx, width, height } = this;
    if (width < 20 || height < 100) return;
    const groundY = height - 56;
    const scale = Math.max(0.3, Math.min(width / 640, (groundY - 20) / 200, 1.6));
    const ox = (width - 600 * scale) / 2;
    const sx = (x: number) => ox + x * scale;
    const sy = (y: number) => groundY - y * scale;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#10131f";
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "#2e3352";
    ctx.fillRect(0, groundY, width, height - groundY);

    // препятствие
    ctx.fillStyle = "#f87171";
    ctx.fillRect(sx(OBST.x), sy(OBST.h), OBST.w * scale, OBST.h * scale);
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.font = `${Math.max(10, Math.round(11 * scale))}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText("Obstacle", sx(OBST.x + OBST.w / 2), sy(OBST.h) - 8);

    // кубик
    const { x, y, over } = this.frame;
    const s = SIZE * scale;
    const px = sx(x), py = sy(y) - s;
    ctx.fillStyle = "#7dd3fc";
    ctx.beginPath();
    ctx.roundRect(px, py, s, s, 8 * scale);
    ctx.fill();
    ctx.fillStyle = "#0f1220";
    ctx.beginPath();
    ctx.arc(px + s / 2 - 8 * scale, py + 14 * scale, 3 * scale, 0, Math.PI * 2);
    ctx.arc(px + s / 2 + 8 * scale, py + 14 * scale, 3 * scale, 0, Math.PI * 2);
    ctx.fill();

    // переменная в памяти — как в задании 7
    ctx.textAlign = "left";
    ctx.font = "12px ui-monospace, Consolas, monospace";
    ctx.fillStyle = "#a78bfa";
    ctx.fillText(`isGameOver = ${over}`, 14, groundY + 30);

    if (over) {
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(10,10,14,0.55)";
      ctx.fillRect(0, 0, width, groundY);
      ctx.fillStyle = "#f87171";
      ctx.font = "800 28px system-ui, sans-serif";
      ctx.fillText("GAME OVER", width / 2, groundY / 2);
    }
    ctx.textAlign = "left";
  }
}