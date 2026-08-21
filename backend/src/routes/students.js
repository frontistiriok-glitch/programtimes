const express = require("express");

function makeStudentRouter(db) {
  const router = express.Router();
  const col = db.collection("students");

  router.get("/", async (req, res) => {
    const snap = await col.get();
    res.json(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });

  router.post("/", async (req, res) => {
    const ref = await col.add(req.body);
    const doc = await ref.get();
    res.status(201).json({ id: doc.id, ...doc.data() });
  });

  router.put("/:id", async (req, res) => {
    await col.doc(req.params.id).set(req.body, { merge: true });
    const doc = await col.doc(req.params.id).get();
    res.json({ id: doc.id, ...doc.data() });
  });

  // Χειροκίνητη ανάθεση/αλλαγή Τμημάτων (ClassGroups) για έναν μαθητή.
  // Ένας μαθητής μπορεί να ανήκει σε ΠΟΛΛΑ τμήματα ταυτόχρονα (π.χ. μ3 στο Α και στο Β).
  router.put("/:id/assign-classes", async (req, res) => {
    const { classGroupIds } = req.body; // array από ids, [] για αποσύνδεση απ' όλα
    await col.doc(req.params.id).set({ classGroupIds: Array.isArray(classGroupIds) ? classGroupIds : [] }, { merge: true });
    const doc = await col.doc(req.params.id).get();
    res.json({ id: doc.id, ...doc.data() });
  });

  // Επίλυση ενός "unmatched" ονόματος μαθήματος: είτε σύνδεση με υπάρχον courseId,
  // είτε δημιουργία νέου Course από το κείμενο.
  router.post("/:id/resolve-course", async (req, res) => {
    const { unmatchedText, courseId, createNewTitle } = req.body;
    const studentRef = col.doc(req.params.id);
    const studentDoc = await studentRef.get();
    if (!studentDoc.exists) return res.status(404).json({ error: "Ο μαθητής δεν βρέθηκε." });
    const student = studentDoc.data();

    let resolvedCourseId = courseId;
    if (createNewTitle) {
      const newCourseRef = await db.collection("courses").add({ title: createNewTitle });
      resolvedCourseId = newCourseRef.id;
    }

    const courseIds = [...(student.courseIds || []), resolvedCourseId];
    const unmatchedCourseNames = (student.unmatchedCourseNames || []).filter((t) => t !== unmatchedText);

    await studentRef.set({ courseIds, unmatchedCourseNames }, { merge: true });
    const updated = await studentRef.get();
    res.json({ id: updated.id, ...updated.data() });
  });

  router.delete("/:id", async (req, res) => {
    await col.doc(req.params.id).delete();
    res.status(204).end();
  });

  return router;
}

module.exports = { makeStudentRouter };
