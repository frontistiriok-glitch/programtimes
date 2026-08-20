const express = require("express");
const cors = require("cors");
const { db } = require("./firebase");
const { makeEntityRouter } = require("./routes/entities");
const { makeAssignmentRouter } = require("./routes/assignments");
const { makeExcelRouter } = require("./routes/excel");
const { makeStudentRouter } = require("./routes/students");

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/courses", makeEntityRouter(db, "courses"));
app.use("/api/classgroups", makeEntityRouter(db, "classGroups"));
app.use("/api/teachers", makeEntityRouter(db, "teachers"));
app.use("/api/rooms", makeEntityRouter(db, "rooms"));
app.use("/api/students", makeStudentRouter(db));
app.use("/api/assignments", makeAssignmentRouter(db));
app.use("/api", makeExcelRouter(db)); // /api/export/excel , /api/import/excel

app.get("/api/health", (req, res) => res.json({ ok: true }));

module.exports = app;
