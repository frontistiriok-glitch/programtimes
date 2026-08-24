import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Αυτές οι τιμές ΔΕΝ είναι μυστικές (public identifiers ενός Firebase project) -
// η ασφάλεια δεν βασίζεται στο να κρυφτούν, αλλά στο ότι το backend επαληθεύει
// πάντα το πραγματικό Firebase Auth token (βλ. backend/src/authMiddleware.js).
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
