export const ages = ["18–24岁", "25–34岁", "35–44岁", "45–59岁", "≥60岁"] as const;
export const education = [
  "初中及以下（未上学、小学、初中）",
  "高中/中专（普通高中、中专、职高、技校）",
  "大专及以上（大专、本科、研究生）",
] as const;

const educationTargets = [584, 340, 476];
const districtAge: Array<[string, number[]]> = [
  ["福田区", [17, 42, 28, 25, 8]], ["罗湖区", [11, 29, 19, 17, 5]],
  ["盐田区", [2, 6, 4, 4, 1]], ["南山区", [20, 51, 34, 30, 9]],
  ["宝安区", [50, 126, 84, 75, 23]], ["龙岗区", [44, 114, 75, 68, 21]],
  ["龙华区", [27, 70, 46, 42, 13]], ["坪山区", [7, 17, 12, 10, 3]],
  ["光明区", [13, 32, 21, 19, 6]], ["大鹏新区", [2, 4, 3, 3, 1]],
  ["深汕特别合作区", [1, 3, 2, 1, 0]],
];

type WorkingCell = { d: number; a: number; expected: number[]; values: number[]; remaining: number; selected: Set<number> };

function buildQuotaCells() {
  const cells: WorkingCell[] = [];
  const base = [0, 0, 0];
  districtAge.forEach(([, ageCounts], d) => ageCounts.forEach((count, a) => {
    const expected = educationTargets.map((target) => count * target / 1400);
    const values = expected.map(Math.floor);
    values.forEach((value, e) => { base[e] += value; });
    cells.push({ d, a, expected, values, remaining: count - values.reduce((sum, value) => sum + value, 0), selected: new Set() });
  }));
  const deficits = educationTargets.map((target, e) => target - base[e]);
  const edges = cells.flatMap((cell, c) => education.map((_, e) => ({ c, e, fraction: cell.expected[e] - Math.floor(cell.expected[e]) })));
  edges.sort((x, y) => y.fraction - x.fraction || x.c - y.c || x.e - y.e);
  for (const edge of edges) {
    const cell = cells[edge.c];
    if (cell.remaining && deficits[edge.e] && !cell.selected.has(edge.e)) {
      cell.values[edge.e] += 1; cell.remaining -= 1; deficits[edge.e] -= 1; cell.selected.add(edge.e);
    }
  }
  return cells.flatMap((cell) => education.map((edu, e) => {
    const district = districtAge[cell.d][0];
    const age = ages[cell.a];
    return { key: `${cell.d}-${e}-${cell.a}`, district, education: edu, age, quota: cell.values[e] };
  }));
}

export const quotaSeed = buildQuotaCells();
