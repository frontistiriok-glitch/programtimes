import React, { useMemo, useRef, useState } from "react";

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

  if (!open) return null;

  const handlePrint = () => window.print();

  const handleShare = async () => {
    if (!previewRef.current) return;
    setSharing(true);
    try {
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import("jspdf"),
        import("html2canvas"),
      ]);
      const canvas = await html2canvas(previewRef.current, { scale: 2, backgroundColor: "#ffffff" });
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

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: "Πρόγραμμα Φροντιστηρίου", text: scopeName });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
        alert("Η άμεση κοινή χρήση (π.χ. Viber) δεν υποστηρίζεται σε αυτόν τον browser/συσκευή — το PDF κατέβηκε στη συσκευή σου, μπορείς να το επισυνάψεις χειροκίνητα.");
      }
    } catch (err) {
      alert("Προέκυψε σφάλμα κατά τη δημιουργία του PDF.");
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 print:static print:bg-transparent print:p-0">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg bg-white shadow-xl print:max-h-none print:max-w-none print:rounded-none print:shadow-none">
        {/* Controls - κρύβονται στην εκτύπωση */}
        <div className="flex flex-wrap items-end gap-3 border-b border-line px-5 py-4 print:hidden">
          <label className="flex flex-col gap-1 text-xs font-medium text-slate">
            Προβολή ανά
            <select
              value={scopeType}
              onChange={(e) => { setScopeType(e.target.value); setScopeId(""); }}
              className="rounded-md border border-line px-2 py-1.5 text-sm"
            >
              {SCOPE_TYPES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-slate">
            Επιλογή
            <select
              value={scopeId}
              onChange={(e) => setScopeId(e.target.value)}
              className="w-56 rounded-md border border-line px-2 py-1.5 text-sm"
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
                className={`px-3 py-1.5 text-sm ${format === "grid" ? "bg-accent text-white" : "bg-white text-ink"}`}
              >
                Πλέγμα
              </button>
              <button
                onClick={() => setFormat("list")}
                className={`px-3 py-1.5 text-sm ${format === "list" ? "bg-accent text-white" : "bg-white text-ink"}`}
              >
                Λίστα
              </button>
            </div>
          </div>

          <div className="ml-auto flex gap-2">
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
        <div className="overflow-auto p-5 print:overflow-visible print:p-8">
          <div ref={previewRef} className="print-area mx-auto max-w-3xl bg-white">
            <div className="mb-4 flex items-end justify-between border-b-2 border-ink pb-3">
              <div>
                <div className="font-display text-xl font-semibold text-ink">ΦΡΟΝΤΙΣΤΗΡΙΟ ΚΟΥΤΣΟΥΚΟΣ</div>
                <div className="text-sm text-slate">2026-2027</div>
              </div>
              <div className="text-right">
                <div className="text-xs uppercase tracking-wide text-slate">
                  {SCOPE_TYPES.find((s) => s.key === scopeType)?.label}
                </div>
                <div className="font-display text-lg font-semibold text-ink">{scopeName || "—"}</div>
              </div>
            </div>

            {!scopeId && (
              <div className="py-12 text-center text-sm text-slate">
                Επίλεξε καθηγητή, τμήμα ή μαθητή παραπάνω για προεπισκόπηση.
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

// Ελαφριά, καθαρά τυπωμένη εκδοχή του εβδομαδιαίου πλέγματος (χωρίς drag&drop/interactivity -
// άχρηστα σε χαρτί) ειδικά για το preview/εκτύπωση.
function SimplePrintGrid({ assignments }) {
  const HOURS = Array.from({ length: 17 }, (_, i) => {
    const total = 14 * 60 + i * 30;
    const h = String(Math.floor(total / 60)).padStart(2, "0");
    const m = String(total % 60).padStart(2, "0");
    return `${h}:${m}`;
  });

  const cellContent = (dayKey, time) =>
    assignments.filter((a) => a.day === dayKey && a.startTime === time);

  return (
    <table className="w-full border-collapse text-[11px]">
      <thead>
        <tr>
          <th className="w-14 border border-line bg-paper p-1"></th>
          {DAYS.map((d) => (
            <th key={d.key} className="border border-line bg-paper p-1 font-display text-xs font-semibold">
              {d.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {HOURS.map((time) => (
          <tr key={time}>
            <td className="border border-line p-1 text-right text-slate">{time}</td>
            {DAYS.map((d) => {
              const items = cellContent(d.key, time);
              return (
                <td key={d.key + time} className="border border-line p-1 align-top">
                  {items.map((a) => (
                    <div key={a.id} className="mb-1 rounded border border-ink/30 bg-paper/60 p-1">
                      <div className="font-semibold">{a.course?.title}</div>
                      <div>{a.classGroup?.name} · {a.teacher?.fullName}</div>
                      <div>{a.room?.name}</div>
                    </div>
                  ))}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
