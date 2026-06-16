export const XP_PER_PAGE = 2;
export const STREAK_BONUS = 10;
export const BOOK_FINISH_BONUS = 50;

export function calcXP(pagesRead, streak) {
  const base = pagesRead * XP_PER_PAGE;
  const bonus = streak > 1 ? STREAK_BONUS : 0;
  return base + bonus;
}