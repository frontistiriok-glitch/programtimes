import React, { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebaseClient";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      // Επιτυχία: το onAuthStateChanged στο App.jsx αναλαμβάνει να δείξει την εφαρμογή.
    } catch (err) {
      setError("Λάθος email ή κωδικός.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-lg border border-line bg-white p-6 shadow-sm">
        <h1 className="mb-1 font-display text-xl font-semibold text-ink">ΦΡΟΝΤΙΣΤΗΡΙΟ ΚΟΥΤΣΟΥΚΟΣ</h1>
        <p className="mb-6 text-sm text-slate">Σύνδεση στο πρόγραμμα</p>

        <label className="mb-3 block text-xs font-medium text-slate">
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm focus:border-accent focus:outline-none"
          />
        </label>

        <label className="mb-4 block text-xs font-medium text-slate">
          Κωδικός
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm focus:border-accent focus:outline-none"
          />
        </label>

        {error && <div className="mb-4 rounded-md border border-warn bg-warn/10 px-3 py-2 text-sm text-warn">{error}</div>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-60"
        >
          {loading ? "Σύνδεση..." : "Σύνδεση"}
        </button>
      </form>
    </div>
  );
}
