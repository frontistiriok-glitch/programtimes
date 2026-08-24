import { auth } from "./firebaseClient";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

// Κάθε αίτημα προς το API επισυνάπτει το τρέχον Firebase Auth ID token (αν υπάρχει
// συνδεδεμένος χρήστης). Το token ανανεώνεται αυτόματα από το Firebase SDK όταν χρειάζεται.
async function authHeaders() {
  const user = auth.currentUser;
  if (!user) return {};
  const token = await user.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

async function request(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(await authHeaders()) };
  const res = await fetch(`${BASE}${path}`, { headers, ...options });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.error || "Σφάλμα αιτήματος");
    err.status = res.status;
    err.body = body;
    throw err;
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  list: (entity) => request(`/${entity}`),
  create: (entity, data) => request(`/${entity}`, { method: "POST", body: JSON.stringify(data) }),
  update: (entity, id, data) => request(`/${entity}/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  remove: (entity, id) => request(`/${entity}/${id}`, { method: "DELETE" }),
  assignStudentClasses: (studentId, classGroupIds) =>
    request(`/students/${studentId}/assign-classes`, { method: "PUT", body: JSON.stringify({ classGroupIds }) }),
  resolveStudentCourse: (studentId, payload) =>
    request(`/students/${studentId}/resolve-course`, { method: "POST", body: JSON.stringify(payload) }),

  // Excel export: ΔΕΝ μπορεί να είναι απλό <a href> πλέον, αφού το endpoint είναι
  // προστατευμένο - χρειάζεται το Authorization header. Κατεβάζουμε το αρχείο μέσω fetch
  // και ενεργοποιούμε το download προγραμματιστικά.
  downloadExcel: async () => {
    const headers = await authHeaders();
    const res = await fetch(`${BASE}/export/excel`, { headers });
    if (!res.ok) throw new Error("Αποτυχία εξαγωγής Excel");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "programma.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  },

  importExcelAnalyze: async (file) => {
    const headers = await authHeaders();
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${BASE}/import/excel/analyze`, { method: "POST", headers, body: form });
    return res.json();
  },
  importExcelCommit: async (file, resolutions) => {
    const headers = await authHeaders();
    const form = new FormData();
    form.append("file", file);
    form.append("resolutions", JSON.stringify(resolutions));
    const res = await fetch(`${BASE}/import/excel/commit`, { method: "POST", headers, body: form });
    return res.json();
  },
};
