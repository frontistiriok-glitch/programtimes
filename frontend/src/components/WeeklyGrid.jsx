import React from "react";

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

const FALLBACK_PALETTE = ["#2F6F4E", "#B4472B", "#4C6EF5", "#AE3EC9", "#E8590C", "#0CA678", "#F08C00", "#1971C2"];

function colorForTeacher(teacher) {
  if (teacher?.color) return teacher.color;
  if (!teacher?.id) return "#2F6F4E";
  let hash = 0;
  for (const ch of teacher.id) hash = (hash * 31 + ch.charCodeAt(0)) % FALLBACK_PALETTE.length;
  return FALLBACK_PALETTE[hash];
}

/**
 * Τοποθετεί τις αναθέσεις μιας ημέρας σε "λωρίδες" (lanes) ώστε όσες συμπίπτουν χρονικά
 * να εμφανίζονται δίπλα-δίπλα (πλάι-πλάι) αντί να επικαλύπτονται οπτικά.
 * Κλασικός αλγόριθμος interval-graph coloring πάνω σε συνδεδεμένα "clusters" επικάλυψης.
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

export default function WeeklyGrid({ assignments, teachers, onCellClick, onCardClick, onDrop }) {
  const handleDragStart = (e, assignment) => {
    e.dataTransfer.setData("assignmentId", String(assignment.id));
  };

  const handleDragOver = (e) => e.preventDefault();

  const handleDrop = (e, day, time) => {
    e.preventDefault();
    const assignmentId = e.dataTransfer.getData("assignmentId"); // string (Firestore doc id) - ΟΧΙ Number()
    if (assignmentId) onDrop(assignmentId, day, time);
  };

  const teachersInView = teachers.filter((t) => assignments.some((a) => a.teacherId === t.id));

  // Layout ανά ημέρα, ώστε ταυτόχρονες αναθέσεις να παίρνουν lane/lanes και να χωράνε δίπλα-δίπλα.
  const laidOutByDay = {};
  for (const day of DAYS) {
    const dayAssignments = assignments.filter((a) => a.day === day.key);
    laidOutByDay[day.key] = layoutLanesForDay(dayAssignments);
  }

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

          {/* Time gutter */}
          {HOURS.map((time, rowIdx) => (
            <React.Fragment key={time}>
              <div
                className="border-b border-line px-2 py-2 text-right text-xs text-slate"
                style={{ gridRow: rowIdx + 2 }}
              >
                {time}
              </div>
              {DAYS.map((d) => (
                <div
                  key={d.key + time}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, d.key, time)}
                  onClick={() => onCellClick(d.key, time)}
                  className="relative h-10 cursor-pointer border-b border-l border-line hover:bg-accentSoft/40"
                  style={{ gridRow: rowIdx + 2, gridColumn: DAYS.indexOf(d) + 2 }}
                />
              ))}
            </React.Fragment>
          ))}

          {/* Assignment cards: κάθε grid cell (ημέρα) μπορεί να περιέχει πολλαπλές κάρτες σε lanes */}
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
