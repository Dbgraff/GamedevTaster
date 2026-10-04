// Реестр заданий: номер → функция, которая открывает экран задания.
// Когда появится задание 8, достаточно добавить его сюда — кнопка
// "Продолжить: сложные задания" в развилке и на итоговом экране включится сама.

import { renderNumbersTask } from "./task1";
import { renderCodeTask } from "./task2";
import { renderTask3 } from "./task3";
import { renderTask4 } from "./task4";
import { renderTask5 } from "./task5";
import { renderTask6 } from "./task6";
import { renderTask7 } from "./task7";
import { renderTask8 } from "./task8";
import { renderTask9 } from "./task9";
import { renderTask10 } from "./task10";

const TASKS: Record<number, () => void> = {
  1: () => renderNumbersTask(),
  2: renderCodeTask,
  3: renderTask3,
  4: renderTask4,
  5: renderTask5,
  6: renderTask6,
  7: renderTask7,
  8: renderTask8,
  9: renderTask9,
  10: renderTask10,
};

export function getTaskRenderer(n: number): (() => void) | undefined {
  return TASKS[n];
}

// После этого задания заканчивается уровень B (код с пояснениями)
// и игроку предлагают выбор: опросник или сложные задания уровня C.
export const CHECKPOINT_AFTER = 7;
export const HARD_TASKS_FROM = CHECKPOINT_AFTER + 1;