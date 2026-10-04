// Наставник на правилах (заглушка вместо ИИ на этапе MVP).
//
// Строит профиль из журнала прохождения (state.ts → progress) и ответов
// рефлексии. Всё, что он выдаёт, — структурированный объект Profile: его же
// можно будет отдать языковой модели, когда появится ИИ-наставник, —
// сигналы останутся теми же, поменяется только то, кто пишет итоговый текст.

import { TASK_TITLES } from "./ui/shell";

export type Interest = "numbers" | "logic" | "engine" | "code";

export interface Reflection {
  moreInteresting: Interest;
  hardestPart: Interest | "neither";
  wantedWhy: boolean;
}

export interface SessionState {
  numbersAttempts: number;
  codeAttempts: number;
  reflection: Reflection | null;
}

export interface Journal {
  attempts: Record<number, number>;
  solvedOn: Record<number, number>;
  mistakes: Record<number, string[]>;
  hints: Record<number, number>;
  enteredAt: Record<number, number>;
  times: Record<number, number>;
  flags: Set<string>;
  checkpoint: null | "survey" | "continue";
  startedAt: number;
}

// ---------- Оси профиля: какие задания проверяют какой навык ----------
export const AXES: { id: Interest; title: string; tasks: number[]; strength: string }[] = [
  { id: "numbers", title: "Числа и баланс", tasks: [1], strength: "ты быстро почувствовал(а), как числа меняют ощущение от игры" },
  { id: "logic", title: "Логика и порядок", tasks: [2, 3], strength: "ты хорошо видишь, в каком порядке должны происходить действия" },
  { id: "engine", title: "Устройство движка", tasks: [4, 6], strength: "ты понял(а), как устроены объекты в движке: какие компоненты им нужны и какие события они вызывают" },
  { id: "code", title: "Работа с кодом", tasks: [5, 6, 7], strength: "ты уверенно читаешь настоящий C# и понимаешь, что делает каждая строка" },
];

const INTEREST_LABEL: Record<Interest, string> = {
  numbers: "подбирать числа и баланс",
  logic: "собирать логику из блоков",
  engine: "разбираться, как устроен движок",
  code: "работать с настоящим кодом",
};

// ---------- Направления ----------
type DirectionId = "programmer" | "techdesigner" | "designer";
const DIRECTIONS: Record<DirectionId, { title: string; about: string; next: string[] }> = {
  programmer: {
    title: "Геймплей-программист",
    about: "Геймплей-программист пишет код, благодаря которому игра вообще работает: движение, камера, столкновения, счёт.",
    next: [
      "Пройди бесплатные курсы для новичков на Unity Learn — там тот же редактор и тот же C#, что ты видел(а) здесь.",
      "Собери свой мини-платформер: кубик, прыжок, монетки и счёт — всё это ты уже чинил(а) в этой пробе.",
    ],
  },
  techdesigner: {
    title: "Технический геймдизайнер",
    about: "Технический геймдизайнер стоит между дизайном и кодом: настраивает компоненты, физику и поведение объектов, чтобы задумка заработала в движке.",
    next: [
      "Открой Unity и попробуй собрать сцену без единой строки кода — только из готовых компонентов: Rigidbody, коллайдеры, триггеры.",
      "Разбери любимую игру: какие объекты в ней твёрдые, какие проходимые, что срабатывает при касании — и как бы ты это настроил(а).",
    ],
  },
  designer: {
    title: "Геймдизайнер",
    about: "Геймдизайнер придумывает правила и баланс: как высоко прыгает герой, как быстро растёт счёт, когда игре пора стать сложнее.",
    next: [
      "Возьми любимую игру и выпиши в таблицу её числа: скорость, урон, награды. Что бы ты поменял(а) и почему?",
      "Собери бумажный прототип своей игры и проверь баланс на друзьях — так начинают многие геймдизайнеры.",
    ],
  },
};

