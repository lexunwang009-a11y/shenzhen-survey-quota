import { ensureDb } from "../../../lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = await ensureDb();
    const { results } = await db.prepare(`
      SELECT q.key, q.district, q.education, q.age, q.quota,
             q.quota - COUNT(r.id) AS remaining
      FROM quota_cells q LEFT JOIN reservations r ON r.cell_key = q.key
      GROUP BY q.key ORDER BY q.rowid
    `).all();
    const claimantResult = await db.prepare("SELECT cell_key, claimant_name, organization, phone FROM reservations ORDER BY created_at").all();
    const claimants = new Map<string, Array<{ name: string; organization: string; phone: string }>>();
    for (const row of claimantResult.results as Array<{ cell_key: string; claimant_name: string; organization: string; phone: string }>) {
      claimants.set(row.cell_key, [...(claimants.get(row.cell_key) ?? []), { name: row.claimant_name, organization: row.organization, phone: row.phone }]);
    }
    const cells = (results as Array<Record<string, unknown>>).map((cell) => ({ ...cell, claimants: claimants.get(cell.key as string) ?? [] }));
    const totalQuota = cells.reduce((sum, cell) => sum + Number(cell.quota), 0);
    const totalRemaining = cells.reduce((sum, cell) => sum + Number(cell.remaining), 0);
    return Response.json({ cells, totalQuota, totalRemaining }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "加载失败" }, { status: 500 });
  }
}
