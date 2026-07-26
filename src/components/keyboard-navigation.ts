export function nextOptionIndex(current: number, length: number, key: "ArrowDown" | "ArrowUp"): number {
  if (length <= 0) return 0;
  return key === "ArrowDown" ? (current + 1) % length : (current - 1 + length) % length;
}

export type RatingKeyboardResult = { type: "select"; value: number } | { type: "clear" } | { type: "none" };

export function ratingKeyboardResult(key: string, rating: number, max: number, allowClear: boolean): RatingKeyboardResult {
  if (key === "ArrowRight" || key === "ArrowUp") return { type: "select", value: rating === max ? 1 : rating + 1 };
  if (key === "ArrowLeft" || key === "ArrowDown") return { type: "select", value: rating === 1 ? max : rating - 1 };
  if (key === "Home") return { type: "select", value: 1 };
  if (key === "End") return { type: "select", value: max };
  if ((key === "Delete" || key === "Backspace") && allowClear) return { type: "clear" };
  return { type: "none" };
}
