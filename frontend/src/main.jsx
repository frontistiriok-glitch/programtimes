import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// PWA: καταχώρηση service worker ώστε η εφαρμογή να είναι "εγκαταστάσιμη" στο κινητό/desktop.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Αν αποτύχει (π.χ. σε τοπικό dev χωρίς https), η εφαρμογή δουλεύει κανονικά χωρίς PWA.
    });
  });
}
