// Мини-физика сцены для заданий 4, 6 и 7.
//
// Работает "как в Unity", только упрощённо и в одном измерении движения:
//   • Rigidbody — объект двигает физика и тянет вниз гравитация.
//     Без него объект стоит на месте, что бы ни делал скрипт.
//   • Collider — у объекта есть форма для касаний. Без него сквозь объект
//     проходят, и движок даже не узнаёт о касании.
//   • Is Trigger — коллайдер становится "проходимым": физика не останавливает,
//     но движок вызывает OnTriggerEnter. Обычный коллайдер вызывает OnCollisionEnter.
//   • Пол держит только объекты с твёрдым (не триггерным) коллайдером —
//     поэтому без коллайдера или с Is Trigger объект с Rigidbody проваливается.
//
// Симуляция идёт фиксированными шагами, поэтому один и тот же набор
// компонентов всегда даёт один и тот же результат.

export interface BodyConfig {
  rigidbody: boolean;
  collider: boolean;
  isTrigger: boolean;
}

export type ObjKind = "player" | "wall" | "coin";

export interface SceneObject {
  id: string;
  kind: ObjKind;
  name: string;
  x: number; // левый край, в единицах мира
  y: number; // высота нижнего края над полом (0 — стоит на полу)
  w: number;
  h: number;
  vx: number;
  vy: number;
  cfg: BodyConfig;
  alive: boolean;
}

export interface ObjectSpec {
  id: string;
  kind: ObjKind;
  name: string;
  x: number;
  y?: number;
  cfg: BodyConfig;
}

export interface SceneApi {
  self: SceneObject;
  destroy(obj: SceneObject): void;
  log(line: string): void;
}

export interface SceneHandlers {
  onCollisionEnter?: (other: SceneObject, api: SceneApi) => void;
  onTriggerEnter?: (other: SceneObject, api: SceneApi) => void;
  hud?: () => { right?: string; left?: string };
}

export interface SceneResult {
  log: string[];
  playerMoved: boolean;
  playerFell: boolean;
  playerLeftScene: boolean;
  stoppedAtWall: boolean;
  wallPushed: boolean;
  bumpedCoin: boolean;
  coinFell: boolean;
  triggers: string[]; // id объектов, на которых сработал OnTriggerEnter
  collisions: string[]; // id объектов, на которых сработал OnCollisionEnter
  destroyed: string[];
}

export const WORLD_W = 600;
const SIZES: Record<ObjKind, { w: number; h: number; y: number }> = {
  player: { w: 40, h: 40, y: 0 },
  wall: { w: 26, h: 120, y: 0 },
  coin: { w: 24, h: 24, y: 10 },
};
const GRAVITY = 1500;
const PLAYER_SPEED = 170;
const STEP = 1 / 120;
const DURATION = 3.2;
const GROUND_PX = 56;

const solid = (o: SceneObject) => o.cfg.collider && !o.cfg.isTrigger;

// Для финального задания: мир шире экрана и камера, которая едет за кубиком.
//   LateUpdate — камера всегда видит актуальную позицию кубика, едет плавно;
//   Update — порядок Update не гарантирован, камера иногда видит позицию на
//   несколько шагов старее и подёргивается (как в задании 5).
export interface SceneOptions {
  worldWidth?: number;
  duration?: number;
  camera?: "LateUpdate" | "Update" | null;
}

export class Scene2D {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width = 0;
  private height = 0;
  private objects: SceneObject[] = [];
  private specs: ObjectSpec[];
  private handlers: SceneHandlers = {};
  private running = false;
  private opts: SceneOptions = {};
  private playerTrail: number[] = []; // позиции кубика по шагам — откуда камера в Update берёт "старую"

  constructor(canvas: HTMLCanvasElement, specs: ObjectSpec[], opts: SceneOptions = {}) {
    this.opts = opts;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context not available");
    this.canvas = canvas;
    this.ctx = ctx;
    this.specs = specs;
    this.build();
    this.resize();
  }