// ---------- Что объяснить по каждой конкретной ошибке ----------
// Коды пишут сами задания в registerAttempt(task, ok, mistake).
export const MISTAKES: Record<string, string> = {
  // задание 1
  "1:no-jump": "без силы прыжка персонажу просто нечем оторваться от земли",
  "1:too-weak": "сила прыжка и гравитация тянут в разные стороны — важен их баланс, а не одно число",
  "1:clipped-floor": "слишком короткая проверка земли не успевает «поймать» пол — и персонаж проваливается",
  "1:hovering": "слишком длинная проверка земли ловит пол раньше времени — и персонаж «встаёт» в воздухе",
  // задание 2
  "2:missing-force": "каждое действие нужно явно написать: без силы вверх прыжка не будет",
  "2:reset-after-force": "сброс скорости после силы гасит прыжок — порядок команд меняет результат",
  "2:no-reset": "без сброса скорости сила складывается со старым падением — прыжки получаются разными",
  "2:too-high": "Update и так выполняется каждый кадр — лишний цикл вокруг разового действия ломает поведение",
  // задание 3
  "3:no-physics": "посчитать скорость мало — двигает объект только физика",
  "3:zero-velocity": "шаг, который читает значение раньше, чем его посчитали, получает ноль",
  "3:wrong-order": "код может «вроде работать», но быть собран не так, как задумано",
  // задание 4
  "4:player-no-rb": "без Rigidbody физика объект не двигает, что бы ни писал скрипт",
  "4:player-falls": "Rigidbody без твёрдого коллайдера проваливается сквозь пол",
  "4:wall-rb": "Rigidbody делает объект подвижным — неподвижной стене он не нужен",
  "4:wall-no-collider": "без твёрдого коллайдера сквозь объект можно пройти",
  "4:coin-no-collider": "без коллайдера движок даже не узнаёт о касании",
  "4:coin-not-trigger": "проходимым объект делает Is Trigger — без него это ещё одна стена",
  "4:coin-rb": "лишний Rigidbody тянет объект вниз — монетке он не нужен",
  // задание 5
  "5:compile": "переменную нельзя использовать раньше, чем она объявлена, — иначе код не скомпилируется",
  "5:no-move": "посчитать позицию мало — её нужно присвоить transform.position",
  "5:recalc": "offset задаётся один раз — если пересчитывать его каждый кадр до расчёта позиции, камера «замерзает» на месте",
  "5:direct": "без offset камера «прилипает» к персонажу и повторяет каждый его прыжок",
  "5:bob": "высоту камеры нужно зафиксировать до того, как её переместить",
  "5:update-jitter": "камере нужен LateUpdate: он выполняется после того, как все объекты уже сдвинулись",
  "5:extra-lines": "лишняя строка может не ломать код, но это лишний шанс что-то сломать",
  // задание 6
  "6:compile-dup": "у каждого события движка свой метод — два одинаковых метода в классе быть не может",
  "6:destroy-self": "Destroy(gameObject) удаляет объект со скриптом, а не тот, которого коснулись",
  "6:wrong-event": "твёрдые столкновения и триггеры — разные события: OnCollisionEnter и OnTriggerEnter",
  "6:coin-left": "чтобы подобрать монетку, её нужно явно удалить — Destroy(other.gameObject)",
  "6:no-score": "удалить монетку мало — счёт тоже нужно увеличить самому",
  "6:score-extra": "одно и то же действие, выполненное дважды, даёт двойной результат",
  // задание 7
  "7:compile": "число и текст — разные типы данных, их нельзя просто присвоить друг другу",
  "7:no-inc": "без score += 1 счёт не растёт",
  "7:no-label": "переменная и текст на экране — разные вещи: текст сам не обновится",
  "7:label-before-inc": "текст нужно обновлять после того, как счёт вырос, — иначе он показывает старое значение",
  "7:score-extra": "одно и то же действие, выполненное дважды, даёт двойной результат",
};

// ---------- Профиль ----------
export interface Profile {
  direction: DirectionId;
  directionTitle: string;
  summary: string;
  axes: { id: Interest; title: string; value: number | null }[];
  strengths: string[];
  difficulties: { task: number; title: string; lessons: string[] }[];
  workStyle: string[];
  interestNote?: string;
  next: string[];
  totalMinutes: number;
}

// Насколько уверенно решено задание: 1 — с первой попытки без подсказок
function taskScore(j: Journal, task: number): number | null {
  const solved = j.solvedOn[task];
  if (solved === undefined) return (j.attempts[task] ?? 0) > 0 ? 0.2 : null; // не дошёл — не учитываем
  const base = solved === 1 ? 1 : solved === 2 ? 0.85 : solved === 3 ? 0.7 : 0.55;
  const hintPenalty = Math.min(0.2, (j.hints[task] ?? 0) * 0.1);
  return Math.max(0.1, base - hintPenalty);
}

const plural = (n: number, one: string, few: string, many: string) => {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
};

