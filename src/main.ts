import "./style.css";
import { renderNumbersTask } from "./tasks/task1";

// Отдельного экрана интро больше нет — приветствие теперь модалка поверх задания 1.
renderNumbersTask({ withIntro: true });