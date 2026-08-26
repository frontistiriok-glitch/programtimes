const express = require("express");
const multer = require("multer");
const XLSX = require("xlsx");
const { findConflicts } = require("../conflictCheck");
const { matchCoursesFromText, stripAccentsLower } = require("../fuzzyMatch");
const { parseUnavailableSlots, keyToGreekDay } = require("../dayMapping");

const upload = multer({ storage: multer.memoryStorage() });

function normalizeKey(s) {
  return stripAccentsLower(String(s || "").trim());
}

// Επιστρέφει την πρώτη μη-κενή τιμή ενός row για μια λίστα πιθανών ονομάτων στήλης
// (π.χ. ελληνικό header ή αγγλικό fallback).
function pick(row, keys) {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== "") return row[k];
  }
  return undefined;
}

// Εντοπίζει ονόματα που εμφανίζονται ΠΑΝΩ ΑΠΟ ΜΙΑ ΦΟΡΑ μέσα στο ίδιο sheet του αρχείου.
function findDuplicateGroups(rows, nameKeys) {
  const groups = {};
  rows.forEach((row, index) => {
    const name = pick(row, nameKeys);
    if (!name) return;
    const key = normalizeKey(name);
    (groups[key] = groups[key] || []).push({ index, row, name });
  });
  return Object.entries(groups)
    .filter(([, arr]) => arr.length > 1)
    .map(([key, arr]) => ({ key, name: arr[0].name, candidates: arr.map(({ index, row }) => ({ index, ...row })) }));
}

// Μειώνει τη λίστα rows σε ΜΙΑ γραμμή ανά όνομα, με βάση τις επιλογές του χρήστη.
function resolveDuplicateRows(rows, nameKeys, resolutions = {}) {
  const groups = {};
  const noNameRows = [];
  rows.forEach((row, index) => {
    const name = pick(row, nameKeys);
    if (!name) { noNameRows.push(row); return; }
    const key = normalizeKey(name);
    (groups[key] = groups[key] || []).push({ index, row });
  });
  const result = [...noNameRows];
  for (const [key, arr] of Object.entries(groups)) {
    if (arr.length === 1) { result.push(arr[0].row); continue; }
    const chosenIndex = resolutions[key];
    const chosen = arr.find((r) => r.index === chosenIndex) || arr[0];
    result.push(chosen.row);
  }
  return result;
}

// Στέλνει μια λίστα write-operations (set/delete) στο Firestore μέσω batch(es).
// - ΚΑΘΕ chunk (έως 450 operations, με ασφάλεια κάτω από το όριο 500 του Firestore) είναι
//   ατομικό: είτε περνάνε ΟΛΕΣ οι αλλαγές του chunk, είτε ΚΑΜΙΑ.
// - Ένα batch.commit() είναι ΕΝΑ αίτημα δικτύου για έως 450 αλλαγές, αντί για εκατοντάδες
//   ξεχωριστά αιτήματα -- αυτό λύνει και το πρόβλημα ταχύτητας (timeout σε serverless function
//   όταν το αρχείο είναι μεγάλο).
async function commitWritesInChunks(db, writes) {
  const CHUNK_SIZE = 450;
  for (let i = 0; i < writes.length; i += CHUNK_SIZE) {
    const chunk = writes.slice(i, i + CHUNK_SIZE);
    const batch = db.batch();
    for (const w of chunk) {
      if (w.type === "delete") batch.delete(w.ref);
      else batch.set(w.ref, w.data, w.options || {});
    }
    await batch.commit();
  }
}

