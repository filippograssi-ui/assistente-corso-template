// Le calorie sono i macro: la formula non cambia mai.
export function caloriesFromMacros(proteine, carboidrati, grassi) {
  return Math.round(4 * proteine + 4 * carboidrati + 9 * grassi);
}
