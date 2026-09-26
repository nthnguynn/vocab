"use client";

import { useActionState, useState } from "react";
import { importFromFile, importFromSheet, type FormState } from "@/app/actions";

function Status({ state }: { state: FormState }) {
  if (state.error) return <p className="text-sm font-medium text-berry">{state.error}</p>;
  if (state.message) return <p className="pop-in text-sm font-medium text-mint">{state.message}</p>;
  return null;
}

export function FileImportForm() {
  const [state, action, pending] = useActionState(importFromFile, {});
  const [fileName, setFileName] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);

  return (
    <form action={action} className="space-y-4">
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={() => setDrag(false)}
        className={`relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed px-6 py-10 text-center transition ${
          drag ? "border-petal-500 bg-petal-100" : "border-petal-200 bg-petal-50/60 hover:border-petal-400 hover:bg-petal-50"
        }`}
      >
        <span className="text-4xl" aria-hidden>{fileName ? "📄" : "☁️"}</span>
        <span className="font-semibold text-petal-700">{fileName ?? "Kéo thả file CSV vào đây"}</span>
        <span className="text-sm text-muted">{fileName ? "Bấm để chọn file khác" : "hoặc bấm để chọn file"}</span>
        <input
          type="file"
          name="file"
          accept=".csv,.tsv,.txt,text/csv"
          required
          onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn" disabled={pending || !fileName}>{pending ? "Đang nhập…" : "📥 Nhập từ file"}</button>
        <Status state={state} />
      </div>
    </form>
  );
}

export function SheetImportForm({ defaultUrl }: { defaultUrl: string }) {
  const [state, action, pending] = useActionState(importFromSheet, {});
  return (
    <form action={action} className="space-y-3">
      <input name="url" required defaultValue={defaultUrl} aria-label="Link Google Sheets" className="input" placeholder="https://docs.google.com/spreadsheets/d/…" />
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn-soft" disabled={pending}>{pending ? "Đang đồng bộ…" : "🔄 Đồng bộ từ link"}</button>
        <Status state={state} />
      </div>
    </form>
  );
}
