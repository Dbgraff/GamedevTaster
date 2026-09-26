// Простая симуляция прыжка персонажа-платформера на Canvas.
// Специально написана "как в Unity": публичные параметры (jumpForce, gravityScale,
// groundCheckDistance), которые в задаче 1 крутит пользователь, и функция jump(),
// которую в задаче 2 "вызывает" правильно выбранный код.

export interface PhysicsParams {
  jumpForce: number; // 0–15, аналог Rigidbody force
  gravityScale: number; // 1–30, аналог Rigidbody2D.gravityScale
  groundCheckDistance: number; // 0.02–0.3, аналог радиуса проверки земли
}

export type PlayOutcome = "idle" | "no-jump" | "clipped-floor" | "good-jump";

export class PlatformerDemo {
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private groundY: number;

  private posY: number;
  private velY = 0;
  private isGrounded = true;
  private animId: number | null = null;
  private lastTime = 0;
  private elapsedAirTime = 0;
  private maxHeightReached = 0;

  private params: PhysicsParams;

  onOutcome?: (outcome: PlayOutcome, meta: { peakHeight: number; airTime: number }) => void;

  constructor(canvas: HTMLCanvasElement, params: PhysicsParams) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context not available");
    this.ctx = ctx;
    this.width = canvas.width;
    this.height = canvas.height;
    this.groundY = this.height - 60;
    this.posY = this.groundY;
    this.params = params;
    this.draw();
  }

  setParams(params: Partial<PhysicsParams>) {
    this.params = { ...this.params, ...params };
  }

  reset() {
    this.posY = this.groundY;
    this.velY = 0;
    this.isGrounded = true;
    this.elapsedAirTime = 0;
    this.maxHeightReached = 0;
    this.draw();
  }

  // Аналог нажатия пробела в реальной игре.
  tryJump() {
    if (!this.isGrounded) return;

    if (this.params.jumpForce <= 0) {
      // Ничего не происходит — сила прыжка не задана.
      this.onOutcome?.("no-jump", { peakHeight: 0, airTime: 0 });
      return;
    }

    this.isGrounded = false;
    this.velY = -this.params.jumpForce * 12; // масштаб под пиксели канваса
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
      this.update(dt);
      this.draw();
      if (!this.isGrounded) {
        this.animId = requestAnimationFrame(step);
      } else {
        this.animId = null;
      }
    };
    this.animId = requestAnimationFrame(step);
  }

  private update(dt: number) {
    const gravity = this.params.gravityScale * 60; // px/s^2 масштаб
    this.velY += gravity * dt;
    this.posY += this.velY * dt;
    this.elapsedAirTime += dt;

    const heightAboveGround = this.groundY - this.posY;
    if (heightAboveGround > this.maxHeightReached) {
      this.maxHeightReached = heightAboveGround;
    }

    // groundCheckDistance слишком маленький -> персонаж "проваливается"
    // на пару кадров ниже пола, прежде чем система его поймает — имитируем это.
    const groundThreshold = this.groundY + (0.3 - this.params.groundCheckDistance) * 40;

    if (this.posY >= this.groundY && this.velY >= 0) {
      const clipped = this.posY > groundThreshold + 2;
      this.posY = this.groundY;
      this.velY = 0;
      this.isGrounded = true;

      const outcome: PlayOutcome = clipped ? "clipped-floor" : "good-jump";
      this.onOutcome?.(outcome, {
        peakHeight: Math.round(this.maxHeightReached),
        airTime: Math.round(this.elapsedAirTime * 1000),
      });
    }
  }

  private draw() {
    const { ctx, width, height, groundY, posY } = this;
    ctx.clearRect(0, 0, width, height);

    // фон
    ctx.fillStyle = "#0f1220";
    ctx.fillRect(0, 0, width, height);

    // земля
    ctx.fillStyle = "#2e3352";
    ctx.fillRect(0, groundY + 40, width, height - groundY - 40);

    // персонаж
    const size = 40;
    ctx.fillStyle = "#7dd3fc";
    ctx.beginPath();
    ctx.roundRect(width / 2 - size / 2, posY - size, size, size, 8);
    ctx.fill();

    // "глаза" для наглядности направления
    ctx.fillStyle = "#0f1220";
    ctx.beginPath();
    ctx.arc(width / 2 - 8, posY - size + 14, 3, 0, Math.PI * 2);
    ctx.arc(width / 2 + 8, posY - size + 14, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}
