import React, { useMemo, useRef, useState } from "react";
import { colorForTeacher } from "../teacherColor";

const DAYS = [
  { key: "MONDAY", label: "Δευτέρα" },
  { key: "TUESDAY", label: "Τρίτη" },
  { key: "WEDNESDAY", label: "Τετάρτη" },
  { key: "THURSDAY", label: "Πέμπτη" },
  { key: "FRIDAY", label: "Παρασκευή" },
  { key: "SATURDAY", label: "Σάββατο" },
];
const DAY_LABEL = Object.fromEntries(DAYS.map((d) => [d.key, d.label]));
const DAY_ORDER = Object.fromEntries(DAYS.map((d, i) => [d.key, i]));

const SCOPE_TYPES = [
  { key: "teacher", label: "Καθηγητής" },
  { key: "classgroup", label: "Τμήμα" },
  { key: "student", label: "Μαθητής" },
];

function toMinutes(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

const GRID_START_MINUTES = 14 * 60; // 14:00
const SLOT_MINUTES = 30;
const SLOT_COUNT = 17; // 14:00 έως 22:00 σε μισές ώρες

export default function PrintPreviewModal({ open, onClose, assignments, teachers, classGroups, students }) {
  const [scopeType, setScopeType] = useState("teacher");
  const [scopeId, setScopeId] = useState("");
  const [format, setFormat] = useState("grid"); // "grid" | "list"
  const [sharing, setSharing] = useState(false);
  const previewRef = useRef(null);

  const scopeOptions = useMemo(() => {
    if (scopeType === "teacher") return teachers.map((t) => ({ id: t.id, label: t.fullName }));
    if (scopeType === "classgroup") return classGroups.map((g) => ({ id: g.id, label: g.name }));
    return students.map((s) => ({ id: s.id, label: s.fullName }));
  }, [scopeType, teachers, classGroups, students]);

  const scopeName = scopeOptions.find((o) => o.id === scopeId)?.label || "";

  const classGroupStudents = useMemo(() => {
    if (scopeType !== "classgroup" || !scopeId) return [];
    return students.filter((s) => (s.classGroupIds || []).includes(scopeId));
  }, [scopeType, scopeId, students]);

  const filteredAssignments = useMemo(() => {
    if (!scopeId) return [];
    let list;
    if (scopeType === "teacher") list = assignments.filter((a) => a.teacherId === scopeId);
    else if (scopeType === "classgroup") list = assignments.filter((a) => a.classGroupId === scopeId);
    else {
      const student = students.find((s) => s.id === scopeId);
      const ids = student?.classGroupIds || [];
      list = assignments.filter((a) => ids.includes(a.classGroupId));
    }
    return [...list].sort((a, b) => {
      const dayDiff = DAY_ORDER[a.day] - DAY_ORDER[b.day];
      if (dayDiff !== 0) return dayDiff;
      return toMinutes(a.startTime) - toMinutes(b.startTime);
    });
  }, [assignments, scopeType, scopeId, students]);

  const teachersInPreview = useMemo(() => {
    const ids = new Set(filteredAssignments.map((a) => a.teacherId));
    return teachers.filter((t) => ids.has(t.id));
  }, [filteredAssignments, teachers]);

  if (!open) return null;

  const handlePrint = () => window.print();

  const handleShare = async () => {
    if (!previewRef.current) return;
    setSharing(true);
    try {
      let canvas;
      try {
        const [{ default: jsPDFmod }, html2canvasMod] = await Promise.all([
          import("jspdf"),
          import("html2canvas"),
        ]);
        const jsPDF = jsPDFmod;
        const html2canvas = html2canvasMod.default;
        canvas = await html2canvas(previewRef.current, {
          scale: 2,
          backgroundColor: "#ffffff",
          useCORS: true,
        });
        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
        const pageW = pdf.internal.pageSize.getWidth();
        const pageH = pdf.internal.pageSize.getHeight();
        const ratio = Math.min(pageW / canvas.width, pageH / canvas.height);
        const w = canvas.width * ratio;
        const h = canvas.height * ratio;
        pdf.addImage(imgData, "PNG", (pageW - w) / 2, (pageH - h) / 2, w, h);
        const blob = pdf.output("blob");
        const fileName = `programma_${(scopeName || "all").replace(/\s+/g, "_")}.pdf`;
        const file = new File([blob], fileName, { type: "application/pdf" });

        try {
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], title: "Πρόγραμμα Φροντιστηρίου", text: scopeName });
          } else {
            throw new Error("share-not-supported");
          }
        } catch (shareErr) {
          // Είτε δεν υποστηρίζεται είτε ο χρήστης ακύρωσε το share sheet -> έχουμε ήδη το PDF, το κατεβάζουμε.
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = fileName;
          a.click();
          URL.revokeObjectURL(url);
          if (shareErr.message === "share-not-supported") {
            alert("Η άμεση κοινή χρήση (π.χ. Viber) δεν υποστηρίζεται σε αυτόν τον browser/συσκευή — το PDF κατέβηκε, μπορείς να το επισυνάψεις χειροκίνητα.");
          }
        }
      } catch (genErr) {
        console.error("Σφάλμα δημιουργίας PDF:", genErr);
        alert("Προέκυψε σφάλμα κατά τη δημιουργία του PDF: " + (genErr?.message || "άγνωστο σφάλμα") + "\nΔοκίμασε το κουμπί 'Εκτύπωση' ως εναλλακτική.");
      }
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-0 sm:p-4 print:static print:bg-transparent print:p-0">
      <div className="flex h-full w-full max-w-4xl flex-col overflow-hidden bg-white shadow-xl sm:h-auto sm:max-h-[92vh] sm:rounded-lg print:h-auto print:max-h-none print:max-w-none print:rounded-none print:shadow-none">
        {/* Controls - κρύβονται στην εκτύπωση. Στοιχίζονται κάθετα σε κινητό. */}
        <div className="flex flex-col gap-3 border-b border-line px-4 py-3 sm:flex-row sm:flex-wrap sm:items-end sm:px-5 sm:py-4 print:hidden">
          <label className="flex flex-col gap-1 text-xs font-medium text-slate">
            Προβολή ανά
            <select
              value={scopeType}
              onChange={(e) => { setScopeType(e.target.value); setScopeId(""); }}
              className="w-full rounded-md border border-line px-2 py-1.5 text-sm sm:w-auto"
            >
              {SCOPE_TYPES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-slate">
            Επιλογή
            <select
              value={scopeId}
              onChange={(e) => setScopeId(e.target.value)}
              className="w-full rounded-md border border-line px-2 py-1.5 text-sm sm:w-56"
            >
              <option value="">Επίλεξε...</option>
              {scopeOptions.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          </label>
          <div className="flex flex-col gap-1 text-xs font-medium text-slate">
            Μορφή
            <div className="flex overflow-hidden rounded-md border border-line">
              <button
                onClick={() => setFormat("grid")}
                className={`flex-1 px-3 py-1.5 text-sm ${format === "grid" ? "bg-accent text-white" : "bg-white text-ink"}`}
              >
                Πλέγμα
              </button>
              <button
                onClick={() => setFormat("list")}
                className={`flex-1 px-3 py-1.5 text-sm ${format === "list" ? "bg-accent text-white" : "bg-white text-ink"}`}
              >
                Λίστα
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:ml-auto sm:flex sm:flex-row">
            <button onClick={handlePrint} disabled={!scopeId} className="rounded-md border border-line px-3 py-1.5 text-sm font-medium text-ink hover:bg-paper disabled:opacity-40">
              Εκτύπωση
            </button>
            <button onClick={handleShare} disabled={!scopeId || sharing} className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-40">
              {sharing ? "Δημιουργία PDF..." : "Κοινή χρήση (π.χ. Viber)"}
            </button>
            <button onClick={onClose} className="rounded-md border border-line px-3 py-1.5 text-sm text-slate hover:bg-paper">
              Κλείσιμο
            </button>
          </div>
        </div>

        {/* Preview / print area */}
        <div className="flex-1 overflow-auto p-3 sm:p-5 print:overflow-visible print:p-8">
          <div ref={previewRef} className="print-area mx-auto max-w-3xl bg-white">
            <div className="mb-4 flex items-end justify-between border-b-2 border-ink pb-3">
              <div>
                <div className="font-display text-lg font-semibold text-ink sm:text-xl">ΦΡΟΝΤΙΣΤΗΡΙΟ ΚΟΥΤΣΟΥΚΟΣ</div>
                <div className="text-sm text-slate">2026-2027</div>
              </div>
              <div className="text-right">
                <div className="text-xs uppercase tracking-wide text-slate">
                  {SCOPE_TYPES.find((s) => s.key === scopeType)?.label}
                </div>
                <div className="font-display text-base font-semibold text-ink sm:text-lg">{scopeName || "—"}</div>
              </div>
            </div>

            {!scopeId && (
              <div className="py-12 text-center text-sm text-slate">
                Επίλεξε καθηγητή, τμήμα ή μαθητή παραπάνω για προεπισκόπηση.
              </div>
            )}

            {scopeId && scopeType === "classgroup" && (
              <div className="mb-4 rounded-md border border-line bg-paper/50 p-2 text-sm">
                <span className="font-medium text-ink">Μαθητές τμήματος: </span>
                {classGroupStudents.length > 0
                  ? classGroupStudents.map((s) => s.fullName).join(", ")
                  : "— κανένας μαθητής ανατεθειμένος ακόμα —"}
              </div>
            )}

            {scopeId && format === "grid" && teachersInPreview.length > 1 && (
              <div className="mb-2 flex flex-wrap items-center gap-3 text-xs text-slate">
                <span className="font-medium text-ink">Καθηγητές:</span>
                {teachersInPreview.map((t) => (
                  <span key={t.id} className="flex items-center gap-1.5">
                    <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colorForTeacher(t) }} />
                    {t.fullName}
                  </span>
                ))}
              </div>
            )}

            {scopeId && format === "list" && (
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b-2 border-ink text-left">
                    <th className="py-1.5 pr-3">Ημέρα</th>
                    <th className="py-1.5 pr-3">Ώρα</th>
                    <th className="py-1.5 pr-3">Μάθημα</th>
                    <th className="py-1.5 pr-3">Τμήμα</th>
                    <th className="py-1.5 pr-3">Καθηγητής</th>
                    <th className="py-1.5 pr-3">Αίθουσα</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAssignments.map((a) => (
                    <tr key={a.id} className="border-b border-line">
                      <td className="py-1.5 pr-3">{DAY_LABEL[a.day]}</td>
                      <td className="py-1.5 pr-3">{a.startTime}–{a.endTime}</td>
                      <td className="py-1.5 pr-3">{a.course?.title}</td>
                      <td className="py-1.5 pr-3">{a.classGroup?.name}</td>
                      <td className="py-1.5 pr-3">{a.teacher?.fullName}</td>
                      <td className="py-1.5 pr-3">{a.room?.name}</td>
                    </tr>
                  ))}
                  {filteredAssignments.length === 0 && (
                    <tr><td colSpan={6} className="py-6 text-center text-slate">Καμία ανάθεση.</td></tr>
                  )}
                </tbody>
              </table>
            )}

            {scopeId && format === "grid" && (
              <SimplePrintGrid assignments={filteredAssignments} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Πλέγμα εκτύπωσης/preview με την ΙΔΙΑ οπτική γλώσσα με το κανονικό πρόγραμμα στην οθόνη:
// έγχρωμες κάρτες ανά καθηγητή (colorForTeacher), rowSpan ανάλογα με τη διάρκεια.
function SimplePrintGrid({ assignments }) {
  const HOURS = Array.from({ length: SLOT_COUNT }, (_, i) => {
    const total = GRID_START_MINUTES + i * SLOT_MINUTES;
    const h = String(Math.floor(total / 60)).padStart(2, "0");
    const m = String(total % 60).padStart(2, "0");
    return `${h}:${m}`;
  });

  function slotIndexOf(time) {
    return Math.round((toMinutes(time) - GRID_START_MINUTES) / SLOT_MINUTES);
  }

  function slotSpanOf(a) {
    const span = Math.round((toMinutes(a.endTime) - toMinutes(a.startTime)) / SLOT_MINUTES);
    return Math.max(1, span);
  }

  const layoutByDay = useMemo(() => {
    const result = {};
    for (const day of DAYS) {
      const dayAssignments = assignments.filter((a) => a.day === day.key);
      const cellMap = {};
      const byStartIndex = {};
      for (const a of dayAssignments) {
        const idx = slotIndexOf(a.startTime);
        if (idx < 0 || idx >= SLOT_COUNT) continue;
        (byStartIndex[idx] = byStartIndex[idx] || []).push(a);
      }
      for (const idxStr of Object.keys(byStartIndex)) {
        const idx = Number(idxStr);
        if (cellMap[idx] === "covered") continue;
        const items = byStartIndex[idx];
        const span = Math.min(Math.max(...items.map(slotSpanOf)), SLOT_COUNT - idx);
        cellMap[idx] = { items, span };
        for (let k = idx + 1; k < idx + span; k++) cellMap[k] = "covered";
      }
      result[day.key] = cellMap;
    }
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignments]);

  return (
    <table className="w-full border-collapse text-[10px] sm:text-[11px]">
      <thead>
        <tr>
          <th className="w-12 border border-line bg-paper p-1 sm:w-14"></th>
          {DAYS.map((d) => (
            <th key={d.key} className="border border-line bg-paper p-1 font-display text-[10px] font-semibold sm:text-xs">
              {d.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {HOURS.map((time, rowIdx) => (
          <tr key={time}>
            <td className="border border-line p-1 text-right text-slate">{time}</td>
            {DAYS.map((d) => {
              const cell = layoutByDay[d.key][rowIdx];
              if (cell === "covered") return null;
              if (cell && cell.items) {
                return (
                  <td key={d.key + time} rowSpan={cell.span} className="border border-line p-0.5 align-top sm:p-1">
                    {cell.items.map((a) => {
                      const color = colorForTeacher(a.teacher);
                      return (
                        <div
                          key={a.id}
                          className="mb-1 rounded border px-1 py-0.5"
                          style={{ backgroundColor: color + "22", borderColor: color }}
                        >
                          <div className="font-semibold text-ink">{a.course?.title}</div>
                          <div className="text-slate">{a.classGroup?.name} · {a.teacher?.fullName}</div>
                          <div className="text-slate">{a.room?.name}</div>
                        </div>
                      );
                    })}
                  </td>
                );
              }
              return <td key={d.key + time} className="border border-line p-1 align-top" />;
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
