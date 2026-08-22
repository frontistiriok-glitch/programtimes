import React, { useState } from "react";
import { api } from "../api";
import { keyToGreekDay } from "../dayLabels";
import ClassGroupPicker from "./ClassGroupPicker.jsx";

const emptyStudentForm = { fullName: "", grade: "", parentName: "", phone: "", email: "", notes: "" };

export default function StudentsPanel({ students, classGroups, courses, onChanged }) {
  const [expandedId, setExpandedId] = useState(null);
  const [addForm, setAddForm] = useState(emptyStudentForm);
  const [addError, setAddError] = useState(null);

  const setField = (key) => (e) => setAddForm((f) => ({ ...f, [key]: e.target.value }));

  const handleAddStudent = async (e) => {
    e.preventDefault();
    if (!addForm.fullName.trim()) {
      setAddError("Το ονοματεπώνυμο είναι υποχρεωτικό.");
      return;
    }
    try {
      await api.create("students", {
        fullName: addForm.fullName,
        grade: addForm.grade || null,
        parentName: addForm.parentName || null,
        phone: addForm.phone || null,
        email: addForm.email || null,
        notes: addForm.notes || null,
        courseIds: [],
        unmatchedCourseNames: [],
        unavailableSlots: [],
        classGroupIds: [],
      });
      setAddForm(emptyStudentForm);
      setAddError(null);
      onChanged();
    } catch (err) {
      setAddError("Προέκυψε σφάλμα κατά την προσθήκη.");
    }
  };

  const handleDeleteStudent = async (id) => {
    if (!confirm("Σίγουρα διαγραφή αυτού του μαθητή;")) return;
    await api.remove("students", id);
    if (expandedId === id) setExpandedId(null);
    onChanged();
  };

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

      <form onSubmit={handleAddStudent} className="flex flex-wrap items-end gap-3 border-b border-line bg-paper/50 px-4 py-3">
        <label className="flex flex-col gap-1 text-xs font-medium text-slate">
          Ονοματεπώνυμο *
          <input value={addForm.fullName} onChange={setField("fullName")} className="w-40 rounded-md border border-line px-2 py-1.5 text-sm" />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate">
          Τάξη
          <input value={addForm.grade} onChange={setField("grade")} className="w-28 rounded-md border border-line px-2 py-1.5 text-sm" />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate">
          Γονέας/Κηδεμόνας
          <input value={addForm.parentName} onChange={setField("parentName")} className="w-40 rounded-md border border-line px-2 py-1.5 text-sm" />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate">
          Τηλέφωνο
          <input value={addForm.phone} onChange={setField("phone")} className="w-32 rounded-md border border-line px-2 py-1.5 text-sm" />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate">
          Email
          <input value={addForm.email} onChange={setField("email")} className="w-40 rounded-md border border-line px-2 py-1.5 text-sm" />
        </label>
        <button type="submit" className="rounded-md bg-accent px-4 py-1.5 text-sm font-medium text-white hover:bg-accent/90">
          Προσθήκη μαθητή
        </button>
        {addError && <span className="text-xs text-warn">{addError}</span>}
      </form>

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

              <ClassGroupPicker
                classGroups={classGroups}
                assignedIds={s.classGroupIds || []}
                onChange={(next) => handleAssignClasses(s.id, next)}
              />

              <button
                className="text-xs text-accent underline"
                onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}
              >
                {expandedId === s.id ? "Λιγότερα" : "Περισσότερα"}
              </button>
              <button
                className="text-xs text-warn underline"
                onClick={() => handleDeleteStudent(s.id)}
              >
                Διαγραφή
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
