"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { recordTestAnswer } from "@/app/actions";
import SpeakButton, { speak } from "./SpeakButton";

export type Question = {
  id: number;
  prompt: string; // câu hỏi hiển thị
  answer: string; // đáp án đúng
  hint: string | null; // loại từ / ví dụ
  example: string | null;
  word: string; // từ tiếng Anh để phát âm
  choices?: string[];
};

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFC")
    .replace(/[.,!?;:"“”'()]/g, "")
    .replace(/\s+/g, " ")
    .trim();

function isCorrect(input: string, answer: string) {
  const a = normalize(input);
  if (!a) return false;
  // Chấp nhận bất kỳ nghĩa nào trong danh sách "a, b / c"
  return [answer, ...answer.split(/[,/;]/)].some((x) => normalize(x) === a);
}

export default function Quiz({ questions: fromServer, mode }: { questions: Question[]; mode: "type" | "choice" }) {
  const router = useRouter();
  const [initial] = useState(fromServer);
  const [questions, setQuestions] = useState(initial);
  const [i, setI] = useState(0);
  const [input, setInput] = useState("");
  const [checked, setChecked] = useState<null | boolean>(null);
  const [wrong, setWrong] = useState<(Question & { given: string })[]>([]);
  const [score, setScore] = useState(0);
  const [, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const q = questions[i];
  const done = i >= questions.length;

  useEffect(() => {
    if (checked === null) inputRef.current?.focus();
  }, [i, checked]);

  function submit(value: string) {
    if (!q || checked !== null) return;
    const ok = isCorrect(value, q.answer);
    setInput(value);
    setChecked(ok);
    if (ok) setScore((s) => s + 1);
    else setWrong((w) => [...w, { ...q, given: value }]);
    speak(q.word);
    startTransition(() => recordTestAnswer(q.id, value, ok));
  }

  function next() {
    setI((x) => x + 1);
    setInput("");
    setChecked(null);
  }

  function restart(list: Question[]) {
    setQuestions(list);
    setI(0);
    setInput("");
    setChecked(null);
    setWrong([]);
    setScore(0);
  }

  if (done) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <div className="card pop-in mx-auto max-w-2xl !p-8">
        <div className="text-center">
          <p className="text-5xl">{pct === 100 ? "🏆" : pct >= 70 ? "🎀" : "🌱"}</p>
          <h2 className="h-display mt-3 text-2xl">Kết quả: {score}/{questions.length}</h2>
          <p className="text-muted">{pct === 100 ? "Tuyệt vời, không sai câu nào!" : `Chính xác ${pct}% — cố lên nhé!`}</p>
        </div>
        {wrong.length > 0 && (
          <div className="mt-6 space-y-2">
            <p className="label">Câu sai cần sửa</p>
            {wrong.map((w) => (
              <div key={w.id} className="flex items-center gap-3 rounded-2xl border border-petal-100 bg-petal-50 px-4 py-3">
                <SpeakButton text={w.word} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-muted">{w.prompt}</p>
                  <p className="font-semibold">
                    <span className="text-berry line-through decoration-2">{w.given || "(bỏ trống)"}</span>
                    <span className="mx-2 text-petal-300">→</span>
                    <span className="text-mint">{w.answer}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {wrong.length > 0 && (
            <button className="btn" onClick={() => restart(wrong.map(({ given, ...q }) => (void given, q)))}>
              ✍️ Làm lại {wrong.length} câu sai
            </button>
          )}
          <button className="btn-soft" onClick={() => restart(initial)}>↺ Restart</button>
          <button className="btn-soft" onClick={() => router.refresh()}>
            🎲 Tạo đề mới
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold text-petal-600">Câu {i + 1} / {questions.length}</span>
        <span className="chip">✅ {score} · ❌ {wrong.length}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-petal-100">
        <div className="h-full rounded-full bg-gradient-to-r from-petal-300 to-petal-500 transition-all" style={{ width: `${(i / questions.length) * 100}%` }} />
      </div>

      <div key={q.id} className={`card pop-in !p-8 ${checked === false ? "shake" : ""}`}>
        <p className="text-center text-xs font-semibold tracking-wide text-muted uppercase">Từ này là gì?</p>
        <p className="h-display mt-3 text-center text-3xl break-words sm:text-4xl">{q.prompt}</p>
        {q.hint && <p className="mt-2 text-center text-sm text-muted italic">({q.hint})</p>}

        {mode === "choice" && q.choices ? (
          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            {q.choices.map((c) => {
              const isAns = checked !== null && isCorrect(c, q.answer);
              const isPicked = checked !== null && c === input;
              return (
                <button
                  key={c}
                  disabled={checked !== null}
                  onClick={() => submit(c)}
                  className={`rounded-2xl border-2 px-4 py-3.5 text-left font-medium transition ${
                    isAns
                      ? "border-mint bg-mint/10 text-mint"
                      : isPicked
                        ? "border-berry bg-berry/10 text-berry"
                        : "border-petal-100 bg-white hover:border-petal-300 hover:bg-petal-50"
                  }`}
                >
                  {c}
                </button>
              );
            })}
          </div>
        ) : (
          <form
            className="mt-7 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (checked === null) submit(input);
              else next();
            }}
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              readOnly={checked !== null}
              placeholder="Nhập đáp án…"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              className={`input !py-3 !text-base ${checked === true ? "!border-mint !ring-mint/20" : checked === false ? "!border-berry !ring-berry/20" : ""}`}
            />
            <button className="btn shrink-0">{checked === null ? "Kiểm tra" : "Tiếp →"}</button>
          </form>
        )}

        {checked !== null && (
          <div className={`pop-in mt-5 rounded-2xl p-4 ${checked ? "bg-mint/10" : "bg-berry/10"}`}>
            <p className={`font-semibold ${checked ? "text-mint" : "text-berry"}`}>
              {checked ? "✅ Chính xác!" : "❌ Chưa đúng rồi"}
            </p>
            <div className="mt-1 flex items-center gap-2">
              <SpeakButton text={q.word} />
              <p>
                Đáp án: <b>{q.answer}</b>
              </p>
            </div>
            {q.example && <p className="mt-2 text-sm text-muted italic">“{q.example}”</p>}
          </div>
        )}
      </div>

      {checked !== null && mode === "choice" && (
        <div className="text-center">
          <button className="btn" onClick={next} autoFocus>Câu tiếp theo →</button>
        </div>
      )}
      {checked === null && mode === "type" && (
        <p className="text-center text-xs text-muted">
          Không nhớ? <button className="underline hover:text-petal-600" onClick={() => submit("")}>Xem đáp án</button>
        </p>
      )}
    </div>
  );
}
