import { ensureDb } from "../../../lib/db";
import { ages, education } from "../../../lib/quota-data";

type Selection = { cellKey: string; quantity: number };

export async function POST(request: Request) {
  try {
    const body = await request.json() as { name?: string; organization?: string; phone?: string; selections?: Selection[] };
    const name = body.name?.trim() ?? "";
    const organization = body.organization?.trim() ?? "";
    const phone = body.phone?.trim() ?? "";
    const selections = (body.selections ?? []).filter((item) => Number.isInteger(item.quantity) && item.quantity > 0 && item.quantity <= 50);
    if (!name || !organization || !/^[0-9+()\-\s]{7,20}$/.test(phone) || !selections.length || selections.length > 30) {
      return Response.json({ error: "请完整填写姓名、学校/单位、有效手机号码和领取名额。" }, { status: 400 });
    }
    const db = await ensureDb();
    const placeholders = selections.map(() => "?").join(",");
    const known = await db.prepare(`SELECT key, age, education FROM quota_cells WHERE key IN (${placeholders})`).bind(...selections.map((item) => item.cellKey)).all();
    if (known.results.length !== selections.length) return Response.json({ error: "选择中包含无效配额格。" }, { status: 400 });
    const cellDetails = new Map((known.results as Array<{ key: string; age: string; education: string }>).map((row) => [row.key, row]));
    let young = 0, older = 0, higher = 0, lower = 0;
    for (const item of selections) {
      const cell = cellDetails.get(item.cellKey)!;
      if (cell.age === ages[0] || cell.age === ages[1]) young += item.quantity; else older += item.quantity;
      if (cell.education === education[2]) higher += item.quantity; else lower += item.quantity;
    }
    if (young > older) return Response.json({ error: "年龄搭配不符合：每1名18–34岁受访者必须搭配至少1名35岁及以上受访者。" }, { status: 400 });
    if (higher > lower) return Response.json({ error: "学历搭配不符合：每1名大专及以上受访者必须搭配至少1名其他学历受访者。" }, { status: 400 });

    const requestedValues = selections.map(() => "(?, ?)").join(",");
    const batchId = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const query = `
      WITH RECURSIVE requested(cell_key, qty) AS (VALUES ${requestedValues}),
      expanded(cell_key, n) AS (
        SELECT cell_key, 1 FROM requested WHERE qty >= 1
        UNION ALL SELECT e.cell_key, e.n + 1 FROM expanded e JOIN requested r ON r.cell_key = e.cell_key WHERE e.n < r.qty
      ),
      capacity AS (
        SELECT req.cell_key, req.qty, q.quota, COUNT(res.id) AS used
        FROM requested req JOIN quota_cells q ON q.key = req.cell_key
        LEFT JOIN reservations res ON res.cell_key = req.cell_key GROUP BY req.cell_key
      ),
      all_ok AS (SELECT CASE WHEN SUM(CASE WHEN quota - used >= qty THEN 1 ELSE 0 END) = COUNT(*) THEN 1 ELSE 0 END AS ok FROM capacity)
      INSERT INTO reservations (id, batch_id, cell_key, claimant_name, organization, phone, created_at)
      SELECT lower(hex(randomblob(16))), ?, e.cell_key, ?, ?, ?, ? FROM expanded e WHERE (SELECT ok FROM all_ok) = 1
    `;
    const bindings = selections.flatMap((item) => [item.cellKey, item.quantity]);
    const result = await db.prepare(query).bind(...bindings, batchId, name, organization, phone, createdAt).run();
    const expected = selections.reduce((sum, item) => sum + item.quantity, 0);
    if (result.meta.changes !== expected) return Response.json({ error: "部分名额刚刚被其他人领取，请根据最新剩余数量重新选择。" }, { status: 409 });
    return Response.json({ ok: true, count: expected });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "领取失败" }, { status: 500 });
  }
}
