import React, { useRef, useState } from "react";
import { api } from "../api";

export default function ExcelButtons({ onImported }) {
  const fileInput = useRef(null);
  const [report, setReport] = useState(null);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await api.importExcel(file);
    setReport(result);
    onImported();
    e.target.value = "";
  };

  return (
    <div className="flex items-center gap-3">
      <a
        href={api.exportExcelUrl()}
        className="rounded-md border border-line bg-white px-3 py-2 text-sm font-medium text-ink hover:bg-paper"
      >
        Εξαγωγή σε Excel
      </a>
      <button
        onClick={() => fileInput.current?.click()}
        className="rounded-md border border-line bg-white px-3 py-2 text-sm font-medium text-ink hover:bg-paper"
      >
        Εισαγωγή από Excel
      </button>
      <input ref={fileInput} type="file" accept=".xlsx" className="hidden" onChange={handleFile} />

      {report && (
        <div className="text-xs text-slate">
          Εισήχθησαν: {Object.values(report.inserted || {}).reduce((a, b) => a + b, 0)} ·
          Απορρίφθηκαν: {report.rejected?.length || 0}
          {report.studentsNeedingReview > 0 && (
            <> · <span className="text-warn">{report.studentsNeedingReview} μαθήματα μαθητών χρειάζονται χειροκίνητη επιβεβαίωση (καρτέλα Μαθητές)</span></>
          )}
          <button onClick={() => setReport(null)} className="ml-2 underline">κλείσιμο</button>
        </div>
      )}
    </div>
  );
}
