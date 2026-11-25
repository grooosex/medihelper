export const APP_ID = "购药助手";
export const FILE_VERSION = 1;
export const STORAGE_KEY = "gouyao-zhushou-v1";

export type DayMode = "days" | "dates";
export type OverrideKind = "follow" | "days" | "date";

export type Med = {
  id: string;
  name: string;
  timesPerDay: string;
  amountPerTime: string;
  perBox: string;
  remaining: string;
  price: string;
  overrideKind: OverrideKind;
  overrideDays: string;
  overrideEnd: string;
};

export type Person = {
  id: string;
  name: string;
  note: string;
  dayMode: DayMode;
  days: string;
  startDate: string;
  endDate: string;
  meds: Med[];
};

export type Store = {
  people: Person[];
  activeId: string;
};

const DAD_MED_NAMES = [
  "阿司匹林肠溶片（拜阿司匹灵）",
  "阿托伐他汀钙片（立普妥）",
  "替格瑞洛片（倍林达）",
  "恩格列净片（科糖恩）",
  "硝苯地平控释片（拜新同）",
  "叶酸片（斯利安）",
  "复合维生素B片（力生）",
  "百令片",
  "海昆肾喜胶囊",
] as const;

export function copyPersonName(name: string): string {
  const base = name.trim() || "未命名";
  return `${base}(副本)`;
}

export function duplicatePerson(person: Person, personId: string, medIds: string[]): Person {
  return {
    ...person,
    id: personId,
    name: copyPersonName(person.name),
    meds: person.meds.map((med, index) => ({ ...med, id: medIds[index] ?? `${personId}-med-${index}` })),
  };
}

export function emptyMed(id: string, name = ""): Med {
  return {
    id,
    name,
    timesPerDay: "",
    amountPerTime: "",
    perBox: "",
    remaining: "",
    price: "",
    overrideKind: "follow",
    overrideDays: "",
    overrideEnd: "",
  };
}

export function createSeed(): Store {
  return {
    activeId: "person-dad",
    people: [
      {
        id: "person-dad",
        name: "爸爸",
        note: "",
        dayMode: "days",
        days: "",
        startDate: "",
        endDate: "",
        meds: DAD_MED_NAMES.map((name, index) => emptyMed(`med-dad-${index}`, name)),
      },
    ],
  };
}

