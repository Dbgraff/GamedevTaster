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
const VELOCITY_SCALE = 50; // масштаб jumpForce -> пиксели/сек
const GRAVITY_SCALE_MULT = 45; // масштаб gravityScale -> пиксели/сек^2
const CORRECTION_MS = 220; // сколько длится "доводка" персонажа обратно на пол
// При jumpForce=8 / gravityScale=15 (стандартные значения задачи 2) пик прыжка
// получается ~120px — заметный прыжок на весь экран, а не еле уловимое движение.

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

export type BlockId =
  | "reset-velocity"
  | "apply-force"
  | "wait"
  | "repeat-3x"
  | "check-grounded"
  | "declare-jump-var"
  | "log-jump";

export interface TrialResult {
  peakHeight: number;
  didJump: boolean;
}

export type LogFn = (line: string) => void;

export class BlockJumpSimulator {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private groundY: number;

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context not available");
    this.canvas = canvas;
    this.ctx = ctx;
    this.width = 0;
    this.height = 0;
    this.groundY = 0;
    this.resize();
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));

    this.width = width;
    this.height = height;
    this.canvas.width = Math.round(width * dpr);
    this.canvas.height = Math.round(height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.groundY = height - 56;
    this.draw(this.groundY);
  }

  // Применяет эффект одного блока к текущей вертикальной скорости.
  // Блоки без физического эффекта (условие/переменная/лог) просто печатают
  // строку в лог через onLog — это и есть их "польза": показать, что код
  // выполняется, но ни на что не влияет.
  private applyBlockEffect(block: BlockId, velY: number, jumpForce: number, onLog?: LogFn): number {
    switch (block) {
      case "reset-velocity":
        return 0;
      case "apply-force":
        return velY + -jumpForce * VELOCITY_SCALE;
      case "check-grounded":
        onLog?.("if (isGrounded) → true, но это уже проверено снаружи");
        return velY;
      case "declare-jump-var":
        onLog?.("float force = 20f; — объявлена, но нигде не использована");
        return velY;
      case "log-jump":
        onLog?.('Debug.Log("Прыжок!")');
        return velY;
      default:
        return velY;
    }
  }

  async runTrial(
    sequence: BlockId[],
    startingVelY: number,
    jumpForce = 8,
    gravityScale = 15,
    onLog?: LogFn
  ): Promise<TrialResult> {
    let velY = startingVelY;

    for (let i = 0; i < sequence.length; i++) {
      const block = sequence[i];

      if (block === "wait") {
        await this.sleep(180);
        continue;
      }

      if (block === "repeat-3x") {
        const next = sequence[i + 1];
        if (next && next !== "wait" && next !== "repeat-3x") {
          onLog?.(`for (int i = 0; i < 3; i++) { … } — повторяем «${next}» 3 раза`);
          for (let r = 0; r < 3; r++) {
            velY = this.applyBlockEffect(next, velY, jumpForce, onLog);
          }
          i++; // блок-цель уже отработан внутри повторения, пропускаем его
        }
        continue;
      }

      velY = this.applyBlockEffect(block, velY, jumpForce, onLog);
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

      // Даже если блок «Повторить» утроил силу — не даём улететь за пределы вьюпорта навсегда.
      const maxVel = Math.sqrt(2 * gravityScale * GRAVITY_SCALE_MULT * this.height * 0.85);
      velY = Math.max(velY, -maxVel);

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