export type TextPatch = { start: number; end: number; replacement: string };
export type DiffLine = { type: "same" | "add" | "remove"; value: string; beforeLine?: number; afterLine?: number };

export function applyTextPatches(source: string, patches: TextPatch[]) {
  const ordered = [...patches].sort((a, b) => b.start - a.start || b.end - a.end);
  let boundary = source.length;
  let output = source;
  for (const patch of ordered) {
    if (!Number.isInteger(patch.start) || !Number.isInteger(patch.end) || patch.start < 0 || patch.end < patch.start || patch.end > source.length) {
      throw new Error("Patch possui intervalo inválido.");
    }
    if (patch.end > boundary) throw new Error("Patches não podem se sobrepor.");
    boundary = patch.start;
    output = `${output.slice(0, patch.start)}${patch.replacement}${output.slice(patch.end)}`;
  }
  return output;
}

export function lineDiff(before: string, after: string): DiffLine[] {
  const left = before.split("\n");
  const right = after.split("\n");
  const table = Array.from({ length: left.length + 1 }, () => Array<number>(right.length + 1).fill(0));
  for (let i = left.length - 1; i >= 0; i--) {
    for (let j = right.length - 1; j >= 0; j--) {
      table[i][j] = left[i] === right[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }
  const result: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < left.length && j < right.length) {
    if (left[i] === right[j]) {
      result.push({ type: "same", value: left[i], beforeLine: ++i, afterLine: ++j });
    } else if (table[i + 1][j] >= table[i][j + 1]) {
      result.push({ type: "remove", value: left[i], beforeLine: ++i });
    } else {
      result.push({ type: "add", value: right[j], afterLine: ++j });
    }
  }
  while (i < left.length) result.push({ type: "remove", value: left[i], beforeLine: ++i });
  while (j < right.length) result.push({ type: "add", value: right[j], afterLine: ++j });
  return result;
}