  setOptions(opts: SceneOptions) {
    this.opts = { ...this.opts, ...opts };
    if (!this.running) this.draw();
  }

  setSpecs(specs: ObjectSpec[]) {
    this.specs = specs;
    if (!this.running) {
      this.build();
      this.draw();
    }
  }

  setHandlers(handlers: SceneHandlers) {
    this.handlers = handlers;
    if (!this.running) this.draw();
  }

  resize() {
    if (!this.canvas.isConnected) return; // canvas уже убран со страницы при смене задания
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.width = Math.max(1, Math.round(rect.width));
    this.height = Math.max(1, Math.round(rect.height));
    this.canvas.width = Math.round(this.width * dpr);
    this.canvas.height = Math.round(this.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.draw();
  }

  private build() {
    this.objects = this.specs.map((s) => {
      const size = SIZES[s.kind];
      return {
        id: s.id,
        kind: s.kind,
        name: s.name,
        x: s.x,
        y: s.y ?? size.y,
        w: size.w,
        h: size.h,
        vx: 0,
        vy: 0,
        cfg: { ...s.cfg, isTrigger: s.cfg.collider && s.cfg.isTrigger },
        alive: true,
      };
    });
  }

  run(): Promise<SceneResult> {
    this.build();
    this.running = true;

    const result: SceneResult = {
      log: [],
      playerMoved: false,
      playerFell: false,
      playerLeftScene: false,
      stoppedAtWall: false,
      wallPushed: false,
      bumpedCoin: false,
      coinFell: false,
      triggers: [],
      collisions: [],
      destroyed: [],
    };
    const log = (line: string) => result.log.push(line);
    const player = this.objects.find((o) => o.kind === "player")!;
    const touching = new Set<string>();
    const fellLogged = new Set<string>();
    let pushLogged = false;

    const api = (): SceneApi => ({
      self: player,
      destroy: (obj) => {
        if (!obj.alive) return;
        obj.alive = false;
        result.destroyed.push(obj.id);
        log(`Destroy(): объект «${obj.name}» удалён со сцены`);
      },
      log: (line) => log(`Debug.Log → ${line}`),
    });

    if (!player.cfg.rigidbody) {
      log("У кубика нет Rigidbody — скрипт задаёт скорость, но двигать объект некому: физика его не видит");
    }

    const step = (dt: number) => {
      // 1) Гравитация и пол — только для объектов с Rigidbody
      for (const o of this.objects) {
        if (!o.alive || !o.cfg.rigidbody) continue;
        const wasAbove = o.y >= -0.5;
        o.vy -= GRAVITY * dt;
        o.y += o.vy * dt;
        if (solid(o) && wasAbove && o.y <= 0) {
          o.y = 0;
          o.vy = 0;
        }
        if (o.y < -4 && !fellLogged.has(o.id)) {
          fellLogged.add(o.id);
          if (o.kind === "player") result.playerFell = true;
          if (o.kind === "coin") result.coinFell = true;
          log(
            o.cfg.collider
              ? `«${o.name}» провалился сквозь пол — у него Is Trigger, а триггер за пол не держится, Rigidbody тянет вниз`
              : `«${o.name}» провалился сквозь пол — у него есть Rigidbody, но нет коллайдера, держаться за пол нечем`
          );
        }
      }

      // 2) Скрипт кубика двигает его вправо (через Rigidbody)
      if (player.alive && player.cfg.rigidbody) {
        player.vx = PLAYER_SPEED;
        player.x += player.vx * dt;
        result.playerMoved = true;
      }

      // 3) Касания кубика с другими объектами
      if (!player.alive) return;
      for (const other of this.objects) {
        if (other === player || !other.alive) continue;
        const overlap =
          player.x < other.x + other.w &&
          player.x + player.w > other.x &&
          player.y < other.y + other.h &&
          player.y + player.h > other.y;

        if (!overlap || !player.cfg.collider || !other.cfg.collider) {
          if (!overlap) touching.delete(other.id);
          continue;
        }

        if (player.cfg.isTrigger || other.cfg.isTrigger) {
          if (!touching.has(other.id)) {
            touching.add(other.id);
            result.triggers.push(other.id);
            log(`OnTriggerEnter: кубик прошёл сквозь «${other.name}», движок сообщил о касании`);
            this.handlers.onTriggerEnter?.(other, api());
          }
          continue;
        }

        // твёрдое столкновение
        const first = !touching.has(other.id);
        if (first) {
          touching.add(other.id);
          result.collisions.push(other.id);
          log(`OnCollisionEnter: кубик столкнулся с «${other.name}»`);
          this.handlers.onCollisionEnter?.(other, api());
          if (!other.alive) continue; // обработчик мог удалить объект
        }
        if (other.cfg.rigidbody) {
          other.x = player.x + player.w; // подвижный объект толкается
          if (other.kind === "wall") result.wallPushed = true;
          if (!pushLogged) {
            pushLogged = true;
            log(`«${other.name}» сдвинулся от удара — у него есть Rigidbody, физика считает его подвижным`);
          }
        } else {
          player.x = other.x - player.w;
          if (other.kind === "wall") result.stoppedAtWall = true;
          if (other.kind === "coin" && first) {
            result.bumpedCoin = true;
            log(`Кубик упёрся в «${other.name}», как в стену — её коллайдер твёрдый, без Is Trigger`);
          }
        }
      }

      if (player.x > (this.opts.worldWidth ?? WORLD_W) + 20 && !result.playerLeftScene) {
        result.playerLeftScene = true;
        log("Кубик уехал за край сцены — его ничто не остановило");
      }
    };

    const duration = this.opts.duration ?? DURATION;
    this.playerTrail = [player.x];
    return new Promise((resolve) => {
      let simTime = 0;
      let acc = 0;
      let last = performance.now();
      const frame = (now: number) => {
        acc += Math.max(0, Math.min((now - last) / 1000, 0.05));
        last = now;
        while (acc >= STEP && simTime < duration) {
          step(STEP);
          this.playerTrail.push(player.x);
          acc -= STEP;
          simTime += STEP;
        }
        this.draw();
        if (simTime < duration) {
          requestAnimationFrame(frame);
        } else {
          this.running = false;
          resolve(result);
        }
      };
      requestAnimationFrame(frame);
    });
  }

  // ---------- Отрисовка ----------
  private draw() {
    const { ctx, width, height } = this;
    const groundY = height - GROUND_PX;
    // масштаб: мир целиком влезает по ширине и стена — по высоте
    if (width < 20 || height < GROUND_PX + 40) return; // слишком маленький холст — рисовать нечего
    const cameraMode = this.opts.camera ?? null;
    let sx: (x: number) => number;
    let scale: number;
    let camX = 0;
    if (cameraMode) {
      // камера следует за кубиком: масштаб — по высоте, мир шире экрана
      scale = Math.max(0.2, Math.min((groundY - 20) / 140, 1.6));
      const trail = this.playerTrail;
      const player = this.objects.find((o) => o.kind === "player");
      let seenX = player?.x ?? 0;
      if (cameraMode === "Update" && trail.length > 1) {
        const stale = Math.floor(Math.random() * 7); // 0–6 шагов назад
        seenX = trail[Math.max(0, trail.length - 1 - stale)];
      }
      camX = seenX + 120;
      sx = (x: number) => width / 2 + (x - camX) * scale;
    } else {
      scale = Math.max(0.2, Math.min(width / (WORLD_W + 40), (groundY - 20) / 140, 1.6));
      const offsetX = (width - WORLD_W * scale) / 2;
      sx = (x: number) => offsetX + x * scale;
    }
    const sy = (y: number) => groundY - y * scale;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#10131f";
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = "rgba(125,211,252,0.06)";
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 24) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 24) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    ctx.fillStyle = "#2e3352";
    ctx.fillRect(0, groundY, width, height - groundY);
    ctx.strokeStyle = "#4b5285";
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(width, groundY);
    ctx.stroke();
    if (cameraMode) {
      ctx.font = "10px ui-monospace, Consolas, monospace";
      ctx.textAlign = "center";
      const first = Math.floor((camX - width / 2 / scale) / 100) * 100;
      for (let wx = first; wx < camX + width / 2 / scale + 100; wx += 100) {
        ctx.fillStyle = "rgba(125,211,252,0.12)";
        ctx.fillRect(sx(wx) - 2, groundY - 70 * scale, 4, 70 * scale);
        ctx.fillStyle = "rgba(200,210,230,0.4)";
        ctx.fillText(String(wx), sx(wx), groundY - 76 * scale);
      }
    }

