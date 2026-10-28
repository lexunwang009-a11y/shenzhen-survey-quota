"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Cell = {
  key: string;
  district: string;
  education: string;
  age: string;
  quota: number;
  remaining: number;
  claimants: Array<{ name: string; organization: string; phone: string }>;
};

type StatePayload = { cells: Cell[]; totalQuota: number; totalRemaining: number };

const ages = ["18–24岁", "25–34岁", "35–44岁", "45–59岁", "≥60岁"];
const education = [
  "初中及以下（未上学、小学、初中）",
  "高中/中专（普通高中、中专、职高、技校）",
  "大专及以上（大专、本科、研究生）",
];

export default function Home() {
  const [data, setData] = useState<StatePayload | null>(null);
  const [district, setDistrict] = useState("福田区");
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [form, setForm] = useState({ name: "", organization: "", phone: "" });
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch("/api/state", { cache: "no-store" });
    if (!response.ok) throw new Error("配额数据加载失败");
    setData(await response.json());
  }, []);

  useEffect(() => {
    load().catch((error) => setMessage(error.message));
  }, [load]);

  const districts = useMemo(
    () => Array.from(new Set(data?.cells.map((cell) => cell.district) ?? [])),
    [data]
  );
  const cellMap = useMemo(
    () => new Map(data?.cells.map((cell) => [cell.key, cell]) ?? []),
    [data]
  );
  const selectedEntries = useMemo(
    () => Object.entries(selected).filter(([, qty]) => qty > 0),
    [selected]
  );
  const selectedTotal = selectedEntries.reduce((sum, [, qty]) => sum + qty, 0);
  const youngCount = selectedEntries.reduce((sum, [key, qty]) => {
    const age = cellMap.get(key)?.age;
    return sum + (age === "18–24岁" || age === "25–34岁" ? qty : 0);
  }, 0);
  const olderCount = selectedTotal - youngCount;
  const higherEduCount = selectedEntries.reduce(
    (sum, [key, qty]) => sum + (cellMap.get(key)?.education.startsWith("大专及以上") ? qty : 0),
    0
  );
  const lowerEduCount = selectedTotal - higherEduCount;
  const ageRuleOk = youngCount === 0 || olderCount >= youngCount;
  const educationRuleOk = higherEduCount === 0 || lowerEduCount >= higherEduCount;
  const ready = selectedTotal > 0 && ageRuleOk && educationRuleOk;

  function adjust(key: string, delta: number) {
    const cell = cellMap.get(key);
    if (!cell) return;
    setSelected((current) => {
      const next = Math.max(0, Math.min(cell.remaining, (current[key] ?? 0) + delta));
      const updated = { ...current };
      if (next === 0) delete updated[key];
      else updated[key] = next;
      return updated;
    });
    setMessage("");
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!ready || !form.name.trim() || !form.organization.trim() || !form.phone.trim()) return;
    setSubmitting(true);
    setMessage("");
    try {
      const response = await fetch("/api/reservations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...form,
          selections: selectedEntries.map(([cellKey, quantity]) => ({ cellKey, quantity })),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "领取失败，请稍后重试");
      setSelected({});
      setForm({ name: "", organization: "", phone: "" });
      setMessage(`领取成功，共锁定 ${selectedTotal} 个名额。`);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "领取失败");
      await load();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main>
      <header className="hero">
        <div>
          <p className="eyebrow">深圳市居民就餐调查</p>
          <h1>调查任务领取</h1>
          <p className="lead">点击配额格选择受访者类型。数字为剩余名额，姓名为已经领取该类型任务的调查员。</p>
        </div>
        <div className="progress-card">
          <span>全市剩余</span>
          <strong>{data ? data.totalRemaining.toLocaleString() : "—"}</strong>
          <small>共 {data?.totalQuota.toLocaleString() ?? "1,400"} 个名额</small>
        </div>
      </header>

      <div className="workspace">
        <section className="quota-panel">
          <div className="quota-body">
            <div className="district-tabs" aria-label="选择居住地">
              <p>选择居住地</p>
              {districts.map((name) => (
                <button key={name} className={district === name ? "active" : ""} onClick={() => setDistrict(name)}>
                  {name}
                </button>
              ))}
            </div>

            <div className="table-scroll">
              <div className="quota-grid" role="table" aria-label={`${district}配额表`}>
              <div className="corner" role="columnheader">学历 \ 年龄</div>
              {ages.map((age) => <div className="age-head" role="columnheader" key={age}>{age}</div>)}
              {education.flatMap((edu) => [
                <div className="edu-head" role="rowheader" key={`${edu}-head`}><span>{edu}</span></div>,
                ...ages.map((age) => {
                  const cell = data?.cells.find((item) => item.district === district && item.education === edu && item.age === age);
                  if (!cell) return <div className="quota-cell loading" key={`${edu}-${age}`} />;
                  const qty = selected[cell.key] ?? 0;
                  return (
                    <div className={`quota-cell ${qty ? "chosen" : ""} ${cell.remaining === 0 ? "empty" : ""}`} key={cell.key}>
                      <button className="cell-main" onClick={() => adjust(cell.key, 1)} disabled={cell.remaining === 0} aria-label={`选择${district}${edu}${age}`}>
                        <span>剩余</span>
                        <strong>{cell.remaining}</strong>
                        <small>原配额 {cell.quota}</small>
                      </button>
                      {qty > 0 && (
                        <div className="stepper">
                          <button onClick={() => adjust(cell.key, -1)} aria-label="减少一个">−</button>
                          <b>已选 {qty}</b>
                          <button onClick={() => adjust(cell.key, 1)} disabled={qty >= cell.remaining} aria-label="增加一个">＋</button>
                        </div>
                      )}
                      <div className="names">
                        {cell.claimants.length ? cell.claimants.map((person, index) => (
                          <span className="claimant-chip" key={`${person.name}-${index}`}>
                            <button type="button">{person.name}</button>
                            <span className="contact-popover" role="tooltip">
                              <b>{person.name}</b>
                              <small>学校 / 单位</small><strong>{person.organization}</strong>
                              <small>手机号码</small><strong>{person.phone}</strong>
                            </span>
                          </span>
                        )) : <em>暂无领取</em>}
                      </div>
                    </div>
                  );
                }),
              ])}
              </div>
            </div>
          </div>
          <p className="privacy-note">鼠标移到领取人姓名上可查看学校/单位和手机号码；手机端请点击姓名。</p>
        </section>

        <aside className="claim-panel">
          <div className="claim-head">
            <div><p className="eyebrow">当前领取单</p><h2>{selectedTotal} 个名额</h2></div>
            {selectedTotal > 0 && <button className="clear" onClick={() => setSelected({})}>清空</button>}
          </div>

          <div className="rules">
            <div className={ageRuleOk ? "rule ok" : "rule bad"}>
              <span>{ageRuleOk ? "✓" : "!"}</span>
              <p><b>年龄搭配</b><small>18–34岁 {youngCount} 人，35岁及以上 {olderCount} 人</small></p>
            </div>
            <div className={educationRuleOk ? "rule ok" : "rule bad"}>
              <span>{educationRuleOk ? "✓" : "!"}</span>
              <p><b>学历搭配</b><small>大专及以上 {higherEduCount} 人，其他学历 {lowerEduCount} 人</small></p>
            </div>
          </div>

          <div className="selection-list">
            {selectedEntries.length === 0 ? (
              <p className="empty-cart">从左侧表格点击名额开始领取。</p>
            ) : selectedEntries.map(([key, qty]) => {
              const cell = cellMap.get(key)!;
              return <div key={key}><b>{qty}× {cell.age}</b><span>{cell.district} · {cell.education.split("（")[0]}</span></div>;
            })}
          </div>

          <form onSubmit={submit}>
            <label>姓名<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="领取任务的调查员姓名" /></label>
            <label>学校 / 单位<input required value={form.organization} onChange={(e) => setForm({ ...form, organization: e.target.value })} placeholder="请输入完整名称" /></label>
            <label>手机号码<input required inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="用于任务联络和奖励发放" /></label>
            {!ageRuleOk && <p className="form-error">每选择1名18–34岁受访者，至少需要搭配1名35岁及以上受访者。</p>}
            {!educationRuleOk && <p className="form-error">每选择1名大专及以上受访者，至少需要搭配1名其他学历受访者。</p>}
            <button className="submit" disabled={!ready || submitting}>{submitting ? "正在锁定名额…" : "确认领取"}</button>
          </form>
          {message && <div className={`message ${message.includes("成功") ? "success" : ""}`}>{message}</div>}
        </aside>
      </div>
    </main>
  );
}
