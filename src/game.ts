// Симуляция прыжка персонажа-платформера на Canvas.
// Написана "как в Unity": публичные параметры (jumpForce, gravityScale,
// groundCheckDistance) — задача 1 крутит их через числовые поля.
// BlockJumpSimulator ниже — отдельная физика для задачи 2 (сборка блоков кода),
// она умеет запускать последовательность блоков с произвольной стартовой
// вертикальной скоростью, чтобы показать, ломает ли неправильный порядок логику.

export interface PhysicsParams {
  jumpForce: number; // 0–15, аналог силы в Rigidbody2D.AddForce
  gravityScale: number; // 1–30, аналог Rigidbody2D.gravityScale
  groundCheckDistance: number; // 0.02–0.30, аналог радиуса проверки земли (в юнитах)
}

export type PlayOutcome = "idle" | "no-jump" | "clipped-floor" | "good-jump";

const PX_PER_UNIT = 100; // масштаб перевода "юнитов" groundCheckDistance в пиксели
const VELOCITY_SCALE = 12; // масштаб jumpForce -> пиксели/сек
const GRAVITY_SCALE_MULT = 60; // масштаб gravityScale -> пиксели/сек^2
const CORRECTION_MS = 220; // сколько длится "доводка" персонажа обратно на пол

export class PlatformerDemo {
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
    this.ctx = ctx;
    this.width = canvas.width;
    this.height = canvas.height;
    this.groundY = this.height - 56;
    this.restY = this.groundY;
    this.posY = this.groundY;
    this.params = params;
    this.draw();
  }

  setParams(params: Partial<PhysicsParams>) {
    this.params = { ...this.params, ...params };
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

  tryJump() {
    if (!this.isGrounded) return;

    if (this.params.jumpForce <= 0) {
      this.onOutcome?.("no-jump", { peakHeight: 0, airTime: 0, dip: 0 });
      return;
    }

    this.isGrounded = false;
    this.velY = -this.params.jumpForce * VELOCITY_SCALE;
    this.elapsedAirTime = 0;
    this.maxHeightReached = 0;
    this.startLoop();
  }

  private startLoop() {
    if (this.animId !== null) return;
    this.lastTime = performance.now();
    const step = (time: number) => {
      const dt = Math.min((time - this.lastTime) / 1000, 0.05);
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
      const t = Math.min((time - this.correctionStart) / CORRECTION_MS, 1);
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

    if (this.posY >= this.groundY && this.velY >= 0) {
      // Сколько персонаж успел "провалиться" за этот кадр, прежде чем игра это заметила
      const overshoot = this.posY - this.groundY;
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
        this.onOutcome?.("good-jump", {
          peakHeight: Math.round(this.maxHeightReached),
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
  }
}

// ---------------------------------------------------------------------------
// Симулятор для задачи 2: собранная игроком последовательность блоков
// прогоняется дважды — один раз "с пола", один раз "с остаточной скоростью
// падения" (как будто персонаж только что сошёл с уступа) — чтобы неправильный
// порядок блоков наглядно проявил себя как баг.
// ---------------------------------------------------------------------------

export type BlockId = "reset-velocity" | "apply-force" | "wait";

export interface TrialResult {
  peakHeight: number;
  didJump: boolean;
}

export class BlockJumpSimulator {
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private groundY: number;

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context not available");
    this.ctx = ctx;
    this.width = canvas.width;
    this.height = canvas.height;
    this.groundY = this.height - 56;
    this.draw(this.groundY);
  }

  async runTrial(
    sequence: BlockId[],
    startingVelY: number,
    jumpForce = 8,
    gravityScale = 15
  ): Promise<TrialResult> {
    let velY = startingVelY;

    for (const block of sequence) {
      if (block === "reset-velocity") {
        velY = 0;
      } else if (block === "apply-force") {
        velY += -jumpForce * VELOCITY_SCALE;
      } else if (block === "wait") {
        await this.sleep(180);
      }
    }

    return this.simulatePhysics(velY, gravityScale);
  }

  private simulatePhysics(initialVelY: number, gravityScale = 15): Promise<TrialResult> {
    return new Promise((resolve) => {
      let posY = this.groundY;
      let velY = initialVelY;
      let peak = 0;
      let last = performance.now();

      // Если стартовая скорость уже "вверх" достаточно сильно — считаем, что прыжок случился.
      const didJumpAtAll = initialVelY < -5;

      if (!didJumpAtAll) {
        this.draw(posY);
        resolve({ peakHeight: 0, didJump: false });
        return;
      }

      const step = (time: number) => {
        const dt = Math.min((time - last) / 1000, 0.05);
        last = time;
        velY += gravityScale * GRAVITY_SCALE_MULT * dt;
        posY += velY * dt;
        const height = this.groundY - posY;
        if (height > peak) peak = height;

        if (posY >= this.groundY && velY >= 0) {
          posY = this.groundY;
          this.draw(posY);
          resolve({ peakHeight: Math.round(peak), didJump: peak > 3 });
          return;
        }
        this.draw(posY);
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }

  private sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
  }

  private draw(posY: number) {
    const { ctx, width, height, groundY } = this;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#10131f";
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "#2e3352";
    ctx.fillRect(0, groundY, width, height - groundY);

    const size = 36;
    ctx.fillStyle = "#a78bfa";
    ctx.beginPath();
    ctx.roundRect(width / 2 - size / 2, posY - size, size, size, 8);
    ctx.fill();
  }
}