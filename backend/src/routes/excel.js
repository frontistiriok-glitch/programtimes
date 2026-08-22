const express = require("express");
const multer = require("multer");
const XLSX = require("xlsx");
const { findConflicts } = require("../conflictCheck");
const { matchCoursesFromText, stripAccentsLower } = require("../fuzzyMatch");
const { parseUnavailableSlots, keyToGreekDay } = require("../dayMapping");

const upload = multer({ storage: multer.memoryStorage() });

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

    // Μαθητές: αναπαράγει τη μορφή της φόρμας δήλωσης γονέων
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

  // ---------- IMPORT ----------
  router.post("/import/excel", upload.single("file"), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "Δεν εστάλη αρχείο." });

    const wb = XLSX.read(req.file.buffer, { type: "buffer" });
    const report = { inserted: {}, updated: {}, rejected: [] };

    async function upsertSheet(sheetName, collectionName, mapRow) {
      const sheet = wb.Sheets[sheetName];
      if (!sheet) return;
      const rows = XLSX.utils.sheet_to_json(sheet);
      let inserted = 0, updated = 0;
      const col = db.collection(collectionName);
      for (const row of rows) {
        const data = mapRow(row);
        if (row.id) {
          await col.doc(String(row.id)).set(data, { merge: true });
          updated++;
        } else {
          await col.add(data);
          inserted++;
        }
      }
      report.inserted[sheetName] = inserted;
      report.updated[sheetName] = updated;
    }

    await upsertSheet("Courses", "courses", (r) => ({ title: r.title, category: r.category || null }));
    await upsertSheet("ClassGroups", "classGroups", (r) => ({ name: r.name, grade: r.grade || null }));
    await upsertSheet("Teachers", "teachers", (r) => ({ fullName: r.fullName, specialty: r.specialty || null }));
    await upsertSheet("Rooms", "rooms", (r) => ({ name: r.name, capacity: Number(r.capacity) || null }));

    // --- Assignments: ΠΛΗΡΗΣ ΑΝΤΙΚΑΤΑΣΤΑΣΗ. Το ωρολόγιο πρόγραμμα (Assignments) δεν κάνει
    //     merge/upsert σαν τις άλλες οντότητες: όταν το αρχείο περιέχει sheet "Assignments",
    //     ΟΛΕΣ οι υπάρχουσες αναθέσεις διαγράφονται πρώτα, και μετά μπαίνουν από την αρχή
    //     όσες περιγράφει το sheet. Έτσι το import αντικατοπτρίζει ακριβώς το αρχείο, χωρίς
    //     να αφήνει πίσω παλιές ώρες που τυχόν αφαιρέθηκαν από το Excel.
    const assignSheet = wb.Sheets["Assignments"];
    if (assignSheet) {
      const oldAssignmentsSnap = await db.collection("assignments").get();
      await Promise.all(oldAssignmentsSnap.docs.map((d) => d.ref.delete()));
      report.deleted = { Assignments: oldAssignmentsSnap.size };

      const rows = XLSX.utils.sheet_to_json(assignSheet);
      const [courses, classGroups, teachers, rooms] = await Promise.all([
        getAll("courses"), getAll("classGroups"), getAll("teachers"), getAll("rooms"),
      ]);
      const existingAssignments = []; // ξεκινάει άδειο αφού μόλις διαγράψαμε τα πάντα
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

        const ref = await db.collection("assignments").add({ ...candidate, courseId: course.id });
        existingAssignments.push({ id: ref.id, ...candidate, courseId: course.id });
        insertedCount++;
      }
      report.inserted["Assignments"] = insertedCount;
    }

    // --- Students: parsing "Μαθήματα" (fuzzy match) + "Μη διαθέσιμες ώρες" (day/time parse)
    //     + "Τμήματα" (πολλαπλά, χωρισμένα με κόμμα, match by name).
    //     Dedupe: αν υπάρχει ήδη μαθητής με το ίδιο ονοματεπώνυμο, ΕΝΗΜΕΡΩΝΕΤΑΙ αντί να
    //     δημιουργείται δεύτερη εγγραφή. ---
    const studentSheet = wb.Sheets["Μαθητές"] || wb.Sheets["Students"];
    if (studentSheet) {
      const rows = XLSX.utils.sheet_to_json(studentSheet);
      const courses = await getAll("courses");
      const classGroups = await getAll("classGroups");
      const existingStudents = await getAll("students");
      const normalize = (s) => stripAccentsLower(String(s || "").trim());

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

        const existing = existingStudents.find((s) => normalize(s.fullName) === normalize(fullName));
        if (existing) {
          // Ενημέρωση: κρατάμε τυχόν ήδη χειροκίνητα ανατεθειμένα Τμήματα αν το νέο import δεν όρισε κανένα.
          const mergedClassGroupIds = classGroupIds.length > 0 ? classGroupIds : (existing.classGroupIds || []);
          await db.collection("students").doc(existing.id).set(
            { ...studentData, classGroupIds: mergedClassGroupIds },
            { merge: true }
          );
          updated++;
        } else {
          await db.collection("students").add(studentData);
          inserted++;
        }
      }
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
