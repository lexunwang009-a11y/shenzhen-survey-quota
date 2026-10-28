import { env } from "cloudflare:workers";
import { quotaSeed } from "./quota-data";

export async function ensureDb() {
  const db = env.DB;
  if (!db) throw new Error("数据库暂不可用");
  await db.batch([
    db.prepare("CREATE TABLE IF NOT EXISTS quota_cells (key TEXT PRIMARY KEY, district TEXT NOT NULL, education TEXT NOT NULL, age TEXT NOT NULL, quota INTEGER NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS reservations (id TEXT PRIMARY KEY, batch_id TEXT NOT NULL, cell_key TEXT NOT NULL, claimant_name TEXT NOT NULL, organization TEXT NOT NULL, phone TEXT NOT NULL, created_at TEXT NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS admins (email TEXT PRIMARY KEY, created_at TEXT NOT NULL)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_reservations_cell_key ON reservations(cell_key)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_reservations_created_at ON reservations(created_at)"),
  ]);
  const count = await db.prepare("SELECT COUNT(*) AS count FROM quota_cells").first<{ count: number }>();
  if (!count?.count) {
    await db.batch(quotaSeed.map((cell) => db.prepare("INSERT OR IGNORE INTO quota_cells (key, district, education, age, quota) VALUES (?, ?, ?, ?, ?)").bind(cell.key, cell.district, cell.education, cell.age, cell.quota)));
  }
  return db;
}

export function requestEmail(request: Request) {
  return request.headers.get("oai-authenticated-user-email")?.trim().toLowerCase() || (process.env.NODE_ENV === "development" ? "local-admin@example.test" : "");
}
