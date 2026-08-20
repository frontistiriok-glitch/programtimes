import React, { useState, useEffect } from "react";

const DAYS = [
  { key: "MONDAY", label: "Δευτέρα" },
  { key: "TUESDAY", label: "Τρίτη" },
  { key: "WEDNESDAY", label: "Τετάρτη" },
  { key: "THURSDAY", label: "Πέμπτη" },
  { key: "FRIDAY", label: "Παρασκευή" },
  { key: "SATURDAY", label: "Σάββατο" },
];

export default function AssignmentModal({ open, initial, courses, classGroups, teachers, rooms, onSave, onDelete, onClose, error }) {
  const [form, setForm] = useState(initial);

  useEffect(() => setForm(initial), [initial]);

  if (!open) return null;

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-4 font-display text-lg font-semibold text-ink">
          {initial?.id ? "Επεξεργασία ανάθεσης" : "Νέα ανάθεση"}
        </h2>

        {error && (
          <div className="mb-4 rounded-md border border-warn bg-warn/10 px-3 py-2 text-sm text-warn">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <label className="col-span-2 text-xs font-medium text-slate">
            Μάθημα
            <select className="mt-1 w-full rounded-md border border-line px-2 py-2 text-sm" value={form?.courseId || ""} onChange={set("courseId")}>
              <option value="">Επιλογή...</option>
              {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </label>
          <label className="text-xs font-medium text-slate">
            Τμήμα
            <select className="mt-1 w-full rounded-md border border-line px-2 py-2 text-sm" value={form?.classGroupId || ""} onChange={set("classGroupId")}>
              <option value="">Επιλογή...</option>
              {classGroups.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label className="text-xs font-medium text-slate">
            Καθηγητής
            <select className="mt-1 w-full rounded-md border border-line px-2 py-2 text-sm" value={form?.teacherId || ""} onChange={set("teacherId")}>
              <option value="">Επιλογή...</option>
              {teachers.map((t) => <option key={t.id} value={t.id}>{t.fullName}</option>)}
            </select>
          </label>
          <label className="col-span-2 text-xs font-medium text-slate">
            Αίθουσα
            <select className="mt-1 w-full rounded-md border border-line px-2 py-2 text-sm" value={form?.roomId || ""} onChange={set("roomId")}>
              <option value="">Επιλογή...</option>
              {rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </label>
          <label className="text-xs font-medium text-slate">
            Ημέρα
            <select className="mt-1 w-full rounded-md border border-line px-2 py-2 text-sm" value={form?.day || ""} onChange={set("day")}>
              {DAYS.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}
            </select>
          </label>
          <div />
          <label className="text-xs font-medium text-slate">
            Ώρα έναρξης
            <input type="time" className="mt-1 w-full rounded-md border border-line px-2 py-2 text-sm" value={form?.startTime || ""} onChange={set("startTime")} />
          </label>
          <label className="text-xs font-medium text-slate">
            Ώρα λήξης
            <input type="time" className="mt-1 w-full rounded-md border border-line px-2 py-2 text-sm" value={form?.endTime || ""} onChange={set("endTime")} />
          </label>
        </div>

        <div className="mt-6 flex justify-between">
          {form?.id ? (
            <button onClick={() => onDelete(form.id)} className="rounded-md border border-warn px-3 py-2 text-sm text-warn hover:bg-warn/10">
              Διαγραφή
            </button>
          ) : <span />}
          <div className="flex gap-2">
            <button onClick={onClose} className="rounded-md border border-line px-3 py-2 text-sm text-slate hover:bg-paper">
              Ακύρωση
            </button>
            <button onClick={() => onSave(form)} className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90">
              Αποθήκευση
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
