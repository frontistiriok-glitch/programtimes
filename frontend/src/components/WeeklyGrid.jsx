import React, { useMemo, useState } from "react";
import { colorForTeacher } from "../teacherColor";

const DAYS = [
  { key: "MONDAY", label: "Δευτέρα" },
  { key: "TUESDAY", label: "Τρίτη" },
  { key: "WEDNESDAY", label: "Τετάρτη" },
  { key: "THURSDAY", label: "Πέμπτη" },
  { key: "FRIDAY", label: "Παρασκευή" },
  { key: "SATURDAY", label: "Σάββατο" },
];

// Ώρες 14:00 - 22:00 σε βήματα μισής ώρας
const HOURS = Array.from({ length: 17 }, (_, i) => {
  const totalMinutes = 14 * 60 + i * 30;
  const h = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
  const m = String(totalMinutes % 60).padStart(2, "0");
  return `${h}:${m}`;
});

function toMinutes(time) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function timeToRow(time) {
  const [h, m] = time.split(":").map(Number);
  const minutesFrom14 = (h - 14) * 60 + m;
  return Math.round(minutesFrom14 / 30) + 1; // +1 γιατί η γραμμή 1 είναι το header
}

function durationRows(start, end) {
  const [h1, m1] = start.split(":").map(Number);
  const [h2, m2] = end.split(":").map(Number);
  return Math.round(((h2 * 60 + m2) - (h1 * 60 + m1)) / 30);
}

/**
 * Τοποθετεί τις αναθέσεις μιας ημέρας σε "λωρίδες" (lanes) ώστε όσες συμπίπτουν χρονικά
 * να εμφανίζονται δίπλα-δίπλα αντί να επικαλύπτονται οπτικά.
 */
function layoutLanesForDay(dayAssignments) {
  const sorted = [...dayAssignments].sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));
  const result = [];
  let cluster = [];
  let clusterEnd = -Infinity;

  function flushCluster() {
    if (cluster.length === 0) return;
    const laneEndTimes = [];
    for (const ev of cluster) {
      const start = toMinutes(ev.startTime);
      let laneIndex = laneEndTimes.findIndex((end) => end <= start);
      if (laneIndex === -1) {
        laneIndex = laneEndTimes.length;
        laneEndTimes.push(0);
      }
      laneEndTimes[laneIndex] = toMinutes(ev.endTime);
      result.push({ assignment: ev, lane: laneIndex });
    }
    const totalLanes = laneEndTimes.length;
    for (const item of result.slice(-cluster.length)) item.lanes = totalLanes;
    cluster = [];
  }

  for (const ev of sorted) {
    const start = toMinutes(ev.startTime);
    if (start >= clusterEnd) {
      flushCluster();
      clusterEnd = toMinutes(ev.endTime);
    } else {
      clusterEnd = Math.max(clusterEnd, toMinutes(ev.endTime));
    }
    cluster.push(ev);
  }
  flushCluster();

  return result;
}

