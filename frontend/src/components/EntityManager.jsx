import React, { useState, useMemo } from "react";
import { api } from "../api";

/**
 * Γενικό component διαχείρισης για μια απλή οντότητα (Μάθημα, Καθηγητής, Αίθουσα, Τμήμα).
 *
 * fields: [{ key, label, type: 'text'|'number'|'color', optional }]
 */
export default function EntityManager({ entityEndpoint, title, items, fields, onChanged }) {
  const emptyForm = Object.fromEntries(fields.map((f) => [f.key, ""]));
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState(null);
  const [sortKey, setSortKey] = useState(fields[0]?.key || "");
  const [sortDir, setSortDir] = useState("asc");

  const sortableFields = fields.filter((f) => f.type !== "color");

  const sortedItems = useMemo(() => {
    if (!sortKey) return items;
    const copy = [...items];
    copy.sort((a, b) => {
      const av = a[sortKey] ?? "";
      const bv = b[sortKey] ?? "";
      const cmp = typeof av === "number" && typeof bv === "number"
        ? av - bv
        : String(av).localeCompare(String(bv), "el");
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [items, sortKey, sortDir]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const startEdit = (item) => {
    setEditingId(item.id);
    setForm(Object.fromEntries(fields.map((f) => [f.key, item[f.key] ?? ""])));
    setError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const requiredMissing = fields.some((f) => !f.optional && !String(form[f.key] || "").trim());
    if (requiredMissing) {
      setError("Συμπλήρωσε τα υποχρεωτικά πεδία.");
      return;
    }
    const payload = { ...form };
    fields.forEach((f) => {
      if (f.type === "number" && payload[f.key] !== "") payload[f.key] = Number(payload[f.key]);
      if (payload[f.key] === "") payload[f.key] = null;
    });

    try {
      if (editingId) {
        await api.update(entityEndpoint, editingId, payload);
      } else {
        await api.create(entityEndpoint, payload);
      }
      cancelEdit();
      onChanged();
    } catch (err) {
      setError("Προέκυψε σφάλμα κατά την αποθήκευση.");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Σίγουρα διαγραφή; Αν χρησιμοποιείται σε πρόγραμμα, ίσως προκύψουν προβλήματα αναφοράς.")) return;
    await api.remove(entityEndpoint, id);
    if (editingId === id) cancelEdit();
    onChanged();
  };

  return (
    <div className="rounded-lg border border-line bg-white">
      <div className="border-b border-line px-4 py-3">
        <h3 className="font-display text-base font-semibold text-ink">{title}</h3>
        <p className="text-xs text-slate">{items.length} εγγραφές</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3 border-b border-line bg-paper/50 px-4 py-3">
        {fields.map((f) => (
          <label key={f.key} className="flex flex-col gap-1 text-xs font-medium text-slate">
            {f.label}{f.optional ? "" : " *"}
            <input
              type={f.type === "number" ? "number" : f.type === "color" ? "color" : "text"}
              value={form[f.key] ?? ""}
              onChange={set(f.key)}
              className={f.type === "color"
                ? "h-9 w-14 rounded-md border border-line"
                : "w-40 rounded-md border border-line px-2 py-1.5 text-sm text-ink focus:border-accent focus:outline-none"}
            />
          </label>
        ))}
        <button type="submit" className="rounded-md bg-accent px-4 py-1.5 text-sm font-medium text-white hover:bg-accent/90">
          {editingId ? "Αποθήκευση" : "Προσθήκη"}
        </button>
        {editingId && (
          <button type="button" onClick={cancelEdit} className="rounded-md border border-line px-3 py-1.5 text-sm text-slate hover:bg-white">
            Ακύρωση
          </button>
        )}
        {error && <span className="text-xs text-warn">{error}</span>}
      </form>

      <div className="flex items-center gap-2 border-b border-line bg-paper/30 px-4 py-2 text-xs text-slate">
        <span>Ταξινόμηση:</span>
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value)}
          className="rounded-md border border-line px-2 py-1"
        >
          {sortableFields.map((f) => (
            <option key={f.key} value={f.key}>{f.label}</option>
          ))}
        </select>
        <button
          onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
          className="rounded-md border border-line px-2 py-1"
          title="Αντιστροφή σειράς"
        >
          {sortDir === "asc" ? "Α → Ω" : "Ω → Α"}
        </button>
      </div>

      <div className="divide-y divide-line">
        {sortedItems.map((item) => (
          <div key={item.id} className="flex items-center justify-between px-4 py-2 text-sm">
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-ink">
              {fields.map((f) => (
                <span key={f.key}>
                  <span className="text-slate">{f.label}: </span>
                  {f.type === "color" && item[f.key] ? (
                    <span
                      className="inline-block h-3 w-3 rounded-full align-middle"
                      style={{ backgroundColor: item[f.key] }}
                    />
                  ) : (
                    item[f.key] ?? "—"
                  )}
                </span>
              ))}
            </div>
            <div className="flex gap-3 text-xs">
              <button onClick={() => startEdit(item)} className="text-accent underline">Επεξεργασία</button>
              <button onClick={() => handleDelete(item.id)} className="text-warn underline">Διαγραφή</button>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <div className="px-4 py-6 text-center text-sm text-slate">Δεν υπάρχουν ακόμα εγγραφές.</div>
        )}
      </div>
    </div>
  );
}
