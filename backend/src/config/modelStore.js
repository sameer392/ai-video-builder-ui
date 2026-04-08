const { createPool } = require("mysql2/promise");

let pool;

function getPool() {
  if (!pool) {
    throw new Error("Model store not initialized.");
  }
  return pool;
}

async function initModelStore() {
  const host = process.env.MYSQL_HOST || "localhost";
  const port = Number(process.env.MYSQL_PORT || 3306);
  const user = process.env.MYSQL_USER || "root";
  const password = process.env.MYSQL_PASSWORD || "";
  const database = process.env.MYSQL_DATABASE || "ai_marketing";

  pool = createPool({
    host,
    port,
    user,
    password,
    database,
    waitForConnections: true,
    connectionLimit: 10,
  });

  await pool.query(`
    CREATE TABLE IF NOT EXISTS person_models (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      person VARCHAR(100) NOT NULL,
      prompt_id VARCHAR(191) NOT NULL,
      lora_name VARCHAR(255),
      status ENUM('queued', 'completed', 'failed') NOT NULL DEFAULT 'queued',
      training_images INT NOT NULL DEFAULT 0,
      error_message TEXT,
      created_at DATETIME NOT NULL,
      updated_at DATETIME NOT NULL,
      INDEX idx_person_status_created (person, status, created_at)
    )
  `);
}

async function insertTrainingJob(job) {
  const db = getPool();
  await db.query(
    `INSERT INTO person_models
      (person, prompt_id, lora_name, status, training_images, error_message, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      job.person,
      job.promptId,
      job.loraName || null,
      job.status || "queued",
      job.trainingImages || 0,
      job.errorMessage || null,
      job.createdAt,
      job.updatedAt,
    ]
  );
}

async function updateTrainingJob(promptId, updates) {
  const db = getPool();
  const loraName = updates.loraName === undefined ? null : updates.loraName;
  const status = updates.status === undefined ? null : updates.status;
  const errorMessage = updates.errorMessage === undefined ? null : updates.errorMessage;
  await db.query(
    `UPDATE person_models
     SET lora_name = COALESCE(?, lora_name),
         status = COALESCE(?, status),
         error_message = ?,
         updated_at = ?
     WHERE prompt_id = ?`,
    [loraName, status, errorMessage, updates.updatedAt, promptId]
  );
}

async function getLatestReadyLora(person) {
  const db = getPool();
  const [rows] = await db.query(
    `SELECT lora_name
     FROM person_models
     WHERE person = ? AND status = 'completed' AND lora_name IS NOT NULL
     ORDER BY updated_at DESC
     LIMIT 1`,
    [person]
  );
  return rows[0]?.lora_name || null;
}

async function getTrainingJobs(limit = 50) {
  const db = getPool();
  const [rows] = await db.query(
    `SELECT person, prompt_id, lora_name, status, training_images, error_message, created_at, updated_at
     FROM person_models
     ORDER BY updated_at DESC
     LIMIT ?`,
    [limit]
  );
  return rows.map((row) => ({
    person: row.person,
    promptId: row.prompt_id,
    loraName: row.lora_name,
    status: row.status,
    trainingImages: row.training_images,
    errorMessage: row.error_message,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at,
  }));
}

module.exports = {
  initModelStore,
  insertTrainingJob,
  updateTrainingJob,
  getLatestReadyLora,
  getTrainingJobs,
};
