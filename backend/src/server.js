const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const apiKeyAuth = require("./middleware/apiKeyAuth");
const generateRoutes = require("./routes/generateRoutes");
const trainingRoutes = require("./routes/trainingRoutes");
const { initHistoryStore } = require("./config/historyStore");
const { initModelStore } = require("./config/modelStore");

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(apiKeyAuth);

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/", generateRoutes);
app.use("/", trainingRoutes);

async function startServer() {
  try {
    await initHistoryStore();
    await initModelStore();

    app.listen(port, () => {
      // eslint-disable-next-line no-console
      console.log(`Backend listening on http://localhost:${port}`);
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Failed to initialize server:", error?.message || error);
    process.exit(1);
  }
}

startServer();
