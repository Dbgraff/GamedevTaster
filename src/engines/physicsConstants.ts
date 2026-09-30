// Общие масштабы физики прыжка — используются и PlatformerDemo (задача 1),
// и BlockJumpSimulator (задача 2), поэтому вынесены отдельно, чтобы оба
// движка всегда были откалиброваны одинаково.

export const PX_PER_UNIT = 100; // масштаб перевода "юнитов" groundCheckDistance в пиксели
export const VELOCITY_SCALE = 50; // масштаб jumpForce -> пиксели/сек
export const GRAVITY_SCALE_MULT = 45; // масштаб gravityScale -> пиксели/сек^2
// При jumpForce=8 / gravityScale=15 (стандартные значения задачи 2) пик прыжка
// получается ~120px — заметный прыжок на весь экран, а не еле уловимое движение.