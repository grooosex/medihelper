import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { a as require_jsx_runtime } from "../_libs/@radix-ui/react-collection+[...].mjs";
import { a as Menu, i as Plus, n as Upload, o as Ellipsis, s as Download, t as X } from "../_libs/lucide-react.mjs";
import { a as DropdownMenuTrigger, i as DropdownMenuPortal, n as DropdownMenuContent, r as DropdownMenuItem, t as DropdownMenu } from "../_libs/@radix-ui/react-dropdown-menu+[...].mjs";
import { t as clsx } from "../_libs/clsx.mjs";
import { t as twMerge } from "../_libs/tailwind-merge.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-CUY0hUrj.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function cn(...inputs) {
	return twMerge(clsx(inputs));
}
var APP_ID = "购药助手";
var STORAGE_KEY = "gouyao-zhushou-v1";
var DAD_MED_NAMES = [
	"阿司匹林肠溶片（拜阿司匹灵）",
	"阿托伐他汀钙片（立普妥）",
	"替格瑞洛片（倍林达）",
	"恩格列净片（科糖恩）",
	"硝苯地平控释片（拜新同）",
	"叶酸片（斯利安）",
	"复合维生素B片（力生）",
	"百令片",
	"海昆肾喜胶囊"
];
function emptyMed(id, name = "") {
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
		overrideEnd: ""
	};
}
function createSeed() {
	return {
		activeId: "person-dad",
		people: [{
			id: "person-dad",
			name: "爸爸",
			note: "",
			dayMode: "days",
			days: "",
			startDate: "",
			endDate: "",
			meds: DAD_MED_NAMES.map((name, index) => emptyMed(`med-dad-${index}`, name))
		}]
	};
}
function parseNum(raw) {
	const s = raw.trim();
	if (!/^\d+(\.\d+)?$/.test(s)) return null;
	const n = Number(s);
	return Number.isFinite(n) ? n : null;
}
function round2(n) {
	return Math.round((n + Number.EPSILON) * 100) / 100;
}
/** Ceil the value the user sees at two decimals, so 1.00 stays 1 and 1.01 becomes 2. */
function ceilUnits(n) {
	const shown = round2(n);
	const ceiled = Math.ceil(shown - 1e-10);
	return ceiled === 0 ? 0 : ceiled;
}
function format2(n) {
	return round2(n).toFixed(2);
}
function formatTablets(n) {
	const shown = round2(n);
	return Number.isInteger(shown) ? String(shown) : shown.toFixed(2);
}
function formatLoose(n) {
	const r = Math.round(n * 10) / 10;
	return Number.isInteger(r) ? String(r) : r.toFixed(1);
}
function formatMoney(n) {
	return `¥${round2(n).toFixed(2)}`;
}
function todayISO(now = /* @__PURE__ */ new Date()) {
	return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}
function parseISODate(iso) {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
	if (!match) return null;
	const y = Number(match[1]);
	const mo = Number(match[2]);
	const d = Number(match[3]);
	const dt = new Date(y, mo - 1, d);
	if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
	return dt;
}
function inclusiveDays(startISO, endISO) {
	const start = parseISODate(startISO);
	const end = parseISODate(endISO);
	if (!start || !end) return null;
	const diff = Math.round((end.getTime() - start.getTime()) / 864e5);
	if (diff < 0) return null;
	return diff + 1;
}
function formatCNDate(iso) {
	const d = parseISODate(iso);
	if (!d) return iso;
	return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}
