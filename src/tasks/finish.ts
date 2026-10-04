import { openModal } from "../ui/shell";
import { progress } from "../state";
import { renderReflection } from "./reflection";

// Кнопка "Закончить и пройти опрос" на заданиях 7–10. С подтверждением — чтобы
// нельзя было уйти случайным нажатием. beforeLeave — снять слушатели задания.
export function setupFinishButton(beforeLeave?: () => void) {
  document.querySelector("#finish-btn")?.addEventListener("click", () => {
    const modal = openModal(
      `
        <p class="eyebrow">Закончить курс?</p>
        <h1 id="finish-title">Перейти к разбору и опросу</h1>
        <p class="lead">Всё, что ты уже прошёл(ла), попадёт в разбор. Оставшиеся задания можно не проходить — это нормально.</p>
        <div class="modal-actions">
          <button type="button" class="primary" data-finish="yes">Да, закончить</button>
          <button type="button" class="secondary" data-finish="no" data-autofocus>Вернуться к заданию</button>
        </div>
      `,
      { labelledBy: "finish-title" }
    );
    if (!modal) return;
    modal.backdrop.querySelector('[data-finish="no"]')!.addEventListener("click", modal.close);
    modal.backdrop.querySelector('[data-finish="yes"]')!.addEventListener("click", () => {
      modal.close();
      beforeLeave?.();
      progress.exitPoint = "finish_button";
      renderReflection();
    });
  });
}