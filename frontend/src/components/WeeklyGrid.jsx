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

export default function WeeklyGrid({ assignments, onCellClick, onCardClick, onDrop }) {
  const handleDragStart = (e, assignment) => {
    e.dataTransfer.setData("assignmentId", String(assignment.id));
  };

  const handleDragOver = (e) => e.preventDefault();

  const handleDrop = (e, day, time) => {
    e.preventDefault();
    const assignmentId = Number(e.dataTransfer.getData("assignmentId"));
    if (assignmentId) onDrop(assignmentId, day, time);
  };

  return (
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

        {/* Assignment cards, overlaid via grid placement */}
        {assignments.map((a) => {
          const dayIndex = DAYS.findIndex((d) => d.key === a.day);
          if (dayIndex === -1) return null;
          const rowStart = timeToRow(a.startTime) + 1;
          const rowSpan = durationRows(a.startTime, a.endTime);
          return (
            <div
              key={a.id}
              draggable
              onDragStart={(e) => handleDragStart(e, a)}
              onClick={(e) => {
                e.stopPropagation();
                onCardClick(a);
              }}
              className="z-10 m-0.5 cursor-grab rounded-md border px-2 py-1 text-xs shadow-sm transition hover:shadow-md active:cursor-grabbing"
              style={{
                gridRow: `${rowStart} / span ${rowSpan}`,
                gridColumn: dayIndex + 2,
                backgroundColor: (a.course?.color || "#2F6F4E") + "22",
                borderColor: a.course?.color || "#2F6F4E",
              }}
            >
              <div className="font-semibold text-ink">{a.course?.title}</div>
              <div className="text-slate">{a.classGroup?.name} · {a.teacher?.fullName}</div>
              <div className="text-slate">{a.room?.name}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
