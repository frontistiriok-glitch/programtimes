const { admin } = require("./firebase");

// Προστατεύει τα /api routes: απαιτεί έγκυρο Firebase Auth ID token στο header
// "Authorization: Bearer <token>". Το token παράγεται στο frontend μετά από επιτυχές
// login (signInWithEmailAndPassword) και ανανεώνεται αυτόματα από το Firebase SDK.
//
// Χρησιμοποιεί το ΙΔΙΟ service account (firebase-admin) που ήδη έχουμε για το Firestore -
// δεν χρειάζεται κανένα επιπλέον env var.
async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const match = header.match(/^Bearer (.+)$/);
  if (!match) {
    return res.status(401).json({ error: "UNAUTHENTICATED", message: "Απαιτείται σύνδεση." });
  }
  try {
    const decoded = await admin.auth().verifyIdToken(match[1]);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "UNAUTHENTICATED", message: "Μη έγκυρη ή ληγμένη σύνδεση." });
  }
}

module.exports = { requireAuth };
