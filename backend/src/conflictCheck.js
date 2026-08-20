// conflictCheck.js
// Πυρήνας λογικής ελέγχου συγκρούσεων για τις Αναθέσεις (Assignments).
//
// Δύο ειδών έλεγχοι:
//  1) ΣΚΛΗΡΟΙ (hard) - μπλοκάρουν την αποθήκευση: καθηγητής/αίθουσα/τμήμα διπλοκρατημένα.
//  2) ΜΑΛΑΚΟΙ (soft) - απλή προειδοποίηση, δεν μπλοκάρουν: μαθητής του τμήματος
//     έχει δηλώσει μη διαθεσιμότητα στη συγκεκριμένη ώρα.

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function timesOverlap(aStart, aEnd, bStart, bEnd) {
  const aS = toMinutes(aStart);
  const aE = toMinutes(aEnd);
  const bS = toMinutes(bStart);
  const bE = toMinutes(bEnd);
  return aS < bE && bS < aE;
}

/**
 * ΣΚΛΗΡΟΙ έλεγχοι: καθηγητής/αίθουσα/τμήμα δεν μπορούν να έχουν επικαλυπτόμενες αναθέσεις.
 *
 * @param {object} candidate  { day, startTime, endTime, teacherId, roomId, classGroupId, excludeId? }
 * @param {Array}  existing   λίστα υπαρχουσών αναθέσεων (ίδιας ημέρας αρκεί, αλλά δέχεται και όλες)
 * @returns {Array} λίστα συγκρούσεων (άδεια αν δεν υπάρχει καμία)
 */
function findConflicts(candidate, existing) {
  const conflicts = [];

  for (const other of existing) {
    if (candidate.excludeId && other.id === candidate.excludeId) continue;
    if (other.day !== candidate.day) continue;

    const overlaps = timesOverlap(candidate.startTime, candidate.endTime, other.startTime, other.endTime);
    if (!overlaps) continue;

    if (other.teacherId === candidate.teacherId) {
      conflicts.push({
        type: "TEACHER_DOUBLE_BOOKED",
        message: `Ο καθηγητής διδάσκει ήδη ${other.startTime}-${other.endTime} την ίδια ημέρα.`,
        conflictingAssignmentId: other.id,
      });
    }
    if (other.roomId === candidate.roomId) {
      conflicts.push({
        type: "ROOM_DOUBLE_BOOKED",
        message: `Η αίθουσα είναι ήδη κατειλημμένη ${other.startTime}-${other.endTime} την ίδια ημέρα.`,
        conflictingAssignmentId: other.id,
      });
    }
    if (other.classGroupId === candidate.classGroupId) {
      conflicts.push({
        type: "CLASS_DOUBLE_BOOKED",
        message: `Το τμήμα έχει ήδη μάθημα ${other.startTime}-${other.endTime} την ίδια ημέρα.`,
        conflictingAssignmentId: other.id,
      });
    }
  }

  return conflicts;
}

/**
 * ΜΑΛΑΚΟΣ έλεγχος (προειδοποίηση, όχι μπλοκάρισμα): μαθητές ανατεθειμένοι στο ίδιο
 * classGroupId με δηλωμένη μη-διαθεσιμότητα που τέμνει το [startTime, endTime) της ανάθεσης.
 *
 * Οι μη διαθέσιμες ώρες αποθηκεύονται σε 30λεπτα σημεία (π.χ. "14:30" σημαίνει το slot 14:30-15:00).
 *
 * @param {object} candidate  { day, startTime, endTime, classGroupId }
 * @param {Array}  students   λίστα μαθητών [{ id, fullName, classGroupId, unavailableSlots: [{day, time}] }]
 * @returns {Array} λίστα προειδοποιήσεων ανά μαθητή
 */
function findStudentAvailabilityWarnings(candidate, students) {
  const warnings = [];
  const startMin = toMinutes(candidate.startTime);
  const endMin = toMinutes(candidate.endTime);

  for (const student of students) {
    if (student.classGroupId !== candidate.classGroupId) continue;
    const slots = student.unavailableSlots || [];

    const clashingSlots = slots.filter((slot) => {
      if (slot.day !== candidate.day) return false;
      const slotStart = toMinutes(slot.time);
      const slotEnd = slotStart + 30; // κάθε δηλωμένο σημείο καλύπτει μισή ώρα
      return slotStart < endMin && startMin < slotEnd;
    });

    if (clashingSlots.length > 0) {
      warnings.push({
        type: "STUDENT_UNAVAILABLE",
        studentId: student.id,
        studentName: student.fullName,
        message: `Ο/Η ${student.fullName} έχει δηλώσει μη διαθεσιμότητα σε αυτή την ώρα.`,
      });
    }
  }

  return warnings;
}

module.exports = { findConflicts, findStudentAvailabilityWarnings, timesOverlap, toMinutes };
