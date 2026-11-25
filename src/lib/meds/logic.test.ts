import assert from "node:assert/strict";
import test from "node:test";
import {
  calcMed,
  ceilUnits,
  createSeed,
  duplicatePerson,
  emptyMed,
  inclusiveDays,
  parseArchive,
  round2,
  serializeStore,
  tripInfo,
  type Person,
} from "./logic.ts";

test("copy keeps the medicines and marks the name", () => {
  const person = dad();
  person.name = "爸";
  person.note = "早晚";
  person.days = "90";
  const med = emptyMed("m1", "阿托伐他汀钙片（立普妥）");
  med.timesPerDay = "1";
  med.amountPerTime = "1";
  med.perBox = "28";
  med.remaining = "4";
  med.price = "36.5";
  person.meds = [med];
  const copy = duplicatePerson(person, "p2", ["m2"]);
  assert.equal(copy.name, "爸(副本)");
  assert.equal(copy.note, "早晚");
  assert.equal(copy.days, "90");
  assert.equal(copy.id, "p2");
  assert.notEqual(copy.meds[0]?.id, "m1");
  assert.equal(copy.meds[0]?.id, "m2");
  assert.equal(copy.meds[0]?.name, "阿托伐他汀钙片（立普妥）");
  assert.equal(copy.meds[0]?.perBox, "28");
  assert.equal(copy.meds[0]?.remaining, "4");
  assert.equal(copy.meds[0]?.price, "36.5");
  assert.equal(person.meds[0]?.id, "m1");
});

test("inclusive dates count both ends", () => {
  assert.equal(inclusiveDays("2026-10-28", "2026-10-28"), 1);
  assert.equal(inclusiveDays("2026-10-28", "2026-11-26"), 30);
  assert.equal(inclusiveDays("2026-11-26", "2026-10-28"), null);
});

test("ceil follows the two-decimal figure", () => {
  assert.equal(round2(520 / 36), 14.44);
  assert.equal(ceilUnits(520 / 36), 15);
  assert.equal(ceilUnits(2), 2);
  assert.equal(ceilUnits(1.004), 1);
  assert.equal(ceilUnits(1.006), 2);
});

test("blank remaining skips the medicine", () => {
  const person = dad();
  const med = emptyMed("m", "百令片");
  med.timesPerDay = "3";
  med.amountPerTime = "3";
  med.perBox = "36";
  const calc = calcMed(person, med, "2026-10-28");
  assert.equal(calc.active, false);
  assert.equal(calc.tabletsExact, null);
  assert.equal(calc.countsInTotal, false);
});

test("zero remaining still buys", () => {
  const person = dad();
  person.days = "60";
  const med = emptyMed("m", "百令片");
  med.timesPerDay = "3";
  med.amountPerTime = "3";
  med.remaining = "0";
  med.perBox = "36";
  const calc = calcMed(person, med, "2026-10-28");
  assert.equal(calc.active, true);
  assert.equal(calc.tabletsExact, 540);
  assert.equal(calc.boxesCeil, 15);
});

test("stock on hand is subtracted and surplus is kept", () => {
  const person = dad();
  person.days = "60";
  const med = emptyMed("m", "百令片");
  med.timesPerDay = "3";
  med.amountPerTime = "3";
  med.remaining = "20";
  med.perBox = "36";
  const calc = calcMed(person, med, "2026-10-28");
  assert.equal(calc.tabletsExact, 520);
  assert.equal(round2(calc.boxesExact ?? 0), 14.44);
  assert.equal(calc.boxesCeil, 15);

  med.remaining = "600";
  const extra = calcMed(person, med, "2026-10-28");
  assert.equal(extra.tabletsExact, 0);
  assert.equal(extra.boxesCeil, 0);
  assert.equal(extra.surplus, 60);
});

test("a medicine can keep its own day count", () => {
  const person = dad();
  person.days = "30";
  const med = emptyMed("m", "百令片");
  med.timesPerDay = "3";
  med.amountPerTime = "3";
  med.remaining = "0";
  med.overrideKind = "days";
  med.overrideDays = "60";
  const calc = calcMed(person, med, "2026-10-28");
  assert.equal(calc.custom, true);
  assert.equal(calc.days, 60);
  assert.equal(calc.tabletsExact, 540);
});

test("price is the amount paid, and only active rows count", () => {
  const person = dad();
  person.days = "30";
  const buying = emptyMed("a");
  buying.remaining = "1";
  buying.price = "36.5";
  const skipped = emptyMed("b");
  skipped.price = "100";
  assert.equal(calcMed(person, buying, "2026-10-28").countsInTotal, true);
  assert.equal(calcMed(person, buying, "2026-10-28").price, 36.5);
  assert.equal(calcMed(person, skipped, "2026-10-28").countsInTotal, false);
});

test("archive round-trips and rejects other files", () => {
  const seed = createSeed();
  const parsed = parseArchive(serializeStore(seed, "2026-10-28T00:00:00.000Z"));
  assert.equal(parsed.ok, true);
  if (parsed.ok) {
    assert.equal(parsed.data.people[0]?.name, "爸爸");
    assert.equal(parsed.data.people[0]?.meds.length, 9);
    assert.equal(parsed.data.people[0]?.meds[0]?.name, "阿司匹林肠溶片（拜阿司匹灵）");
  }
  const bad = parseArchive(JSON.stringify({ hello: "world" }));
  assert.equal(bad.ok, false);
});

test("date mode uses an inclusive span", () => {
  const person = dad();
  person.dayMode = "dates";
  person.endDate = "2026-11-26";
  const trip = tripInfo(person, "2026-10-28");
  assert.equal(trip.days, 30);
  assert.equal(trip.start, "2026-10-28");
});

function dad(): Person {
  const person = createSeed().people[0];
  if (!person) throw new Error("missing seed");
  return structuredClone(person);
}
