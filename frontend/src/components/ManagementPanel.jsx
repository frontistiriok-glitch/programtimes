import React, { useState } from "react";
import EntityManager from "./EntityManager.jsx";

const SECTIONS = [
  {
    key: "courses",
    endpoint: "courses",
    title: "Μαθήματα",
    fields: [
      { key: "title", label: "Τίτλος" },
      { key: "category", label: "Κατηγορία", optional: true },
      { key: "color", label: "Χρώμα", type: "color", optional: true },
    ],
  },
  {
    key: "teachers",
    endpoint: "teachers",
    title: "Καθηγητές",
    fields: [
      { key: "fullName", label: "Ονοματεπώνυμο" },
      { key: "specialty", label: "Ειδικότητα", optional: true },
      { key: "color", label: "Χρώμα", type: "color", optional: true },
    ],
  },
  {
    key: "rooms",
    endpoint: "rooms",
    title: "Αίθουσες",
    fields: [
      { key: "name", label: "Όνομα/Αριθμός" },
      { key: "capacity", label: "Χωρητικότητα", type: "number", optional: true },
    ],
  },
  {
    key: "classgroups",
    endpoint: "classgroups",
    title: "Τμήματα",
    fields: [
      { key: "name", label: "Όνομα Τμήματος" },
      { key: "grade", label: "Τάξη", optional: true },
      { key: "color", label: "Χρώμα", type: "color", optional: true },
    ],
  },
];

export default function ManagementPanel({ data, onChanged }) {
  const [activeSection, setActiveSection] = useState(SECTIONS[0].key);
  const section = SECTIONS.find((s) => s.key === activeSection);

  return (
    <div className="space-y-4">
      <div className="flex gap-2 rounded-lg border border-line bg-white p-1">
        {SECTIONS.map((s) => (
          <button
            key={s.key}
            onClick={() => setActiveSection(s.key)}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${
              activeSection === s.key ? "bg-accent text-white" : "text-slate hover:bg-paper"
            }`}
          >
            {s.title}
          </button>
        ))}
      </div>

      <EntityManager
        key={section.key}
        entityEndpoint={section.endpoint}
        title={section.title}
        items={data[section.key] || []}
        fields={section.fields}
        onChanged={onChanged}
      />
    </div>
  );
}
