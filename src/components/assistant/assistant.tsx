import { useEffect, useId, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Download, GripVertical, Menu, MoreHorizontal, Plus, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  calcMed,
  createSeed,
  downloadName,
  duplicatePerson,
  emptyMed,
  format2,
  formatMoney,
  formatTablets,
  parseArchive,
  resetTrip,
  sanitizeDecimal,
  sanitizeInt,
  serializeStore,
  STORAGE_KEY,
  todayISO,
  tripDirty,
  tripInfo,
  type Med,
  type Person,
  type Store,
} from "@/lib/meds/logic";

const DAY_CHIPS = [30, 60, 90, 180] as const;
const HOLD_MS = 600;
const HOLD_SLOP = 12;

export function Assistant() {
  const [store, setStore] = useState<Store>(() => createSeed());
  const [hydrated, setHydrated] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editor, setEditor] = useState<
    | { kind: "rename" | "note"; personId: string }
    | { kind: "add" }
    | { kind: "delete-person"; personId: string }
    | { kind: "delete-med"; personId: string; medId: string }
    | { kind: "reset" }
    | { kind: "import"; data: Store }
    | { kind: "import-error"; message: string }
    | null
  >(null);
  const [draftName, setDraftName] = useState("");
  const [draftNote, setDraftNote] = useState("");
  const [exportNote, setExportNote] = useState("");
  const [sortDraft, setSortDraft] = useState<Med[] | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const today = todayISO();

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = parseArchive(raw);
        if (parsed.ok) setStore(parsed.data);
      }
    } catch {
      /* keep the first-run list */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, serializeStore(store));
  }, [store, hydrated]);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  useEffect(() => {
    setSortDraft(null);
  }, [store.activeId]);

  const person = store.people.find((item) => item.id === store.activeId) ?? null;
  const sorting = sortDraft !== null;

  function patchPerson(personId: string, patch: Partial<Person>) {
    setStore((current) => ({
      ...current,
      people: current.people.map((item) => (item.id === personId ? { ...item, ...patch } : item)),
    }));
  }

  function patchMed(personId: string, medId: string, patch: Partial<Med>) {
    setStore((current) => ({
      ...current,
      people: current.people.map((item) =>
        item.id !== personId
          ? item
          : { ...item, meds: item.meds.map((med) => (med.id === medId ? { ...med, ...patch } : med)) },
      ),
    }));
  }

  function reorderPeople(next: Person[]) {
    setStore((current) => ({ ...current, people: next }));
  }

  function commitSort() {
    if (!person || !sortDraft) return;
    patchPerson(person.id, { meds: sortDraft });
    setSortDraft(null);
  }

  function selectPerson(personId: string) {
    setStore((current) => ({ ...current, activeId: personId }));
    setDrawerOpen(false);
  }

  function openAdd() {
    setDraftName("");
    setDraftNote("");
    setEditor({ kind: "add" });
  }

  function openRename(target: Person) {
    setDraftName(target.name);
    setEditor({ kind: "rename", personId: target.id });
  }

  function openNote(target: Person) {
    setDraftNote(target.note);
    setEditor({ kind: "note", personId: target.id });
  }

  function commitAdd() {
    const name = draftName.trim();
    if (!name) return;
    const id = crypto.randomUUID();
    const next: Person = {
      id,
      name,
      note: draftNote.trim(),
      dayMode: "days",
      days: "",
      startDate: "",
      endDate: "",
      meds: [],
    };
    setStore((current) => ({ people: [...current.people, next], activeId: id }));
    setEditor(null);
    setDrawerOpen(false);
  }

  function copyPerson(source: Person) {
    const id = crypto.randomUUID();
    const next = duplicatePerson(
      source,
      id,
      source.meds.map(() => crypto.randomUUID()),
    );
    setStore((current) => {
      const index = current.people.findIndex((item) => item.id === source.id);
      const people = [...current.people];
      people.splice(index < 0 ? people.length : index + 1, 0, next);
      return { people, activeId: id };
    });
  }

  function commitRename() {
    if (editor?.kind !== "rename") return;
    const name = draftName.trim();
    if (!name) return;
    patchPerson(editor.personId, { name });
    setEditor(null);
  }

  function commitNote() {
    if (editor?.kind !== "note") return;
    patchPerson(editor.personId, { note: draftNote.trim() });
    setEditor(null);
  }

  function commitDeletePerson() {
    if (editor?.kind !== "delete-person") return;
    const personId = editor.personId;
    setStore((current) => {
      const people = current.people.filter((item) => item.id !== personId);
      const activeId = current.activeId === personId ? (people[0]?.id ?? "") : current.activeId;
      return { people, activeId };
    });
    setEditor(null);
  }

  function commitDeleteMed() {
    if (editor?.kind !== "delete-med") return;
    const { personId, medId } = editor;
    setStore((current) => ({
      ...current,
      people: current.people.map((item) =>
        item.id !== personId ? item : { ...item, meds: item.meds.filter((med) => med.id !== medId) },
      ),
    }));
    setEditor(null);
  }

  function askReset() {
    if (!person) return;
    if (!tripDirty(person)) {
      patchPerson(person.id, resetTrip(person));
      return;
    }
    setEditor({ kind: "reset" });
  }

  function commitReset() {
    if (!person) return;
    patchPerson(person.id, resetTrip(person));
    setEditor(null);
  }

  function addMed() {
    if (!person) return;
    const med = emptyMed(crypto.randomUUID());
    patchPerson(person.id, { meds: [...person.meds, med] });
    requestAnimationFrame(() => {
      document.getElementById(`med-${med.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  function exportFile() {
    const blob = new Blob([serializeStore(store)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const filename = downloadName();
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setExportNote(`已下载 ${filename}`);
  }

  async function onPickFile(file: File | undefined) {
    if (!file) return;
    const text = await file.text();
    const parsed = parseArchive(text);
    if (!parsed.ok) {
      setEditor({ kind: "import-error", message: parsed.error });
      return;
    }
    setEditor({ kind: "import", data: parsed.data });
  }

  function commitImport() {
    if (editor?.kind !== "import") return;
    setStore(editor.data);
    setEditor(null);
    setDrawerOpen(false);
  }

  const totals = person ? summarize(person, today) : null;

  return (
    <div className="min-h-dvh bg-paper text-ink">
      <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-line bg-paper/95 px-2 py-1.5 backdrop-blur">
        <button
          type="button"
          className="grid size-11 place-items-center rounded-xl transition-transform duration-150 ease-out active:scale-[0.96]"
          aria-label="打开家人"
          onClick={() => setDrawerOpen(true)}
        >
          <Menu className="size-6" />
        </button>
        <div className="min-w-0">
          <p className="font-serif text-base leading-tight">购药助手</p>
          <p className="truncate text-sm text-muted">
            {person ? person.name || "未命名" : "还没有家人"}
            {person?.note ? ` · ${person.note}` : ""}
          </p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-xl px-3 pt-2 pb-20">
        {person ? (
          <>
            <TripBar person={person} today={today} onChange={(patch) => patchPerson(person.id, patch)} onReset={askReset} />
            {sorting ? null : <ShoppingList person={person} today={today} />}
            <div className="mt-2 flex flex-col gap-2">
              {person.meds.length === 0 ? (
                <p className="rounded-xl border border-dashed border-line px-3 py-6 text-center text-sm text-muted">还没有药</p>
              ) : null}
              {sorting && sortDraft ? (
                <MedSortList meds={sortDraft} onReorder={setSortDraft} />
              ) : (
                person.meds.map((med) => (
                  <MedCard
                    key={med.id}
                    person={person}
                    med={med}
                    today={today}
                    onChange={(patch) => patchMed(person.id, med.id, patch)}
                    onDelete={() => setEditor({ kind: "delete-med", personId: person.id, medId: med.id })}
                  />
                ))
              )}
            </div>
            {sorting ? (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSortDraft(null)}
                  className="min-h-11 rounded-xl border border-line bg-card text-sm transition-transform duration-150 ease-out active:scale-[0.96]"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={commitSort}
                  className="min-h-11 rounded-xl bg-pine text-sm text-card transition-transform duration-150 ease-out active:scale-[0.96]"
                >
                  完成
                </button>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={addMed}
                  className="mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-pine bg-card text-sm text-pine-ink transition-transform duration-150 ease-out active:scale-[0.96]"
                >
                  <Plus className="size-4" />
                  添加药品
                </button>
                {person.meds.length >= 2 ? (
                  <button
                    type="button"
                    onClick={() => setSortDraft([...person.meds])}
                    className="mt-2 flex min-h-11 w-full items-center justify-center rounded-xl border border-line bg-card text-sm transition-transform duration-150 ease-out active:scale-[0.96]"
                  >
                    排序
                  </button>
                ) : null}
              </>
            )}
          </>
        ) : (
          <div className="rounded-2xl border border-dashed border-line px-4 py-10 text-center">
            <p className="font-serif text-2xl">还没有家人</p>
            <p className="mt-2 text-muted">先加一位家人，再记他的药。</p>
            <button
              type="button"
              onClick={() => {
                setDrawerOpen(true);
                openAdd();
              }}
              className="mt-4 min-h-11 rounded-xl bg-pine px-4 text-card transition-transform duration-150 ease-out active:scale-[0.96]"
            >
              新增家人
            </button>
          </div>
        )}
      </main>

      {totals ? <TotalBar totals={totals} /> : null}

      <Drawer
        open={drawerOpen}
        people={store.people}
        activeId={store.activeId}
        exportNote={exportNote}
        fileRef={fileRef}
        onClose={() => setDrawerOpen(false)}
        onSelect={selectPerson}
        onAdd={openAdd}
        onRename={openRename}
        onNote={openNote}
        onCopy={copyPerson}
        onDelete={(personId) => setEditor({ kind: "delete-person", personId })}
        onReorder={reorderPeople}
        onExport={exportFile}
        onPickFile={(file) => void onPickFile(file)}
      />

      {editor?.kind === "add" ? (
        <Modal title="新增家人" onClose={() => setEditor(null)}>
          <Field label="名字" value={draftName} onChange={setDraftName} placeholder="例如 妈妈" />
          <div className="mt-3">
            <Field label="备注" value={draftNote} onChange={setDraftNote} placeholder="可以不填" multiline />
          </div>
          <ModalActions
            confirmLabel="添加"
            onConfirm={commitAdd}
            confirmDisabled={!draftName.trim()}
            onClose={() => setEditor(null)}
          />
        </Modal>
      ) : null}

      {editor?.kind === "rename" ? (
        <Modal title="改名" onClose={() => setEditor(null)}>
          <Field label="名字" value={draftName} onChange={setDraftName} />
          <ModalActions
            confirmLabel="保存"
            onConfirm={commitRename}
            confirmDisabled={!draftName.trim()}
            onClose={() => setEditor(null)}
          />
        </Modal>
      ) : null}

      {editor?.kind === "note" ? (
        <Modal title="改备注" onClose={() => setEditor(null)}>
          <Field label="备注" value={draftNote} onChange={setDraftNote} placeholder="不填就留空" multiline />
          <ModalActions confirmLabel="保存" onConfirm={commitNote} onClose={() => setEditor(null)} />
        </Modal>
      ) : null}

      {editor?.kind === "delete-person" ? (
        <Modal title="删除这位家人" onClose={() => setEditor(null)}>
          <p className="text-pretty">
            删除「{store.people.find((item) => item.id === editor.personId)?.name || "未命名"}」后，这个人的药单也会一起删掉。
          </p>
          <ModalActions confirmLabel="删除" danger onConfirm={commitDeletePerson} onClose={() => setEditor(null)} />
        </Modal>
      ) : null}

      {editor?.kind === "delete-med" ? (
        <Modal title="删除这种药" onClose={() => setEditor(null)}>
          <p>药名、用量和每盒会一起删掉，不能靠重置找回来。</p>
          <ModalActions confirmLabel="删除" danger onConfirm={commitDeleteMed} onClose={() => setEditor(null)} />
        </Modal>
      ) : null}

      {editor?.kind === "reset" ? (
        <Modal title="重置这次" onClose={() => setEditor(null)}>
          <p className="text-pretty">剩余、花费，还有单独改过的天数会清掉。药名、用量、每盒留下。</p>
          <ModalActions confirmLabel="仍然重置" onConfirm={commitReset} onClose={() => setEditor(null)} />
        </Modal>
      ) : null}

      {editor?.kind === "import" ? (
        <Modal title="读档" onClose={() => setEditor(null)}>
          <p className="text-pretty">
            会用这份存档替换本机全部家人和药单，一共 {editor.data.people.length} 位家人。这台手机上还没导出的修改会消失。
          </p>
          <ModalActions confirmLabel="替换" onConfirm={commitImport} onClose={() => setEditor(null)} />
        </Modal>
      ) : null}

      {editor?.kind === "import-error" ? (
        <Modal title="没法读档" onClose={() => setEditor(null)}>
          <p>{editor.message}</p>
          <ModalActions confirmLabel="知道了" onConfirm={() => setEditor(null)} onClose={() => setEditor(null)} hideCancel />
        </Modal>
      ) : null}
    </div>
  );
}

function summarize(person: Person, today: string) {
  let sum = 0;
  let priced = 0;
  let active = 0;
  for (const med of person.meds) {
    const calc = calcMed(person, med, today);
    if (!calc.active) continue;
    active += 1;
    if (calc.countsInTotal && calc.price !== null) {
      sum += calc.price;
      priced += 1;
    }
  }
  return { sum, priced, active, unpriced: active - priced };
}

function ShoppingList({ person, today }: { person: Person; today: string }) {
  const lines = person.meds.flatMap((med) => {
    const calc = calcMed(person, med, today);
    if (!calc.active || calc.boxesCeil === null || calc.boxesCeil <= 0) return [];
    return [{ id: med.id, name: med.name.trim() || "未命名", boxes: calc.boxesCeil, perBox: med.perBox }];
  });
  if (lines.length === 0) return null;
  return (
    <section className="mt-2 rounded-xl border border-pine bg-pine-soft px-3 py-2 text-pine-ink">
      <h2 className="text-sm font-semibold">这次建议买</h2>
      <ul className="mt-1 flex flex-col gap-1">
        {lines.map((line) => (
          <li key={line.id} className="flex items-baseline justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-baseline">
              <span className="truncate">{line.name}</span>
              <span className="ml-1 shrink-0 text-xs underline underline-offset-2">
                {formatTablets(Number(line.perBox))}片/盒
              </span>
            </span>
            <span className="shrink-0 font-semibold tabular-nums">{line.boxes} 盒</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function TripBar({
  person,
  today,
  onChange,
  onReset,
}: {
  person: Person;
  today: string;
  onChange: (patch: Partial<Person>) => void;
  onReset: () => void;
}) {
  const trip = tripInfo(person, today);
  const byDate = person.dayMode === "dates";
  return (
    <section className="rounded-xl border border-line bg-card px-2 py-2">
      {byDate ? (
        <div className="grid grid-cols-[1fr_1fr_auto_auto] items-end gap-1.5">
          <DateCell label="开始" value={person.startDate} onChange={(value) => onChange({ startDate: value })} />
          <DateCell label="结束" value={person.endDate} onChange={(value) => onChange({ endDate: value })} />
          <button
            type="button"
            onClick={() => onChange({ dayMode: "days" })}
            className="h-8 shrink-0 rounded-lg border border-line bg-paper px-2 text-sm"
          >
            天数
          </button>
          <button
            type="button"
            onClick={onReset}
            className="h-8 shrink-0 rounded-lg border border-line bg-paper px-2 text-sm"
          >
            重置
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-1.5">
          <label htmlFor={`trip-days-${person.id}`} className="shrink-0 text-sm text-muted">
            天数
          </label>
          <input
            id={`trip-days-${person.id}`}
            inputMode="numeric"
            value={person.days}
            autoComplete="off"
            onChange={(event) => onChange({ days: sanitizeInt(event.target.value) })}
            className="h-8 w-14 rounded-lg border border-line bg-paper px-1.5 text-sm text-ink outline-none focus:border-pine"
          />
          <div className="grid min-w-0 flex-1 grid-cols-4 gap-1">
            {DAY_CHIPS.map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => onChange({ dayMode: "days", days: String(days) })}
                className={cn(
                  "h-8 rounded-lg border text-sm transition-transform duration-150 ease-out active:scale-[0.96]",
                  person.days === String(days) ? "border-pine bg-pine-soft text-pine-ink" : "border-line bg-paper text-ink",
                )}
              >
                {days}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => onChange({ dayMode: "dates" })}
            className="h-8 shrink-0 rounded-lg border border-line bg-paper px-2 text-sm"
          >
            日期
          </button>
          <button
            type="button"
            onClick={onReset}
            className="h-8 shrink-0 rounded-lg border border-line bg-paper px-2 text-sm"
          >
            重置
          </button>
        </div>
      )}
      {byDate && trip.days !== null ? <p className="mt-1 text-sm text-pine-ink">一共 {trip.days} 天</p> : null}
      {trip.error ? <p className="mt-1 text-sm text-cinnabar">{trip.error}</p> : null}
    </section>
  );
}

function globalDayText(person: Person, today: string): string {
  const days = tripInfo(person, today).days;
  return days === null ? "" : String(days);
}

function MedCard({
  person,
  med,
  today,
  onChange,
  onDelete,
}: {
  person: Person;
  med: Med;
  today: string;
  onChange: (patch: Partial<Med>) => void;
  onDelete: () => void;
}) {
  const calc = calcMed(person, med, today);
  const [dayDraft, setDayDraft] = useState<string | null>(null);
  const customDays = med.overrideKind === "days" && med.overrideDays.trim() !== "";
  const customDate = med.overrideKind === "date" && Boolean(med.overrideEnd);
  const shownDays =
    dayDraft !== null
      ? dayDraft
      : customDays
        ? med.overrideDays
        : customDate && calc.days !== null
          ? String(calc.days)
          : globalDayText(person, today);

  function onDays(raw: string) {
    const next = sanitizeInt(raw);
    setDayDraft(next);
    if (next === "") onChange({ overrideKind: "follow", overrideDays: "", overrideEnd: "" });
    else onChange({ overrideKind: "days", overrideDays: next, overrideEnd: "" });
  }

  const tablets = calc.tabletsExact === null ? "" : formatTablets(calc.tabletsExact);
  const boxesExact = calc.boxesExact === null ? "" : format2(calc.boxesExact);
  const boxesCeil = calc.boxesCeil === null ? "" : String(calc.boxesCeil);
  const showResult = calc.active && calc.tabletsExact !== null;

  return (
    <article
      id={`med-${med.id}`}
      className={cn(
        "rounded-xl border px-2.5 py-2 transition-colors duration-200",
        calc.active ? "border-pine bg-card text-ink" : "border-inactive-line bg-card text-inactive",
      )}
    >
      <div className="flex items-center gap-1.5">
        <label htmlFor={`name-${med.id}`} className="shrink-0 text-sm text-muted">
          药名
        </label>
        <input
          id={`name-${med.id}`}
          value={med.name}
          autoComplete="off"
          onChange={(event) => onChange({ name: event.target.value })}
          className="h-8 min-w-0 flex-1 rounded-lg border border-line bg-paper px-2 text-sm text-inherit outline-none focus:border-pine"
        />
        <button
          type="button"
          onClick={onDelete}
          aria-label="删除这种药"
          className="grid size-8 shrink-0 place-items-center rounded-lg text-cinnabar"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="mt-2 grid grid-cols-12 gap-1.5">
        <div className="col-span-4">
          <p className="mb-1 text-sm leading-none text-muted">用量</p>
          <div className="grid grid-cols-2 gap-1">
            <UnitBox
              value={med.timesPerDay}
              onChange={(value) => onChange({ timesPerDay: sanitizeDecimal(value) })}
              inputMode="decimal"
              suffix="次"
              ariaLabel="次数"
            />
            <UnitBox
              value={med.amountPerTime}
              onChange={(value) => onChange({ amountPerTime: sanitizeDecimal(value) })}
              inputMode="decimal"
              suffix="片"
              ariaLabel="片数"
            />
          </div>
        </div>
        <div className="col-span-3">
          <p className="mb-1 text-sm leading-none text-muted">每盒</p>
          <UnitBox
            value={med.perBox}
            onChange={(value) => onChange({ perBox: sanitizeDecimal(value) })}
            inputMode="decimal"
            suffix="片"
            ariaLabel="每盒"
          />
        </div>
        <div className="col-span-2">
          <p className="mb-1 text-sm leading-none text-muted">天数</p>
          <UnitBox
            value={shownDays}
            onChange={onDays}
            onBlur={() => setDayDraft(null)}
            inputMode="numeric"
            ariaLabel="天数"
            marked={customDays || customDate}
          />
        </div>
        <div className="col-span-3">
          <p className="mb-1 text-sm leading-none font-medium text-pine-ink">剩余</p>
          <UnitBox
            value={med.remaining}
            onChange={(value) => onChange({ remaining: sanitizeDecimal(value) })}
            inputMode="decimal"
            suffix="片"
            ariaLabel="剩余"
            tone="remain"
          />
        </div>
      </div>

      <div className={cn("mt-2 rounded-lg px-2 py-1.5 text-sm", showResult ? "bg-pine-soft text-pine-ink" : "text-muted")}>
        <p className="flex flex-wrap items-baseline gap-x-2 tabular-nums">
          <span>
            需补片数 <span className="text-base font-semibold">{tablets}</span>
          </span>
          <span>
            盒数
            {boxesExact === "" ? null : (
              <>
                {" "}
                精确 {boxesExact} 取整 <span className="text-base font-semibold">{boxesCeil}</span>
              </>
            )}
          </span>
        </p>
        {showResult && calc.surplus !== null && calc.surplus > 0 ? (
          <p className="mt-0.5 tabular-nums">还多 {formatTablets(calc.surplus)} 片</p>
        ) : null}
      </div>

      <div className="mt-2 w-28">
        <UnitBox
          value={med.price}
          onChange={(value) => onChange({ price: sanitizeDecimal(value) })}
          inputMode="decimal"
          suffix="元"
          ariaLabel="花费"
        />
      </div>
    </article>
  );
}

function UnitBox({
  label,
  value,
  onChange,
  onBlur,
  suffix,
  inputMode,
  ariaLabel,
  tone = "plain",
  marked = false,
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  suffix?: string;
  inputMode?: "decimal" | "numeric";
  ariaLabel?: string;
  tone?: "plain" | "remain";
  marked?: boolean;
}) {
  const id = useId();
  return (
    <div className="min-w-0">
      {label ? (
        <label htmlFor={id} className="mb-1 block text-sm text-muted">
          {label}
        </label>
      ) : null}
      <span
        className={cn(
          "flex h-8 items-center rounded-lg border px-1.5 focus-within:border-pine",
          tone === "remain" ? "border-pine bg-pine-soft text-ink" : "border-line bg-paper",
          marked && tone !== "remain" && "border-pine",
        )}
      >
        <input
          id={label ? id : undefined}
          aria-label={ariaLabel}
          inputMode={inputMode}
          value={value}
          autoComplete="off"
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          className="min-w-0 flex-1 bg-transparent text-sm text-inherit outline-none"
        />
        {suffix ? <span className="shrink-0 text-xs text-muted">{suffix}</span> : null}
      </span>
    </div>
  );
}

function DateCell({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const id = useId();
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-1 block text-sm text-muted">
        {label}
      </label>
      <input
        id={id}
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-8 w-full rounded-lg border border-line bg-paper px-1 text-sm text-ink outline-none focus:border-pine"
      />
    </div>
  );
}

function TotalBar({ totals }: { totals: ReturnType<typeof summarize> }) {
  const money = totals.priced === 0 ? "还没记" : formatMoney(totals.sum);
  return (
    <div className="safe-bottom fixed inset-x-0 bottom-0 z-20 border-t border-line bg-paper/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-xl items-baseline justify-between gap-3 px-4 py-2">
        <p className="text-sm text-muted">合计</p>
        <p className="font-serif text-2xl tabular-nums" aria-live="polite">
          {money}
        </p>
      </div>
    </div>
  );
}

type DragGeom = {
  id: string;
  y: number;
  offsetY: number;
  left: number;
  width: number;
  height: number;
};

function moveAt<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length) return list;
  const next = list.slice();
  const [item] = next.splice(from, 1);
  if (item === undefined) return list;
  next.splice(to, 0, item);
  return next;
}

function dropIndex(rows: HTMLElement[], y: number, dragId: string): number {
  let index = 0;
  for (const row of rows) {
    if (row.dataset.sortId === dragId) continue;
    const rect = row.getBoundingClientRect();
    if (y > rect.top + rect.height / 2) index += 1;
  }
  return index;
}

function nudgeScroll(scroller: HTMLElement | null, clientY: number): boolean {
  const speed = 16;
  if (!scroller) {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    if (clientY < 88 && window.scrollY > 0) {
      window.scrollBy(0, -speed);
      return true;
    }
    if (clientY > window.innerHeight - 120 && window.scrollY < max - 1) {
      window.scrollBy(0, speed);
      return true;
    }
    return false;
  }
  const rect = scroller.getBoundingClientRect();
  const max = scroller.scrollHeight - scroller.clientHeight;
  if (clientY < rect.top + 64 && scroller.scrollTop > 0) {
    scroller.scrollTop -= speed;
    return true;
  }
  if (clientY > rect.bottom - 64 && scroller.scrollTop < max - 1) {
    scroller.scrollTop += speed;
    return true;
  }
  return false;
}

function lockTouch(scroller: HTMLElement | null, locked: boolean) {
  const el = scroller ?? document.documentElement;
  el.style.touchAction = locked ? "none" : "";
}

function pulseHold() {
  try {
    navigator.vibrate?.(12);
  } catch {
    /* this browser has no vibration */
  }
}

function useRowDrag<T extends { id: string }>({
  items,
  onLive,
  onCommit,
  onCancel,
  scrollerRef,
}: {
  items: T[];
  onLive: (next: T[]) => void;
  onCommit?: (next: T[]) => void;
  onCancel?: () => void;
  scrollerRef: RefObject<HTMLElement | null>;
}) {
  const itemsRef = useRef(items);
  const liveRef = useRef(onLive);
  const commitRef = useRef(onCommit);
  const cancelRef = useRef(onCancel);
  const scrollerHolder = useRef(scrollerRef);
  itemsRef.current = items;
  liveRef.current = onLive;
  commitRef.current = onCommit;
  cancelRef.current = onCancel;
  scrollerHolder.current = scrollerRef;

  const listRef = useRef<HTMLUListElement>(null);
  const dragRef = useRef<DragGeom | null>(null);
  const [drag, setDrag] = useState<DragGeom | null>(null);
  const yRef = useRef(0);
  const rafRef = useRef(0);
  const detachRef = useRef<(() => void) | null>(null);
  const applyRef = useRef<(y: number) => void>(() => {});

  applyRef.current = (y: number) => {
    const current = dragRef.current;
    const list = listRef.current;
    if (!current || !list) return;
    const rows = [...list.querySelectorAll<HTMLElement>("[data-sort-id]")];
    if (rows.length === 0) return;
    const to = dropIndex(rows, y, current.id);
    const from = itemsRef.current.findIndex((item) => item.id === current.id);
    if (from < 0 || from === to) return;
    const next = moveAt(itemsRef.current, from, to);
    itemsRef.current = next;
    liveRef.current(next);
  };

  useEffect(
    () => () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      detachRef.current?.();
      detachRef.current = null;
      lockTouch(scrollerHolder.current.current, false);
    },
    [],
  );

  function pump() {
    if (rafRef.current) return;
    const step = () => {
      rafRef.current = 0;
      if (!dragRef.current) return;
      const scrolling = nudgeScroll(scrollerHolder.current.current, yRef.current);
      if (!scrolling) return;
      applyRef.current(yRef.current);
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
  }

  function begin(row: HTMLElement, id: string, clientY: number, pointerId?: number) {
    if (dragRef.current) return;
    const rect = row.getBoundingClientRect();
    const next: DragGeom = {
      id,
      y: clientY,
      offsetY: clientY - rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    };
    dragRef.current = next;
    yRef.current = clientY;
    setDrag(next);
    lockTouch(scrollerHolder.current.current, true);
    if (pointerId !== undefined) {
      try {
        row.setPointerCapture(pointerId);
      } catch {
        /* window listeners still follow the finger */
      }
    }

    let ended = false;
    const onMove = (event: PointerEvent) => {
      if (!dragRef.current) return;
      if (event.cancelable) event.preventDefault();
      yRef.current = event.clientY;
      const moved = { ...dragRef.current, y: event.clientY };
      dragRef.current = moved;
      setDrag(moved);
      applyRef.current(event.clientY);
      pump();
    };
    const onTouch = (event: TouchEvent) => {
      if (dragRef.current && event.cancelable) event.preventDefault();
    };
    const removeListeners = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      window.removeEventListener("touchmove", onTouch);
    };
    const finish = (kind: "up" | "cancel") => {
      if (ended) return;
      ended = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
      removeListeners();
      detachRef.current = null;
      lockTouch(scrollerHolder.current.current, false);
      dragRef.current = null;
      setDrag(null);
      if (kind === "up") commitRef.current?.(itemsRef.current);
      else cancelRef.current?.();
    };
    const onUp = () => finish("up");
    const onCancel = () => finish("cancel");
    detachRef.current = removeListeners;
    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    window.addEventListener("touchmove", onTouch, { passive: false });
  }

  return { listRef, drag, begin };
}

function DragGhost({ drag, children }: { drag: DragGeom; children: ReactNode }) {
  if (typeof document === "undefined") return null;
  return createPortal(
    <div
      className="pointer-events-none fixed z-50 flex items-center gap-2 rounded-xl border border-pine bg-card px-3 text-ink shadow-lg"
      style={{ top: drag.y - drag.offsetY, left: drag.left, width: drag.width, height: drag.height }}
    >
      {children}
    </div>,
    document.body,
  );
}

function MedSortList({ meds, onReorder }: { meds: Med[]; onReorder: (next: Med[]) => void }) {
  const scrollerRef = useRef<HTMLElement | null>(null);
  const { listRef, drag, begin } = useRowDrag({ items: meds, onLive: onReorder, scrollerRef });
  const dragging = meds.find((med) => med.id === drag?.id);
  return (
    <>
      <ul ref={listRef} className="flex flex-col gap-1.5">
        {meds.map((med) => {
          const held = drag?.id === med.id;
          return (
            <li
              key={med.id}
              data-sort-id={med.id}
              className={cn(
                "hold-row overflow-hidden rounded-xl",
                held ? "border border-dashed border-pine bg-pine-soft" : "border border-line bg-card",
              )}
              style={{ ...(held && drag ? { height: drag.height } : null), touchAction: "none" }}
              onPointerDown={(event) => {
                if (held || event.button !== 0) return;
                event.preventDefault();
                begin(event.currentTarget, med.id, event.clientY, event.pointerId);
              }}
            >
              <div className={cn("flex min-h-12 items-center gap-2 px-3", held && "invisible")}>
                <GripVertical className="size-4 shrink-0 text-muted" />
                <span className="truncate text-sm">{med.name.trim() || "未命名"}</span>
              </div>
            </li>
          );
        })}
      </ul>
      {drag && dragging ? (
        <DragGhost drag={drag}>
          <GripVertical className="size-4 shrink-0 text-muted" />
          <span className="truncate text-sm">{dragging.name.trim() || "未命名"}</span>
        </DragGhost>
      ) : null}
    </>
  );
}

function FamilyList({
  people,
  activeId,
  scrollerRef,
  onSelect,
  onRename,
  onNote,
  onCopy,
  onDelete,
  onReorder,
}: {
  people: Person[];
  activeId: string;
  scrollerRef: RefObject<HTMLElement | null>;
  onSelect: (id: string) => void;
  onRename: (person: Person) => void;
  onNote: (person: Person) => void;
  onCopy: (person: Person) => void;
  onDelete: (id: string) => void;
  onReorder: (next: Person[]) => void;
}) {
  const [draft, setDraft] = useState<Person[] | null>(null);
  const visual = draft ?? people;
  const { listRef, drag, begin } = useRowDrag({
    items: visual,
    onLive: setDraft,
    onCommit: (next) => {
      setDraft(null);
      const same = next.length === people.length && next.every((item, index) => item.id === people[index]?.id);
      if (!same) onReorder(next);
    },
    onCancel: () => setDraft(null),
    scrollerRef,
  });
  const holdTimer = useRef<number | null>(null);
  const startPoint = useRef({ x: 0, y: 0 });
  const lastPoint = useRef({ x: 0, y: 0 });
  const moved = useRef(false);
  const suppressClick = useRef(false);
  const dragging = visual.find((item) => item.id === drag?.id);

  function clearHold() {
    if (holdTimer.current !== null) {
      window.clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  }

  function onHoldEnd() {
    clearHold();
    if (suppressClick.current) {
      window.setTimeout(() => {
        suppressClick.current = false;
      }, 0);
    }
    if (moved.current && !suppressClick.current) {
      window.setTimeout(() => {
        moved.current = false;
      }, 0);
    }
  }

  function onHoldStart(event: ReactPointerEvent<HTMLButtonElement>, id: string) {
    if (event.button !== 0) return;
    moved.current = false;
    startPoint.current = { x: event.clientX, y: event.clientY };
    lastPoint.current = startPoint.current;
    const row = event.currentTarget.closest("li");
    if (!(row instanceof HTMLElement)) return;
    clearHold();
    holdTimer.current = window.setTimeout(() => {
      holdTimer.current = null;
      suppressClick.current = true;
      pulseHold();
      begin(row, id, lastPoint.current.y);
    }, HOLD_MS);
  }

  function onHoldMove(event: ReactPointerEvent<HTMLButtonElement>) {
    lastPoint.current = { x: event.clientX, y: event.clientY };
    if (holdTimer.current === null) return;
    const dx = event.clientX - startPoint.current.x;
    const dy = event.clientY - startPoint.current.y;
    if (dx * dx + dy * dy > HOLD_SLOP * HOLD_SLOP) {
      moved.current = true;
      clearHold();
    }
  }

  return (
    <>
      <ul ref={listRef}>
        {visual.map((item) => {
          const selected = item.id === activeId;
          const held = drag?.id === item.id;
          return (
            <li
              key={item.id}
              data-sort-id={item.id}
              className={cn(
                "flex items-stretch overflow-hidden border-b border-line",
                selected && !held && "bg-pine-soft",
                held && "border-dashed border-pine bg-pine-soft",
              )}
              style={held && drag ? { height: drag.height } : undefined}
            >
              <button
                type="button"
                className={cn("hold-row min-h-11 min-w-0 flex-1 px-4 py-3 text-left", held && "invisible")}
                style={{ touchAction: "pan-y" }}
                onPointerDown={(event) => onHoldStart(event, item.id)}
                onPointerMove={onHoldMove}
                onPointerUp={onHoldEnd}
                onPointerCancel={onHoldEnd}
                onContextMenu={(event) => event.preventDefault()}
                onClick={() => {
                  if (suppressClick.current || moved.current) {
                    suppressClick.current = false;
                    moved.current = false;
                    return;
                  }
                  onSelect(item.id);
                }}
              >
                <span className={cn("block truncate", selected ? "font-semibold text-pine-ink" : "text-ink")}>
                  {item.name || "未命名"}
                </span>
                {item.note ? <span className="mt-0.5 block truncate text-sm text-muted">{item.note}</span> : null}
              </button>
              {held ? null : (
                <PersonMenu person={item} onRename={onRename} onNote={onNote} onCopy={onCopy} onDelete={onDelete} />
              )}
            </li>
          );
        })}
      </ul>
      {drag && dragging ? (
        <DragGhost drag={drag}>
          <span className="truncate text-sm">{dragging.name || "未命名"}</span>
        </DragGhost>
      ) : null}
    </>
  );
}

function Drawer({
  open,
  people,
  activeId,
  exportNote,
  fileRef,
  onClose,
  onSelect,
  onAdd,
  onRename,
  onNote,
  onCopy,
  onDelete,
  onReorder,
  onExport,
  onPickFile,
}: {
  open: boolean;
  people: Person[];
  activeId: string;
  exportNote: string;
  fileRef: RefObject<HTMLInputElement | null>;
  onClose: () => void;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onRename: (person: Person) => void;
  onNote: (person: Person) => void;
  onCopy: (person: Person) => void;
  onDelete: (id: string) => void;
  onReorder: (next: Person[]) => void;
  onExport: () => void;
  onPickFile: (file: File | undefined) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  return (
    <div className={cn("fixed inset-0 z-40", open ? "pointer-events-auto" : "pointer-events-none")} aria-hidden={!open}>
      <button
        type="button"
        className={cn("absolute inset-0 bg-ink/40 transition-opacity duration-200", open ? "opacity-100" : "opacity-0")}
        aria-label="关闭家人列表"
        tabIndex={open ? 0 : -1}
        onClick={onClose}
      />
      <aside
        inert={open ? undefined : true}
        className={cn(
          "absolute inset-y-0 left-0 flex h-full w-[min(20rem,86vw)] flex-col bg-card shadow-xl transition-transform duration-200 ease-out",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="font-serif text-xl">家人</h2>
          <button type="button" onClick={onClose} aria-label="关闭" className="grid size-11 place-items-center rounded-xl">
            <X className="size-5" />
          </button>
        </div>
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          {people.length === 0 ? <p className="px-4 py-6 text-sm text-muted">还没有家人</p> : null}
          <FamilyList
            people={people}
            activeId={activeId}
            scrollerRef={scrollRef}
            onSelect={onSelect}
            onRename={onRename}
            onNote={onNote}
            onCopy={onCopy}
            onDelete={onDelete}
            onReorder={onReorder}
          />
          <div className="p-4">
            <button
              type="button"
              onClick={onAdd}
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-pine text-pine-ink transition-transform duration-150 ease-out active:scale-[0.96]"
            >
              <Plus className="size-5" />
              新增家人
            </button>
          </div>
        </div>
        <div className="safe-bottom border-t border-line px-4 pt-3">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onExport}
              className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-pine text-card transition-transform duration-150 ease-out active:scale-[0.96]"
            >
              <Download className="size-4" />
              存档
            </button>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-line bg-paper transition-transform duration-150 ease-out active:scale-[0.96]"
            >
              <Upload className="size-4" />
              读档
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              onPickFile(file);
            }}
          />
          <p className="mt-2 text-sm text-pretty text-muted">存档会下载一个文件。换手机时把文件发过去，在那边点读档。读档会整份替换。</p>
          {exportNote ? <p className="mt-1 text-sm text-pine-ink">{exportNote}</p> : null}
        </div>
      </aside>
    </div>
  );
}

function PersonMenu({
  person,
  onRename,
  onNote,
  onCopy,
  onDelete,
}: {
  person: Person;
  onRename: (person: Person) => void;
  onNote: (person: Person) => void;
  onCopy: (person: Person) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        aria-label={`${person.name || "未命名"}的操作`}
        className="grid size-11 shrink-0 place-items-center self-center rounded-xl text-ink"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <MoreHorizontal className="size-5" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={4}
          className="z-50 min-w-36 rounded-xl border border-line bg-card p-1 text-ink shadow-lg"
        >
          <MenuItem onSelect={() => onRename(person)}>改名</MenuItem>
          <MenuItem onSelect={() => onNote(person)}>改备注</MenuItem>
          <MenuItem onSelect={() => onCopy(person)}>复制</MenuItem>
          <MenuItem danger onSelect={() => onDelete(person.id)}>
            删除
          </MenuItem>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function MenuItem({ children, onSelect, danger = false }: { children: string; onSelect: () => void; danger?: boolean }) {
  return (
    <DropdownMenu.Item
      onSelect={onSelect}
      className={cn(
        "flex min-h-11 cursor-pointer items-center rounded-lg px-3 outline-none data-[highlighted]:bg-pine-soft",
        danger ? "text-cinnabar" : "text-ink",
      )}
    >
      {children}
    </DropdownMenu.Item>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  inputMode,
  suffix,
  type = "text",
  multiline = false,
  grow = false,
  extra = null,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  inputMode?: "decimal" | "numeric" | "text";
  suffix?: string;
  type?: "text" | "date";
  multiline?: boolean;
  grow?: boolean;
  extra?: ReactNode;
}) {
  const id = useId();
  const growRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = growRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${el.scrollHeight}px`;
  }, [value, grow]);
  const shell = "flex min-h-11 w-full items-center rounded-xl border border-line bg-paper px-3 text-inherit focus-within:border-pine";
  return (
    <div className="block min-w-0">
      <span className="mb-1 flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-sm text-muted">
          {label}
        </label>
        {extra}
      </span>
      {multiline ? (
        <textarea
          id={id}
          value={value}
          placeholder={placeholder}
          rows={3}
          onChange={(event) => onChange(event.target.value)}
          className="w-full resize-none rounded-xl border border-line bg-paper px-3 py-2 text-base text-ink outline-none placeholder:text-inactive focus:border-pine"
        />
      ) : grow ? (
        <textarea
          id={id}
          ref={growRef}
          value={value}
          rows={1}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          className="min-h-11 w-full resize-none overflow-hidden rounded-xl border border-line bg-paper px-3 py-2 text-base leading-normal text-inherit outline-none placeholder:text-inactive focus:border-pine"
        />
      ) : (
        <span className={shell}>
          <input
            id={id}
            type={type}
            inputMode={inputMode}
            value={value}
            placeholder={placeholder}
            autoComplete="off"
            onChange={(event) => onChange(event.target.value)}
            className="min-w-0 flex-1 bg-transparent py-2 text-base text-inherit outline-none placeholder:text-inactive"
          />
          {suffix ? <span className="shrink-0 pl-2 text-sm text-muted">{suffix}</span> : null}
        </span>
      )}
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button type="button" className="absolute inset-0 bg-ink/40" aria-label="关闭" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative z-10 w-full max-w-md rounded-t-2xl bg-card p-5 text-ink sm:rounded-2xl"
      >
        <h2 className="font-serif text-xl">{title}</h2>
        <div className="mt-3">{children}</div>
      </div>
    </div>
  );
}

function ModalActions({
  confirmLabel,
  onConfirm,
  onClose,
  confirmDisabled = false,
  danger = false,
  hideCancel = false,
}: {
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
  confirmDisabled?: boolean;
  danger?: boolean;
  hideCancel?: boolean;
}) {
  return (
    <div className={cn("mt-4 grid gap-2", hideCancel ? "grid-cols-1" : "grid-cols-2")}>
      {hideCancel ? null : (
        <button
          type="button"
          onClick={onClose}
          className="min-h-11 rounded-xl border border-line bg-paper transition-transform duration-150 ease-out active:scale-[0.96]"
        >
          取消
        </button>
      )}
      <button
        type="button"
        onClick={onConfirm}
        disabled={confirmDisabled}
        className={cn(
          "min-h-11 rounded-xl text-card transition-transform duration-150 ease-out disabled:opacity-40 active:scale-[0.96]",
          danger ? "bg-cinnabar" : "bg-pine",
        )}
      >
        {confirmLabel}
      </button>
    </div>
  );
}
