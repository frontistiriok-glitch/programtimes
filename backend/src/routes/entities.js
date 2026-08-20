const express = require("express");

// Γενικό factory function που φτιάχνει βασικά CRUD routes πάνω σε μια Firestore collection.
function makeEntityRouter(db, collectionName) {
  const router = express.Router();
  const col = db.collection(collectionName);

  router.get("/", async (req, res) => {
    const snap = await col.get();
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    res.json(items);
  });

  router.post("/", async (req, res) => {
    const ref = await col.add(req.body);
    const doc = await ref.get();
    res.status(201).json({ id: doc.id, ...doc.data() });
  });

  router.put("/:id", async (req, res) => {
    await col.doc(req.params.id).set(req.body, { merge: true });
    const doc = await col.doc(req.params.id).get();
    res.json({ id: doc.id, ...doc.data() });
  });

  router.delete("/:id", async (req, res) => {
    await col.doc(req.params.id).delete();
    res.status(204).end();
  });

  return router;
}

module.exports = { makeEntityRouter };
