const FALLBACK_PALETTE = ["#2F6F4E", "#B4472B", "#4C6EF5", "#AE3EC9", "#E8590C", "#0CA678", "#F08C00", "#1971C2"];

export function colorForTeacher(teacher) {
  if (teacher?.color) return teacher.color;
  if (!teacher?.id) return "#2F6F4E";
  // Σταθερό fallback χρώμα ανά καθηγητή (deterministic hash) όταν δεν έχει οριστεί χειροκίνητα.
  let hash = 0;
  for (const ch of teacher.id) hash = (hash * 31 + ch.charCodeAt(0)) % FALLBACK_PALETTE.length;
  return FALLBACK_PALETTE[hash];
}
