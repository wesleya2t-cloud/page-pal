export type House = {
  id: string;
  name: string;
  motto: string;
  /** oklch color string used inline for house-owned surfaces */
  color: string;
};

export const HOUSES: House[] = [
  {
    id: "emberbind",
    name: "Emberbind",
    motto: "We read until the wick is gone.",
    color: "oklch(0.508 0.139 33)",
  },
  {
    id: "verdantpage",
    name: "Verdantpage",
    motto: "Slow pages, deep roots.",
    color: "oklch(0.472 0.072 148)",
  },
  {
    id: "gildleaf",
    name: "Gildleaf",
    motto: "Every margin worth gilding.",
    color: "oklch(0.6 0.1 78)",
  },
  {
    id: "inkfall",
    name: "Inkfall",
    motto: "The night is a long chapter.",
    color: "oklch(0.286 0.055 268)",
  },
];

export function houseById(id: string | null | undefined): House {
  return HOUSES.find((h) => h.id === id) ?? HOUSES[3]!;
}

/** XP: 10 per page read, 5 per minute studied or timed. */
export function xpFrom(pages: number, minutes: number) {
  return pages * 10 + minutes * 5;
}

export function levelFromXp(xp: number) {
  const level = Math.floor(Math.sqrt(xp / 250)) + 1;
  const currentFloor = (level - 1) ** 2 * 250;
  const nextFloor = level ** 2 * 250;
  const progress = nextFloor === currentFloor ? 0 : (xp - currentFloor) / (nextFloor - currentFloor);
  return { level, progress: Math.min(1, Math.max(0, progress)), nextFloor, xp };
}

export function todayISO(d = new Date()) {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export function daysAgoISO(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return todayISO(d);
}

/** Consecutive days (ending today or yesterday) with any activity. */
export function streakFrom(dates: string[]) {
  const set = new Set(dates);
  if (set.size === 0) return 0;
  let streak = 0;
  let cursor = 0;
  if (!set.has(daysAgoISO(0))) {
    if (!set.has(daysAgoISO(1))) return 0;
    cursor = 1;
  }
  while (set.has(daysAgoISO(cursor))) {
    streak += 1;
    cursor += 1;
  }
  return streak;
}

const SPINE_PALETTE = [
  "oklch(0.508 0.139 33)",
  "oklch(0.472 0.072 148)",
  "oklch(0.6 0.1 78)",
  "oklch(0.286 0.055 268)",
  "oklch(0.42 0.09 300)",
  "oklch(0.45 0.1 220)",
  "oklch(0.55 0.11 60)",
  "oklch(0.38 0.06 180)",
];

export function spineColorFor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return SPINE_PALETTE[hash % SPINE_PALETTE.length]!;
}

export function formatMinutes(total: number) {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function formatClock(seconds: number) {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function relativeDay(dateISO: string) {
  if (dateISO === daysAgoISO(0)) return "Today";
  if (dateISO === daysAgoISO(1)) return "Yesterday";
  return new Date(dateISO + "T00:00:00").toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
