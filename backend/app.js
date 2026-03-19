require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

const app = express();

connectDB();

app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());

app.use("/api/auth", require("./routes/auth"));
app.use("/api/progress", require("./routes/progress"));
app.use("/api/wordle", require("./routes/wordle"));
app.use("/api/quiz", require("./routes/quiz"));

app.get("/api/health", (req, res) =>
  res.json({ status: "ok", time: new Date() }),
);

module.exports = app;
