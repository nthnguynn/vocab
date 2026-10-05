"use client";

import { useState, useEffect, useRef, useMemo, useTransition } from "react";
import Link from "next/link";
import { splitSentences, tokenizeWords, maskWord, calculateRecitationDiff, type WordToken } from "@/lib/passages";
import { recordPassageSession } from "@/app/actions";
import DeleteButton from "./DeleteButton";
import { deletePassage } from "@/app/actions";

// Sound effects with Web Audio API (zero external assets needed)
function playSound(type: "correct" | "wrong" | "celebrate" | "tap") {
  if (typeof window === "undefined") return;
  try {
    const AudioContext = window.AudioContext || (window as unknown as { webkitAudioContext: typeof window.AudioContext }).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    if (type === "tap") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } else if (type === "correct") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.exponentialRampToValueAtTime(659.25, ctx.currentTime + 0.1); // E5
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } else if (type === "wrong") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(160, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } else if (type === "celebrate") {
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.1);
        gain.gain.setValueAtTime(0.12, ctx.currentTime + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.1 + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.1);
        osc.stop(ctx.currentTime + idx * 0.1 + 0.35);
      });
    }
  } catch {
    // Ignore audio failures if browser blocks autoplay
  }
}

interface PassageStudioProps {
  passage: {
    id: number;
    title: string;
    content: string;
    translation: string | null;
    level: string;
    tags: string | null;
    timesPracticed: number;
    bestScore: number | null;
    topic?: { id: number; name: string; emoji: string } | null;
  };
}

type PracticeMode = "listen" | "vanish" | "typing" | "scramble" | "recite";

