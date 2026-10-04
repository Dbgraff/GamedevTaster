// Движок задания 8 («Препятствия появляются сами»).
//
// Интерпретатор планировщика вызовов — как в Unity:
//   • InvokeRepeating("SpawnObstacle", a, b) — первый вызов через a секунд, дальше каждые b;
//   • Invoke("SpawnObstacle", a) — один вызов через a секунд;
//   • SpawnObstacle(); — вызвать прямо сейчас (если метод вызывает сам себя — бесконечная
//     рекурсия, игра падает с StackOverflowException);
//   • Instantiate(...) — создать препятствие в текущий момент.
// Строки в Start() выполняются один раз в момент 0, строки в SpawnObstacle() — при каждом его вызове.

export type SpawnLineId = "repeat23" | "repeat32" | "invoke2" | "callNow" | "instantiate";

export const SPAWN_LINES: Record<SpawnLineId, string> = {
  repeat23: 'InvokeRepeating("SpawnObstacle", 2f, 3f);',
  repeat32: 'InvokeRepeating("SpawnObstacle", 3f, 2f);',
  invoke2: 'Invoke("SpawnObstacle", 2f);',
  callNow: "SpawnObstacle();",
  instantiate: "Instantiate(obstaclePrefab, spawnPoint.position, Quaternion.identity);",
};

export const TARGET_SPAWNS = [2, 5, 8, 11]; // первое через 2 с, дальше каждые 3
export const SIM_SECONDS = 12;
const MAX_DEPTH = 40; // глубина вызовов, после которой "стек переполнен"
const MAX_SPAWNS = 40; // дальше — лавина, считать нет смысла

export interface SpawnResult {
  spawns: number[];
  crashed: boolean; // StackOverflowException
  avalanche: boolean; // препятствий стало слишком много
  calls: number; // сколько раз вызвался SpawnObstacle
}

export function simulateSpawns(start: SpawnLineId[], body: SpawnLineId[]): SpawnResult {
  const spawns: number[] = [];
  const queue: number[] = []; // моменты запланированных вызовов SpawnObstacle
  let crashed = false;
  let calls = 0;

  const schedule = (now: number, line: SpawnLineId) => {
    if (line === "repeat23" || line === "repeat32") {
      const [first, rate] = line === "repeat23" ? [2, 3] : [3, 2];
      for (let t = now + first; t <= SIM_SECONDS + 1e-9; t += rate) queue.push(t);
    } else if (line === "invoke2") {
      if (now + 2 <= SIM_SECONDS) queue.push(now + 2);
    }
  };

  const callSpawn = (now: number, depth: number) => {
    if (crashed) return;
    if (depth > MAX_DEPTH) {
      crashed = true;
      return;
    }
    calls++;
    for (const line of body) {
      if (crashed || spawns.length > MAX_SPAWNS) return;
      if (line === "instantiate") spawns.push(now);
      else if (line === "callNow") callSpawn(now, depth + 1);
      else schedule(now, line);
    }
  };

  // Start(): один раз в момент 0
  for (const line of start) {
    if (crashed) break;
    if (line === "instantiate") spawns.push(0);
    else if (line === "callNow") callSpawn(0, 1);
    else schedule(0, line);
  }

  // дальше — по расписанию, по возрастанию времени (новые вызовы могут добавлять новые)
  while (!crashed && queue.length && spawns.length <= MAX_SPAWNS) {
    queue.sort((a, b) => a - b);
    const t = queue.shift()!;
    callSpawn(t, 1);
  }

  // Лавина — когда повторы запускаются изнутри повторяемого метода: каждый вызов
  // добавляет ещё одну серию. За 12 секунд игры их может быть и меньше 40, поэтому
  // смотрим на саму причину, а не только на количество.
  const repeatsInsideBody = body.some((l) => l === "repeat23" || l === "repeat32");
  const avalanche = spawns.length > MAX_SPAWNS || (repeatsInsideBody && calls > TARGET_SPAWNS.length * 2);
  return {
    spawns: spawns.sort((a, b) => a - b).slice(0, MAX_SPAWNS + 1),
    crashed,
    avalanche,
    calls,
  };
}

// ---------- Отрисовка: сцена + шкала времени ----------
const PLAYBACK = 3; // 12 секунд игры проигрываются за 4
const OBSTACLE_SPEED = 0.16; // доля ширины сцены в секунду игрового времени

