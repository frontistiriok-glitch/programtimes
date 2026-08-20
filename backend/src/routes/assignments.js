const express = require("express");
const { findConflicts, findStudentAvailabilityWarnings } = require("../conflictCheck");

function makeAssignmentRouter(db) {
  const router = express.Router();
  const assignmentsCol = db.collection("assignments");
  const studentsCol = db.collection("students");

  async function getAllAssignments() {
    const snap = await assignmentsCol.get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }

  async function getAllStudents() {
    const snap = await studentsCol.get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }

  // Επισυνάπτει τα σχετικά έγγραφα (course/classGroup/teacher/room) σε κάθε assignment,
  // ώστε το frontend να μη χρειάζεται να κάνει join.
  async function hydrate(assignments) {
    const [coursesSnap, classGroupsSnap, teachersSnap, roomsSnap] = await Promise.all([
      db.collection("courses").get(),
      db.collection("classGroups").get(),
      db.collection("teachers").get(),
      db.collection("rooms").get(),
    ]);
    const byId = (snap) => Object.fromEntries(snap.docs.map((d) => [d.id, { id: d.id, ...d.data() }]));
    const courses = byId(coursesSnap);
    const classGroups = byId(classGroupsSnap);
    const teachers = byId(teachersSnap);
    const rooms = byId(roomsSnap);

    return assignments.map((a) => ({
      ...a,
      course: courses[a.courseId] || null,
      classGroup: classGroups[a.classGroupId] || null,
      teacher: teachers[a.teacherId] || null,
      room: rooms[a.roomId] || null,
    }));
  }

  router.get("/", async (req, res) => {
    const items = await getAllAssignments();
    res.json(await hydrate(items));
  });

  router.post("/", async (req, res) => {
    const { courseId, classGroupId, teacherId, roomId, day, startTime, endTime } = req.body;
    const candidate = { courseId, classGroupId, teacherId, roomId, day, startTime, endTime };

    const [existing, students] = await Promise.all([getAllAssignments(), getAllStudents()]);
    const conflicts = findConflicts(candidate, existing);
    if (conflicts.length > 0) {
      return res.status(409).json({ error: "CONFLICT", conflicts });
    }

    const ref = await assignmentsCol.add(candidate);
    const warnings = findStudentAvailabilityWarnings(candidate, students);
    const doc = await ref.get();
    res.status(201).json({ id: doc.id, ...doc.data(), warnings });
  });

  router.put("/:id", async (req, res) => {
    const id = req.params.id;
    const { courseId, classGroupId, teacherId, roomId, day, startTime, endTime } = req.body;
    const candidate = { courseId, classGroupId, teacherId, roomId, day, startTime, endTime, excludeId: id };

    const [existing, students] = await Promise.all([getAllAssignments(), getAllStudents()]);
    const conflicts = findConflicts(candidate, existing);
    if (conflicts.length > 0) {
      return res.status(409).json({ error: "CONFLICT", conflicts });
    }

    await assignmentsCol.doc(id).set(
      { courseId, classGroupId, teacherId, roomId, day, startTime, endTime },
      { merge: true }
    );
    const warnings = findStudentAvailabilityWarnings(candidate, students);
    const doc = await assignmentsCol.doc(id).get();
    res.json({ id: doc.id, ...doc.data(), warnings });
  });

  router.delete("/:id", async (req, res) => {
    await assignmentsCol.doc(req.params.id).delete();
    res.status(204).end();
  });

  return router;
}

module.exports = { makeAssignmentRouter };
