// Симуляция прыжка персонажа-платформера на Canvas для задачи 1.
// Публичные параметры (jumpForce, gravityScale, groundCheckDistance) —
// задача 1 крутит их через числовые поля в инспекторе.

import { PX_PER_UNIT, VELOCITY_SCALE, GRAVITY_SCALE_MULT } from "./physicsConstants";

export interface PhysicsParams {
  jumpForce: number; // 0–15, аналог силы в Rigidbody2D.AddForce
  gravityScale: number; // 1–30, аналог Rigidbody2D.gravityScale
  groundCheckDistance: number; // 0.02–0.30, аналог радиуса проверки земли (в юнитах)
}

export type PlayOutcome = "idle" | "no-jump" | "too-weak" | "clipped-floor" | "hovering" | "good-jump";

const MIN_JUMP_HEIGHT = 24; // px — прыжок ниже этого порога не считается "нормальным"
const CORRECTION_MS = 220; // сколько длится "доводка" персонажа обратно на пол
// Проверка земли длиннее этого (в px) ловит пол, пока персонаж ещё в воздухе:
// игра решает, что он уже стоит, и он "встаёт" над полом. Вместе с провалом
// при слишком короткой проверке это даёт честное окно "не мало и не много".
const HOVER_LIMIT_PX = 15;

export class PlatformerDemo {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private groundY: number; // Y-координата, на которой стоят ноги персонажа

  private restY: number; // физически "правильная" точка покоя (= groundY)
  private posY: number; // текущая отрисовываемая позиция (может временно проседать ниже restY)
  private velY = 0;
  private isGrounded = true;
  private animId: number | null = null;
  private lastTime = 0;
  private elapsedAirTime = 0;
  private maxHeightReached = 0;

  private correcting = false;
  private correctionStart = 0;
  private correctionFrom = 0;

  private params: PhysicsParams;

  onOutcome?: (outcome: PlayOutcome, meta: { peakHeight: number; airTime: number; dip: number }) => void;

