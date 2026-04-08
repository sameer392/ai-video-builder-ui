const mysql = require("mysql2/promise");

let pool;

function getPool() {
  if (!pool) {
    throw new Error("History store not initialized.");
  }
  return pool;
}

async function initHistoryStore() {
  const host = process.env.MYSQL_HOST || "localhost";
  const port = Number(process.env.MYSQL_PORT || 3306);
  const user = process.env.MYSQL_USER || "root";
  const password = process.env.MYSQL_PASSWORD || "";
  const database = process.env.MYSQL_DATABASE || "ai_marketing";

  pool = mysql.createPool({
    host,
    port,
    user,
    password,
    database,
    waitForConnections: true,
    connectionLimit: 10,
  });

  await pool.query(`
    CREATE TABLE IF NOT EXISTS generation_history (
      id VARCHAR(191) PRIMARY KEY,
      person VARCHAR(100) NOT NULL,
      script TEXT NOT NULL,
      style TEXT NOT NULL,
      type VARCHAR(50) NOT NULL,
      url TEXT NOT NULL,
      created_at DATETIME NOT NULL
    )
  `);
}

async function addHistory(item) {
  const db = getPool();
  await db.query(
    `INSERT INTO generation_history (id, person, script, style, type, url, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       person = VALUES(person),
       script = VALUES(script),
       style = VALUES(style),
       type = VALUES(type),
       url = VALUES(url),
       created_at = VALUES(created_at)`,
    [item.id, item.person, item.script, item.style, item.type, item.url, item.createdAt]
  );
}

async function getHistory(limit = 25) {
  const db = getPool();
  const [rows] = await db.query(
    `SELECT id, person, script, style, type, url, created_at
     FROM generation_history
     ORDER BY created_at DESC
     LIMIT ?`,
    [limit]
  );

  return rows.map((row) => ({
    id: row.id,
    person: row.person,
    script: row.script,
    style: row.style,
    type: row.type,
    url: row.url,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  }));
}

module.exports = {
  initHistoryStore,
  addHistory,
  getHistory,
};
