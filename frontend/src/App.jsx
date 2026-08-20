import React, { useEffect, useState, useMemo } from "react";
import { api } from "./api";
import WeeklyGrid from "./components/WeeklyGrid.jsx";
import Filters from "./components/Filters.jsx";
import AssignmentModal from "./components/AssignmentModal.jsx";
import ExcelButtons from "./components/ExcelButtons.jsx";
import StudentsPanel from "./components/StudentsPanel.jsx";

const emptyForm = { day: "MONDAY", startTime: "16:00", endTime: "17:30" };

export default function App() {
  const [tab, setTab] = useState("schedule"); // "schedule" | "students"

  const [courses, setCourses] = useState([]);
  const [classGroups, setClassGroups] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [students, setStudents] = useState([]);

  const [filters, setFilters] = useState({ classGroupId: "", teacherId: "", roomId: "" });
  const [modalOpen, setModalOpen] = useState(false);
  const [modalForm, setModalForm] = useState(emptyForm);
  const [modalError, setModalError] = useState(null);
  const [warningBanner, setWarningBanner] = useState(null);

  async function refreshAll() {
    const [c, g, t, r, a, s] = await Promise.all([
      api.list("courses"),
      api.list("classgroups"),
      api.list("teachers"),
      api.list("rooms"),
      api.list("assignments"),
      api.list("students"),
    ]);
    setCourses(c); setClassGroups(g); setTeachers(t); setRooms(r); setAssignments(a); setStudents(s);
  }

  useEffect(() => { refreshAll(); }, []);

  const filteredAssignments = useMemo(() => {
    return assignments.filter((a) => {
      if (filters.classGroupId && a.classGroupId !== filters.classGroupId) return false;
      if (filters.teacherId && a.teacherId !== filters.teacherId) return false;
      if (filters.roomId && a.roomId !== filters.roomId) return false;
      return true;
    });
  }, [assignments, filters]);

  const openNewCell = (day, startTime) => {
    setModalError(null);
    setModalForm({ ...emptyForm, day, startTime, endTime: addMinutes(startTime, 90) });
    setModalOpen(true);
  };

  const openExisting = (assignment) => {
    setModalError(null);
    setModalForm({
      id: assignment.id,
      courseId: assignment.courseId,
      classGroupId: assignment.classGroupId,
      teacherId: assignment.teacherId,
      roomId: assignment.roomId,
      day: assignment.day,
      startTime: assignment.startTime,
      endTime: assignment.endTime,
    });
    setModalOpen(true);
  };

  const handleSave = async (form) => {
    const payload = {
      courseId: form.courseId,
      classGroupId: form.classGroupId,
      teacherId: form.teacherId,
      roomId: form.roomId,
      day: form.day,
      startTime: form.startTime,
      endTime: form.endTime,
    };
    try {
      const result = form.id
        ? await api.update("assignments", form.id, payload)
        : await api.create("assignments", payload);

      setModalOpen(false);
      refreshAll();

      if (result.warnings && result.warnings.length > 0) {
        setWarningBanner(result.warnings.map((w) => w.message).join(" "));
      }
    } catch (err) {
      if (err.status === 409) {
        setModalError(err.body.conflicts.map((c) => c.message).join(" "));
      } else {
        setModalError("Προέκυψε σφάλμα κατά την αποθήκευση.");
      }
    }
  };

  const handleDelete = async (id) => {
    await api.remove("assignments", id);
    setModalOpen(false);
    refreshAll();
  };

  const handleDrop = async (assignmentId, day, startTime) => {
    const a = assignments.find((x) => x.id === assignmentId);
    if (!a) return;
    const duration = diffMinutes(a.startTime, a.endTime);
    const newEnd = addMinutes(startTime, duration);
    try {
      const result = await api.update("assignments", assignmentId, {
        courseId: a.courseId, classGroupId: a.classGroupId, teacherId: a.teacherId, roomId: a.roomId,
        day, startTime, endTime: newEnd,
      });
      refreshAll();
      if (result.warnings && result.warnings.length > 0) {
        setWarningBanner(result.warnings.map((w) => w.message).join(" "));
      }
    } catch (err) {
      alert(err.body?.conflicts?.map((c) => c.message).join(" ") || "Σύγκρουση προγράμματος.");
    }
  };

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-line bg-white px-6 py-4">
        <h1 className="font-display text-xl font-semibold text-ink">Πρόγραμμα Φροντιστηρίου</h1>
        <div className="mt-3 flex gap-4 text-sm">
          <button
            onClick={() => setTab("schedule")}
            className={`border-b-2 pb-1 ${tab === "schedule" ? "border-accent font-semibold text-accent" : "border-transparent text-slate"}`}
          >
            Πρόγραμμα
          </button>
          <button
            onClick={() => setTab("students")}
            className={`border-b-2 pb-1 ${tab === "students" ? "border-accent font-semibold text-accent" : "border-transparent text-slate"}`}
          >
            Μαθητές ({students.length})
          </button>
        </div>
      </header>

      {warningBanner && (
        <div className="flex items-center justify-between bg-warn/10 px-6 py-2 text-sm text-warn">
          <span>⚠ {warningBanner}</span>
          <button onClick={() => setWarningBanner(null)} className="underline">κλείσιμο</button>
        </div>
      )}

      <main className="mx-auto max-w-6xl space-y-4 px-6 py-6">
        {tab === "schedule" && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Filters classGroups={classGroups} teachers={teachers} rooms={rooms} filters={filters} setFilters={setFilters} />
              <ExcelButtons onImported={refreshAll} />
            </div>

            <WeeklyGrid
              assignments={filteredAssignments}
              onCellClick={openNewCell}
              onCardClick={openExisting}
              onDrop={handleDrop}
            />
          </>
        )}

        {tab === "students" && (
          <>
            <div className="flex justify-end">
              <ExcelButtons onImported={refreshAll} />
            </div>
            <StudentsPanel students={students} classGroups={classGroups} courses={courses} onChanged={refreshAll} />
          </>
        )}
      </main>

      <AssignmentModal
        open={modalOpen}
        initial={modalForm}
        courses={courses}
        classGroups={classGroups}
        teachers={teachers}
        rooms={rooms}
        error={modalError}
        onSave={handleSave}
        onDelete={handleDelete}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}

function addMinutes(time, minutes) {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const hh = String(Math.floor(total / 60) % 24).padStart(2, "0");
  const mm = String(total % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

function diffMinutes(start, end) {
  const [h1, m1] = start.split(":").map(Number);
  const [h2, m2] = end.split(":").map(Number);
  return (h2 * 60 + m2) - (h1 * 60 + m1);
}
