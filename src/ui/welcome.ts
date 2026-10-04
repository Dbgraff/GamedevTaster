// Приветственное окно перед заданием 1: знакомство → согласие → вопросы "до".
// Тексты согласия и вопросов — по "Опроснику пилотной апробации" (экран согласия,
// вопросы 1–2) плюс возраст. При отказе курс полностью доступен, но без опроса.

import { openModal, TASK_TITLES } from "./shell";
import { research, type AgeBand, type Experience } from "../research";

const AGES: { v: AgeBand; label: string }[] = [
  { v: "14-15", label: "14–15" },
  { v: "16-17", label: "16–17" },
  { v: "18-21", label: "18–21" },
  { v: "22-25", label: "22–25" },
  { v: "26+", label: "26 и старше" },
];
const EXPERIENCE: { v: Experience; label: string }[] = [
  { v: "none", label: "совсем нет опыта" },
  { v: "school", label: "писал(а) код в школе или на курсах" },
  { v: "student", label: "учусь или учился(лась) на программиста" },
  { v: "work", label: "работаю с кодом" },
];

const introStep = () => `
  <p class="eyebrow">Попробуй профессию · программист в геймдеве</p>
  <h1 id="welcome-title">Сейчас ты побудешь геймплей-программистом</h1>
  <p class="lead">
    Ты будешь чинить и собирать поведение кубика в редакторе, похожем на Unity:
    сначала подкручивать числа, потом собирать логику из блоков, а ближе к концу —
    работать с настоящим кодом. Никакой теории заранее — сразу практика.
  </p>
  <ul class="modal-list">
    <li><span class="info-dot"></span>${TASK_TITLES.length} заданий, каждое — на несколько минут, от подкрутки чисел до настоящего кода</li>
    <li><span class="info-dot"></span>Застрял — жми «💡 Подсказка»</li>
    <li><span class="info-dot"></span>Что пошло не так и почему — во вкладке Console рядом со сценой</li>
    <li><span class="info-dot"></span>В конце — разбор: что тебе зашло больше и какая роль в геймдеве может подойти</li>
    <li class="keyboard-hint"><span class="info-dot"></span>🎮 В заданиях с этим значком можно управлять кубиком с клавиатуры</li>
  </ul>
  <button type="button" class="primary" data-step="next" data-autofocus>${research.answered ? "▶ Начать" : "Дальше →"}</button>
`;

const consentStep = () => `
  <p class="eyebrow">Шаг 2 из 3 · согласие</p>
  <h1 id="welcome-title">Небольшое исследование</h1>
  <p class="lead">
    Это анонимный опрос для учебного исследования. Ответы не связаны с твоим именем или аккаунтом
    и используются только в обобщённом виде. Продолжая, ты соглашаешься на участие.
  </p>
  <div class="modal-actions">
    <button type="button" class="primary" data-consent="yes" data-autofocus>Да, согласен(на)</button>
    <button type="button" class="secondary" data-consent="no">Не согласен(на)</button>
  </div>
  <p class="modal-note">Если не согласишься — курс всё равно полностью доступен, просто без опроса в конце.</p>
`;

const optionList = (name: string, items: { v: string; label: string }[], extraClass = "") =>
  `<div class="pre-options ${extraClass}" role="radiogroup">${items
    .map((i) => `<button type="button" class="pre-option" role="radio" aria-checked="false" data-q="${name}" data-v="${i.v}">${i.label}</button>`)
    .join("")}</div>`;

const preStep = () => `
  <p class="eyebrow">Шаг 3 из 3 · пара вопросов до начала</p>
  <h1 id="welcome-title">Расскажи немного о себе</h1>
  <div class="pre-q">
    <p class="pre-q-title">Сколько тебе лет?</p>
    ${optionList("age", AGES, "pre-options--row")}
  </div>
  <div class="pre-q">
    <p class="pre-q-title">Твой опыт в программировании</p>
    ${optionList("experience", EXPERIENCE)}
  </div>
  <div class="pre-q">
    <p class="pre-q-title">Как бы ты сейчас оценил(а) своё понимание того, чем занимается разработчик игр?</p>
    ${optionList("understand", [1, 2, 3, 4, 5].map((n) => ({ v: String(n), label: String(n) })), "pre-options--scale")}
    <div class="pre-scale-labels"><span>вообще не представляю</span><span>хорошо понимаю</span></div>
  </div>
  <button type="button" class="primary" data-step="start" disabled>▶ Начать</button>
`;

const declinedStep = () => `
  <p class="eyebrow">Без опроса</p>
  <h1 id="welcome-title">Хорошо, понятно!</h1>
  <p class="lead">Курс полностью доступен: задания, подсказки и разбор в конце — всё как обычно. Опроса не будет, и никакие данные никуда не отправятся.</p>
  <button type="button" class="primary" data-step="start" data-autofocus>▶ Начать</button>
`;

export function showWelcome(onDone?: () => void) {
  // Окно нельзя закрыть по Esc: иначе можно было бы пропустить согласие и вопросы "до"
  const modal = openModal(`<div class="welcome-step"></div>`, { labelledBy: "welcome-title", dismissible: false });
  if (!modal) return;
  const card = modal.backdrop.querySelector<HTMLDivElement>(".welcome-step")!;

  const finish = () => {
    modal.close();
    onDone?.();
  };

  const show = (html: string, bind: () => void) => {
    card.innerHTML = html;
    card.parentElement!.scrollTop = 0;
    bind();
    card.querySelector<HTMLElement>("[data-autofocus]")?.focus();
  };

  const showIntro = () =>
    show(introStep(), () => {
      card.querySelector('[data-step="next"]')!.addEventListener("click", () => (research.answered ? finish() : showConsent()));
    });

  const showConsent = () =>
    show(consentStep(), () => {
      card.querySelector('[data-consent="yes"]')!.addEventListener("click", () => {
        research.consent = true;
        showPre();
      });
      card.querySelector('[data-consent="no"]')!.addEventListener("click", () => {
        research.consent = false;
        research.answered = true;
        show(declinedStep(), () => card.querySelector('[data-step="start"]')!.addEventListener("click", finish));
      });
    });

  const showPre = () =>
    show(preStep(), () => {
      const start = card.querySelector<HTMLButtonElement>('[data-step="start"]')!;
      const picked: Record<string, string> = {};
      card.querySelectorAll<HTMLButtonElement>(".pre-option").forEach((btn) =>
        btn.addEventListener("click", () => {
          const q = btn.dataset.q!;
          picked[q] = btn.dataset.v!;
          card.querySelectorAll<HTMLButtonElement>(`.pre-option[data-q="${q}"]`).forEach((b) => {
            b.classList.toggle("active", b === btn);
            b.setAttribute("aria-checked", String(b === btn));
          });
          start.disabled = !(picked.age && picked.experience && picked.understand);
        })
      );
      start.addEventListener("click", () => {
        research.age = picked.age as AgeBand;
        research.experience = picked.experience as Experience;
        research.understandPre = Number(picked.understand);
        research.answered = true;
        finish();
      });
    });

  showIntro();
}