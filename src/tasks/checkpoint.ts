import { openModal, TASK_TITLES } from "../ui/shell";
import { progress } from "../state";
import { getTaskRenderer, CHECKPOINT_AFTER, HARD_TASKS_FROM } from "./registry";
import { renderReflection } from "./reflection";

// Развилка после задания 7: опросник сейчас или сложные задания уровня C.
// Выбор не окончательный — с итогового экрана можно вернуться к сложным заданиям.
export function showCheckpointModal() {
  const hardTask = getTaskRenderer(HARD_TASKS_FROM);
  const solved = Object.entries(progress.solvedOn).filter(([n]) => Number(n) <= CHECKPOINT_AFTER);
  const firstTry = solved.filter(([, attempt]) => attempt === 1).length;
  const hardCount = TASK_TITLES.length - CHECKPOINT_AFTER;

  const modal = openModal(
    `
      <p class="eyebrow">Задания 1–${CHECKPOINT_AFTER} пройдены</p>
      <h1 id="checkpoint-title">Базовая часть позади</h1>
      <p class="lead">
        Ты прошёл путь от подкрутки чисел до первых строк настоящего C#.
        Дальше — уровень посложнее: тот же код, но <b>без комментариев-подсказок</b>,
        а в самом конце — финальный баг, который собирает всё пройденное.
      </p>
      <div class="modal-stats">
        <div class="modal-stat"><span class="modal-stat-num">${solved.length}/${CHECKPOINT_AFTER}</span><span>заданий решено</span></div>
        <div class="modal-stat"><span class="modal-stat-num">${firstTry}</span><span>с первой попытки</span></div>
        <div class="modal-stat"><span class="modal-stat-num">${hardCount}</span><span>${hardTask ? "сложных впереди" : "сложных — скоро"}</span></div>
      </div>
      <div class="modal-actions">
        ${
          hardTask
            ? `<button type="button" class="primary" data-choice="continue" data-autofocus>Продолжить: сложные задания →</button>
               <button type="button" class="secondary" data-choice="survey">Пройти опросник и получить разбор</button>`
            : `<button type="button" class="primary" data-choice="survey" data-autofocus>Пройти опросник и получить разбор</button>
               <button type="button" class="secondary" disabled>Сложные задания — скоро появятся</button>`
        }
      </div>
      <p class="modal-note">${
        hardTask
          ? "Опросник никуда не денется — его можно пройти и после сложных заданий."
          : "Задания 8–10 сейчас в разработке. Когда они появятся, к ним можно будет перейти прямо с итогового экрана."
      }</p>
    `,
    { labelledBy: "checkpoint-title" }
  );
  if (!modal) return;

  modal.backdrop.querySelector('[data-choice="survey"]')?.addEventListener("click", () => {
    modal.close();
    progress.checkpoint = "survey";
    renderReflection();
  });
  modal.backdrop.querySelector('[data-choice="continue"]')?.addEventListener("click", () => {
    modal.close();
    progress.checkpoint = "continue";
    hardTask?.();
  });
}