  constructor(canvas: HTMLCanvasElement, params: PhysicsParams) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context not available");
    this.canvas = canvas;
    this.ctx = ctx;
    this.width = 0;
    this.height = 0;
    this.groundY = 0;
    this.restY = 0;
    this.posY = 0;
    this.params = params;
    this.resize();
  }

  // Подгоняет внутреннее разрешение канваса под его реальный отображаемый
  // размер (с учётом devicePixelRatio — иначе на Retina/масштабированных
  // экранах картинка будет мыльной). Вызывать при монтировании и на resize.
  resize() {
    if (!this.canvas.isConnected) return; // canvas уже убран со страницы при смене задания
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));

    this.width = width;
    this.height = height;
    this.canvas.width = Math.round(width * dpr);
    this.canvas.height = Math.round(height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const wasGrounded = this.isGrounded && !this.correcting;
    this.groundY = height - 56;
    if (wasGrounded) {
      this.restY = this.groundY;
      this.posY = this.groundY;
    }
    this.draw();
  }

  getParams(): PhysicsParams {
    return { ...this.params };
  }

  setParams(params: Partial<PhysicsParams>) {
    this.params = { ...this.params, ...params };
    // линия проверки земли должна меняться сразу, как игрок ввёл новое значение
    if (this.animId === null) this.draw();
  }

  reset() {
    this.posY = this.groundY;
    this.restY = this.groundY;
    this.velY = 0;
    this.isGrounded = true;
    this.elapsedAirTime = 0;
    this.maxHeightReached = 0;
    this.correcting = false;
    this.draw();
  }

  // Кубик в воздухе или его ещё "доводят" на пол — новый прыжок начинать нельзя
  isBusy(): boolean {
    return !this.isGrounded || this.correcting;
  }

  tryJump() {
    if (!this.isGrounded) return;

    if (this.params.jumpForce <= 0) {
      this.onOutcome?.("no-jump", { peakHeight: 0, airTime: 0, dip: 0 });
      return;
    }

    this.isGrounded = false;
    // Никакого ограничения по высоте — если выкрутить силу в максимум, а гравитацию
    // в минимум, персонаж честно улетает за пределы экрана. Это тоже часть задачи:
    // увидеть, как ведут себя крайние значения.
    this.velY = -this.params.jumpForce * VELOCITY_SCALE;
    this.elapsedAirTime = 0;
    this.maxHeightReached = 0;
    this.startLoop();
  }

  private startLoop() {
    if (this.animId !== null) return;
    this.lastTime = performance.now();
    const step = (time: number) => {
      const dt = Math.max(0, Math.min((time - this.lastTime) / 1000, 0.05));
      this.lastTime = time;
      this.update(dt, time);
      this.draw();
      if (!this.isGrounded || this.correcting) {
        this.animId = requestAnimationFrame(step);
      } else {
        this.animId = null;
      }
    };
    this.animId = requestAnimationFrame(step);
  }

  private update(dt: number, time: number) {
    if (this.correcting) {
      const t = Math.max(0, Math.min((time - this.correctionStart) / CORRECTION_MS, 1));
      const eased = 1 - Math.pow(1 - t, 3);
      this.posY = this.correctionFrom + (this.restY - this.correctionFrom) * eased;
      if (t >= 1) this.correcting = false;
      return;
    }

    const gravity = this.params.gravityScale * GRAVITY_SCALE_MULT;
    this.velY += gravity * dt;
    this.posY += this.velY * dt;
    this.elapsedAirTime += dt;

    const heightAboveGround = this.groundY - this.posY;
    if (heightAboveGround > this.maxHeightReached) {
      this.maxHeightReached = heightAboveGround;
    }

    // Слишком длинная проверка земли дотягивается до пола, пока кубик ещё падает:
    // игра считает его стоящим и останавливает прямо в воздухе. Высота "зависания"
    // считается от длины проверки, а не от тайминга кадра — результат стабильный.
    const checkRadius = this.params.groundCheckDistance * PX_PER_UNIT;
    if (this.velY >= 0 && checkRadius > HOVER_LIMIT_PX && this.groundY - this.posY <= checkRadius) {
      const gap = Math.round(Math.min(checkRadius, this.maxHeightReached));
      this.posY = this.groundY - gap;
      this.velY = 0;
      this.isGrounded = true;
      this.onOutcome?.("hovering", {
        peakHeight: Math.round(this.maxHeightReached),
        airTime: Math.round(this.elapsedAirTime * 1000),
        dip: gap, // для "hovering" здесь высота зависания над полом
      });
      return;
    }

    if (this.posY >= this.groundY && this.velY >= 0) {
      // Сколько персонаж успел бы "провалиться" за кадр, прежде чем игра это заметила.
      // Считаем через скорость приземления и ФИКСИРОВАННЫЙ номинальный шаг кадра
      // (а не реальный this.posY-this.groundY), иначе результат зависит от дрожания
      // таймингов браузера — один и тот же прыжок то проходил бы чисто, то проваливался.
      const NOMINAL_DT = 1 / 60;
      const overshoot = this.velY * NOMINAL_DT;
      // Радиус, в пределах которого игра ЛОВИТ приземление вовремя.
      // Чем меньше groundCheckDistance, тем этот радиус меньше — и тем легче
      // провалиться глубже, чем он покрывает.
      const detectionRadius = this.params.groundCheckDistance * PX_PER_UNIT;
      const dip = Math.max(0, overshoot - detectionRadius);

      this.velY = 0;
      this.isGrounded = true;

      if (dip > 1.5) {
        // Видимый провал под пол + доводка обратно наверх
        this.posY = this.groundY + dip;
        this.correcting = true;
        this.correctionStart = time;
        this.correctionFrom = this.posY;
        this.onOutcome?.("clipped-floor", {
          peakHeight: Math.round(this.maxHeightReached),
          airTime: Math.round(this.elapsedAirTime * 1000),
          dip: Math.round(dip),
        });
      } else {
        this.posY = this.groundY;
        const peakHeight = Math.round(this.maxHeightReached);
        const outcome: PlayOutcome = peakHeight < MIN_JUMP_HEIGHT ? "too-weak" : "good-jump";
        this.onOutcome?.(outcome, {
          peakHeight,
          airTime: Math.round(this.elapsedAirTime * 1000),
          dip: 0,
        });
      }
    }
  }

  private draw() {
    const { ctx, width, height, groundY, posY } = this;
    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = "#10131f";
    ctx.fillRect(0, 0, width, height);

    // сетка "движка"
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

    // земля — верхняя грань ровно на groundY, персонаж стоит на ней вплотную
    ctx.fillStyle = "#2e3352";
    ctx.fillRect(0, groundY, width, height - groundY);
    ctx.strokeStyle = "#4b5285";
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(width, groundY);
    ctx.stroke();

    // персонаж
    const size = 40;
    ctx.fillStyle = "#7dd3fc";
    ctx.beginPath();
    ctx.roundRect(width / 2 - size / 2, posY - size, size, size, 8);
    ctx.fill();

    ctx.fillStyle = "#0f1220";
    ctx.beginPath();
    ctx.arc(width / 2 - 8, posY - size + 14, 3, 0, Math.PI * 2);
    ctx.arc(width / 2 + 8, posY - size + 14, 3, 0, Math.PI * 2);
    ctx.fill();

    // Проверка земли, как Debug.DrawRay в Unity: зелёная линия вниз от ног
    // длиной Ground Check Distance — видно, достаёт ли она до пола и когда
    const ray = this.params.groundCheckDistance * PX_PER_UNIT;
    ctx.save();
    ctx.strokeStyle = "rgba(74, 222, 128, 0.9)";
    ctx.lineWidth = 2;
    ctx.setLineDash([3, 2]);
    ctx.beginPath();
    ctx.moveTo(width / 2, posY);
    ctx.lineTo(width / 2, posY + ray);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(74, 222, 128, 0.9)";
    ctx.beginPath();
    ctx.arc(width / 2, posY + ray, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}