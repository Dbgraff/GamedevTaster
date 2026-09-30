// Интерпретатор для задачи 3 («Кубик учится двигаться»). В отличие от
// простого сравнения с эталонным массивом, здесь каждый блок реально читает
// и пишет только то состояние движка, которое существует к этому моменту —
// так неправильный порядок ломает результат по-настоящему (кубик физически
// не сдвинется), а не просто помечается текстом "не то".

export type MoveBlockId = "input" | "direction" | "multiply" | "assign" | "physics";

export const MOVE_BLOCK_LABELS: Record<MoveBlockId, string> = {
  input: "Движок считывает нажатие клавиш A/D",
  direction: "Нажатие превращается в число направления: −1, 0 или 1",
  multiply: "Направление умножается на скорость (Move Speed)",
  assign: "Персонажу присваивается новая скорость по оси X",
  physics: "Физика пересчитывает позицию кубика",
};

export const MOVE_CORRECT_ORDER: MoveBlockId[] = ["input", "direction", "multiply", "assign", "physics"];

const MOVE_SPEED = 1; // условная единица скорости — реальный масштаб задаёт анимация в UI

interface MoveState {
  hasInput: boolean;
  direction: number | undefined;
  speed: number | undefined;
  velocity: number;
}

export interface MoveResult {
  velocityAtPhysics: number; // итоговая скорость в момент, когда физика её применила (0 = кубик не сдвинулся)
  ranPhysics: boolean; // был ли в сборке вообще блок "physics"
  log: string[]; // построчный разбор того, что реально произошло
}

export function simulateMoveSequence(sequence: MoveBlockId[]): MoveResult {
  const s: MoveState = { hasInput: false, direction: undefined, speed: undefined, velocity: 0 };
  const log: string[] = [];
  let velocityAtPhysics = 0;
  let ranPhysics = false;

  for (const block of sequence) {
    switch (block) {
      case "input":
        s.hasInput = true;
        log.push("Input: клавиша D нажата");
        break;

      case "direction":
        // Если ввод ещё не считан к этому моменту — направление читается "пустым" (0).
        s.direction = s.hasInput ? 1 : 0;
        log.push(
          s.hasInput
            ? "direction = 1 (ввод уже был считан)"
            : "direction = 0 — ввод ещё не считан, читаем значение по умолчанию"
        );
        break;

      case "multiply":
        // Если direction ещё не посчитан — умножаем на 0, а не на будущее значение.
        s.speed = (s.direction ?? 0) * MOVE_SPEED;
        log.push(
          s.direction === undefined
            ? "speed = 0 * MoveSpeed — direction ещё не посчитан, умножать не на что"
            : `speed = ${s.direction} * MoveSpeed = ${s.speed}`
        );
        break;

      case "assign":
        // Если speed ещё не посчитан — персонажу присваивается 0.
        s.velocity = s.speed ?? 0;
        log.push(
          s.speed === undefined
            ? "velocity = 0 — speed ещё не посчитан на этот момент"
            : `velocity = ${s.velocity}`
        );
        break;

      case "physics":
        // Физика использует ТЕКУЩЕЕ значение velocity именно в этот момент —
        // всё, что случится со speed/velocity ПОСЛЕ этой строчки, в этот тик уже не попадёт.
        velocityAtPhysics = s.velocity;
        ranPhysics = true;
        log.push(
          velocityAtPhysics !== 0
            ? `Физика сдвигает кубик: velocity = ${velocityAtPhysics}`
            : "Физика применяется, но velocity сейчас 0 — кубик не двигается"
        );
        break;
    }
  }

  return { velocityAtPhysics, ranPhysics, log };
}