export class SpawnDemo {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width = 0;
  private height = 0;
  private t = 0;
  private result: SpawnResult | null = null;

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
    this.t = 0;
    this.result = null;
    this.draw();
  }

  run(result: SpawnResult): Promise<void> {
    this.result = result;
    // при падении игра "останавливается" почти сразу
    const end = result.crashed ? 0.4 : SIM_SECONDS;
    return new Promise((resolve) => {
      let start: number | null = null;
      const tick = (now: number) => {
        if (start === null) start = now;
        this.t = Math.max(0, Math.min(end, ((now - start) / 1000) * PLAYBACK));
        this.draw();
        if (this.t < end) requestAnimationFrame(tick);
        else resolve();
      };
      requestAnimationFrame(tick);
    });
  }

  private draw() {
    const { ctx, width, height } = this;
    if (width < 20 || height < 120) return;
    const timelineH = 46;
    const groundY = height - timelineH - 40;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#10131f";
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "#2e3352";
    ctx.fillRect(0, groundY, width, height - timelineH - groundY);

    // кубик слева
    const size = 40;
    const px = Math.round(width * 0.12);
    ctx.fillStyle = "#7dd3fc";
    ctx.beginPath();
    ctx.roundRect(px, groundY - size, size, size, 8);
    ctx.fill();
    ctx.fillStyle = "#0f1220";
    ctx.beginPath();
    ctx.arc(px + size / 2 - 8, groundY - size + 14, 3, 0, Math.PI * 2);
    ctx.arc(px + size / 2 + 8, groundY - size + 14, 3, 0, Math.PI * 2);
    ctx.fill();

    // точка появления справа
    const spawnX = width - 50;
    ctx.strokeStyle = "rgba(167,139,250,0.7)";
    ctx.setLineDash([4, 3]);
    ctx.strokeRect(spawnX - 4, groundY - 46, 32, 46);
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(200,190,250,0.8)";
    ctx.font = "11px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("spawnPoint", spawnX + 12, groundY - 52);

    // препятствия, уже появившиеся к моменту t, едут влево
    const spawns = this.result?.spawns ?? [];
    for (const s of spawns) {
      if (s > this.t) continue;
      const x = spawnX - (this.t - s) * OBSTACLE_SPEED * width;
      if (x < -40) continue;
      ctx.fillStyle = "#f87171";
      ctx.beginPath();
      ctx.moveTo(x, groundY);
      ctx.lineTo(x + 12, groundY - 30);
      ctx.lineTo(x + 24, groundY);
      ctx.closePath();
      ctx.fill();
    }

    // часы
    ctx.textAlign = "right";
    ctx.fillStyle = "#f2f2f2";
    ctx.font = "600 15px ui-monospace, Consolas, monospace";
    ctx.fillText(`t = ${this.t.toFixed(1)} с`, width - 14, 26);

    if (this.result?.crashed && this.t > 0.2) {
      ctx.fillStyle = "rgba(10,10,14,0.75)";
      ctx.fillRect(0, 0, width, height - timelineH);
      ctx.textAlign = "center";
      ctx.fillStyle = "#f87171";
      ctx.font = "700 18px ui-monospace, Consolas, monospace";
      ctx.fillText("StackOverflowException", width / 2, (height - timelineH) / 2);
    }

    // шкала времени: пунктир — где препятствия должны появиться, сплошные — где появились
    const tlY = height - timelineH + 10;
    const left = 16, right = width - 16;
    const tx = (sec: number) => left + (sec / SIM_SECONDS) * (right - left);
    ctx.fillStyle = "#16192a";
    ctx.fillRect(0, height - timelineH, width, timelineH);
    ctx.strokeStyle = "#3a3f5c";
    ctx.beginPath();
    ctx.moveTo(left, tlY + 12);
    ctx.lineTo(right, tlY + 12);
    ctx.stroke();
    ctx.font = "10px ui-monospace, Consolas, monospace";
    ctx.textAlign = "center";
    for (let sec = 0; sec <= SIM_SECONDS; sec++) {
      ctx.fillStyle = "#5a5f7c";
      ctx.fillRect(tx(sec), tlY + 9, 1, 6);
      if (sec % 2 === 0) ctx.fillText(String(sec), tx(sec), tlY + 30);
    }
    ctx.strokeStyle = "rgba(74,222,128,0.8)";
    for (const sec of TARGET_SPAWNS) {
      ctx.beginPath();
      ctx.arc(tx(sec), tlY + 12, 6, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = "#f87171";
    for (const sec of spawns) {
      if (sec > this.t) continue;
      ctx.beginPath();
      ctx.arc(tx(Math.min(sec, SIM_SECONDS)), tlY + 12, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#7dd3fc";
    ctx.fillRect(tx(this.t) - 1, tlY - 2, 2, 28);
    ctx.textAlign = "left";
  }
}