export function buildProfile(j: Journal, reflection: Reflection | null): Profile {
  const axes = AXES.map((a) => {
    const scores = a.tasks.map((t) => taskScore(j, t)).filter((v): v is number => v !== null);
    return { id: a.id, title: a.title, value: scores.length ? Math.round((scores.reduce((x, y) => x + y, 0) / scores.length) * 100) : null };
  });
  const v = (id: Interest) => (axes.find((a) => a.id === id)!.value ?? 0) / 100;

  // Направление: то, как решал, плюс то, что сам назвал интересным
  const score: Record<DirectionId, number> = {
    programmer: v("code") * 0.6 + v("logic") * 0.4,
    techdesigner: v("engine") * 0.5 + v("numbers") * 0.25 + v("code") * 0.25,
    designer: v("numbers") * 0.6 + v("logic") * 0.2 + v("engine") * 0.2,
  };
  const interest = reflection?.moreInteresting;
  if (interest === "code") score.programmer += 0.15;
  if (interest === "logic") { score.programmer += 0.08; score.techdesigner += 0.05; }
  if (interest === "engine") score.techdesigner += 0.15;
  if (interest === "numbers") score.designer += 0.15;
  const direction = (Object.keys(score) as DirectionId[]).reduce((a, b) => (score[b] > score[a] ? b : a));
  const dir = DIRECTIONS[direction];

  // Сильные стороны — оси от 70%
  const strengths = axes
    .filter((a) => a.value !== null && a.value >= 70)
    .sort((a, b) => b.value! - a.value!)
    .slice(0, 2)
    .map((a) => `${a.title}: ${AXES.find((x) => x.id === a.id)!.strength}.`);

  // Где было сложно — любые задания с конкретными ошибками (сначала самые трудные),
  // с объяснением именно тех ошибок, которые человек допустил
  const difficulties = Object.keys(j.mistakes)
    .map(Number)
    .filter((t) => (j.mistakes[t]?.length ?? 0) > 0)
    .sort((a, b) => (j.attempts[b] ?? 0) - (j.attempts[a] ?? 0))
    .slice(0, 3)
    .map((t) => ({
      task: t,
      title: TASK_TITLES[t - 1],
      lessons: (j.mistakes[t] ?? []).map((m) => MISTAKES[`${t}:${m}`]).filter(Boolean).slice(0, 2),
    }))
    .filter((d) => d.lessons.length > 0);

  // Как работал
  const workStyle: string[] = [];
  const totalHints = Object.values(j.hints).reduce((a, b) => a + b, 0);
  if (totalHints === 0) workStyle.push("Ты справился(лась) без единой подсказки — это говорит о самостоятельности.");
  else if (totalHints <= 3) workStyle.push("Подсказки ты открывал(а) иногда — нормальный рабочий режим: в реальной разработке тоже постоянно что-то ищут и уточняют.");
  else workStyle.push("Подсказки помогали тебе часто — на старте это нормально; важно, что ты доходил(а) до решения.");

  const persistent = Object.values(j.solvedOn).filter((n) => n >= 3).length;
  if (persistent > 0)
    workStyle.push(
      `Ты не сдавался(лась): в ${persistent} ${plural(persistent, "задании", "заданиях", "заданиях")} добился(лась) решения после нескольких неудачных попыток. Для разработчика это, пожалуй, главное качество — баги редко чинятся с первого раза.`
    );

  const experiments: string[] = [];
  if (j.solvedOn[1] !== undefined && (j.attempts[1] ?? 0) - j.solvedOn[1] >= 2) experiments.push("продолжал(а) крутить параметры прыжка");
  if (j.flags.has("drove3")) experiments.push("погонял(а) кубик с клавиатуры");
  if (experiments.length)
    workStyle.push(`После решения ты ещё экспериментировал(а) — ${experiments.join(" и ")}. Именно так разработчики и находят, как сделать игру лучше.`);

  if (reflection?.wantedWhy) workStyle.push("Ты отметил(а), что хотелось понять, почему всё работает именно так, — это любопытство со временем помогает быстрее находить причины багов.");
  if (j.checkpoint === "continue") workStyle.push("На развилке ты выбрал(а) сложные задания вместо опроса — хороший знак интереса к делу.");

  // Интерес важнее лёгкости: если интересное давалось тяжело — поддержать, а не "это не твоё"
  let interestNote: string | undefined;
  if (interest) {
    const val = axes.find((a) => a.id === interest)!.value;
    if (val !== null && val < 60)
      interestNote = `Ты отметил(а), что тебе интереснее всего ${INTEREST_LABEL[interest]}, хотя давалось это непросто. Это хороший знак, а не плохой: навык приходит с практикой, а желание разбираться — не ко всем.`;
  }

  const totalMinutes = Math.max(1, Math.round((Date.now() - j.startedAt) / 60000));

  return {
    direction,
    directionTitle: dir.title,
    summary: `Похоже, тебе ближе всего роль «${dir.title}». ${dir.about}`,
    axes,
    strengths,
    difficulties,
    workStyle,
    interestNote,
    next: dir.next,
    totalMinutes,
  };
}