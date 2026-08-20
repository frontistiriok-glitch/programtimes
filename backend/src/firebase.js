const admin = require("firebase-admin");

// Αναμένει service account JSON. Βάλε το path στο .env ως GOOGLE_APPLICATION_CREDENTIALS
// ή το περιεχόμενο ως FIREBASE_SERVICE_ACCOUNT_JSON (χρήσιμο για hosting όπως Render/Railway).
function initFirebase() {
  if (admin.apps.length) return admin.app();

  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    return admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }

  // Αλλιώς, βασίζεται στο GOOGLE_APPLICATION_CREDENTIALS env var (path σε αρχείο json)
  return admin.initializeApp({ credential: admin.credential.applicationDefault() });
}

const app = initFirebase();
const db = admin.firestore();

module.exports = { admin, db };