export function parseNum(raw: string): number | null {
  const s = raw.trim();
  if (!/^\d+(\.\d+)?$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Ceil the value the user sees at two decimals, so 1.00 stays 1 and 1.01 becomes 2. */
export function ceilUnits(n: number): number {
  const shown = round2(n);
  const ceiled = Math.ceil(shown - 1e-10);
  return ceiled === 0 ? 0 : ceiled;
}

export function format2(n: number): string {
  return round2(n).toFixed(2);
}

export function formatTablets(n: number): string {
  const shown = round2(n);
  return Number.isInteger(shown) ? String(shown) : shown.toFixed(2);
}

export function formatLoose(n: number): string {
  const r = Math.round(n * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
}

export function formatMoney(n: number): string {
  return `¥${round2(n).toFixed(2)}`;
}

export function todayISO(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseISODate(iso: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;
  const y = Number(match[1]);
  const mo = Number(match[2]);
  const d = Number(match[3]);
  const dt = new Date(y, mo - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
  return dt;
}

export function inclusiveDays(startISO: string, endISO: string): number | null {
  const start = parseISODate(startISO);
  const end = parseISODate(endISO);
  if (!start || !end) return null;
  const diff = Math.round((end.getTime() - start.getTime()) / 86_400_000);
  if (diff < 0) return null;
  return diff + 1;
}

export function formatCNDate(iso: string): string {
  const d = parseISODate(iso);
  if (!d) return iso;
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

export function addDaysISO(iso: string, days: number): string | null {
  const d = parseISODate(iso);
  if (!d) return null;
  d.setDate(d.getDate() + days);
  return todayISO(d);
}

export type TripInfo = {
  mode: DayMode;
  days: number | null;
  start: string;
  error: string | null;
};

export function tripInfo(person: Person, today: string): TripInfo {
  if (person.dayMode === "dates") {
    const start = person.startDate || today;
    if (!person.endDate) return { mode: "dates", days: null, start, error: null };
    const days = inclusiveDays(start, person.endDate);
    if (days === null) {
      return { mode: "dates", days: null, start, error: "结束日期不能早于开始" };
    }
    return { mode: "dates", days, start, error: null };
  }
  if (person.days.trim() === "") {
    return { mode: "days", days: null, start: today, error: null };
  }
  const n = parseNum(person.days);
  if (n === null || n <= 0) {
    return { mode: "days", days: null, start: today, error: "天数要大于 0" };
  }
  return { mode: "days", days: n, start: today, error: null };
}

export type MedCalc = {
  active: boolean;
  days: number | null;
  custom: boolean;
  dayLabel: string;
  dayError: string | null;
  tabletsExact: number | null;
  tabletsCeil: number | null;
  boxesExact: number | null;
  boxesCeil: number | null;
  surplus: number | null;
  surplusDays: number | null;
  blocker: string | null;
  boxNote: string | null;
  price: number | null;
  countsInTotal: boolean;
};

export function calcMed(person: Person, med: Med, today: string): MedCalc {
  const trip = tripInfo(person, today);
  const remainingRaw = med.remaining.trim();
  const active = remainingRaw !== "";
  const remaining = parseNum(med.remaining);
  const price = parseNum(med.price);

  let days: number | null = null;
  let custom = false;
  let dayError: string | null = null;
  let dayLabel = "跟这次一样";

  if (med.overrideKind === "days" && med.overrideDays.trim() !== "") {
    custom = true;
    const n = parseNum(med.overrideDays);
    if (n === null || n <= 0) {
      dayError = "这种药的天数要大于 0";
      dayLabel = "单独设置的天数不对";
    } else {
      days = n;
      dayLabel = `单独 ${formatLoose(n)} 天，不跟上面`;
    }
  } else if (med.overrideKind === "date" && med.overrideEnd) {
    custom = true;
    if (!med.overrideEnd) {
      dayError = "选这种药用到哪一天";
      dayLabel = "单独设置，还没选日期";
    } else {
      const n = inclusiveDays(trip.start, med.overrideEnd);
      if (n === null) {
        dayError = "这种药的日期不能早于开始日期";
        dayLabel = "单独设置的日期不对";
      } else {
        days = n;
        dayLabel = `单独用到 ${formatCNDate(med.overrideEnd)}（${n} 天），不跟上面`;
      }
    }
  } else if (trip.error) {
    dayError = trip.error;
    dayLabel = "跟这次一样（日期不对）";
  } else if (trip.days === null) {
    dayLabel = "跟这次一样（上面还没定）";
  } else {
    days = trip.days;
    dayLabel = `跟这次一样（${formatLoose(trip.days)} 天）`;
  }

  const base: MedCalc = {
    active,
    days,
    custom,
    dayLabel,
    dayError,
    tabletsExact: null,
    tabletsCeil: null,
    boxesExact: null,
    boxesCeil: null,
    surplus: null,
    surplusDays: null,
    blocker: null,
    boxNote: null,
    price,
    countsInTotal: active && remaining !== null && price !== null,
  };

  if (!active) return base;
  if (remaining === null) {
    return { ...base, blocker: "剩余要填数字，没有就填 0" };
  }
  if (dayError) return { ...base, blocker: dayError };
  if (days === null) return { ...base, blocker: "先在上面填这次要备的天数" };

  const timesMissing = med.timesPerDay.trim() === "";
  const amountMissing = med.amountPerTime.trim() === "";
  if (timesMissing || amountMissing) {
    return { ...base, blocker: "还差一天几次或每次几片" };
  }
  const times = parseNum(med.timesPerDay);
  const amount = parseNum(med.amountPerTime);
  if (times === null || amount === null) {
    return { ...base, blocker: "用法要填大于或等于 0 的数字" };
  }

  const daily = times * amount;
  const raw = daily * days - remaining;
  const need = Math.max(0, raw);
  const surplus = raw < 0 ? -raw : 0;
  const surplusDays = surplus > 0 && daily > 0 ? surplus / daily : null;

  let boxNote: string | null = null;
  let boxesExact: number | null = null;
  let boxesCeil: number | null = null;
  if (med.perBox.trim() === "") {
    boxNote = "还差一盒几片";
  } else {
    const perBox = parseNum(med.perBox);
    if (perBox === null || perBox <= 0) {
      boxNote = "一盒片数要大于 0";
    } else {
      boxesExact = need / perBox;
      boxesCeil = ceilUnits(boxesExact);
    }
  }

  return {
    ...base,
    tabletsExact: need,
    tabletsCeil: ceilUnits(need),
    boxesExact,
    boxesCeil,
    surplus: surplus > 0 ? surplus : null,
    surplusDays,
    boxNote,
  };
}

export function tripDirty(person: Person): boolean {
  if (person.days.trim() || person.startDate.trim() || person.endDate.trim()) return true;
  return person.meds.some(
    (med) =>
      med.remaining.trim() !== "" ||
      med.price.trim() !== "" ||
      med.overrideKind !== "follow",
  );
}

export function resetTrip(person: Person): Person {
  return {
    ...person,
    days: "",
    startDate: "",
    endDate: "",
    meds: person.meds.map((med) => ({
      ...med,
      remaining: "",
      price: "",
      overrideKind: "follow",
      overrideDays: "",
      overrideEnd: "",
    })),
  };
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asOverride(value: unknown): OverrideKind {
  return value === "days" || value === "date" || value === "follow" ? value : "follow";
}

function parseMed(value: unknown, index: number): Med | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const id = asString(row.id).trim() || `med-${index}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    id,
    name: asString(row.name),
    timesPerDay: asString(row.timesPerDay),
    amountPerTime: asString(row.amountPerTime),
    perBox: asString(row.perBox),
    remaining: asString(row.remaining),
    price: asString(row.price),
    overrideKind: asOverride(row.overrideKind),
    overrideDays: asString(row.overrideDays),
    overrideEnd: asString(row.overrideEnd),
  };
}

function parsePerson(value: unknown, index: number): Person | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const id = asString(row.id).trim() || `person-${index}`;
  const meds = Array.isArray(row.meds)
    ? row.meds.map(parseMed).filter((med): med is Med => med !== null)
    : [];
  return {
    id,
    name: asString(row.name),
    note: asString(row.note),
    dayMode: row.dayMode === "dates" ? "dates" : "days",
    days: asString(row.days),
    startDate: asString(row.startDate),
    endDate: asString(row.endDate),
    meds,
  };
}

export function parseArchive(text: string): { ok: true; data: Store } | { ok: false; error: string } {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: "这个文件不是购药助手的存档" };
  }
  if (!json || typeof json !== "object") {
    return { ok: false, error: "这个文件不是购药助手的存档" };
  }
  const row = json as Record<string, unknown>;
  if (row.app !== APP_ID) return { ok: false, error: "这个文件不是购药助手的存档" };
  if (row.version !== FILE_VERSION) return { ok: false, error: "这份存档的版本不认识，没法读" };
  if (!Array.isArray(row.people)) return { ok: false, error: "这份存档里没有家人清单" };
  const people = row.people.map(parsePerson).filter((person): person is Person => person !== null);
  if (row.people.length > 0 && people.length === 0) {
    return { ok: false, error: "这份存档里的家人读不出来" };
  }
  const ids = new Set<string>();
  for (const person of people) {
    if (ids.has(person.id)) return { ok: false, error: "这份存档里有重复的家人，没法读" };
    ids.add(person.id);
    const medIds = new Set<string>();
    for (const med of person.meds) {
      if (medIds.has(med.id)) return { ok: false, error: "这份存档里有重复的药，没法读" };
      medIds.add(med.id);
    }
  }
  const requested = asString(row.activeId);
  const activeId = people.some((person) => person.id === requested) ? requested : (people[0]?.id ?? "");
  return { ok: true, data: { people, activeId } };
}

export function serializeStore(store: Store, exportedAt = new Date().toISOString()): string {
  return JSON.stringify(
    {
      app: APP_ID,
      version: FILE_VERSION,
      exportedAt,
      people: store.people,
      activeId: store.activeId,
    },
    null,
    2,
  );
}

export function downloadName(now = new Date()): string {
  return `购药助手-${todayISO(now).replaceAll("-", "")}.json`;
}

export function sanitizeDecimal(raw: string): string {
  const cleaned = raw.replace(/[^\d.]/g, "");
  const [head, ...rest] = cleaned.split(".");
  if (rest.length === 0) return head ?? "";
  return `${head}.${rest.join("")}`;
}

export function sanitizeInt(raw: string): string {
  return raw.replace(/[^\d]/g, "");
}
