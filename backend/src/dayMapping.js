// Αντιστοίχιση ελληνικών ονομάτων ημέρας <-> εσωτερικό κλειδί χρησιμοποιούμενο στο πλέγμα προγράμματος.

const GREEK_TO_KEY = {
  "Δευτέρα": "MONDAY",
  "Τρίτη": "TUESDAY",
  "Τετάρτη": "WEDNESDAY",
  "Πέμπτη": "THURSDAY",
  "Παρασκευή": "FRIDAY",
  "Σάββατο": "SATURDAY",
  "Κυριακή": "SUNDAY", // δεν εμφανίζεται στο πλέγμα (14:00-22:00 Δευτ-Σαβ), κρατιέται μόνο ως δεδομένο μαθητή
};

const KEY_TO_GREEK = Object.fromEntries(Object.entries(GREEK_TO_KEY).map(([gr, key]) => [key, gr]));

function greekDayToKey(name) {
  return GREEK_TO_KEY[name.trim()] || null;
}

function keyToGreekDay(key) {
  return KEY_TO_GREEK[key] || key;
}

/**
 * Μετατρέπει το ελεύθερο κείμενο της στήλης "Μη διαθέσιμες ώρες" σε λίστα { day, time }.
 * Αναμενόμενη μορφή ανά στοιχείο: "Δευτέρα 14:30, Τρίτη 18:00, ..."
 */
function parseUnavailableSlots(text) {
  if (!text) return [];
  return text
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const match = part.match(/^(\S+)\s+(\d{1,2}:\d{2})$/);
      if (!match) return null;
      const day = greekDayToKey(match[1]);
      if (!day) return null;
      return { day, time: match[2] };
    })
    .filter(Boolean);
}

module.exports = { greekDayToKey, keyToGreekDay, parseUnavailableSlots, GREEK_TO_KEY };