function tripInfo(person, today) {
	if (person.dayMode === "dates") {
		const start = person.startDate || today;
		if (!person.endDate) return {
			mode: "dates",
			days: null,
			start,
			error: null
		};
		const days = inclusiveDays(start, person.endDate);
		if (days === null) return {
			mode: "dates",
			days: null,
			start,
			error: "结束日期不能早于开始"
		};
		return {
			mode: "dates",
			days,
			start,
			error: null
		};
	}
	if (person.days.trim() === "") return {
		mode: "days",
		days: null,
		start: today,
		error: null
	};
	const n = parseNum(person.days);
	if (n === null || n <= 0) return {
		mode: "days",
		days: null,
		start: today,
		error: "天数要大于 0"
	};
	return {
		mode: "days",
		days: n,
		start: today,
		error: null
	};
}
function calcMed(person, med, today) {
	const trip = tripInfo(person, today);
	const active = med.remaining.trim() !== "";
	const remaining = parseNum(med.remaining);
	const price = parseNum(med.price);
	let days = null;
	let custom = false;
	let dayError = null;
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
	} else if (trip.days === null) dayLabel = "跟这次一样（上面还没定）";
	else {
		days = trip.days;
		dayLabel = `跟这次一样（${formatLoose(trip.days)} 天）`;
	}
	const base = {
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
		countsInTotal: active && remaining !== null && price !== null
	};
	if (!active) return base;
	if (remaining === null) return {
		...base,
		blocker: "剩余要填数字，没有就填 0"
	};
	if (dayError) return {
		...base,
		blocker: dayError
	};
	if (days === null) return {
		...base,
		blocker: "先在上面填这次要备的天数"
	};
	const timesMissing = med.timesPerDay.trim() === "";
	const amountMissing = med.amountPerTime.trim() === "";
	if (timesMissing || amountMissing) return {
		...base,
		blocker: "还差一天几次或每次几片"
	};
	const times = parseNum(med.timesPerDay);
	const amount = parseNum(med.amountPerTime);
	if (times === null || amount === null) return {
		...base,
		blocker: "用法要填大于或等于 0 的数字"
	};
	const daily = times * amount;
	const raw = daily * days - remaining;
	const need = Math.max(0, raw);
	const surplus = raw < 0 ? -raw : 0;
	const surplusDays = surplus > 0 && daily > 0 ? surplus / daily : null;
	let boxNote = null;
	let boxesExact = null;
	let boxesCeil = null;
	if (med.perBox.trim() === "") boxNote = "还差一盒几片";
	else {
		const perBox = parseNum(med.perBox);
		if (perBox === null || perBox <= 0) boxNote = "一盒片数要大于 0";
		else {
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
		boxNote
	};
}
function tripDirty(person) {
	if (person.days.trim() || person.startDate.trim() || person.endDate.trim()) return true;
	return person.meds.some((med) => med.remaining.trim() !== "" || med.price.trim() !== "" || med.overrideKind !== "follow");
}
function resetTrip(person) {
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
			overrideEnd: ""
		}))
	};
}
function asString(value) {
	return typeof value === "string" ? value : "";
}
function asOverride(value) {
	return value === "days" || value === "date" || value === "follow" ? value : "follow";
}
function parseMed(value, index) {
	if (!value || typeof value !== "object") return null;
	const row = value;
	return {
		id: asString(row.id).trim() || `med-${index}-${Math.random().toString(36).slice(2, 8)}`,
		name: asString(row.name),
		timesPerDay: asString(row.timesPerDay),
		amountPerTime: asString(row.amountPerTime),
		perBox: asString(row.perBox),
		remaining: asString(row.remaining),
		price: asString(row.price),
		overrideKind: asOverride(row.overrideKind),
		overrideDays: asString(row.overrideDays),
		overrideEnd: asString(row.overrideEnd)
	};
}
function parsePerson(value, index) {
	if (!value || typeof value !== "object") return null;
	const row = value;
	const id = asString(row.id).trim() || `person-${index}`;
	const meds = Array.isArray(row.meds) ? row.meds.map(parseMed).filter((med) => med !== null) : [];
	return {
		id,
		name: asString(row.name),
		note: asString(row.note),
		dayMode: row.dayMode === "dates" ? "dates" : "days",
		days: asString(row.days),
		startDate: asString(row.startDate),
		endDate: asString(row.endDate),
		meds
	};
}
function parseArchive(text) {
	let json;
	try {
		json = JSON.parse(text);
	} catch {
		return {
			ok: false,
			error: "这个文件不是购药助手的存档"
		};
	}
	if (!json || typeof json !== "object") return {
		ok: false,
		error: "这个文件不是购药助手的存档"
	};
	const row = json;
	if (row.app !== "购药助手") return {
		ok: false,
		error: "这个文件不是购药助手的存档"
	};
	if (row.version !== 1) return {
		ok: false,
		error: "这份存档的版本不认识，没法读"
	};
	if (!Array.isArray(row.people)) return {
		ok: false,
		error: "这份存档里没有家人清单"
	};
	const people = row.people.map(parsePerson).filter((person) => person !== null);
	if (row.people.length > 0 && people.length === 0) return {
		ok: false,
		error: "这份存档里的家人读不出来"
	};
	const ids = /* @__PURE__ */ new Set();
	for (const person of people) {
		if (ids.has(person.id)) return {
			ok: false,
			error: "这份存档里有重复的家人，没法读"
		};
		ids.add(person.id);
		const medIds = /* @__PURE__ */ new Set();
		for (const med of person.meds) {
			if (medIds.has(med.id)) return {
				ok: false,
				error: "这份存档里有重复的药，没法读"
			};
			medIds.add(med.id);
		}
	}
	const requested = asString(row.activeId);
	return {
		ok: true,
		data: {
			people,
			activeId: people.some((person) => person.id === requested) ? requested : people[0]?.id ?? ""
		}
	};
}
function serializeStore(store, exportedAt = (/* @__PURE__ */ new Date()).toISOString()) {
	return JSON.stringify({
		app: APP_ID,
		version: 1,
		exportedAt,
		people: store.people,
		activeId: store.activeId
	}, null, 2);
}
function downloadName(now = /* @__PURE__ */ new Date()) {
	return `购药助手-${todayISO(now).replaceAll("-", "")}.json`;
}
function sanitizeDecimal(raw) {
	const [head, ...rest] = raw.replace(/[^\d.]/g, "").split(".");
	if (rest.length === 0) return head ?? "";
	return `${head}.${rest.join("")}`;
}
function sanitizeInt(raw) {
	return raw.replace(/[^\d]/g, "");
}
var DAY_CHIPS = [
	30,
	60,
	90,
	180
];
function Assistant() {
	const [store, setStore] = (0, import_react.useState)(() => createSeed());
	const [hydrated, setHydrated] = (0, import_react.useState)(false);
	const [drawerOpen, setDrawerOpen] = (0, import_react.useState)(false);
	const [editor, setEditor] = (0, import_react.useState)(null);
	const [draftName, setDraftName] = (0, import_react.useState)("");
	const [draftNote, setDraftNote] = (0, import_react.useState)("");
	const [exportNote, setExportNote] = (0, import_react.useState)("");
	const fileRef = (0, import_react.useRef)(null);
	const today = todayISO();
	(0, import_react.useEffect)(() => {
		try {
			const raw = localStorage.getItem(STORAGE_KEY);
			if (raw) {
				const parsed = parseArchive(raw);
				if (parsed.ok) setStore(parsed.data);
			}
		} catch {}
		setHydrated(true);
	}, []);
	(0, import_react.useEffect)(() => {
		if (!hydrated) return;
		localStorage.setItem(STORAGE_KEY, serializeStore(store));
	}, [store, hydrated]);
	(0, import_react.useEffect)(() => {
		if (!drawerOpen) return;
		const onKey = (event) => {
			if (event.key === "Escape") setDrawerOpen(false);
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [drawerOpen]);
	const person = store.people.find((item) => item.id === store.activeId) ?? null;
	function patchPerson(personId, patch) {
		setStore((current) => ({
			...current,
			people: current.people.map((item) => item.id === personId ? {
				...item,
				...patch
			} : item)
		}));
	}
	function patchMed(personId, medId, patch) {
		setStore((current) => ({
			...current,
			people: current.people.map((item) => item.id !== personId ? item : {
				...item,
				meds: item.meds.map((med) => med.id === medId ? {
					...med,
					...patch
				} : med)
			})
		}));
	}
	function selectPerson(personId) {
		setStore((current) => ({
			...current,
			activeId: personId
		}));
		setDrawerOpen(false);
	}
	function openAdd() {
		setDraftName("");
		setDraftNote("");
		setEditor({ kind: "add" });
	}
	function openRename(target) {
		setDraftName(target.name);
		setEditor({
			kind: "rename",
			personId: target.id
		});
	}
	function openNote(target) {
		setDraftNote(target.note);
		setEditor({
			kind: "note",
			personId: target.id
		});
	}
	function commitAdd() {
		const name = draftName.trim();
		if (!name) return;
		const id = crypto.randomUUID();
		const next = {
			id,
			name,
			note: draftNote.trim(),
			dayMode: "days",
			days: "",
			startDate: "",
			endDate: "",
			meds: []
		};
		setStore((current) => ({
			people: [...current.people, next],
			activeId: id
		}));
		setEditor(null);
		setDrawerOpen(false);
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
			return {
				people,
				activeId: current.activeId === personId ? people[0]?.id ?? "" : current.activeId
			};
		});
		setEditor(null);
	}
	function commitDeleteMed() {
		if (editor?.kind !== "delete-med") return;
		const { personId, medId } = editor;
		setStore((current) => ({
			...current,
			people: current.people.map((item) => item.id !== personId ? item : {
				...item,
				meds: item.meds.filter((med) => med.id !== medId)
			})
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
			document.getElementById(`med-${med.id}`)?.scrollIntoView({
				behavior: "smooth",
				block: "center"
			});
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
	async function onPickFile(file) {
		if (!file) return;
		const parsed = parseArchive(await file.text());
		if (!parsed.ok) {
			setEditor({
				kind: "import-error",
				message: parsed.error
			});
			return;
		}
		setEditor({
			kind: "import",
			data: parsed.data
		});
	}
	function commitImport() {
		if (editor?.kind !== "import") return;
		setStore(editor.data);
		setEditor(null);
		setDrawerOpen(false);
	}
	const totals = person ? summarize(person, today) : null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-h-dvh bg-paper text-ink",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "sticky top-0 z-20 flex items-center gap-2 border-b border-line bg-paper/95 px-2 py-1.5 backdrop-blur",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "grid size-11 place-items-center rounded-xl transition-transform duration-150 ease-out active:scale-[0.96]",
					"aria-label": "打开家人",
					onClick: () => setDrawerOpen(true),
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Menu, { className: "size-6" })
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "min-w-0",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-serif text-base leading-tight",
						children: "购药助手"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "truncate text-sm text-muted",
						children: [person ? person.name || "未命名" : "还没有家人", person?.note ? ` · ${person.note}` : ""]
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", {
				className: "mx-auto w-full max-w-xl px-3 pt-2 pb-20",
				children: person ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TripBar, {
						person,
						today,
						onChange: (patch) => patchPerson(person.id, patch),
						onReset: askReset
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-2 flex flex-col gap-1",
						children: [person.meds.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "rounded-xl border border-dashed border-line px-3 py-6 text-center text-sm text-muted",
							children: "还没有药"
						}) : null, person.meds.map((med) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MedCard, {
							person,
							med,
							today,
							onChange: (patch) => patchMed(person.id, med.id, patch),
							onDelete: () => setEditor({
								kind: "delete-med",
								personId: person.id,
								medId: med.id
							})
						}, med.id))]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: addMed,
						className: "mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-pine bg-card text-sm text-pine-ink transition-transform duration-150 ease-out active:scale-[0.96]",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "size-4" }), "添加药品"]
					})
				] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "rounded-2xl border border-dashed border-line px-4 py-10 text-center",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-serif text-2xl",
							children: "还没有家人"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2 text-muted",
							children: "先加一位家人，再记他的药。"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => {
								setDrawerOpen(true);
								openAdd();
							},
							className: "mt-4 min-h-11 rounded-xl bg-pine px-4 text-card transition-transform duration-150 ease-out active:scale-[0.96]",
							children: "新增家人"
						})
					]
				})
			}),
			totals ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TotalBar, { totals }) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Drawer, {
				open: drawerOpen,
				people: store.people,
				activeId: store.activeId,
				exportNote,
				fileRef,
				onClose: () => setDrawerOpen(false),
				onSelect: selectPerson,
				onAdd: openAdd,
				onRename: openRename,
				onNote: openNote,
				onDelete: (personId) => setEditor({
					kind: "delete-person",
					personId
				}),
				onExport: exportFile,
				onPickFile: (file) => void onPickFile(file)
			}),
			editor?.kind === "add" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Modal, {
				title: "新增家人",
				onClose: () => setEditor(null),
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "名字",
						value: draftName,
						onChange: setDraftName,
						placeholder: "例如 妈妈"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-3",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "备注",
							value: draftNote,
							onChange: setDraftNote,
							placeholder: "可以不填",
							multiline: true
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ModalActions, {
						confirmLabel: "添加",
						onConfirm: commitAdd,
						confirmDisabled: !draftName.trim(),
						onClose: () => setEditor(null)
					})
				]
			}) : null,
			editor?.kind === "rename" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Modal, {
				title: "改名",
				onClose: () => setEditor(null),
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: "名字",
					value: draftName,
					onChange: setDraftName
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ModalActions, {
					confirmLabel: "保存",
					onConfirm: commitRename,
					confirmDisabled: !draftName.trim(),
					onClose: () => setEditor(null)
				})]
			}) : null,
			editor?.kind === "note" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Modal, {
				title: "改备注",
				onClose: () => setEditor(null),
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: "备注",
					value: draftNote,
					onChange: setDraftNote,
					placeholder: "不填就留空",
					multiline: true
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ModalActions, {
					confirmLabel: "保存",
					onConfirm: commitNote,
					onClose: () => setEditor(null)
				})]
			}) : null,
			editor?.kind === "delete-person" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Modal, {
				title: "删除这位家人",
				onClose: () => setEditor(null),
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "text-pretty",
					children: [
						"删除「",
						store.people.find((item) => item.id === editor.personId)?.name || "未命名",
						"」后，这个人的药单也会一起删掉。"
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ModalActions, {
					confirmLabel: "删除",
					danger: true,
					onConfirm: commitDeletePerson,
					onClose: () => setEditor(null)
				})]
			}) : null,
			editor?.kind === "delete-med" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Modal, {
				title: "删除这种药",
				onClose: () => setEditor(null),
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "药名、用量和每盒会一起删掉，不能靠重置找回来。" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ModalActions, {
					confirmLabel: "删除",
					danger: true,
					onConfirm: commitDeleteMed,
					onClose: () => setEditor(null)
				})]
			}) : null,
			editor?.kind === "reset" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Modal, {
				title: "重置这次",
				onClose: () => setEditor(null),
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-pretty",
					children: "剩余、花费，还有单独改过的天数会清掉。药名、用量、每盒留下。"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ModalActions, {
					confirmLabel: "仍然重置",
					onConfirm: commitReset,
					onClose: () => setEditor(null)
				})]
			}) : null,
			editor?.kind === "import" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Modal, {
				title: "读档",
				onClose: () => setEditor(null),
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "text-pretty",
					children: [
						"会用这份存档替换本机全部家人和药单，一共 ",
						editor.data.people.length,
						" 位家人。这台手机上还没导出的修改会消失。"
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ModalActions, {
					confirmLabel: "替换",
					onConfirm: commitImport,
					onClose: () => setEditor(null)
				})]
			}) : null,
			editor?.kind === "import-error" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Modal, {
				title: "没法读档",
				onClose: () => setEditor(null),
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: editor.message }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ModalActions, {
					confirmLabel: "知道了",
					onConfirm: () => setEditor(null),
					onClose: () => setEditor(null),
					hideCancel: true
				})]
			}) : null
		]
	});
}
function summarize(person, today) {
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
	return {
		sum,
		priced,
		active,
		unpriced: active - priced
	};
}
function TripBar({ person, today, onChange, onReset }) {
	const trip = tripInfo(person, today);
	const byDate = person.dayMode === "dates";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "rounded-xl border border-line bg-card px-2 py-2",
		children: [
			byDate ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-[1fr_1fr_auto_auto] items-end gap-1.5",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DateCell, {
						label: "开始",
						value: person.startDate,
						onChange: (value) => onChange({ startDate: value })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DateCell, {
						label: "结束",
						value: person.endDate,
						onChange: (value) => onChange({ endDate: value })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => onChange({ dayMode: "days" }),
						className: "h-7 shrink-0 rounded-lg border border-line bg-paper px-2 text-xs",
						children: "天数"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: onReset,
						className: "h-7 shrink-0 rounded-lg border border-line bg-paper px-2 text-xs",
						children: "重置"
					})
				]
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-1.5",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
						htmlFor: `trip-days-${person.id}`,
						className: "shrink-0 text-xs text-muted",
						children: "天数"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						id: `trip-days-${person.id}`,
						inputMode: "numeric",
						value: person.days,
						autoComplete: "off",
						onChange: (event) => onChange({ days: sanitizeInt(event.target.value) }),
						className: "h-7 w-12 rounded-lg border border-line bg-paper px-1.5 text-sm text-ink outline-none focus:border-pine"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "grid min-w-0 flex-1 grid-cols-4 gap-1",
						children: DAY_CHIPS.map((days) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => onChange({
								dayMode: "days",
								days: String(days)
							}),
							className: cn("h-7 rounded-lg border text-xs transition-transform duration-150 ease-out active:scale-[0.96]", person.days === String(days) ? "border-pine bg-pine-soft text-pine-ink" : "border-line bg-paper text-ink"),
							children: days
						}, days))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => onChange({ dayMode: "dates" }),
						className: "h-7 shrink-0 rounded-lg border border-line bg-paper px-2 text-xs",
						children: "日期"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: onReset,
						className: "h-7 shrink-0 rounded-lg border border-line bg-paper px-2 text-xs",
						children: "重置"
					})
				]
			}),
			byDate && trip.days !== null ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-1 text-xs text-pine-ink",
				children: [
					"一共 ",
					trip.days,
					" 天"
				]
			}) : null,
			trip.error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-1 text-xs text-cinnabar",
				children: trip.error
			}) : null
		]
	});
}
function globalDayText(person, today) {
	const days = tripInfo(person, today).days;
	return days === null ? "" : String(days);
}
function MedCard({ person, med, today, onChange, onDelete }) {
	const calc = calcMed(person, med, today);
	const [dayDraft, setDayDraft] = (0, import_react.useState)(null);
	const customDays = med.overrideKind === "days" && med.overrideDays.trim() !== "";
	const customDate = med.overrideKind === "date" && Boolean(med.overrideEnd);
	const shownDays = dayDraft !== null ? dayDraft : customDays ? med.overrideDays : customDate && calc.days !== null ? String(calc.days) : globalDayText(person, today);
	function onDays(raw) {
		const next = sanitizeInt(raw);
		setDayDraft(next);
		if (next === "") onChange({
			overrideKind: "follow",
			overrideDays: "",
			overrideEnd: ""
		});
		else onChange({
			overrideKind: "days",
			overrideDays: next,
			overrideEnd: ""
		});
	}
	const tablets = calc.tabletsExact === null ? "" : formatTablets(calc.tabletsExact);
	const boxesExact = calc.boxesExact === null ? "" : format2(calc.boxesExact);
	const boxesCeil = calc.boxesCeil === null ? "" : String(calc.boxesCeil);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
		id: `med-${med.id}`,
		className: cn("rounded-xl border px-2 py-1 transition-colors duration-200", calc.active ? "border-pine bg-card text-ink" : "border-inactive-line bg-card text-inactive"),
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-1.5",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
						htmlFor: `name-${med.id}`,
						className: "shrink-0 text-xs text-muted",
						children: "药名"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						id: `name-${med.id}`,
						value: med.name,
						autoComplete: "off",
						onChange: (event) => onChange({ name: event.target.value }),
						className: "h-6 min-w-0 flex-1 rounded-lg border border-line bg-paper px-2 text-sm text-inherit outline-none focus:border-pine"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: onDelete,
						"aria-label": "删除这种药",
						className: "grid size-6 shrink-0 place-items-center rounded-lg text-cinnabar",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "size-4" })
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-0.5 grid grid-cols-12 gap-1",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "col-span-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mb-0.5 text-xs leading-none text-muted",
							children: "用量"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid grid-cols-2 gap-1",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(UnitBox, {
								value: med.timesPerDay,
								onChange: (value) => onChange({ timesPerDay: sanitizeDecimal(value) }),
								inputMode: "decimal",
								suffix: "次",
								ariaLabel: "次数"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(UnitBox, {
								value: med.amountPerTime,
								onChange: (value) => onChange({ amountPerTime: sanitizeDecimal(value) }),
								inputMode: "decimal",
								suffix: "片",
								ariaLabel: "片数"
							})]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "col-span-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mb-0.5 text-xs leading-none text-muted",
							children: "每盒"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(UnitBox, {
							value: med.perBox,
							onChange: (value) => onChange({ perBox: sanitizeDecimal(value) }),
							inputMode: "decimal",
							suffix: "片",
							ariaLabel: "每盒"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "col-span-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mb-0.5 text-xs leading-none text-muted",
							children: "天数"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(UnitBox, {
							value: shownDays,
							onChange: onDays,
							onBlur: () => setDayDraft(null),
							inputMode: "numeric",
							ariaLabel: "天数"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "col-span-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mb-0.5 text-xs leading-none text-muted",
							children: "剩余"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(UnitBox, {
							value: med.remaining,
							onChange: (value) => onChange({ remaining: sanitizeDecimal(value) }),
							inputMode: "decimal",
							suffix: "片",
							ariaLabel: "剩余"
						})]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-0.5 flex items-center gap-1 text-xs",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "shrink-0 tabular-nums",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-muted",
							children: "需补片数 "
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-sm font-semibold",
							children: tablets
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "min-w-0 flex-1 truncate tabular-nums",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-muted",
							children: "需购盒数 "
						}), boxesExact === "" ? null : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-muted",
								children: "精确 "
							}),
							boxesExact,
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-muted",
								children: " 取整 "
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "font-semibold text-pine-ink",
								children: boxesCeil
							})
						] })]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex shrink-0 items-center gap-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-muted",
							children: "花费"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "w-16",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(UnitBox, {
								value: med.price,
								onChange: (value) => onChange({ price: sanitizeDecimal(value) }),
								inputMode: "decimal",
								suffix: "元",
								ariaLabel: "花费"
							})
						})]
					})
				]
			})
		]
	});
}
function UnitBox({ label, value, onChange, onBlur, suffix, inputMode, ariaLabel }) {
	const id = (0, import_react.useId)();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-w-0",
		children: [label ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
			htmlFor: id,
			className: "mb-0.5 block text-xs text-muted",
			children: label
		}) : null, /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
			className: "flex h-6 items-center rounded-lg border border-line bg-paper px-1.5 focus-within:border-pine",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				id: label ? id : void 0,
				"aria-label": ariaLabel,
				inputMode,
				value,
				autoComplete: "off",
				onChange: (event) => onChange(event.target.value),
				onBlur,
				className: "min-w-0 flex-1 bg-transparent text-sm text-inherit outline-none"
			}), suffix ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "shrink-0 text-xs text-muted",
				children: suffix
			}) : null]
		})]
	});
}
function DateCell({ label, value, onChange }) {
	const id = (0, import_react.useId)();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-w-0",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
			htmlFor: id,
			className: "mb-0.5 block text-xs text-muted",
			children: label
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
			id,
			type: "date",
			value,
			onChange: (event) => onChange(event.target.value),
			className: "h-7 w-full rounded-lg border border-line bg-paper px-1 text-xs text-ink outline-none focus:border-pine"
		})]
	});
}
function TotalBar({ totals }) {
	const money = totals.priced === 0 ? "还没记" : formatMoney(totals.sum);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "safe-bottom fixed inset-x-0 bottom-0 z-20 border-t border-line bg-paper/95 backdrop-blur",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mx-auto flex w-full max-w-xl items-baseline justify-between gap-3 px-4 py-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted",
				children: "合计"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "font-serif text-2xl tabular-nums",
				"aria-live": "polite",
				children: money
			})]
		})
	});
}
function Drawer({ open, people, activeId, exportNote, fileRef, onClose, onSelect, onAdd, onRename, onNote, onDelete, onExport, onPickFile }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: cn("fixed inset-0 z-40", open ? "pointer-events-auto" : "pointer-events-none"),
		"aria-hidden": !open,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
			type: "button",
			className: cn("absolute inset-0 bg-ink/40 transition-opacity duration-200", open ? "opacity-100" : "opacity-0"),
			"aria-label": "关闭家人列表",
			tabIndex: open ? 0 : -1,
			onClick: onClose
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
			inert: open ? void 0 : true,
			className: cn("absolute inset-y-0 left-0 flex h-full w-[min(20rem,86vw)] flex-col bg-card shadow-xl transition-transform duration-200 ease-out", open ? "translate-x-0" : "-translate-x-full"),
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-between border-b border-line px-4 py-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "font-serif text-xl",
						children: "家人"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: onClose,
						"aria-label": "关闭",
						className: "grid size-11 place-items-center rounded-xl",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "size-5" })
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex-1 overflow-y-auto",
					children: [
						people.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "px-4 py-6 text-sm text-muted",
							children: "还没有家人"
						}) : null,
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", { children: people.map((person) => {
							const selected = person.id === activeId;
							return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
								className: cn("flex items-stretch border-b border-line", selected && "bg-pine-soft"),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									type: "button",
									onClick: () => onSelect(person.id),
									className: "min-h-11 min-w-0 flex-1 px-4 py-3 text-left",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: cn("block truncate", selected ? "font-semibold text-pine-ink" : "text-ink"),
										children: person.name || "未命名"
									}), person.note ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "mt-0.5 block truncate text-sm text-muted",
										children: person.note
									}) : null]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PersonMenu, {
									person,
									onRename,
									onNote,
									onDelete
								})]
							}, person.id);
						}) }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "p-4",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								onClick: onAdd,
								className: "flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-pine text-pine-ink transition-transform duration-150 ease-out active:scale-[0.96]",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "size-5" }), "新增家人"]
							})
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "safe-bottom border-t border-line px-4 pt-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid grid-cols-2 gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								onClick: onExport,
								className: "flex min-h-11 items-center justify-center gap-2 rounded-xl bg-pine text-card transition-transform duration-150 ease-out active:scale-[0.96]",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Download, { className: "size-4" }), "存档"]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								onClick: () => fileRef.current?.click(),
								className: "flex min-h-11 items-center justify-center gap-2 rounded-xl border border-line bg-paper transition-transform duration-150 ease-out active:scale-[0.96]",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Upload, { className: "size-4" }), "读档"]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							ref: fileRef,
							type: "file",
							accept: "application/json,.json",
							className: "hidden",
							onChange: (event) => {
								const file = event.target.files?.[0];
								event.target.value = "";
								onPickFile(file);
							}
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2 text-sm text-pretty text-muted",
							children: "存档会下载一个文件。换手机时把文件发过去，在那边点读档。读档会整份替换。"
						}),
						exportNote ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 text-sm text-pine-ink",
							children: exportNote
						}) : null
					]
				})
			]
		})]
	});
}
function PersonMenu({ person, onRename, onNote, onDelete }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DropdownMenu, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DropdownMenuTrigger, {
		"aria-label": `${person.name || "未命名"}的操作`,
		className: "grid size-11 shrink-0 place-items-center self-center rounded-xl text-ink",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Ellipsis, { className: "size-5" })
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DropdownMenuPortal, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DropdownMenuContent, {
		align: "end",
		sideOffset: 4,
		className: "z-50 min-w-36 rounded-xl border border-line bg-card p-1 text-ink shadow-lg",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MenuItem, {
				onSelect: () => onRename(person),
				children: "改名"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MenuItem, {
				onSelect: () => onNote(person),
				children: "改备注"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MenuItem, {
				danger: true,
				onSelect: () => onDelete(person.id),
				children: "删除"
			})
		]
	}) })] });
}
function MenuItem({ children, onSelect, danger = false }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DropdownMenuItem, {
		onSelect,
		className: cn("flex min-h-11 cursor-pointer items-center rounded-lg px-3 outline-none data-[highlighted]:bg-pine-soft", danger ? "text-cinnabar" : "text-ink"),
		children
	});
}
function Field({ label, value, onChange, placeholder, inputMode, suffix, type = "text", multiline = false, grow = false, extra = null }) {
	const id = (0, import_react.useId)();
	const growRef = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		const el = growRef.current;
		if (!el) return;
		el.style.height = "0px";
		el.style.height = `${el.scrollHeight}px`;
	}, [value, grow]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "block min-w-0",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
			className: "mb-1 flex items-center justify-between gap-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
				htmlFor: id,
				className: "text-sm text-muted",
				children: label
			}), extra]
		}), multiline ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
			id,
			value,
			placeholder,
			rows: 3,
			onChange: (event) => onChange(event.target.value),
			className: "w-full resize-none rounded-xl border border-line bg-paper px-3 py-2 text-base text-ink outline-none placeholder:text-inactive focus:border-pine"
		}) : grow ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
			id,
			ref: growRef,
			value,
			rows: 1,
			placeholder,
			onChange: (event) => onChange(event.target.value),
			className: "min-h-11 w-full resize-none overflow-hidden rounded-xl border border-line bg-paper px-3 py-2 text-base leading-normal text-inherit outline-none placeholder:text-inactive focus:border-pine"
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
			className: "flex min-h-11 w-full items-center rounded-xl border border-line bg-paper px-3 text-inherit focus-within:border-pine",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				id,
				type,
				inputMode,
				value,
				placeholder,
				autoComplete: "off",
				onChange: (event) => onChange(event.target.value),
				className: "min-w-0 flex-1 bg-transparent py-2 text-base text-inherit outline-none placeholder:text-inactive"
			}), suffix ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "shrink-0 pl-2 text-sm text-muted",
				children: suffix
			}) : null]
		})]
	});
}
function Modal({ title, onClose, children }) {
	(0, import_react.useEffect)(() => {
		const onKey = (event) => {
			if (event.key === "Escape") onClose();
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [onClose]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "fixed inset-0 z-50 flex items-end justify-center sm:items-center",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
			type: "button",
			className: "absolute inset-0 bg-ink/40",
			"aria-label": "关闭",
			onClick: onClose
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			role: "dialog",
			"aria-modal": "true",
			"aria-label": title,
			className: "relative z-10 w-full max-w-md rounded-t-2xl bg-card p-5 text-ink sm:rounded-2xl",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "font-serif text-xl",
				children: title
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-3",
				children
			})]
		})]
	});
}
function ModalActions({ confirmLabel, onConfirm, onClose, confirmDisabled = false, danger = false, hideCancel = false }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: cn("mt-4 grid gap-2", hideCancel ? "grid-cols-1" : "grid-cols-2"),
		children: [hideCancel ? null : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
			type: "button",
			onClick: onClose,
			className: "min-h-11 rounded-xl border border-line bg-paper transition-transform duration-150 ease-out active:scale-[0.96]",
			children: "取消"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
			type: "button",
			onClick: onConfirm,
			disabled: confirmDisabled,
			className: cn("min-h-11 rounded-xl text-card transition-transform duration-150 ease-out disabled:opacity-40 active:scale-[0.96]", danger ? "bg-cinnabar" : "bg-pine"),
			children: confirmLabel
		})]
	});
}
function Home() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Assistant, {});
}
//#endregion
export { Home as component };
