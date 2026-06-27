export const MIN_KCET_RANK = 1;
export const MAX_KCET_RANK = 400000;

export const isValidKcetRank = (value: string | number): boolean => {
  const rank = typeof value === 'number' ? value : parseInt(value, 10);
  return Number.isInteger(rank) && rank >= MIN_KCET_RANK && rank <= MAX_KCET_RANK;
};
