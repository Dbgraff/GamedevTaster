// Эвристический (не-ИИ) генератор фидбэка для MVP.
//
// КАК ПОДКЛЮЧИТЬ РЕАЛЬНЫЙ ИИ ПОЗЖЕ:
// Замени тело getFeedback() на fetch к своей serverless-функции
// (Cloudflare Worker / Netlify Function), которая уже на сервере
// дергает Anthropic/OpenAI API с system-промптом-рубрикой и этим же
// объектом SessionState в качестве контекста. Ключ API при этом
// никогда не попадает в браузер пользователя.
//
// Пример вызова, когда бэкенд будет готов:
//
// export async function getFeedback(state: SessionState): Promise<string> {
//   const res = await fetch("https://your-worker.example.workers.dev/feedback", {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify(state),
//   });
//   const data = await res.json();
//   return data.feedback;
// }

export interface SessionState {
  numbersAttempts: number; // сколько раз нажали Play, пока не получился нормальный прыжок
  codeAttempts: number; // сколько раз выбрали неверный вариант кода
  reflection: {
    moreInteresting: "numbers" | "code";
    hardestPart: "numbers" | "code" | "neither";
    wantedWhy: boolean; // хотелось понять "почему", а не просто получить результат
  };
}

export function getFeedback(state: SessionState): string {
  const { numbersAttempts, codeAttempts, reflection } = state;

  const strugglesMoreWithNumbers = numbersAttempts > codeAttempts + 1;
  const strugglesMoreWithCode = codeAttempts > numbersAttempts + 1;

  const likesNumbers =
    reflection.moreInteresting === "numbers" || strugglesMoreWithCode;
  const likesCode =
    reflection.moreInteresting === "code" || strugglesMoreWithNumbers;

  const parts: string[] = [];

  if (likesNumbers && !likesCode) {
    parts.push(
      "Похоже, тебе больше зашла настройка ощущений от игры через цифры, чем сама логика кода. " +
        "Это нормально и даже здорово — многие в геймдеве начинали именно с интереса к балансу и «фидбэку» игры. " +
        "Возможно, тебе стоит присмотреться не только к программированию, но и к геймдизайну или техническому геймдизайну — " +
        "там как раз много работы именно с числами и ощущениями."
    );
  } else if (likesCode && !likesNumbers) {
    parts.push(
      "Похоже, тебе больше понравилось разбираться с логикой и структурой кода, чем просто крутить цифры. " +
        "Это хороший знак для программирования — тебе может зайти путь именно в геймплей-программирование или инструменты для разработки."
    );
  } else {
    parts.push(
      "У тебя неплохо получилось и с настройкой чисел, и с логикой кода — это хорошая база для программиста в геймдеве, " +
        "где обе эти вещи постоянно переплетаются."
    );
  }

  if (reflection.wantedWhy) {
    parts.push(
      "Ты отметил(а), что хотелось разобраться «почему», а не просто получить результат — " +
        "это важная черта для разработчика: со временем именно это любопытство помогает быстрее находить причины багов."
    );
  } else {
    parts.push(
      "Ты больше ориентировался(лась) на результат, чем на «почему так работает» — тоже рабочий подход, " +
        "особенно на старте, но по мере погружения в код разбираться в причинах придётся всё чаще."
    );
  }

  return parts.join(" ");
}
