"use client";

import { useActionState, useEffect, useRef } from "react";
import { createTopic } from "@/app/actions";

const EMOJIS = ["🌸", "💻", "🍓", "✈️", "💗", "👗", "🏥", "💼", "🎵", "⚽", "🐱", "🌿", "📚", "🏠", "🎨"];

export default function TopicForm() {
  const [state, action, pending] = useActionState(createTopic, {});
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);

  return (
    <form ref={ref} action={action} className="space-y-3">
      <div className="flex gap-2">
        <select name="emoji" aria-label="Biểu tượng" className="input !w-24 text-lg">
          {EMOJIS.map((e) => (
            <option key={e} value={e}>{e}</option>
          ))}
        </select>
        <input name="name" required placeholder="VD: Business, Health…" className="input" />
      </div>
      <button className="btn w-full" disabled={pending}>
        {pending ? "Đang tạo…" : "Tạo chủ đề"}
      </button>
      {state.error && <p className="text-sm text-berry">{state.error}</p>}
      {state.message && <p className="pop-in text-sm text-mint">{state.message}</p>}
    </form>
  );
}
