import React, { useState } from "react";
import { api } from "../api";
import { keyToGreekDay } from "../dayLabels";

export default function StudentsPanel({ students, classGroups, courses, onChanged }) {
  const [expandedId, setExpandedId] = useState(null);

  const classGroupName = (id) => classGroups.find((g) => g.id === id)?.name || "—";
  const courseName = (id) => courses.find((c) => c.id === id)?.title || id;

  const handleAssignClasses = async (studentId, classGroupIds) => {
    await api.assignStudentClasses(studentId, classGroupIds);
    onChanged();
  };

  const handleResolveCourse = async (studentId, unmatchedText, courseId) => {
    if (courseId === "__new__") {
      await api.resolveStudentCourse(studentId, { unmatchedText, createNewTitle: unmatchedText });
    } else {
      await api.resolveStudentCourse(studentId, { unmatchedText, courseId });
    }
    onChanged();
  };

  return (
    <div className="rounded-lg border border-line bg-white">
      <div className="border-b border-line px-4 py-3">
        <h2 className="font-display text-base font-semibold text-ink">Μαθητές / Δηλώσεις γονέων</h2>
        <p className="text-xs text-slate">{students.length} εγγραφές</p>
      </div>

      <div className="divide-y divide-line">
        {students.map((s) => (
          <div key={s.id} className="px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="font-medium text-ink">{s.fullName}</div>
                <div className="text-xs text-slate">
                  {s.grade} {s.parentName ? `· Γονέας: ${s.parentName}` : ""} {s.phone ? `· ${s.phone}` : ""}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs text-slate">
                <span>Τμήματα:</span>
                {classGroups.map((g) => {
                  const checked = (s.classGroupIds || []).includes(g.id);
                  return (
                    <label key={g.id} className="flex items-center gap-1 rounded-full border border-line px-2 py-1">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          const current = s.classGroupIds || [];
                          const next = e.target.checked
                            ? [...current, g.id]
                            : current.filter((id) => id !== g.id);
                          handleAssignClasses(s.id, next);
                        }}
                      />
                      {g.name}
                    </label>
                  );
                })}
                {classGroups.length === 0 && <span>Δεν υπάρχουν ακόμα τμήματα.</span>}
              </div>

              <button
                className="text-xs text-accent underline"
                onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}
              >
                {expandedId === s.id ? "Λιγότερα" : "Περισσότερα"}
              </button>
            </div>

            {expandedId === s.id && (
              <div className="mt-3 space-y-2 rounded-md bg-paper p-3 text-sm">
                <div>
                  <span className="font-medium text-ink">Μαθήματα (αντιστοιχισμένα): </span>
                  {(s.courseIds || []).length > 0
                    ? s.courseIds.map((cid) => courseName(cid)).join(", ")
                    : "—"}
                </div>

                {(s.unmatchedCourseNames || []).length > 0 && (
                  <div className="rounded-md border border-warn/40 bg-warn/10 p-2">
                    <div className="mb-1 font-medium text-warn">Χρειάζονται χειροκίνητη επιβεβαίωση:</div>
                    {s.unmatchedCourseNames.map((name) => (
                      <div key={name} className="mb-1 flex items-center gap-2">
                        <span className="text-slate">"{name}"</span>
                        <select
                          className="rounded-md border border-line px-2 py-1 text-xs"
                          defaultValue=""
                          onChange={(e) => handleResolveCourse(s.id, name, e.target.value)}
                        >
                          <option value="" disabled>Σύνδεση με...</option>
                          {courses.map((c) => (
                            <option key={c.id} value={c.id}>{c.title}</option>
                          ))}
                          <option value="__new__">+ Δημιουργία νέου μαθήματος "{name}"</option>
                        </select>
                      </div>
                    ))}
                  </div>
                )}

                <div>
                  <span className="font-medium text-ink">Μη διαθέσιμες ώρες: </span>
                  {(s.unavailableSlots || []).length > 0
                    ? s.unavailableSlots.map((sl) => `${keyToGreekDay(sl.day)} ${sl.time}`).join(", ")
                    : "—"}
                </div>

                {s.notes && (
                  <div><span className="font-medium text-ink">Σημειώσεις: </span>{s.notes}</div>
                )}
              </div>
            )}
          </div>
        ))}

        {students.length === 0 && (
          <div className="px-4 py-6 text-center text-sm text-slate">
            Δεν υπάρχουν ακόμα δηλώσεις μαθητών. Εισήγαγε από Excel για να γεμίσει η λίστα.
          </div>
        )}
      </div>
    </div>
  );
}
