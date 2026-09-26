"use client";

import { useState } from "react";

type Topic = { id: number; name: string; emoji: string };

/** Chọn nhiều chủ đề bằng chip; gửi lên dưới dạng ?topic=1&topic=2 (không chọn = tất cả). */
export default function TopicPicker({ topics, selected, name = "topic" }: { topics: Topic[]; selected: number[]; name?: string }) {
  const [picked, setPicked] = useState<number[]>(selected);
  const toggle = (id: number) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const chip = (on: boolean) =>
    `inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition active:scale-95 ${
      on ? "border-petal-500 bg-petal-500 text-white shadow-soft" : "border-petal-200 bg-white text-petal-700 hover:border-petal-300 hover:bg-petal-50"
    }`;

  return (
    <div>
      <p className="label">
        Chủ đề <span className="normal-case tracking-normal font-normal">— {picked.length ? `đã chọn ${picked.length}` : "tất cả"}</span>
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setPicked([])} className={chip(picked.length === 0)}>
          🌈 Tất cả
        </button>
        {topics.map((t) => (
          <button key={t.id} type="button" aria-pressed={picked.includes(t.id)} onClick={() => toggle(t.id)} className={chip(picked.includes(t.id))}>
            <span aria-hidden>{t.emoji}</span>
            {t.name}
          </button>
        ))}
      </div>
      {picked.map((id) => (
        <input key={id} type="hidden" name={name} value={id} />
      ))}
    </div>
  );
}
