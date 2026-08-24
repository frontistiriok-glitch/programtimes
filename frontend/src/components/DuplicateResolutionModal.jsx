import React, { useState } from "react";

/**
 * Εμφανίζει τα διπλότυπα (ίδιο όνομα Τμήματος ή Μαθητή σε πάνω από μία γραμμή του αρχείου)
 * και αφήνει τον χρήστη να διαλέξει ποια γραμμή θα κρατηθεί για κάθε όνομα.
 */
export default function DuplicateResolutionModal({ open, classGroupDuplicates, studentDuplicates, onConfirm, onCancel }) {
  const [classGroupChoices, setClassGroupChoices] = useState(
    Object.fromEntries((classGroupDuplicates || []).map((d) => [d.key, d.candidates[0].index]))
  );
  const [studentChoices, setStudentChoices] = useState(
    Object.fromEntries((studentDuplicates || []).map((d) => [d.key, d.candidates[0].index]))
  );

  if (!open) return null;

  const handleConfirm = () => {
    onConfirm({ classGroups: classGroupChoices, students: studentChoices });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg bg-white shadow-xl">
        <div className="border-b border-line px-5 py-4">
          <h2 className="font-display text-lg font-semibold text-ink">Βρέθηκαν διπλότυπα στο αρχείο</h2>
          <p className="text-sm text-slate">Διάλεξε ποια γραμμή θα κρατηθεί για κάθε περίπτωση.</p>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-4">
          {classGroupDuplicates?.length > 0 && (
            <div>
              <h3 className="mb-2 font-medium text-ink">Τμήματα</h3>
              {classGroupDuplicates.map((dup) => (
                <div key={dup.key} className="mb-3 rounded-md border border-line p-3">
                  <div className="mb-2 text-sm font-medium text-ink">"{dup.name}" εμφανίζεται {dup.candidates.length} φορές:</div>
                  {dup.candidates.map((c) => (
                    <label key={c.index} className="mb-1 flex items-center gap-2 text-sm text-slate">
                      <input
                        type="radio"
                        name={`cg-${dup.key}`}
                        checked={classGroupChoices[dup.key] === c.index}
                        onChange={() => setClassGroupChoices((s) => ({ ...s, [dup.key]: c.index }))}
                      />
                      Γραμμή {c.index + 2}: {c.name} {c.grade ? `· Τάξη: ${c.grade}` : ""}
                    </label>
                  ))}
                </div>
              ))}
            </div>
          )}

          {studentDuplicates?.length > 0 && (
            <div>
              <h3 className="mb-2 font-medium text-ink">Μαθητές</h3>
              {studentDuplicates.map((dup) => (
                <div key={dup.key} className="mb-3 rounded-md border border-line p-3">
                  <div className="mb-2 text-sm font-medium text-ink">"{dup.name}" εμφανίζεται {dup.candidates.length} φορές:</div>
                  {dup.candidates.map((c) => (
                    <label key={c.index} className="mb-1 flex items-center gap-2 text-sm text-slate">
                      <input
                        type="radio"
                        name={`st-${dup.key}`}
                        checked={studentChoices[dup.key] === c.index}
                        onChange={() => setStudentChoices((s) => ({ ...s, [dup.key]: c.index }))}
                      />
                      Γραμμή {c.index + 2}: {c["Ονοματεπώνυμο"] || c.fullName}
                      {c["Τάξη"] ? ` · Τάξη: ${c["Τάξη"]}` : ""}
                      {c["Τηλέφωνο"] ? ` · Τηλ: ${c["Τηλέφωνο"]}` : ""}
                    </label>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-line px-5 py-4">
          <button onClick={onCancel} className="rounded-md border border-line px-3 py-2 text-sm text-slate hover:bg-paper">
            Ακύρωση εισαγωγής
          </button>
          <button onClick={handleConfirm} className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90">
            Συνέχεια με αυτές τις επιλογές
          </button>
        </div>
      </div>
    </div>
  );
}