export default function PassagePracticeStudio({ passage }: PassageStudioProps) {
  const [mode, setMode] = useState<PracticeMode>("listen");
  const [, startTransition] = useTransition();

  // Audio Speech state
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeSentenceIndex, setActiveSentenceIndex] = useState<number | null>(null);
  const [playbackRate, setPlaybackRate] = useState<number>(0.9);

  // Sentences and tokens
  const sentences = useMemo(() => splitSentences(passage.content), [passage.content]);
  const tokens = useMemo(() => tokenizeWords(passage.content), [passage.content]);

  // Mode 2: Vanish Cloze State
  const [vanishLevel, setVanishLevel] = useState<1 | 2 | 3 | 4>(2);
  const [revealedWordIndices, setRevealedWordIndices] = useState<Set<number>>(new Set());
  const [isPeeking, setIsPeeking] = useState(false);
  const [showVietnamesePrompt, setShowVietnamesePrompt] = useState(true);

  // Mode 3: Speed Typing State
  const [typingModeType, setTypingModeType] = useState<"first_letter" | "full_word">("first_letter");
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [typedInput, setTypedInput] = useState("");
  const [typingMistakes, setTypingMistakes] = useState(0);
  const [typingStartTime, setTypingStartTime] = useState<number | null>(null);
  const [typingFinished, setTypingFinished] = useState(false);
  const [typingStats, setTypingStats] = useState<{ score: number; accuracy: number; wpm: number; seconds: number } | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const typingInputRef = useRef<HTMLInputElement>(null);

  // Mode 4: Sentence Scramble State
  const [scramblePool, setScramblePool] = useState<{ id: number; text: string }[]>([]);
  const [reconstructedSentences, setReconstructedSentences] = useState<string[]>([]);
  const [scrambleErrorIndex, setScrambleErrorIndex] = useState<number | null>(null);
  const [scrambleFinished, setScrambleFinished] = useState(false);

  // Mode 5: Self Recite Diff State
  const [reciteInput, setReciteInput] = useState("");
  const [diffResult, setDiffResult] = useState<ReturnType<typeof calculateRecitationDiff> | null>(null);
  const [reciteSaved, setReciteSaved] = useState(false);

  // Audio speech handling
  const stopSpeech = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
    setActiveSentenceIndex(null);
  };

  const speakSentence = (text: string, index?: number) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = playbackRate;
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find((v) => v.lang === "en-US" || v.lang.startsWith("en"));
    if (voice) u.voice = voice;

    if (index !== undefined) {
      setActiveSentenceIndex(index);
    }
    setIsPlaying(true);

    u.onend = () => {
      setIsPlaying(false);
      setActiveSentenceIndex(null);
    };

    u.onerror = () => {
      setIsPlaying(false);
      setActiveSentenceIndex(null);
    };

    window.speechSynthesis.speak(u);
  };

  const playFullParagraph = () => {
    if (isPlaying) {
      stopSpeech();
      return;
    }
    let idx = 0;
    const playNext = () => {
      if (idx >= sentences.length) {
        setIsPlaying(false);
        setActiveSentenceIndex(null);
        return;
      }
      setActiveSentenceIndex(idx);
      setIsPlaying(true);
      const u = new SpeechSynthesisUtterance(sentences[idx]);
      u.lang = "en-US";
      u.rate = playbackRate;
      const voice = window.speechSynthesis.getVoices().find((v) => v.lang.startsWith("en"));
      if (voice) u.voice = voice;
      u.onend = () => {
        idx++;
        playNext();
      };
      u.onerror = () => {
        setIsPlaying(false);
        setActiveSentenceIndex(null);
      };
      window.speechSynthesis.speak(u);
    };
    playNext();
  };

  // Reset or initialize modes
  const initScramble = () => {
    const list = sentences.map((text, idx) => ({ id: idx, text }));
    // Shuffle
    const shuffled = [...list].sort(() => Math.random() - 0.5);
    setScramblePool(shuffled);
    setReconstructedSentences([]);
    setScrambleFinished(false);
  };

  const resetTyping = () => {
    setCurrentWordIndex(0);
    setTypedInput("");
    setTypingMistakes(0);
    setTypingStartTime(null);
    setTypingFinished(false);
    setTypingStats(null);
    setTimeout(() => typingInputRef.current?.focus(), 100);
  };

  useEffect(() => {
    return () => {
      stopSpeech();
    };
  }, []);

  // When mode changes
  useEffect(() => {
    stopSpeech();
    if (mode === "scramble") {
      initScramble();
    } else if (mode === "typing") {
      resetTyping();
    }
  }, [mode]);

  // Handle typing input
  const handleTypingKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (typingFinished || currentWordIndex >= tokens.length) return;

    if (!typingStartTime) {
      setTypingStartTime(Date.now());
    }

    const currentToken = tokens[currentWordIndex];
    const targetClean = currentToken.cleanWord;
    const targetChar = targetClean[0]?.toLowerCase();

    if (typingModeType === "first_letter") {
      // First letter rapid recall
      const key = e.key.toLowerCase();

      // Only match letters/numbers
      if (!/^[a-z0-9]$/i.test(key)) {
        if (e.key === " " || e.key === "Enter") {
          // Space triggers a peek/hint for this word
          e.preventDefault();
          revealCurrentWordHint();
        }
        return;
      }

      e.preventDefault();

      if (key === targetChar) {
        // Correct!
        playSound("tap");
        const nextIndex = currentWordIndex + 1;
        setCurrentWordIndex(nextIndex);
        setTypedInput("");

        if (nextIndex >= tokens.length) {
          finishTyping(nextIndex);
        }
      } else {
        // Wrong key
        playSound("wrong");
        setTypingMistakes((m) => m + 1);
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 400);
      }
    }
  };

  const handleFullWordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (typingModeType !== "full_word" || typingFinished) return;
    const val = e.target.value;

    if (!typingStartTime && val.length > 0) {
      setTypingStartTime(Date.now());
    }

    const currentToken = tokens[currentWordIndex];
    const targetClean = currentToken.cleanWord;

    // If user typed space or matches word
    if (val.endsWith(" ") || val.toLowerCase().trim() === targetClean) {
      const cleanVal = val.toLowerCase().trim().replace(/[^a-z0-9]/gi, "");
      if (cleanVal === targetClean) {
        playSound("tap");
        const nextIndex = currentWordIndex + 1;
        setCurrentWordIndex(nextIndex);
        setTypedInput("");

        if (nextIndex >= tokens.length) {
          finishTyping(nextIndex);
        }
      } else if (val.endsWith(" ")) {
        // Typed space on wrong word
        playSound("wrong");
        setTypingMistakes((m) => m + 1);
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 400);
      }
    } else {
      setTypedInput(val);
    }
  };

  const revealCurrentWordHint = () => {
    if (currentWordIndex >= tokens.length) return;
    playSound("tap");
    setTypingMistakes((m) => m + 1);
    const nextIndex = currentWordIndex + 1;
    setCurrentWordIndex(nextIndex);
    setTypedInput("");
    if (nextIndex >= tokens.length) {
      finishTyping(nextIndex);
    }
  };

  const finishTyping = (finalIndex: number) => {
    const elapsedSeconds = Math.max(1, Math.round((Date.now() - (typingStartTime || Date.now())) / 1000));
    const totalWords = tokens.length;
    const accuracy = Math.max(10, Math.round(((totalWords - typingMistakes) / totalWords) * 100));
    const wpm = Math.round((totalWords / elapsedSeconds) * 60);
    const score = Math.round(accuracy * 0.7 + Math.min(30, (wpm / 40) * 30));

    setTypingFinished(true);
    setTypingStats({ score, accuracy, wpm, seconds: elapsedSeconds });
    playSound("celebrate");

    // Save session in background
    startTransition(async () => {
      await recordPassageSession({
        passageId: passage.id,
        mode: "typing",
        score,
        accuracy,
        wpm,
        timeSeconds: elapsedSeconds,
      });
    });
  };

  // Handle sentence scramble click
  const handleScramblePick = (item: { id: number; text: string }) => {
    const nextExpectedIdx = reconstructedSentences.length;
    if (item.id === nextExpectedIdx) {
      // Correct sentence!
      playSound("correct");
      setReconstructedSentences([...reconstructedSentences, item.text]);
      setScramblePool(scramblePool.filter((p) => p.id !== item.id));
      speakSentence(item.text);

      if (reconstructedSentences.length + 1 >= sentences.length) {
        // Complete!
        setScrambleFinished(true);
        playSound("celebrate");
        startTransition(async () => {
          await recordPassageSession({
            passageId: passage.id,
            mode: "scramble",
            score: 100,
            accuracy: 100,
          });
        });
      }
    } else {
      // Incorrect order
      playSound("wrong");
      setScrambleErrorIndex(item.id);
      setTimeout(() => setScrambleErrorIndex(null), 600);
    }
  };

  // Handle recitation diff check
  const handleCheckRecite = () => {
    if (!reciteInput.trim()) return;
    const diff = calculateRecitationDiff(passage.content, reciteInput);
    setDiffResult(diff);
    playSound(diff.accuracy >= 80 ? "celebrate" : "correct");

    startTransition(async () => {
      await recordPassageSession({
        passageId: passage.id,
        mode: "recite",
        score: diff.accuracy,
        accuracy: diff.accuracy,
      });
      setReciteSaved(true);
    });
  };

  // Toggle flash-reveal on word in Vanish Cloze
  const flashWord = (idx: number) => {
    setRevealedWordIndices((prev) => {
      const next = new Set(prev);
      next.add(idx);
      return next;
    });
    setTimeout(() => {
      setRevealedWordIndices((prev) => {
        const next = new Set(prev);
        next.delete(idx);
        return next;
      });
    }, 1800);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Link
            href="/passages"
            className="inline-flex size-9 items-center justify-center rounded-full bg-petal-100 text-petal-700 transition hover:bg-petal-200"
            title="Quay lại danh sách đoạn văn"
          >
            ←
          </Link>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="h-display text-2xl sm:text-3xl">{passage.title}</h1>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  passage.level === "Beginner"
                    ? "bg-mint/15 text-mint"
                    : passage.level === "Advanced"
                    ? "bg-berry/15 text-berry"
                    : "bg-petal-100 text-petal-700"
                }`}
              >
                {passage.level === "Beginner" ? "Cơ bản" : passage.level === "Advanced" ? "Nâng cao" : "Trung cấp"}
              </span>
              {passage.topic && (
                <span className="chip">
                  {passage.topic.emoji} {passage.topic.name}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-muted">
              {tokens.length} từ · {sentences.length} câu · Đã luyện {passage.timesPracticed} lần
              {passage.bestScore !== null && ` · Điểm cao nhất: ${passage.bestScore}%`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Link
            href={`/passages/${passage.id}/edit`}
            className="btn-soft !px-3.5 !py-1.5 text-xs"
            title="Chỉnh sửa đoạn văn"
          >
            ✏️ Sửa
          </Link>
          <DeleteButton
            onDelete={deletePassage.bind(null, passage.id)}
            confirmText={`Xóa đoạn văn “${passage.title}”?`}
          />
        </div>
      </div>

      {/* Mode Navigation Tabs */}
      <div className="card !p-2">
        <nav className="grid grid-cols-2 gap-1.5 sm:grid-cols-5">
          <button
            type="button"
            onClick={() => setMode("listen")}
            className={`flex items-center justify-center gap-1.5 rounded-2xl px-3 py-2.5 text-xs font-semibold transition ${
              mode === "listen"
                ? "bg-petal-500 text-white shadow-soft"
                : "text-muted hover:bg-petal-50 hover:text-petal-700"
            }`}
          >
            <span>🎧</span>
            <span>1. Nghe & Nhại</span>
          </button>

          <button
            type="button"
            onClick={() => setMode("vanish")}
            className={`flex items-center justify-center gap-1.5 rounded-2xl px-3 py-2.5 text-xs font-semibold transition ${
              mode === "vanish"
                ? "bg-petal-500 text-white shadow-soft"
                : "text-muted hover:bg-petal-50 hover:text-petal-700"
            }`}
          >
            <span>🌫️</span>
            <span>2. Biến mất dần</span>
          </button>

          <button
            type="button"
            onClick={() => setMode("typing")}
            className={`flex items-center justify-center gap-1.5 rounded-2xl px-3 py-2.5 text-xs font-semibold transition ${
              mode === "typing"
                ? "bg-petal-500 text-white shadow-soft"
                : "text-muted hover:bg-petal-50 hover:text-petal-700"
            }`}
          >
            <span>⌨️</span>
            <span>3. Gõ phản xạ</span>
          </button>

          <button
            type="button"
            onClick={() => setMode("scramble")}
            className={`flex items-center justify-center gap-1.5 rounded-2xl px-3 py-2.5 text-xs font-semibold transition ${
              mode === "scramble"
                ? "bg-petal-500 text-white shadow-soft"
                : "text-muted hover:bg-petal-50 hover:text-petal-700"
            }`}
          >
            <span>🧩</span>
            <span>4. Ghép câu</span>
          </button>

          <button
            type="button"
            onClick={() => setMode("recite")}
            className={`col-span-2 sm:col-span-1 flex items-center justify-center gap-1.5 rounded-2xl px-3 py-2.5 text-xs font-semibold transition ${
              mode === "recite"
                ? "bg-petal-500 text-white shadow-soft"
                : "text-muted hover:bg-petal-50 hover:text-petal-700"
            }`}
          >
            <span>🎤</span>
            <span>5. Tự kiểm tra</span>
          </button>
        </nav>
      </div>

      {/* ============================================================ */}
      {/* MODE 1: LISTEN & SHADOWING */}
      {/* ============================================================ */}
      {mode === "listen" && (
        <div className="space-y-4">
          {/* Audio Control Bar */}
          <div className="card flex flex-wrap items-center justify-between gap-4 !py-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={playFullParagraph}
                className={`btn !px-5 !py-2.5 text-sm ${isPlaying ? "!bg-berry shadow-none" : ""}`}
              >
                {isPlaying ? "⏹️ Dừng đọc" : "▶️ Nghe toàn bộ đoạn"}
              </button>
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted">
                <span>Tốc độ:</span>
                {[0.75, 0.9, 1.0, 1.25].map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => {
                      setPlaybackRate(rate);
                      if (isPlaying) {
                        stopSpeech();
                      }
                    }}
                    className={`rounded-lg px-2 py-1 transition ${
                      playbackRate === rate ? "bg-petal-500 text-white font-bold" : "bg-petal-100 text-petal-700 hover:bg-petal-200"
                    }`}
                  >
                    {rate}x
                  </button>
                ))}
              </div>
            </div>

            <div className="text-xs text-muted">
              💡 Bấm vào từng câu dưới đây để nghe riêng câu đó và nhại theo (Shadowing).
            </div>
          </div>

          {/* Sentence by Sentence Cards */}
          <div className="space-y-3">
            {sentences.map((sent, idx) => {
              const isActive = activeSentenceIndex === idx;
              return (
                <div
                  key={idx}
                  onClick={() => speakSentence(sent, idx)}
                  className={`card cursor-pointer transition-all hover:scale-[1.01] hover:border-petal-300 ${
                    isActive ? "ring-2 ring-petal-500 bg-petal-50/90 shadow-pop" : "bg-white/90"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-petal-100 text-xs font-bold text-petal-700">
                          {idx + 1}
                        </span>
                        <p className={`text-base sm:text-lg font-medium leading-relaxed ${isActive ? "text-petal-700" : "text-ink"}`}>
                          {sent}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        speakSentence(sent, idx);
                      }}
                      className="grid size-9 shrink-0 place-items-center rounded-full bg-petal-100 text-petal-700 transition hover:bg-petal-200 active:scale-95"
                      title="Nghe câu này"
                    >
                      {isActive && isPlaying ? "🔊" : "🔈"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Vietnamese Translation Accordion */}
          {passage.translation && (
            <div className="card bg-petal-50/60 border-dashed border-petal-200">
              <h3 className="h-display text-sm font-semibold text-petal-700">🇻🇳 Bản dịch tiếng Việt để hiểu trọn vẹn:</h3>
              <p className="mt-2 text-sm text-ink/80 leading-relaxed whitespace-pre-line">{passage.translation}</p>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* MODE 2: VANISHING TEXT (DISAPPEARING CLOZE) */}
      {/* ============================================================ */}
      {mode === "vanish" && (
        <div className="space-y-5">
          {/* Level Switcher */}
          <div className="card flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Cấp độ biến mất</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {[
                  { lvl: 1 as const, label: "Cấp 1: Đầy đủ (100%)", icon: "📖" },
                  { lvl: 2 as const, label: "Cấp 2: Chữ cái đầu", icon: "✨" },
                  { lvl: 3 as const, label: "Cấp 3: Khuyết 50%", icon: "🧩" },
                  { lvl: 4 as const, label: "Cấp 4: Ẩn hoàn toàn", icon: "🙈" },
                ].map((item) => (
                  <button
                    key={item.lvl}
                    type="button"
                    onClick={() => {
                      setVanishLevel(item.lvl);
                      setRevealedWordIndices(new Set());
                    }}
                    className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                      vanishLevel === item.lvl
                        ? "bg-petal-500 text-white shadow-soft"
                        : "bg-petal-100 text-petal-700 hover:bg-petal-200"
                    }`}
                  >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onMouseDown={() => setIsPeeking(true)}
                onMouseUp={() => setIsPeeking(false)}
                onTouchStart={() => setIsPeeking(true)}
                onTouchEnd={() => setIsPeeking(false)}
                className="btn-soft text-xs select-none active:scale-95"
                title="Bấm giữ để nhìn lại bản gốc"
              >
                👁️ Giữ để nhìn trộm
              </button>

              <button
                type="button"
                onClick={() => setShowVietnamesePrompt(!showVietnamesePrompt)}
                className="btn-ghost text-xs"
              >
                {showVietnamesePrompt ? "Ẩn bản dịch" : "Hiện bản dịch"}
              </button>
            </div>
          </div>

          {/* Interactive Paragraph Card */}
          <div className="card relative !p-6 sm:!p-8 leading-loose text-lg sm:text-xl font-medium">
            <div className="flex flex-wrap gap-x-2 gap-y-3">
              {tokens.map((t) => {
                const isRevealed = isPeeking || revealedWordIndices.has(t.index);
                let display = t.raw;

                if (!isRevealed) {
                  if (vanishLevel === 2) {
                    // First letter mode
                    display = t.leadingPunct + maskWord(t.word, "first_letter") + t.trailingPunct;
                  } else if (vanishLevel === 3) {
                    // 50% random cloze based on index parity
                    if (t.index % 2 === 1) {
                      display = t.leadingPunct + maskWord(t.word, "blank") + t.trailingPunct;
                    }
                  } else if (vanishLevel === 4) {
                    // Blind mode
                    display = t.leadingPunct + maskWord(t.word, "dots") + t.trailingPunct;
                  }
                }

                return (
                  <button
                    key={t.index}
                    type="button"
                    onClick={() => flashWord(t.index)}
                    title="Bấm để hé lộ từ này trong 1.5 giây"
                    className={`inline-block rounded-lg px-1.5 py-0.5 transition font-display cursor-pointer ${
                      isRevealed
                        ? "bg-mint/20 text-mint font-bold scale-105"
                        : vanishLevel > 1
                        ? "bg-petal-100/70 text-petal-800 hover:bg-petal-200"
                        : "hover:bg-petal-50"
                    }`}
                  >
                    {display}
                  </button>
                );
              })}
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-petal-100 pt-4 text-xs text-muted">
              <span>💡 Chạm vào bất kỳ từ nào để hé lộ từ đó tạm thời.</span>
              <button
                type="button"
                onClick={() => {
                  playSound("celebrate");
                  startTransition(async () => {
                    await recordPassageSession({
                      passageId: passage.id,
                      mode: "vanish",
                      score: vanishLevel * 25,
                      accuracy: vanishLevel * 25,
                    });
                  });
                  if (vanishLevel < 4) {
                    setVanishLevel((v) => (v + 1) as 1 | 2 | 3 | 4);
                  }
                }}
                className="btn !px-4 !py-1.5 text-xs"
              >
                {vanishLevel < 4 ? "Đã thuộc cấp này! Lên cấp tiếp theo 🚀" : "Đã chinh phục Cấp 4! 🎉"}
              </button>
            </div>
          </div>

          {showVietnamesePrompt && passage.translation && (
            <div className="card bg-petal-50/50">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted">Bản dịch gợi ý:</h4>
              <p className="mt-1 text-sm text-ink/80 leading-relaxed">{passage.translation}</p>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* MODE 3: ACTIVE SPEED TYPING & RAPID RECALL */}
      {/* ============================================================ */}
      {mode === "typing" && (
        <div className="space-y-5">
          {/* Sub-mode selector & Telemetry */}
          <div className="card flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setTypingModeType("first_letter");
                  resetTyping();
                }}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                  typingModeType === "first_letter"
                    ? "bg-petal-500 text-white shadow-soft"
                    : "bg-petal-100 text-petal-700 hover:bg-petal-200"
                }`}
              >
                ⚡ Gõ chữ cái đầu (Phản xạ siêu tốc)
              </button>
              <button
                type="button"
                onClick={() => {
                  setTypingModeType("full_word");
                  resetTyping();
                }}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                  typingModeType === "full_word"
                    ? "bg-petal-500 text-white shadow-soft"
                    : "bg-petal-100 text-petal-700 hover:bg-petal-200"
                }`}
              >
                ⌨️ Gõ nguyên từ
              </button>
            </div>

            <div className="flex items-center gap-4 text-xs font-medium text-muted">
              <div>
                Tiến độ: <span className="font-bold text-petal-600">{currentWordIndex}/{tokens.length}</span>
              </div>
              <div>
                Lỗi sai: <span className="font-bold text-berry">{typingMistakes}</span>
              </div>
              <button type="button" onClick={resetTyping} className="btn-ghost text-xs">
                🔄 Luyện lại
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="h-2 w-full overflow-hidden rounded-full bg-petal-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-petal-400 to-mint transition-all duration-200"
              style={{ width: `${(currentWordIndex / tokens.length) * 100}%` }}
            />
          </div>

          {/* Paragraph Visualizer */}
          <div className={`card relative !p-6 sm:!p-8 leading-loose text-lg sm:text-xl font-medium ${isShaking ? "shake ring-2 ring-berry/40" : ""}`}>
            <div className="flex flex-wrap gap-x-2 gap-y-3 font-display">
              {tokens.map((t) => {
                const isPassed = t.index < currentWordIndex;
                const isCurrent = t.index === currentWordIndex;

                let classes = "inline-block rounded-lg px-1.5 py-0.5 transition";
                if (isPassed) {
                  classes += " bg-mint/15 text-mint font-semibold";
                } else if (isCurrent) {
                  classes += " bg-petal-500 text-white shadow-soft ring-4 ring-petal-200 scale-110 font-bold animate-pulse";
                } else {
                  classes += " text-muted/60";
                }

                return (
                  <span key={t.index} className={classes}>
                    {t.raw}
                  </span>
                );
              })}
            </div>

            {/* Input field */}
            {!typingFinished && (
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <input
                  ref={typingInputRef}
                  autoFocus
                  type="text"
                  value={typedInput}
                  onChange={handleFullWordChange}
                  onKeyDown={handleTypingKey}
                  placeholder={
                    typingModeType === "first_letter"
                      ? "Nhấn phím chữ cái đầu của từ đang tô sáng..."
                      : "Gõ từ tiếp theo rồi gõ phím Cách (Space)..."
                  }
                  className="input !text-lg font-medium shadow-soft sm:flex-1"
                />

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={revealCurrentWordHint}
                    className="btn-soft text-xs !py-3 whitespace-nowrap"
                    title="Bỏ qua hoặc hé lộ từ này"
                  >
                    💡 Gợi ý / Bỏ qua
                  </button>
                  {currentWordIndex < tokens.length && (
                    <button
                      type="button"
                      onClick={() => speakSentence(tokens[currentWordIndex].word)}
                      className="btn-ghost text-xs !py-3 whitespace-nowrap"
                    >
                      🔊 Nghe từ này
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Finish Celebration Modal */}
            {typingFinished && typingStats && (
              <div className="pop-in mt-6 rounded-3xl border border-mint/30 bg-mint/10 p-6 text-center">
                <span className="text-4xl">🎉</span>
                <h3 className="h-display mt-2 text-2xl text-mint">Tuyệt vời! Bạn đã hoàn thành bài gõ!</h3>
                <p className="mt-1 text-sm text-ink/80">Kỹ năng phản xạ ghi nhớ của bạn đã tiến bộ vượt bậc.</p>

                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 max-w-xl mx-auto">
                  <div className="rounded-2xl bg-white p-3 shadow-soft">
                    <p className="text-xs text-muted uppercase">Điểm số</p>
                    <p className="font-display text-2xl font-bold text-petal-600">{typingStats.score}</p>
                  </div>
                  <div className="rounded-2xl bg-white p-3 shadow-soft">
                    <p className="text-xs text-muted uppercase">Độ chính xác</p>
                    <p className="font-display text-2xl font-bold text-mint">{typingStats.accuracy}%</p>
                  </div>
                  <div className="rounded-2xl bg-white p-3 shadow-soft">
                    <p className="text-xs text-muted uppercase">Tốc độ gõ</p>
                    <p className="font-display text-2xl font-bold text-ink">{typingStats.wpm} WPM</p>
                  </div>
                  <div className="rounded-2xl bg-white p-3 shadow-soft">
                    <p className="text-xs text-muted uppercase">Thời gian</p>
                    <p className="font-display text-2xl font-bold text-ink">{typingStats.seconds}s</p>
                  </div>
                </div>

                <div className="mt-5 flex justify-center gap-3">
                  <button type="button" onClick={resetTyping} className="btn">
                    🔁 Luyện lại lần nữa
                  </button>
                  <button type="button" onClick={() => setMode("vanish")} className="btn-soft">
                    Thử chế độ Biến mất dần →
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODE 4: SENTENCE SCRAMBLE (RECONSTRUCT PARAGRAPH) */}
      {/* ============================================================ */}
      {mode === "scramble" && (
        <div className="space-y-5">
          <div className="card flex items-center justify-between !py-3">
            <div>
              <p className="text-sm font-semibold text-petal-700">🧩 Xếp các câu theo đúng trình tự câu chuyện</p>
              <p className="text-xs text-muted">Bấm vào câu tiếp theo theo đúng thứ tự logic để ghép thành đoạn văn.</p>
            </div>
            <button type="button" onClick={initScramble} className="btn-ghost text-xs">
              🔄 Xáo trộn lại
            </button>
          </div>

          {/* Target Reconstructed Box */}
          <div className="card min-h-[160px] space-y-3 bg-petal-50/50">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted">Đoạn văn đã ghép ({reconstructedSentences.length}/{sentences.length} câu):</h4>
            {reconstructedSentences.length === 0 ? (
              <p className="text-sm italic text-muted/70">Chưa có câu nào được chọn. Hãy bấm vào câu đầu tiên bên dưới.</p>
            ) : (
              <div className="space-y-2">
                {reconstructedSentences.map((s, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 rounded-2xl bg-white p-3 shadow-soft">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-mint/20 text-xs font-bold text-mint">
                      {idx + 1}
                    </span>
                    <p className="text-sm sm:text-base font-medium text-ink leading-relaxed">{s}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Available Shuffled Sentences */}
          {!scrambleFinished ? (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted">Các câu còn lại (Chọn câu tiếp theo):</h4>
              <div className="grid gap-2 sm:grid-cols-2">
                {scramblePool.map((item) => {
                  const isError = scrambleErrorIndex === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleScramblePick(item)}
                      className={`card !p-4 text-left transition hover:scale-[1.01] hover:border-petal-300 ${
                        isError ? "shake bg-berry/10 border-berry text-berry" : "bg-white"
                      }`}
                    >
                      <p className="text-sm sm:text-base font-medium leading-relaxed">{item.text}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="pop-in card bg-mint/10 border-mint/30 text-center !p-7">
              <span className="text-4xl">🏆</span>
              <h3 className="h-display mt-2 text-2xl text-mint">Tuyệt đỉnh! Đoạn văn đã được ghép hoàn chỉnh!</h3>
              <p className="mt-1 text-sm text-ink/80">Bạn đã nắm rất vững cấu trúc và dòng chảy nội dung của bài.</p>
              <div className="mt-4 flex justify-center gap-3">
                <button type="button" onClick={initScramble} className="btn">
                  Chơi lại lần nữa
                </button>
                <button type="button" onClick={() => setMode("recite")} className="btn-soft">
                  Chuyển sang Tự gõ kiểm tra →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* MODE 5: RECITATION & SMART DIFF CHECK */}
      {/* ============================================================ */}
      {mode === "recite" && (
        <div className="space-y-5">
          <div className="card">
            <h3 className="h-display text-lg">🎤 Tự nhớ & Đối chiếu bản gốc</h3>
            <p className="mt-1 text-xs text-muted">
              Hãy nhắm mắt nhẩm lại hoặc tự gõ lại đoạn văn theo trí nhớ của bạn. Sau đó bấm So sánh để hệ thống chỉ ra chính xác từ nào bạn nhớ đúng, từ nào bị bỏ quên!
            </p>

            <div className="mt-4">
              <textarea
                rows={6}
                value={reciteInput}
                onChange={(e) => {
                  setReciteInput(e.target.value);
                  setDiffResult(null);
                  setReciteSaved(false);
                }}
                placeholder="Gõ lại toàn bộ đoạn văn tiếng Anh theo trí nhớ của bạn vào đây..."
                className="input !text-base leading-relaxed"
              />
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-muted">
                {reciteInput.trim() ? `${reciteInput.trim().split(/\s+/).length} từ đã gõ` : "Chưa nhập từ nào"}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setReciteInput("")}
                  className="btn-ghost text-xs"
                >
                  Xóa gõ lại
                </button>
                <button
                  type="button"
                  disabled={!reciteInput.trim()}
                  onClick={handleCheckRecite}
                  className="btn !px-5"
                >
                  🔍 So sánh với bản gốc
                </button>
              </div>
            </div>
          </div>

          {/* Diff Result Card */}
          {diffResult && (
            <div className="pop-in card !p-6 sm:!p-8 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-petal-100 pb-4">
                <div>
                  <h4 className="h-display text-xl">Kết quả đối chiếu trí nhớ</h4>
                  <p className="text-xs text-muted">
                    Nhớ đúng {diffResult.matchedCount}/{diffResult.totalWords} từ gốc
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-xs text-muted block uppercase">Độ chính xác</span>
                    <span
                      className={`font-display text-3xl font-bold ${
                        diffResult.accuracy >= 85
                          ? "text-mint"
                          : diffResult.accuracy >= 60
                          ? "text-petal-600"
                          : "text-berry"
                      }`}
                    >
                      {diffResult.accuracy}%
                    </span>
                  </div>

                  {reciteSaved && (
                    <span className="rounded-full bg-mint/20 px-3 py-1 text-xs font-semibold text-mint">
                      ✓ Đã lưu kết quả
                    </span>
                  )}
                </div>
              </div>

              {/* Legend */}
              <div className="flex flex-wrap items-center gap-4 text-xs font-medium">
                <span className="flex items-center gap-1.5">
                  <span className="size-3 rounded-full bg-mint" /> Đúng (Correct)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-3 rounded-full bg-berry" /> Bị thiếu / Bỏ quên (Missing)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-3 rounded-full bg-amber-400" /> Thừa / Nhầm vị trí (Extra)
                </span>
              </div>

              {/* Highlighted text */}
              <div className="rounded-2xl bg-petal-50/50 p-5 leading-loose text-base sm:text-lg font-medium font-display">
                {diffResult.tokens.map((tok, idx) => {
                  if (tok.status === "correct") {
                    return (
                      <span key={idx} className="text-mint font-semibold mr-1.5">
                        {tok.text}
                      </span>
                    );
                  }
                  if (tok.status === "missing") {
                    return (
                      <span
                        key={idx}
                        className="line-through bg-berry/15 text-berry rounded px-1 mr-1.5 font-normal"
                        title="Từ này có trong bản gốc nhưng bạn đã bỏ quên"
                      >
                        {tok.text}
                      </span>
                    );
                  }
                  return (
                    <span
                      key={idx}
                      className="bg-amber-100 text-amber-800 rounded px-1 mr-1.5 font-normal"
                      title="Từ này bạn gõ thêm hoặc sai vị trí"
                    >
                      {tok.text}
                    </span>
                  );
                })}
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setReciteInput("");
                    setDiffResult(null);
                  }}
                  className="btn-soft text-xs"
                >
                  Thử lại từ đầu
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
