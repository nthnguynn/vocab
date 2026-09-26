"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { recordReview } from "@/app/actions";
import SpeakButton, { speak } from "./SpeakButton";

export type Card = {
  id: number;
  word: string;
  meaning: string;
  type: string | null;
  example: string | null;
  definition: string | null;
  topic: string;
};

function shuffle<T>(arr: T[]) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function Flashcards({ cards: initial }: { cards: Card[] }) {
  const [cards, setCards] = useState(initial);
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [reverse, setReverse] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [results, setResults] = useState<Record<number, boolean>>({});
  const [, startTransition] = useTransition();

  const card = cards[i];
  const done = i >= cards.length;

  useEffect(() => {
    if (card && autoSpeak && !reverse) speak(card.word);
  }, [card, autoSpeak, reverse]);

  const answer = useCallback(
    (remembered: boolean) => {
      if (!card) return;
      setResults((r) => ({ ...r, [card.id]: remembered }));
      startTransition(() => recordReview(card.id, remembered));
      setFlipped(false);
      setI((x) => x + 1);
    },
    [card],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (done || (e.target as HTMLElement).closest("input,textarea,select")) return;
      if (e.code === "Space") {
        e.preventDefault();
        setFlipped((f) => !f);
      } else if (flipped && (e.key === "1" || e.key === "ArrowLeft")) answer(false);
      else if (flipped && (e.key === "2" || e.key === "ArrowRight")) answer(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [answer, done, flipped]);

  const restart = (list: Card[]) => {
    setCards(list);
    setI(0);
    setFlipped(false);
    setResults({});
  };

  if (cards.length === 0) return null;

  if (done) {
    const remembered = cards.filter((c) => results[c.id]).length;
    const forgot = cards.filter((c) => results[c.id] === false);
    return (
      <div className="card pop-in mx-auto max-w-xl !p-8 text-center">
        <p className="text-5xl">{forgot.length === 0 ? "🎉" : "🌷"}</p>
        <h2 className="h-display mt-3 text-2xl">Hoàn thành lượt ôn!</h2>
        <p className="mt-2 text-muted">
          Nhớ <b className="text-mint">{remembered}</b> / {cards.length} từ
        </p>
        {forgot.length > 0 && (
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {forgot.map((c) => (
              <span key={c.id} className="chip">{c.word}</span>
            ))}
          </div>
        )}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {forgot.length > 0 && (
            <button className="btn" onClick={() => restart(shuffle(forgot))}>
              🔁 Ôn lại {forgot.length} từ chưa nhớ
            </button>
          )}
          <button className="btn-soft" onClick={() => restart(shuffle(cards))}>Ôn lại tất cả</button>
          <Link href="/test" className="btn-soft">✍️ Làm test</Link>
        </div>
      </div>
    );
  }

  const front = reverse ? card.meaning : card.word;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Toggle on={reverse} onClick={() => { setReverse((v) => !v); setFlipped(false); }}>
            {reverse ? "VI → EN" : "EN → VI"}
          </Toggle>
          <Toggle on={autoSpeak} onClick={() => setAutoSpeak((v) => !v)}>🔊 Tự phát âm</Toggle>
          <button className="btn-ghost" onClick={() => restart(shuffle(cards))}>🔀 Trộn thẻ</button>
        </div>
        <span className="text-sm font-semibold text-petal-600">
          {i + 1} / {cards.length}
        </span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-petal-100">
        <div className="h-full rounded-full bg-gradient-to-r from-petal-300 to-petal-500 transition-all" style={{ width: `${(i / cards.length) * 100}%` }} />
      </div>

      <div
        className="flip cursor-pointer select-none"
        onClick={() => setFlipped((f) => !f)}
        role="button"
        tabIndex={0}
        aria-label="Lật thẻ"
      >
        <div className={`flip-inner relative h-80 ${flipped ? "is-flipped" : ""}`}>
          <div className="flip-face card absolute inset-0 flex flex-col items-center justify-center gap-4 !p-8 text-center">
            <span className="chip">{card.topic}</span>
            <p className="h-display text-4xl break-words sm:text-5xl">{front}</p>
            {!reverse && card.type && <p className="text-sm text-muted italic">({card.type})</p>}
            {!reverse && <SpeakButton text={card.word} className="!size-11 !text-lg" />}
            <p className="absolute bottom-5 text-xs text-petal-300">Chạm để lật · phím Space</p>
          </div>
          <div className="flip-face flip-back absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-3xl bg-gradient-to-br from-petal-400 to-petal-600 p-8 text-center text-white shadow-pop">
            <p className="font-display text-sm font-semibold opacity-80">{reverse ? card.meaning : card.word}</p>
            <p className="font-display text-3xl font-bold break-words sm:text-4xl">{reverse ? card.word : card.meaning}</p>
            {reverse && <SpeakButton text={card.word} className="!bg-white/25" />}
            {card.example && <p className="max-w-md text-sm italic opacity-95">“{card.example}”</p>}
            {card.definition && !card.example && <p className="max-w-md text-sm opacity-90">{card.definition}</p>}
          </div>
        </div>
      </div>

      <div className={`grid grid-cols-2 gap-3 transition ${flipped ? "opacity-100" : "pointer-events-none opacity-40"}`}>
        <button onClick={() => answer(false)} className="btn-soft !py-3.5 !text-base">😢 Chưa nhớ <kbd className="text-xs opacity-60">1</kbd></button>
        <button onClick={() => answer(true)} className="btn !py-3.5 !text-base">💖 Nhớ rồi <kbd className="text-xs opacity-70">2</kbd></button>
      </div>
    </div>
  );
}

function Toggle({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${on ? "bg-petal-500 text-white" : "bg-petal-100 text-petal-700 hover:bg-petal-200"}`}
    >
      {children}
    </button>
  );
}
