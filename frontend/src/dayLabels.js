const KEY_TO_GREEK = {
  MONDAY: "Δευτέρα",
  TUESDAY: "Τρίτη",
  WEDNESDAY: "Τετάρτη",
  THURSDAY: "Πέμπτη",
  FRIDAY: "Παρασκευή",
  SATURDAY: "Σάββατο",
  SUNDAY: "Κυριακή",
};

export function keyToGreekDay(key) {
  return KEY_TO_GREEK[key] || key;
}
