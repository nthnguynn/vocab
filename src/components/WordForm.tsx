"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import type { FormState } from "@/app/actions";

type Topic = { id: number; name: string; emoji: string };
type WordValues = {
  word?: string;
  meaning?: string;
  type?: string | null;
  definition?: string | null;
  example?: string | null;
  note?: string | null;
  topicId?: number;
};

const TYPES = ["Noun", "Verb", "Adjective", "Adverb", "Phrase", "Idiom", "Preposition", "Conjunction"];

export default function WordForm({
  action,
  topics,
  initial = {},
  submitLabel = "Thêm từ",
  compact = false,
}: {
  action: (state: FormState, fd: FormData) => Promise<FormState>;
  topics: Topic[];
  initial?: WordValues;
  submitLabel?: string;
  compact?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [more, setMore] = useState(!compact);
  const [newTopicMode, setNewTopicMode] = useState(topics.length === 0);
  const wordRef = useRef<HTMLInputElement>(null);

  const [topicId, setTopicId] = useState(String(initial.topicId ?? topics[0]?.id ?? ""));

  // React tự reset form sau khi lưu; chỉ cần đưa con trỏ về ô từ vựng để nhập tiếp
  useEffect(() => {
    if (state.ok) wordRef.current?.focus();
  }, [state]);

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="word">Từ vựng *</label>
          <input ref={wordRef} id="word" name="word" required defaultValue={initial.word} className="input" placeholder="e.g. blossom" />
        </div>
        <div>
          <label className="label" htmlFor="meaning">Nghĩa *</label>
          <input id="meaning" name="meaning" required defaultValue={initial.meaning} className="input" placeholder="nở hoa" />
        </div>
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="label !mb-0" htmlFor="topicId">Chủ đề *</label>
            <button type="button" onClick={() => setNewTopicMode((v) => !v)} className="text-xs font-medium text-petal-600 hover:underline">
              {newTopicMode ? "Chọn chủ đề có sẵn" : "+ Chủ đề mới"}
            </button>
          </div>
          {newTopicMode ? (
            <input name="newTopic" required className="input" placeholder="Tên chủ đề mới" />
          ) : (
            <select id="topicId" name="topicId" required value={topicId} onChange={(e) => setTopicId(e.target.value)} className="input">
              {topics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.emoji} {t.name}
                </option>
              ))}
            </select>
          )}
        </div>
        <div>
          <label className="label" htmlFor="type">Loại từ</label>
          <input id="type" name="type" list="word-types" defaultValue={initial.type ?? ""} className="input" placeholder="Noun, Verb…" />
          <datalist id="word-types">
            {TYPES.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </div>
      </div>

      {more ? (
        <div className="grid gap-4 sm:grid-cols-2 pop-in">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="example">Ví dụ</label>
            <input id="example" name="example" defaultValue={initial.example ?? ""} className="input" placeholder="The cherry trees blossom in spring." />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="definition">Định nghĩa chi tiết</label>
            <textarea id="definition" name="definition" rows={2} defaultValue={initial.definition ?? ""} className="input" />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="note">Ghi chú</label>
            <input id="note" name="note" defaultValue={initial.note ?? ""} className="input" />
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setMore(true)} className="btn-ghost -ml-3">
          ＋ Thêm ví dụ, định nghĩa, nhãn…
        </button>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button className="btn" disabled={pending}>
          {pending ? "Đang lưu…" : submitLabel}
        </button>
        {state.error && <p className="text-sm font-medium text-berry">{state.error}</p>}
        {state.message && <p className="pop-in text-sm font-medium text-mint">{state.message}</p>}
      </div>
    </form>
  );
}
