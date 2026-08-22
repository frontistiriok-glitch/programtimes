import React, { useState, useMemo } from "react";

/**
 * Επιλογή Τμήματος σε δύο βήματα: πρώτα Τάξη (dropdown), μετά Τμήμα εκείνης
 * της Τάξης (δεύτερο dropdown). Ο μαθητής μπορεί να έχει πολλά Τμήματα ταυτόχρονα -
 * τα ήδη ανατεθειμένα εμφανίζονται ως αφαιρούμενα chips.
 */
export default function ClassGroupPicker({ classGroups, assignedIds, onChange }) {
  const [selectedGrade, setSelectedGrade] = useState("");
  const [selectedClassGroupId, setSelectedClassGroupId] = useState("");

  const grades = useMemo(
    () => [...new Set(classGroups.map((g) => g.grade).filter(Boolean))],
    [classGroups]
  );

  const classGroupsForGrade = useMemo(
    () => classGroups.filter((g) => g.grade === selectedGrade),
    [classGroups, selectedGrade]
  );

  const assigned = classGroups.filter((g) => (assignedIds || []).includes(g.id));

  const handleAdd = () => {
    if (!selectedClassGroupId) return;
    if (!(assignedIds || []).includes(selectedClassGroupId)) {
      onChange([...(assignedIds || []), selectedClassGroupId]);
    }
    setSelectedClassGroupId("");
  };

  const handleRemove = (id) => {
    onChange((assignedIds || []).filter((x) => x !== id));
  };

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className="font-medium text-ink">Τμήματα:</span>

      {assigned.map((g) => (
        <span key={g.id} className="flex items-center gap-1 rounded-full bg-accentSoft px-2 py-1 text-ink">
          {g.name}
          <button onClick={() => handleRemove(g.id)} className="text-slate hover:text-warn" title="Αφαίρεση">
            ×
          </button>
        </span>
      ))}
      {assigned.length === 0 && <span className="text-slate">Καμία ανάθεση ακόμα</span>}

      <span className="mx-1 text-slate">·</span>

      <select
        value={selectedGrade}
        onChange={(e) => { setSelectedGrade(e.target.value); setSelectedClassGroupId(""); }}
        className="rounded-md border border-line px-2 py-1"
      >
        <option value="">Τάξη...</option>
        {grades.map((gr) => (
          <option key={gr} value={gr}>{gr}</option>
        ))}
      </select>

      <select
        value={selectedClassGroupId}
        onChange={(e) => setSelectedClassGroupId(e.target.value)}
        disabled={!selectedGrade}
        className="rounded-md border border-line px-2 py-1 disabled:bg-paper disabled:text-slate"
      >
        <option value="">Τμήμα...</option>
        {classGroupsForGrade.map((g) => (
          <option key={g.id} value={g.id}>{g.name}</option>
        ))}
      </select>

      <button
        onClick={handleAdd}
        disabled={!selectedClassGroupId}
        className="rounded-md bg-accent px-2 py-1 text-white disabled:bg-line disabled:text-slate"
      >
        + Προσθήκη
      </button>

      {classGroups.length === 0 && <span className="text-slate">Δεν υπάρχουν ακόμα τμήματα.</span>}
    </div>
  );
}