    for (const o of this.objects) {
      if (!o.alive) continue;
      const x = sx(o.x);
      const y = sy(o.y + o.h);
      const w = o.w * scale;
      const h = o.h * scale;

      if (o.kind === "player") {
        ctx.fillStyle = "#7dd3fc";
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 8 * scale);
        ctx.fill();
        ctx.fillStyle = "#0f1220";
        ctx.beginPath();
        ctx.arc(x + w / 2 - 8 * scale, y + 14 * scale, 3 * scale, 0, Math.PI * 2);
        ctx.arc(x + w / 2 + 8 * scale, y + 14 * scale, 3 * scale, 0, Math.PI * 2);
        ctx.fill();
      } else if (o.kind === "wall") {
        ctx.fillStyle = "#64748b";
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = "#475569";
        for (let by = y + 14 * scale; by < y + h; by += 14 * scale) {
          ctx.beginPath();
          ctx.moveTo(x, by);
          ctx.lineTo(x + w, by);
          ctx.stroke();
        }
      } else {
        const cx = x + w / 2;
        const cy = y + h / 2;
        ctx.fillStyle = "#fbbf24";
        ctx.beginPath();
        ctx.arc(cx, cy, w / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#b45309";
        ctx.lineWidth = Math.max(1, 2 * scale);
        ctx.beginPath();
        ctx.arc(cx, cy, w / 2 - 4 * scale, 0, Math.PI * 2);
        ctx.stroke();
        ctx.lineWidth = 1;
      }

      // Гизмо коллайдера, как в Unity: зелёная рамка; пунктир — триггер
      if (o.cfg.collider) {
        ctx.save();
        ctx.strokeStyle = "#4ade80";
        ctx.lineWidth = 1.5;
        if (o.cfg.isTrigger) ctx.setLineDash([4, 3]);
        ctx.strokeRect(x - 2, y - 2, w + 4, h + 4);
        ctx.restore();
      }

      // подпись имени объекта
      ctx.fillStyle = "rgba(220,220,230,0.7)";
      ctx.font = `${Math.max(10, Math.round(11 * scale))}px system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(o.name, x + w / 2, Math.max(12, y - 8));
    }

    // HUD — счёт и т.п. (задания 6–7)
    const hud = this.handlers.hud?.();
    if (hud) {
      ctx.font = "600 15px system-ui, sans-serif";
      if (hud.right) {
        ctx.textAlign = "right";
        ctx.fillStyle = "#f2f2f2";
        ctx.fillText(hud.right, width - 14, 26);
      }
      if (hud.left) {
        ctx.textAlign = "left";
        ctx.font = "12px ui-monospace, Consolas, monospace";
        ctx.fillStyle = "#a78bfa";
        ctx.fillText(hud.left, 14, height - GROUND_PX + 30);
      }
    }
    ctx.textAlign = "left";
  }
}

export const CORRECT_COMPONENTS: Record<"player" | "wall" | "coin", BodyConfig> = {
  player: { rigidbody: true, collider: true, isTrigger: false },
  wall: { rigidbody: false, collider: true, isTrigger: false },
  coin: { rigidbody: false, collider: true, isTrigger: true },
};