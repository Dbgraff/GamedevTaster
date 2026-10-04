// Симулятор для задачи 2: собранная игроком последовательность блоков
// прогоняется дважды — один раз "с пола", один раз "с остаточной скоростью
// падения" (как будто персонаж только что сошёл с уступа) — чтобы неправильный
// порядок блоков наглядно проявил себя как баг.

import { VELOCITY_SCALE, GRAVITY_SCALE_MULT } from "./physicsConstants";

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

// Эталонная высота "правильного" прыжка, посчитанная напрямую по формуле
// (v²/2g), без канваса и анимации — используется только для сравнения
// в разборе, никогда не проигрывается на экране как настоящий прыжок.
export function referencePeakHeight(jumpForce = 8, gravityScale = 15): number {
  const v = jumpForce * VELOCITY_SCALE;
  const g = gravityScale * GRAVITY_SCALE_MULT;
  return (v * v) / (2 * g);
}

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
        const dt = Math.max(0, Math.min((time - last) / 1000, 0.05));
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