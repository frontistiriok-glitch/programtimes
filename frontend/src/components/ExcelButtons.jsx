import React, { useRef, useState } from "react";
import { api } from "../api";
import DuplicateResolutionModal from "./DuplicateResolutionModal.jsx";

export default function ExcelButtons({ onImported }) {
  const fileInput = useRef(null);
  const [report, setReport] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);
  const [duplicateData, setDuplicateData] = useState(null); // { classGroupDuplicates, studentDuplicates, hasAssignmentsSheet }

  const handleExport = async () => {
    setExporting(true);
    try {
      await api.downloadExcel();
    } catch (err) {
      alert("Προέκυψε σφάλμα κατά την εξαγωγή.");
    } finally {
      setExporting(false);
    }
  };

  const runCommit = async (file, resolutions) => {
    const result = await api.importExcelCommit(file, resolutions);
    setReport(result);
    onImported();
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    const analysis = await api.importExcelAnalyze(file);

    if (analysis.hasAssignmentsSheet) {
      if (!confirm("Προσοχή: αν το αρχείο περιέχει sheet \"Assignments\", ΟΛΟ το τρέχον ωρολόγιο πρόγραμμα θα διαγραφεί και θα αντικατασταθεί από τις ώρες του αρχείου. Συνέχεια;")) {
        return;
      }
    }

    const hasDuplicates = (analysis.classGroupDuplicates?.length || 0) > 0 || (analysis.studentDuplicates?.length || 0) > 0;
    if (hasDuplicates) {
      setPendingFile(file);
      setDuplicateData(analysis);
      return; // περιμένουμε την επιλογή του χρήστη στο modal
    }

    await runCommit(file, { classGroups: {}, students: {} });
  };

  const handleConfirmDuplicates = async (resolutions) => {
    const file = pendingFile;
    setPendingFile(null);
    setDuplicateData(null);
    await runCommit(file, resolutions);
  };

  const handleCancelDuplicates = () => {
    setPendingFile(null);
    setDuplicateData(null);
  };

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleExport}
        disabled={exporting}
        className="rounded-md border border-line bg-white px-3 py-2 text-sm font-medium text-ink hover:bg-paper disabled:opacity-60"
      >
        {exporting ? "Εξαγωγή..." : "Εξαγωγή σε Excel"}
      </button>
      <button
        onClick={() => fileInput.current?.click()}
        className="rounded-md border border-line bg-white px-3 py-2 text-sm font-medium text-ink hover:bg-paper"
      >
        Εισαγωγή από Excel
      </button>
      <input ref={fileInput} type="file" accept=".xlsx" className="hidden" onChange={handleFile} />

      <DuplicateResolutionModal
        open={!!duplicateData}
        classGroupDuplicates={duplicateData?.classGroupDuplicates}
        studentDuplicates={duplicateData?.studentDuplicates}
        onConfirm={handleConfirmDuplicates}
        onCancel={handleCancelDuplicates}
      />

      {report && (
        <div className="text-xs text-slate">
          Εισήχθησαν: {Object.values(report.inserted || {}).reduce((a, b) => a + b, 0)} ·
          Απορρίφθηκαν: {report.rejected?.length || 0}
          {report.deleted?.Assignments > 0 && (
            <> · Διαγράφηκαν {report.deleted.Assignments} παλιές αναθέσεις προγράμματος</>
          )}
          {report.studentsNeedingReview > 0 && (
            <> · <span className="text-warn">{report.studentsNeedingReview} μαθήματα μαθητών χρειάζονται χειροκίνητη επιβεβαίωση (καρτέλα Μαθητές)</span></>
          )}
          <button onClick={() => setReport(null)} className="ml-2 underline">κλείσιμο</button>
        </div>
      )}
    </div>
  );
}