function makeExcelRouter(db) {
  const router = express.Router();

  async function getAll(collectionName) {
    const snap = await db.collection(collectionName).get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }

  // ---------- EXPORT ----------
  router.get("/export/excel", async (req, res) => {
    const [courses, classGroups, teachers, rooms, assignmentsRaw, students] = await Promise.all([
      getAll("courses"),
      getAll("classGroups"),
      getAll("teachers"),
      getAll("rooms"),
      getAll("assignments"),
      getAll("students"),
    ]);

    const byId = (list) => Object.fromEntries(list.map((x) => [x.id, x]));
    const cById = byId(courses), gById = byId(classGroups), tById = byId(teachers), rById = byId(rooms);

    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
      courses.map((c) => ({ id: c.id, title: c.title, category: c.category || "" }))
    ), "Courses");

    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
      classGroups.map((g) => ({ id: g.id, name: g.name, grade: g.grade || "" }))
    ), "ClassGroups");

    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
      teachers.map((t) => ({ id: t.id, fullName: t.fullName, specialty: t.specialty || "" }))
    ), "Teachers");

    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
      rooms.map((r) => ({ id: r.id, name: r.name, capacity: r.capacity || "" }))
    ), "Rooms");

    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
      assignmentsRaw.map((a) => ({
        id: a.id,
        course: cById[a.courseId]?.title || "",
        classGroup: gById[a.classGroupId]?.name || "",
        teacher: tById[a.teacherId]?.fullName || "",
        room: rById[a.roomId]?.name || "",
        day: a.day,
        startTime: a.startTime,
        endTime: a.endTime,
      }))
    ), "Assignments");

    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
      students.map((s) => ({
        id: s.id,
        "Ονοματεπώνυμο": s.fullName,
        "Τάξη": s.grade || "",
        "Γονέας/Κηδεμόνας": s.parentName || "",
        "Τηλέφωνο": s.phone || "",
        "Email": s.email || "",
        "Μαθήματα": (s.courseIds || []).map((cid) => cById[cid]?.title).filter(Boolean).join(", "),
        "Μη διαθέσιμες ώρες": (s.unavailableSlots || [])
          .map((slot) => `${keyToGreekDay(slot.day)} ${slot.time}`)
          .join(", "),
        "Τμήματα": (s.classGroupIds || []).map((gid) => gById[gid]?.name).filter(Boolean).join(", "),
        "Σημειώσεις": s.notes || "",
      }))
    ), "Students");

    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    res.setHeader("Content-Disposition", "attachment; filename=programma.xlsx");
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(buffer);
  });

  // ---------- ANALYZE (βήμα 1: μόνο ανάγνωση, καμία εγγραφή) ----------
  router.post("/import/excel/analyze", upload.single("file"), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "Δεν εστάλη αρχείο." });
    const wb = XLSX.read(req.file.buffer, { type: "buffer" });

    const classGroupsSheet = wb.Sheets["ClassGroups"];
    const studentSheet = wb.Sheets["Μαθητές"] || wb.Sheets["Students"];

    const classGroupRows = classGroupsSheet ? XLSX.utils.sheet_to_json(classGroupsSheet) : [];
    const studentRows = studentSheet ? XLSX.utils.sheet_to_json(studentSheet) : [];

    res.json({
      hasClassGroupsSheet: !!classGroupsSheet,
      hasStudentsSheet: !!studentSheet,
      hasAssignmentsSheet: !!wb.Sheets["Assignments"],
      classGroupDuplicates: findDuplicateGroups(classGroupRows, ["name"]),
      studentDuplicates: findDuplicateGroups(studentRows, ["Ονοματεπώνυμο", "fullName"]),
    });
  });

  // ---------- COMMIT (βήμα 2: πραγματική εισαγωγή, μέσω batch writes) ----------
  router.post("/import/excel/commit", upload.single("file"), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "Δεν εστάλη αρχείο." });

    let resolutions = { classGroups: {}, students: {} };
    if (req.body.resolutions) {
      try { resolutions = JSON.parse(req.body.resolutions); } catch { /* defaults */ }
    }

    const wb = XLSX.read(req.file.buffer, { type: "buffer" });
    const report = { inserted: {}, updated: {}, rejected: [] };

    // Γενικό upsert για απλές οντότητες. Χτίζει τη λίστα writes και τα στέλνει ΟΛΑ μαζί
    // σε ένα batch, αντί να κάνει await ένα-ένα (πιο γρήγορο + ατομικό).
    async function upsertSheet(sheetName, collectionName, nameField, mapRow, dedupResolutions) {
      const sheet = wb.Sheets[sheetName];
      if (!sheet) return;
      const rawRows = XLSX.utils.sheet_to_json(sheet);
      const rows = dedupResolutions
        ? resolveDuplicateRows(rawRows, [nameField], dedupResolutions)
        : rawRows;

      const existing = await getAll(collectionName);
      const existingByName = new Map(existing.map((e) => [normalizeKey(e[nameField]), e.id]));

      const col = db.collection(collectionName);
      const writes = [];
      let inserted = 0, updated = 0;

      for (const row of rows) {
        const data = mapRow(row);
        const nameVal = row[nameField];
        const existingId = row.id ? String(row.id) : (nameVal ? existingByName.get(normalizeKey(nameVal)) : undefined);
        if (existingId) {
          writes.push({ type: "set", ref: col.doc(existingId), data, options: { merge: true } });
          updated++;
        } else {
          const newRef = col.doc(); // auto-id, χωρίς extra round-trip
          writes.push({ type: "set", ref: newRef, data, options: {} });
          if (nameVal) existingByName.set(normalizeKey(nameVal), newRef.id);
          inserted++;
        }
      }

      await commitWritesInChunks(db, writes);
      report.inserted[sheetName] = inserted;
      report.updated[sheetName] = updated;
    }

    await upsertSheet("Courses", "courses", "title", (r) => ({ title: r.title, category: r.category || null }));
    await upsertSheet("ClassGroups", "classGroups", "name", (r) => ({ name: r.name, grade: r.grade || null }), resolutions.classGroups);
    await upsertSheet("Teachers", "teachers", "fullName", (r) => ({ fullName: r.fullName, specialty: r.specialty || null }));
    await upsertSheet("Rooms", "rooms", "name", (r) => ({ name: r.name, capacity: Number(r.capacity) || null }));

    // --- Assignments: ΠΛΗΡΗΣ ΑΝΤΙΚΑΤΑΣΤΑΣΗ, ΑΤΟΜΙΚΑ ---
    // Οι διαγραφές των παλιών ΚΑΙ οι εγγραφές των νέων μπαίνουν στο ΙΔΙΟ batch: είτε
    // περνάνε όλες μαζί (πρόγραμμα ενημερωμένο), είτε καμία (πρόγραμμα όπως ήταν πριν).
    // Έτσι δεν καταλήγει ποτέ σε "μισοτελειωμένη" κατάσταση.
    const assignSheet = wb.Sheets["Assignments"];
    if (assignSheet) {
      const assignmentsCol = db.collection("assignments");
      const oldAssignmentsSnap = await assignmentsCol.get();
      const writes = oldAssignmentsSnap.docs.map((d) => ({ type: "delete", ref: d.ref }));
      report.deleted = { Assignments: oldAssignmentsSnap.size };

      const rows = XLSX.utils.sheet_to_json(assignSheet);
      const [courses, classGroups, teachers, rooms] = await Promise.all([
        getAll("courses"), getAll("classGroups"), getAll("teachers"), getAll("rooms"),
      ]);
      const existingAssignments = []; // μόνο για conflict-check μέσα στο ίδιο αρχείο
      const findByName = (list, key, name) => list.find((x) => x[key] === name);
      let insertedCount = 0;

      for (const row of rows) {
        const course = findByName(courses, "title", row.course);
        const classGroup = findByName(classGroups, "name", row.classGroup);
        const teacher = findByName(teachers, "fullName", row.teacher);
        const room = findByName(rooms, "name", row.room);

        if (!course || !classGroup || !teacher || !room) {
          report.rejected.push({ row, reason: "Δεν βρέθηκε αντίστοιχο μάθημα/τμήμα/καθηγητής/αίθουσα." });
          continue;
        }

        const candidate = {
          day: row.day, startTime: String(row.startTime), endTime: String(row.endTime),
          teacherId: teacher.id, roomId: room.id, classGroupId: classGroup.id,
        };
        const conflicts = findConflicts(candidate, existingAssignments);
        if (conflicts.length > 0) {
          report.rejected.push({ row, reason: "Σύγκρουση προγράμματος.", conflicts });
          continue;
        }

        const newRef = assignmentsCol.doc();
        const data = { ...candidate, courseId: course.id };
        writes.push({ type: "set", ref: newRef, data, options: {} });
        existingAssignments.push({ id: newRef.id, ...data });
        insertedCount++;
      }

      await commitWritesInChunks(db, writes);
      report.inserted["Assignments"] = insertedCount;
    }

    // --- Students ---
    const studentSheet = wb.Sheets["Μαθητές"] || wb.Sheets["Students"];
    if (studentSheet) {
      const rawRows = XLSX.utils.sheet_to_json(studentSheet);
      const rows = resolveDuplicateRows(rawRows, ["Ονοματεπώνυμο", "fullName"], resolutions.students);

      const courses = await getAll("courses");
      const classGroups = await getAll("classGroups");
      const existingStudents = await getAll("students");
      const studentsCol = db.collection("students");

      const writes = [];
      let inserted = 0, updated = 0, unmatchedTotal = 0, unmatchedClassGroups = 0;

      for (const row of rows) {
        const fullName = row["Ονοματεπώνυμο"] || row.fullName;
        if (!fullName) continue;

        const coursesText = row["Μαθήματα"] || row.courses || "";
        const { matched, unmatched } = matchCoursesFromText(coursesText, courses);
        unmatchedTotal += unmatched.length;

        const unavailableSlots = parseUnavailableSlots(row["Μη διαθέσιμες ώρες"] || row.unavailableSlots || "");

        const classGroupsText = row["Τμήματα"] || row["Τμήμα"] || row.classGroups || "";
        const classGroupNames = String(classGroupsText).split(",").map((s) => s.trim()).filter(Boolean);
        const classGroupIds = [];
        for (const name of classGroupNames) {
          const found = classGroups.find((g) => g.name === name);
          if (found) classGroupIds.push(found.id);
          else unmatchedClassGroups++;
        }

        const studentData = {
          fullName,
          grade: row["Τάξη"] || row.grade || null,
          parentName: row["Γονέας/Κηδεμόνας"] || row.parentName || null,
          phone: row["Τηλέφωνο"] ? String(row["Τηλέφωνο"]) : null,
          email: row["Email"] || row.email || null,
          courseIds: matched.map((m) => m.id),
          unmatchedCourseNames: unmatched,
          unavailableSlots,
          notes: row["Σημειώσεις"] || row.notes || null,
          classGroupIds,
        };

        const existing = existingStudents.find((s) => normalizeKey(s.fullName) === normalizeKey(fullName));
        if (existing) {
          const mergedClassGroupIds = classGroupIds.length > 0 ? classGroupIds : (existing.classGroupIds || []);
          writes.push({
            type: "set",
            ref: studentsCol.doc(existing.id),
            data: { ...studentData, classGroupIds: mergedClassGroupIds },
            options: { merge: true },
          });
          updated++;
        } else {
          writes.push({ type: "set", ref: studentsCol.doc(), data: studentData, options: {} });
          inserted++;
        }
      }

      await commitWritesInChunks(db, writes);
      report.inserted["Students"] = inserted;
      report.updated["Students"] = updated;
      report.studentsNeedingReview = unmatchedTotal;
      if (unmatchedClassGroups > 0) report.classGroupsNotFound = unmatchedClassGroups;
    }

    res.json(report);
  });

  return router;
}

module.exports = { makeExcelRouter };
