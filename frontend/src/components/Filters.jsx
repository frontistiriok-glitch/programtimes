import React from "react";

export default function Filters({ classGroups, teachers, rooms, filters, setFilters }) {
  const Select = ({ label, value, onChange, options }) => (
    <label className="flex flex-col gap-1 text-xs font-medium text-slate">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-line bg-white px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
      >
        <option value="">Όλα</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>{o.label}</option>
        ))}
      </select>
    </label>
  );

  return (
    <div className="flex flex-wrap gap-4 rounded-lg border border-line bg-white p-4">
      <Select
        label="Τμήμα"
        value={filters.classGroupId}
        onChange={(v) => setFilters((f) => ({ ...f, classGroupId: v }))}
        options={classGroups.map((c) => ({ id: c.id, label: c.name }))}
      />
      <Select
        label="Καθηγητής"
        value={filters.teacherId}
        onChange={(v) => setFilters((f) => ({ ...f, teacherId: v }))}
        options={teachers.map((t) => ({ id: t.id, label: t.fullName }))}
      />
      <Select
        label="Αίθουσα"
        value={filters.roomId}
        onChange={(v) => setFilters((f) => ({ ...f, roomId: v }))}
        options={rooms.map((r) => ({ id: r.id, label: r.name }))}
      />
    </div>
  );
}