export default function WeeklyGrid({ assignments, allAssignments, teachers, students, onCellClick, onCardClick, onDrop }) {
  const [draggingId, setDraggingId] = useState(null);

  const handleDragStart = (e, assignment) => {
    e.dataTransfer.setData("assignmentId", String(assignment.id));
    setDraggingId(assignment.id);
  };
  const handleDragEnd = () => setDraggingId(null);

  const handleDragOver = (e) => e.preventDefault();

  const handleDrop = (e, day, time) => {
    e.preventDefault();
    const assignmentId = e.dataTransfer.getData("assignmentId"); // string (Firestore doc id)
    if (assignmentId) onDrop(assignmentId, day, time);
    setDraggingId(null);
  };

  const teachersInView = teachers.filter((t) => assignments.some((a) => a.teacherId === t.id));

  const laidOutByDay = {};
  for (const day of DAYS) {
    const dayAssignments = assignments.filter((a) => a.day === day.key);
    laidOutByDay[day.key] = layoutLanesForDay(dayAssignments);
  }

  // --- Live έλεγχος "πού μπορεί/δεν μπορεί να μπει" όσο σέρνεις μια κάρτα ---
  // Κόκκινο αν: (α) σύγκρουση με άλλη ανάθεση ίδιου καθηγητή/αίθουσας/τμήματος, ή
  // (β) κάποιος μαθητής του τμήματος έχει δηλώσει μη-διαθεσιμότητα εκείνη την ώρα.
  const draggingAssignment = draggingId ? assignments.find((a) => a.id === draggingId) : null;

  const validityMatrix = useMemo(() => {
    if (!draggingAssignment) return null;
    const conflictSource = allAssignments || assignments;
    const duration = toMinutes(draggingAssignment.endTime) - toMinutes(draggingAssignment.startTime);
    const enrolledStudents = (students || []).filter((s) =>
      (s.classGroupIds || []).includes(draggingAssignment.classGroupId)
    );

    const matrix = {};
    for (const day of DAYS) {
      matrix[day.key] = {};
      for (const time of HOURS) {
        const start = toMinutes(time);
        const end = start + duration;
        let blocked = false;

        for (const other of conflictSource) {
          if (other.id === draggingAssignment.id) continue;
          if (other.day !== day.key) continue;
          const oS = toMinutes(other.startTime), oE = toMinutes(other.endTime);
          if (start >= oE || oS >= end) continue; // δεν επικαλύπτονται
          if (
            other.teacherId === draggingAssignment.teacherId ||
            other.roomId === draggingAssignment.roomId ||
            other.classGroupId === draggingAssignment.classGroupId
          ) {
            blocked = true;
            break;
          }
        }

        if (!blocked) {
          for (const student of enrolledStudents) {
            const clash = (student.unavailableSlots || []).some((slot) => {
              if (slot.day !== day.key) return false;
              const slotStart = toMinutes(slot.time);
              return start < slotStart + 30 && slotStart < end;
            });
            if (clash) { blocked = true; break; }
          }
        }

        matrix[day.key][time] = !blocked;
      }
    }
    return matrix;
  }, [draggingAssignment, assignments, allAssignments, students]);

  return (
    <div className="space-y-2">
      {teachersInView.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-white px-3 py-2 text-xs text-slate">
          <span className="font-medium text-ink">Καθηγητές:</span>
          {teachersInView.map((t) => (
            <span key={t.id} className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colorForTeacher(t) }} />
              {t.fullName}
            </span>
          ))}
        </div>
      )}

      {validityMatrix && (
        <div className="flex items-center gap-4 rounded-lg border border-line bg-white px-3 py-2 text-xs text-slate">
          <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-400" /> Διαθέσιμο</span>
          <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-red-400" /> Μη διαθέσιμο (σύγκρουση ή μαθητής εκτός ωραρίου)</span>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-line bg-white">
        <div
          className="grid min-w-[860px]"
          style={{ gridTemplateColumns: `88px repeat(${DAYS.length}, 1fr)` }}
        >
          {/* Header row */}
          <div className="border-b border-line bg-paper" />
          {DAYS.map((d) => (
            <div
              key={d.key}
              className="border-b border-l border-line bg-paper px-2 py-3 text-center font-display text-sm font-semibold text-ink"
            >
              {d.label}
            </div>
          ))}

          {/* Time gutter + κελιά (με live έγχρωμο validity όσο γίνεται drag) */}
          {HOURS.map((time, rowIdx) => (
            <React.Fragment key={time}>
              <div
                className="border-b border-line px-2 py-2 text-right text-xs text-slate"
                style={{ gridRow: rowIdx + 2 }}
              >
                {time}
              </div>
              {DAYS.map((d) => {
                const status = validityMatrix ? (validityMatrix[d.key][time] ? "valid" : "invalid") : null;
                return (
                  <div
                    key={d.key + time}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, d.key, time)}
                    onClick={() => onCellClick(d.key, time)}
                    className={`relative h-10 cursor-pointer border-b border-l-4 border-line hover:bg-accentSoft/40 ${
                      status === "valid" ? "border-l-emerald-400 bg-emerald-50" :
                      status === "invalid" ? "border-l-red-400 bg-red-50" : "border-l-line"
                    }`}
                    style={{ gridRow: rowIdx + 2, gridColumn: DAYS.indexOf(d) + 2 }}
                  />
                );
              })}
            </React.Fragment>
          ))}

          {/* Κάρτες αναθέσεων */}
          {DAYS.map((day, dayIndex) =>
            laidOutByDay[day.key].map(({ assignment: a, lane, lanes }) => {
              const rowStart = timeToRow(a.startTime) + 1;
              const rowSpan = durationRows(a.startTime, a.endTime);
              const teacherColor = colorForTeacher(a.teacher);
              const widthPct = 100 / lanes;
              return (
                <div
                  key={a.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, a)}
                  onDragEnd={handleDragEnd}
                  onClick={(e) => {
                    e.stopPropagation();
                    onCardClick(a);
                  }}
                  className="z-10 cursor-grab overflow-hidden rounded-md border px-1.5 py-1 text-[11px] leading-tight shadow-sm transition hover:shadow-md active:cursor-grabbing"
                  style={{
                    gridRow: `${rowStart} / span ${rowSpan}`,
                    gridColumn: dayIndex + 2,
                    justifySelf: "start",
                    width: `calc(${widthPct}% - 3px)`,
                    marginLeft: `calc(${widthPct}% * ${lane})`,
                    backgroundColor: teacherColor + "22",
                    borderColor: teacherColor,
                    opacity: draggingId === a.id ? 0.4 : 1,
                  }}
                >
                  <div className="truncate font-semibold text-ink">{a.course?.title}</div>
                  <div className="truncate text-slate">{a.classGroup?.name} · {a.teacher?.fullName}</div>
                  <div className="truncate text-slate">{a.room?.name}</div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
