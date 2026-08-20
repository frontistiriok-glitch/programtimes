const BASE = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
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
  assignStudentClass: (studentId, classGroupId) =>
    request(`/students/${studentId}/assign-class`, { method: "PUT", body: JSON.stringify({ classGroupId }) }),
  resolveStudentCourse: (studentId, payload) =>
    request(`/students/${studentId}/resolve-course`, { method: "POST", body: JSON.stringify(payload) }),
  exportExcelUrl: () => `${BASE}/export/excel`,
  importExcel: async (file) => {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${BASE}/import/excel`, { method: "POST", body: form });
    return res.json();
  },
};
