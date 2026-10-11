"use client";

import { useState, useEffect, useRef, useMemo, useTransition, useCallback } from "react";
import Link from "next/link";
import {
  type ReflexUnit,
  type ReflexSentence,
  calculateSentenceDiff,
  calculateSpeechAccuracy,
  normalizeSentence,
  type DiffWord,
} from "@/lib/reflex";
import {
  recordReflexSession,
  toggleBookmarkSentence,
  resetUnitReflexProgress,
  saveSentenceReflexProgress,
} from "@/app/actions";

// Sound effects with Web Audio API
function playSound(type: "correct" | "wrong" | "celebrate" | "tap" | "tick") {
  if (typeof window === "undefined") return;
  try {
    const AudioContext =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof window.AudioContext }).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    if (type === "tap" || type === "tick") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(type === "tick" ? 800 : 500, ctx.currentTime);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.04);
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
    // Ignore if audio is blocked
  }
}

// Text-to-Speech function
export function speakSentence(text: string, rate: number = 0.95, onEnd?: () => void) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    if (onEnd) onEnd();
    return;
  }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-US";
  u.rate = rate;

  const voices = window.speechSynthesis.getVoices();
  const naturalVoice =
    voices.find((v) => v.lang.startsWith("en") && (v.name.includes("Natural") || v.name.includes("Google"))) ||
    voices.find((v) => v.lang.startsWith("en-US")) ||
    voices.find((v) => v.lang.startsWith("en"));

  if (naturalVoice) u.voice = naturalVoice;
  if (onEnd) {
    u.onend = () => onEnd();
    u.onerror = () => onEnd();
  }
  window.speechSynthesis.speak(u);
}

export type PracticeMode = "write" | "speak" | "flashcard" | "scramble";

interface SentenceProgressData {
  orderNumber: number;
  isBookmarked: boolean;
  timesPracticed: number;
  lastScore: number | null;
}

interface ReflexPracticeStudioProps {
  unit: ReflexUnit;
  initialProgress: SentenceProgressData[];
  categoryName?: string;
  isCustomSet?: boolean;
}

export default function ReflexPracticeStudio({
  unit,
  initialProgress,
  categoryName,
  isCustomSet = false,
}: ReflexPracticeStudioProps) {
  const [mode, setMode] = useState<PracticeMode>("write");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playbackRate, setPlaybackRate] = useState<number>(0.95);
  const [showHints, setShowHints] = useState(true);
  const [, startTransition] = useTransition();

  // Bookmarks state map
  const [bookmarks, setBookmarks] = useState<Record<number, boolean>>(() => {
    const map: Record<number, boolean> = {};
    initialProgress.forEach((p) => {
      map[p.orderNumber] = p.isBookmarked;
    });
    return map;
  });

  const [isShuffled, setIsShuffled] = useState(false);
  const [practiceSentences, setPracticeSentences] = useState<ReflexSentence[]>(() => unit.sentences);

  // Sync when unit changes
  useEffect(() => {
    setPracticeSentences(unit.sentences);
    setIsShuffled(false);
    setCurrentIndex(0);
  }, [unit]);

  const toggleShuffle = () => {
    playSound("tap");
    if (!isShuffled) {
      const shuffled = [...unit.sentences].sort(() => Math.random() - 0.5);
      setPracticeSentences(shuffled);
      setIsShuffled(true);
    } else {
      setPracticeSentences(unit.sentences);
      setIsShuffled(false);
    }
    setCurrentIndex(0);
    setTypedInput("");
    setWriteSubmitted(false);
    setWriteDiff(null);
    setIsFlipped(false);
    setSpokenTranscript("");
    setSpeakScore(null);
    setSpeechError(null);
  };

  const sentences = practiceSentences;
  const currentSentence = sentences[currentIndex] || sentences[0];
  const isBookmarked = !!bookmarks[currentSentence?.order];

  // Sentence progress tracking state
  const [progressState, setProgressState] = useState<
    Record<number, { timesPracticed: number; lastScore: number | null; isCorrect?: boolean }>
  >(() => {
    const map: Record<number, { timesPracticed: number; lastScore: number | null; isCorrect?: boolean }> = {};
    initialProgress.forEach((p) => {
      map[p.orderNumber] = {
        timesPracticed: p.timesPracticed,
        lastScore: p.lastScore,
        isCorrect: p.lastScore !== null ? p.lastScore >= 80 : undefined,
      };
    });
    return map;
  });

  // Calculate wrong and correct sentences for re-practice
  const wrongSentences = useMemo(() => {
    return unit.sentences.filter((s) => {
      const prog = progressState[s.order];
      return prog && prog.timesPracticed > 0 && (prog.isCorrect === false || (prog.lastScore !== null && prog.lastScore < 80));
    });
  }, [unit.sentences, progressState]);

  const correctSentences = useMemo(() => {
    return unit.sentences.filter((s) => {
      const prog = progressState[s.order];
      return prog && prog.timesPracticed > 0 && (prog.isCorrect === true || (prog.lastScore !== null && prog.lastScore >= 80));
    });
  }, [unit.sentences, progressState]);

  // Auto-resume from unfinished sentence position on mount
  useEffect(() => {
    if (typeof window === "undefined" || isCustomSet || unit.unitNumber <= 0) return;
    try {
      const saved = localStorage.getItem(`reflex_last_pos_${unit.unitNumber}`);
      if (saved !== null) {
        const savedIdx = parseInt(saved, 10);
        if (!isNaN(savedIdx) && savedIdx >= 0 && savedIdx < unit.sentences.length) {
          setCurrentIndex(savedIdx);
          return;
        }
      }
      // If no saved position, jump to first unpracticed sentence
      const firstUnfinished = unit.sentences.findIndex(
        (s) => (progressState[s.order]?.timesPracticed || 0) === 0
      );
      if (firstUnfinished > 0 && firstUnfinished < unit.sentences.length) {
        setCurrentIndex(firstUnfinished);
      }
    } catch {}
  }, [unit.unitNumber]);

  // Save current position to localStorage
  useEffect(() => {
    if (!isCustomSet && unit.unitNumber > 0) {
      try {
        localStorage.setItem(`reflex_last_pos_${unit.unitNumber}`, String(currentIndex));
      } catch {}
    }
  }, [currentIndex, unit.unitNumber, isCustomSet]);

  // Helper to persist single sentence result in real-time
  const saveSingleSentenceProgress = (orderNumber: number, score: number, isCorrect: boolean) => {
    setProgressState((prev) => ({
      ...prev,
      [orderNumber]: {
        timesPracticed: (prev[orderNumber]?.timesPracticed || 0) + 1,
        lastScore: score,
        isCorrect,
      },
    }));

    if (!isCustomSet && unit.unitNumber > 0) {
      startTransition(async () => {
        await saveSentenceReflexProgress({
          unitNumber: unit.unitNumber,
          orderNumber,
          score,
        });
      });
    }
  };

  // Results tracker for session summary
  const [results, setResults] = useState<
    {
      orderNumber: number;
      score: number;
      isCorrect: boolean;
      userAnswer?: string;
    }[]
  >([]);

  const [sessionStartTime] = useState<number>(() => Date.now());
  const [isCompleted, setIsCompleted] = useState(false);

  /* ================= MODE 1: PHẢN XẠ VIẾT (TYPING) ================= */
  const [typedInput, setTypedInput] = useState("");
  const [writeSubmitted, setWriteSubmitted] = useState(false);
  const [writeDiff, setWriteDiff] = useState<{ words: DiffWord[]; accuracy: number; isCorrect: boolean } | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  /* ================= MODE 2: PHẢN XẠ NÓI (SPEAKING) ================= */
  const [isListening, setIsListening] = useState(false);
  const [spokenTranscript, setSpokenTranscript] = useState("");
  const [speakScore, setSpeakScore] = useState<{ accuracy: number; isPass: boolean } | null>(null);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [timerSeconds, setTimerSeconds] = useState<number | null>(null);
  const [timerMax, setTimerMax] = useState<number>(5);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const recognitionRef = useRef<any>(null);

  /* ================= MODE 3: FLASHCARD TỰ ĐỘNG (AUTO-PLAY) ================= */
  const [isFlipped, setIsFlipped] = useState(false);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const autoPlayTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /* ================= MODE 4: GHÉP TỪ PHẢN XẠ (SCRAMBLE) ================= */
  const [scrambleTokens, setScrambleTokens] = useState<{ id: string; word: string; used: boolean }[]>([]);
  const [selectedTokens, setSelectedTokens] = useState<{ id: string; word: string }[]>([]);
  const [scrambleSubmitted, setScrambleSubmitted] = useState(false);
  const [scrambleIsCorrect, setScrambleIsCorrect] = useState(false);

  // Setup scramble tokens when current sentence changes
  useEffect(() => {
    if (mode === "scramble" && currentSentence) {
      const rawWords = currentSentence.en.split(/\s+/).filter(Boolean);
      const shuffled = rawWords
        .map((w, idx) => ({ id: `${idx}-${w}`, word: w, used: false }))
        .sort(() => Math.random() - 0.5);
      setScrambleTokens(shuffled);
      setSelectedTokens([]);
      setScrambleSubmitted(false);
      setScrambleIsCorrect(false);
    }
  }, [currentIndex, mode, currentSentence]);

  // Focus input on mode write
  useEffect(() => {
    if (mode === "write" && !writeSubmitted) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 30);
      return () => clearTimeout(timer);
    }
  }, [currentIndex, mode, writeSubmitted]);

  // Handle Speech Recognition setup
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = "en-US";

        recognition.onresult = (event: any) => {
          let currentTranscript = "";
          for (let i = event.resultIndex; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript;
          }
          setSpokenTranscript(currentTranscript);

          // If final result
          if (event.results[0].isFinal) {
            const finalSpeech = event.results[0][0].transcript;
            const evalResult = calculateSpeechAccuracy(currentSentence.en, finalSpeech);
            setSpeakScore(evalResult);
            setIsListening(false);
            if (evalResult.isPass) {
              playSound("correct");
            } else {
              playSound("wrong");
            }
            saveSingleSentenceProgress(currentSentence.order, evalResult.accuracy, evalResult.isPass);
          }
        };

        recognition.onerror = (event: any) => {
          setIsListening(false);
          if (event.error === "not-allowed") {
            setSpeechError("Microphone bị chặn. Hãy cho phép quyền truy cập micro trong trình duyệt.");
          } else {
            setSpeechError(`Lỗi nhận diện (${event.error}). Bạn có thể tự đánh giá bên dưới.`);
          }
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
    };
  }, [currentSentence]);

  // Clear timer when sentence changes or unmount
  useEffect(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    setTimerSeconds(null);
  }, [currentIndex, mode]);

  // Auto-play loop for Mode Flashcard
  useEffect(() => {
    if (mode !== "flashcard" || !isAutoPlaying) {
      if (autoPlayTimeoutRef.current) clearTimeout(autoPlayTimeoutRef.current);
      return;
    }

    // Step 1: Currently seeing Vietnamese prompt (not flipped). Wait 3 seconds, then flip & speak
    if (!isFlipped) {
      autoPlayTimeoutRef.current = setTimeout(() => {
        setIsFlipped(true);
        playSound("tap");
        speakSentence(currentSentence.en, playbackRate, () => {
          // After speaking finishes, wait 2 seconds then advance
          autoPlayTimeoutRef.current = setTimeout(() => {
            handleNextSentence();
          }, 2000);
        });
      }, 3000);
    }

    return () => {
      if (autoPlayTimeoutRef.current) clearTimeout(autoPlayTimeoutRef.current);
    };
  }, [mode, isAutoPlaying, isFlipped, currentIndex, currentSentence, playbackRate]);

  // Keyboard shortcut support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Khi nhấn phím Enter
      if (e.key === "Enter") {
        e.preventDefault();
        if (mode === "write") {
          if (!writeSubmitted) {
            handleCheckWrite();
          } else {
            handleNextSentence();
          }
        } else if (mode === "scramble") {
          if (!scrambleSubmitted && selectedTokens.length > 0) {
            handleCheckScramble();
          } else if (scrambleSubmitted) {
            handleNextSentence();
          }
        } else {
          handleNextSentence();
        }
        return;
      }

      // Khi người dùng đang gõ trong input text thì không nhận phím Space/Mũi tên làm shortcut
      if (mode === "write" && document.activeElement === inputRef.current) {
        return;
      }

      if (e.code === "Space") {
        e.preventDefault();
        speakSentence(currentSentence.en, playbackRate);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNextSentence();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrevSentence();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    mode,
    writeSubmitted,
    currentSentence,
    currentIndex,
    typedInput,
    playbackRate,
    scrambleSubmitted,
    selectedTokens,
  ]);

  /* ---------------- Actions ---------------- */

  const handleToggleBookmark = () => {
    playSound("tap");
    const nextVal = !isBookmarked;
    setBookmarks((prev) => ({ ...prev, [currentSentence.order]: nextVal }));
    startTransition(async () => {
      await toggleBookmarkSentence(unit.unitNumber, currentSentence.order);
    });
  };

  const handleNextSentence = () => {
    playSound("tap");
    // Reset state for new sentence
    setTypedInput("");
    setWriteSubmitted(false);
    setWriteDiff(null);
    setIsFlipped(false);
    setSpokenTranscript("");
    setSpeakScore(null);
    setSpeechError(null);

    if (currentIndex < sentences.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      // Completed all sentences!
      finishSession();
    }
  };

  const handlePrevSentence = () => {
    if (currentIndex > 0) {
      playSound("tap");
      setTypedInput("");
      setWriteSubmitted(false);
      setWriteDiff(null);
      setIsFlipped(false);
      setSpokenTranscript("");
      setSpeakScore(null);
      setSpeechError(null);
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const finishSession = () => {
    setIsCompleted(true);
    playSound("celebrate");
    const elapsedSeconds = Math.round((Date.now() - sessionStartTime) / 1000);

    const totalCount = sentences.length;
    const correctCount = results.filter((r) => r.isCorrect).length;
    const accuracy = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 100;

    startTransition(async () => {
      await recordReflexSession({
        unitNumber: unit.unitNumber,
        mode,
        score: accuracy,
        accuracy,
        totalCount,
        correctCount,
        timeSeconds: elapsedSeconds,
        sentenceResults: results.map((r) => ({
          orderNumber: r.orderNumber,
          score: r.score,
          isCorrect: r.isCorrect,
        })),
      });
    });
  };

  /* ----- Mode 1 Write Logic ----- */
  const handleCheckWrite = () => {
    if (!typedInput.trim()) {
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      return;
    }

    const diff = calculateSentenceDiff(currentSentence.en, typedInput);
    setWriteDiff(diff);
    setWriteSubmitted(true);

    if (diff.isCorrect) {
      playSound("correct");
    } else {
      playSound("wrong");
    }

    // Auto speak answer
    speakSentence(currentSentence.en, playbackRate);

    // Record result
    setResults((prev) => [
      ...prev.filter((r) => r.orderNumber !== currentSentence.order),
      {
        orderNumber: currentSentence.order,
        score: diff.accuracy,
        isCorrect: diff.isCorrect,
        userAnswer: typedInput,
      },
    ]);

    // Save sentence progress immediately to SQLite database
    saveSingleSentenceProgress(currentSentence.order, diff.accuracy, diff.isCorrect);
  };

  /* ----- Mode 2 Speak Logic ----- */
  const handleStartTimer = (sec: number) => {
    setTimerMax(sec);
    setTimerSeconds(sec);
    playSound("tick");

    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

    timerIntervalRef.current = setInterval(() => {
      setTimerSeconds((prev) => {
        if (prev === null || prev <= 1) {
          if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
          playSound("wrong");
          return 0;
        }
        playSound("tick");
        return prev - 1;
      });
    }, 1000);
  };

  const handleStartListening = () => {
    setSpeechError(null);
    setSpokenTranscript("");
    setSpeakScore(null);

    if (!recognitionRef.current) {
      setSpeechError("Trình duyệt này chưa hỗ trợ nhận diện giọng nói trực tiếp. Bạn có thể tự đánh giá!");
      return;
    }

    try {
      recognitionRef.current.start();
      setIsListening(true);
      playSound("tap");
    } catch {
      setIsListening(false);
    }
  };

  const handleStopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const handleSelfEvaluate = (isPass: boolean) => {
    playSound(isPass ? "correct" : "wrong");
    const accuracy = isPass ? 100 : 40;
    setSpeakScore({ accuracy, isPass });

    setResults((prev) => [
      ...prev.filter((r) => r.orderNumber !== currentSentence.order),
      {
        orderNumber: currentSentence.order,
        score: accuracy,
        isCorrect: isPass,
      },
    ]);

    saveSingleSentenceProgress(currentSentence.order, accuracy, isPass);
  };

  /* ----- Mode 4 Scramble Logic ----- */
  const handleSelectScrambleToken = (tok: { id: string; word: string }) => {
    playSound("tap");
    setScrambleTokens((prev) => prev.map((t) => (t.id === tok.id ? { ...t, used: true } : t)));
    setSelectedTokens((prev) => [...prev, tok]);
  };

  const handleRemoveScrambleToken = (tok: { id: string; word: string }, idx: number) => {
    playSound("tap");
    setSelectedTokens((prev) => prev.filter((_, i) => i !== idx));
    setScrambleTokens((prev) => prev.map((t) => (t.id === tok.id ? { ...t, used: false } : t)));
  };

  const handleCheckScramble = () => {
    const assembled = selectedTokens.map((t) => t.word).join(" ");
    const isCorrect = normalizeSentence(assembled) === normalizeSentence(currentSentence.en);
    setScrambleSubmitted(true);
    setScrambleIsCorrect(isCorrect);

    if (isCorrect) {
      playSound("correct");
    } else {
      playSound("wrong");
    }
    speakSentence(currentSentence.en, playbackRate);

    const score = isCorrect ? 100 : 0;
    setResults((prev) => [
      ...prev.filter((r) => r.orderNumber !== currentSentence.order),
      {
        orderNumber: currentSentence.order,
        score,
        isCorrect,
        userAnswer: assembled,
      },
    ]);

    saveSingleSentenceProgress(currentSentence.order, score, isCorrect);
  };

  // Reset progress action
  const handleResetProgress = () => {
    if (confirm(`Bạn có chắc muốn đặt lại toàn bộ tiến độ của Unit ${unit.unitNumber}?`)) {
      startTransition(async () => {
        await resetUnitReflexProgress(unit.unitNumber);
        setBookmarks({});
        setResults([]);
        setCurrentIndex(0);
        setIsCompleted(false);
      });
    }
  };

  /* ================= RENDER SUMMARY SCREEN ================= */
  if (isCompleted) {
    const totalCount = sentences.length;
    const correctCount = results.filter((r) => r.isCorrect).length;
    const scorePct = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 100;

    return (
      <div className="card mx-auto max-w-2xl text-center !p-8 sm:!p-12 animate-in fade-in zoom-in-95 duration-300">
        <div className="text-6xl mb-4">🎉</div>
        <span className="chip bg-petal-100 text-petal-700 font-semibold mb-2 inline-block">
          {categoryName || "Luyện phản xạ"}
        </span>
        <h2 className="h-display text-3xl font-bold text-slate-800">
          Hoàn thành xuất sắc Unit {unit.unitNumber}!
        </h2>
        <p className="mt-2 text-slate-600">
          {unit.engTitle} {unit.viTitle && `(${unit.viTitle})`}
        </p>

        {/* Stats Grid */}
        <div className="mt-8 grid grid-cols-3 gap-4">
          <div className="rounded-2xl border border-petal-100 bg-petal-50/50 p-4">
            <p className="text-xs font-medium text-slate-500">Độ chính xác</p>
            <p className="text-2xl font-bold text-petal-600 mt-1">{scorePct}%</p>
          </div>
          <div className="rounded-2xl border border-petal-100 bg-petal-50/50 p-4">
            <p className="text-xs font-medium text-slate-500">Câu đạt phản xạ</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">
              {correctCount}/{totalCount}
            </p>
          </div>
          <div className="rounded-2xl border border-petal-100 bg-petal-50/50 p-4">
            <p className="text-xs font-medium text-slate-500">Chế độ luyện</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">
              {mode === "write" ? "Viết ✍️" : mode === "speak" ? "Nói 🎙️" : mode === "flashcard" ? "Thẻ 🗂️" : "Ghép 🧩"}
            </p>
          </div>
        </div>

        {/* Navigation CTAs */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {wrongSentences.length > 0 && (
            <button
              onClick={() => {
                setPracticeSentences(wrongSentences);
                setIsShuffled(false);
                setCurrentIndex(0);
                setResults([]);
                setIsCompleted(false);
                setWriteSubmitted(false);
                setTypedInput("");
              }}
              className="btn !bg-rose-600 hover:!bg-rose-700 !text-white flex items-center gap-1.5 shadow-md"
            >
              <span>🔴</span>
              <span>Luyện lại {wrongSentences.length} câu sai</span>
            </button>
          )}
          <button
            onClick={() => {
              setPracticeSentences(unit.sentences);
              setIsShuffled(false);
              setCurrentIndex(0);
              setResults([]);
              setIsCompleted(false);
              setWriteSubmitted(false);
              setTypedInput("");
            }}
            className="btn-soft"
          >
            🔄 Luyện lại (Thứ tự)
          </button>
          <button
            onClick={() => {
              const shuffled = [...unit.sentences].sort(() => Math.random() - 0.5);
              setPracticeSentences(shuffled);
              setIsShuffled(true);
              setCurrentIndex(0);
              setResults([]);
              setIsCompleted(false);
              setWriteSubmitted(false);
              setTypedInput("");
            }}
            className="btn-soft text-petal-700 bg-petal-50 hover:bg-petal-100"
          >
            🔀 Luyện lại (Xáo câu)
          </button>
          {!isCustomSet && unit.unitNumber < 50 && (
            <Link href={`/reflex/${unit.unitNumber + 1}`} className="btn">
              Tiếp tục Unit {unit.unitNumber + 1} ➔
            </Link>
          )}
          <Link href="/reflex" className="btn-soft">
            📋 Danh sách 50 Unit
          </Link>
        </div>
      </div>
    );
  }

  /* ================= MAIN STUDIO VIEW ================= */
  return (
    <div className="space-y-6">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-petal-600">
            <Link href="/reflex" className="hover:underline">
              ⚡ Phản xạ
            </Link>
            <span>›</span>
            <span>{categoryName || `Unit ${unit.unitNumber}`}</span>
          </div>
          <h1 className="h-display text-2xl font-bold text-slate-900 mt-1">
            {unit.title}
          </h1>
          {unit.viTitle && (
            <p className="text-sm text-slate-500 font-medium">{unit.viTitle}</p>
          )}
        </div>

        {/* Action controls */}
        <div className="flex items-center gap-2">
          {/* Shuffle Toggle Button */}
          <button
            onClick={toggleShuffle}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold shadow-sm transition ${
              isShuffled
                ? "border-petal-500 bg-petal-500 text-white shadow-soft"
                : "border-slate-200 bg-white text-slate-700 hover:border-petal-300 hover:bg-petal-50 hover:text-petal-700"
            }`}
            title={isShuffled ? "Đang xáo câu ngẫu nhiên (Bấm để quay về theo thứ tự)" : "Bấm để xáo trộn câu ngẫu nhiên"}
          >
            <span>🔀</span>
            <span>{isShuffled ? "Đang xáo câu" : "Xáo câu"}</span>
          </button>

          {/* Rate selector */}
          <select
            value={playbackRate}
            onChange={(e) => setPlaybackRate(parseFloat(e.target.value))}
            className="rounded-full border border-petal-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm focus:border-petal-400 focus:outline-none"
            title="Tốc độ đọc của người bản xứ"
          >
            <option value="0.8">Tốc độ: 0.8x (Chậm)</option>
            <option value="0.95">Tốc độ: 1.0x (Chuẩn)</option>
            <option value="1.15">Tốc độ: 1.2x (Nhanh)</option>
          </select>

          {/* Reset button */}
          <button
            onClick={handleResetProgress}
            className="grid size-9 place-items-center rounded-full border border-slate-200 bg-white text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
            title="Đặt lại tiến độ bài học"
          >
            🗑️
          </button>
        </div>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-slate-100/80 p-1.5">
        <button
          onClick={() => {
            playSound("tap");
            setMode("write");
            setIsAutoPlaying(false);
          }}
          className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition ${
            mode === "write"
              ? "bg-white text-petal-600 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <span>✍️</span> Phản xạ Viết
        </button>
        <button
          onClick={() => {
            playSound("tap");
            setMode("speak");
            setIsAutoPlaying(false);
          }}
          className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition ${
            mode === "speak"
              ? "bg-white text-petal-600 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <span>🎙️</span> Phản xạ Nói
        </button>
        <button
          onClick={() => {
            playSound("tap");
            setMode("flashcard");
          }}
          className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition ${
            mode === "flashcard"
              ? "bg-white text-petal-600 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <span>🗂️</span> Thẻ Tự Động
        </button>
        <button
          onClick={() => {
            playSound("tap");
            setMode("scramble");
            setIsAutoPlaying(false);
          }}
          className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition ${
            mode === "scramble"
              ? "bg-white text-petal-600 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <span>🧩</span> Ghép từ phản xạ
        </button>
      </div>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs font-medium text-slate-500">
          <span>
            Câu {currentIndex + 1} / {sentences.length}
          </span>
          <span className="text-petal-600 font-semibold">
            {Math.round(((currentIndex + 1) / sentences.length) * 100)}% hoàn thành
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-petal-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-petal-400 to-petal-600 transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / sentences.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Quick Jump & Sentence Selector Strip */}
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 px-1 gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">Chọn câu:</span>
            <span className="text-[11px] text-emerald-600 font-semibold">✓ {correctSentences.length} đúng</span>
            {wrongSentences.length > 0 && (
              <span className="text-[11px] text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                🔴 {wrongSentences.length} câu sai
              </span>
            )}
          </div>

          {wrongSentences.length > 0 && (
            <button
              onClick={() => {
                playSound("tap");
                if (practiceSentences.length === wrongSentences.length) {
                  // Đang ở chế độ câu sai -> chuyển lại tất cả
                  setPracticeSentences(unit.sentences);
                } else {
                  // Chuyển sang chỉ luyện câu sai
                  setPracticeSentences(wrongSentences);
                }
                setCurrentIndex(0);
                setTypedInput("");
                setWriteSubmitted(false);
                setWriteDiff(null);
                setIsFlipped(false);
                setSpokenTranscript("");
                setSpeakScore(null);
                setSpeechError(null);
              }}
              className={`rounded-full px-3 py-1 text-xs font-bold transition flex items-center gap-1.5 shadow-sm ${
                practiceSentences.length === wrongSentences.length
                  ? "bg-slate-800 text-white hover:bg-slate-700"
                  : "bg-rose-500 text-white hover:bg-rose-600 shadow-soft"
              }`}
              title="Lọc riêng các câu sai để luyện đi luyện lại cho thuộc"
            >
              <span>{practiceSentences.length === wrongSentences.length ? "📋 Hiện tất cả câu" : "🎯 Luyện riêng các câu sai"}</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto py-1 px-0.5 [scrollbar-width:none]">
          {sentences.map((s, idx) => {
            const isCurrent = idx === currentIndex;
            const prog = progressState[s.order];
            const hasPracticed = (prog?.timesPracticed || 0) > 0;
            const isWrong = hasPracticed && (prog.isCorrect === false || (prog.lastScore !== null && prog.lastScore < 80));
            const isCorrect = hasPracticed && !isWrong;
            const isStarred = bookmarks[s.order];

            return (
              <button
                key={s.order}
                onClick={() => {
                  playSound("tap");
                  setCurrentIndex(idx);
                  setTypedInput("");
                  setWriteSubmitted(false);
                  setWriteDiff(null);
                  setIsFlipped(false);
                  setSpokenTranscript("");
                  setSpeakScore(null);
                  setSpeechError(null);
                }}
                className={`relative flex size-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold transition ${
                  isCurrent
                    ? "bg-petal-600 text-white shadow-soft ring-2 ring-petal-300 scale-105"
                    : isWrong
                    ? "bg-rose-100 text-rose-700 border-2 border-rose-400 hover:bg-rose-200 shadow-sm"
                    : isCorrect
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100"
                    : "bg-white text-slate-500 border border-slate-200 hover:border-petal-300 hover:text-petal-700"
                }`}
                title={`Câu #${s.order}${isWrong ? " (🔴 Làm sai - cần luyện lại)" : isCorrect ? " (🟢 Đã làm đúng)" : " (Chưa làm)"}${isStarred ? " ⭐" : ""}`}
              >
                {s.order}
                {isWrong && (
                  <span className="absolute -top-1 -right-1 flex size-2.5 items-center justify-center rounded-full bg-rose-500 text-[8px] text-white font-extrabold">
                    ✕
                  </span>
                )}
                {isStarred && !isWrong && (
                  <span className="absolute -top-1 -right-1 text-[9px]">⭐</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Practice Card */}
      <div className="card relative !p-6 sm:!p-8 overflow-hidden shadow-soft">
        {/* Top sentence bar: order number & bookmark */}
        <div className="flex items-center justify-between pb-4 border-b border-petal-100">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-full bg-petal-100 text-xs font-bold text-petal-700">
              #{currentSentence.order}
            </span>
            <span className="text-xs text-slate-500">
              Chế độ:{" "}
              {mode === "write"
                ? "Gõ phản xạ"
                : mode === "speak"
                ? "Nói & Thử thách"
                : mode === "flashcard"
                ? "Nghe & Shadowing"
                : "Sắp xếp từ"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleBookmark}
              className={`grid size-8 place-items-center rounded-full transition ${
                isBookmarked
                  ? "bg-amber-100 text-amber-500 scale-105"
                  : "bg-slate-100 text-slate-400 hover:bg-slate-200"
              }`}
              title={isBookmarked ? "Bỏ đánh dấu câu này" : "Đánh dấu câu khó để ôn lại"}
            >
              {isBookmarked ? "⭐" : "☆"}
            </button>
            <button
              onClick={() => speakSentence(currentSentence.en, playbackRate)}
              className="grid size-8 place-items-center rounded-full bg-petal-100 text-petal-700 hover:bg-petal-200 transition"
              title="Nghe phát âm người bản xứ (Phím Space)"
            >
              🔊
            </button>
          </div>
        </div>

        {/* Vietnamese Reflex Prompt */}
        <div className="my-6 text-center">
          <span className="text-xs uppercase tracking-wider font-semibold text-petal-500">
            Hãy phản xạ sang tiếng Anh:
          </span>
          <p className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-800 leading-snug">
            {currentSentence.vi}
          </p>

          {/* Vocabulary Hints Toggle */}
          {currentSentence.hints && currentSentence.hints.length > 0 && (
            <div className="mt-4">
              <button
                onClick={() => setShowHints((prev) => !prev)}
                className="text-xs text-slate-400 hover:text-petal-600 transition underline underline-offset-4"
              >
                {showHints ? "Ẩn gợi ý từ vựng ✕" : "💡 Hiện gợi ý từ vựng"}
              </button>
              {showHints && (
                <div className="mt-2 flex flex-wrap justify-center gap-1.5 animate-in fade-in duration-200">
                  {currentSentence.hints.map((hint, hIdx) => (
                    <span
                      key={hIdx}
                      className="rounded-lg border border-petal-200 bg-petal-50/70 px-2.5 py-1 text-xs font-medium text-petal-700"
                    >
                      {hint}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ============================================================== */}
        {/* INTERACTIVE MODE WORKSPACES */}
        {/* ============================================================== */}

        {/* MODE 1: PHẢN XẠ VIẾT (TYPING) */}
        {mode === "write" && (
          <div className="space-y-4">
            {!writeSubmitted ? (
              <div className={`space-y-3 ${isShaking ? "animate-shake" : ""}`}>
                <div className="relative">
                  <input
                    ref={inputRef}
                    type="text"
                    value={typedInput}
                    onChange={(e) => setTypedInput(e.target.value)}
                    placeholder="Gõ câu tiếng Anh tương ứng tại đây..."
                    className="w-full rounded-2xl border-2 border-petal-200 bg-white px-5 py-4 text-base sm:text-lg text-slate-900 shadow-inner placeholder:text-slate-400 focus:border-petal-500 focus:outline-none focus:ring-4 focus:ring-petal-100 transition"
                  />
                  {typedInput && (
                    <button
                      onClick={() => setTypedInput("")}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-sm"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">
                    Nhấn <kbd className="rounded bg-slate-200 px-1 py-0.5 text-[10px] font-mono">Enter</kbd> để kiểm tra
                  </span>
                  <button onClick={handleCheckWrite} className="btn !py-2.5 !px-6 text-sm">
                    Kiểm tra phản xạ ↵
                  </button>
                </div>
              </div>
            ) : (
              /* WRITE RESULT & DIFF VIEW */
              <div className="space-y-5 animate-in fade-in zoom-in-95 duration-200">
                <div
                  className={`rounded-2xl border p-5 ${
                    writeDiff?.isCorrect
                      ? "border-emerald-200 bg-emerald-50/50"
                      : "border-rose-200 bg-rose-50/50"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className={`font-bold text-sm flex items-center gap-1.5 ${
                        writeDiff?.isCorrect ? "text-emerald-700" : "text-rose-700"
                      }`}
                    >
                      {writeDiff?.isCorrect ? "✨ Chính xác tuyệt vời!" : "⚠️ Cần hoàn thiện lại"}
                    </span>
                    <span className="chip bg-white/80 font-bold text-xs">
                      {writeDiff?.accuracy}% khớp
                    </span>
                  </div>

                  {/* Word-by-word Diff Display */}
                  <div className="text-base sm:text-lg leading-relaxed">
                    <span className="text-xs text-slate-500 block mb-1">Đáp án chi tiết:</span>
                    <div className="flex flex-wrap gap-1.5 font-medium">
                      {writeDiff?.words.map((w, wIdx) => {
                        if (w.status === "correct") {
                          return (
                            <span
                              key={wIdx}
                              className="rounded bg-emerald-100 text-emerald-800 px-1.5 py-0.5"
                            >
                              {w.word}
                            </span>
                          );
                        } else if (w.status === "wrong") {
                          return (
                            <span
                              key={wIdx}
                              className="rounded bg-rose-100 text-rose-800 px-1.5 py-0.5 relative group"
                            >
                              <span className="line-through opacity-75">{w.typed}</span>{" "}
                              <span className="font-bold underline">{w.expected}</span>
                            </span>
                          );
                        } else if (w.status === "missing") {
                          return (
                            <span
                              key={wIdx}
                              className="rounded border border-dashed border-amber-400 bg-amber-50 text-amber-800 px-1.5 py-0.5"
                            >
                              +{w.expected}
                            </span>
                          );
                        } else {
                          return (
                            <span
                              key={wIdx}
                              className="rounded bg-slate-200 text-slate-600 line-through px-1.5 py-0.5"
                            >
                              {w.typed}
                            </span>
                          );
                        }
                      })}
                    </div>
                  </div>

                  {/* Native Speaker Sentence Audio */}
                  <div className="mt-4 pt-3 border-t border-slate-200/50 flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-800">
                      Mẫu chuẩn: “{currentSentence.en}”
                    </p>
                    <button
                      onClick={() => speakSentence(currentSentence.en, playbackRate)}
                      className="flex items-center gap-1 text-xs font-medium text-petal-600 hover:text-petal-800"
                    >
                      <span>🔊 Nghe lại</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <span className="text-xs text-slate-500 font-medium">
                    Nhấn <kbd className="rounded bg-slate-200 px-1.5 py-0.5 text-[11px] font-mono font-bold text-slate-700">Enter</kbd> để tiếp tục
                  </span>
                  <button onClick={handleNextSentence} className="btn !py-2.5 !px-6 text-sm">
                    Câu tiếp theo ➔
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* MODE 2: PHẢN XẠ NÓI (SPEAKING) */}
        {mode === "speak" && (
          <div className="space-y-6">
            {/* Countdown / Reflex Challenge Bar */}
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Thử thách phản xạ nhanh:</span>
              <button
                onClick={() => handleStartTimer(3)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  timerSeconds !== null && timerMax === 3
                    ? "bg-rose-500 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                ⏱️ 3 Giây
              </button>
              <button
                onClick={() => handleStartTimer(5)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  timerSeconds !== null && timerMax === 5
                    ? "bg-amber-500 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                ⏱️ 5 Giây
              </button>
              <button
                onClick={() => handleStartTimer(10)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  timerSeconds !== null && timerMax === 10
                    ? "bg-emerald-500 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                ⏱️ 10 Giây
              </button>
            </div>

            {/* Timer visual countdown */}
            {timerSeconds !== null && (
              <div className="text-center">
                <span
                  className={`text-3xl font-extrabold ${
                    timerSeconds <= 2 ? "text-rose-600 animate-pulse" : "text-slate-800"
                  }`}
                >
                  {timerSeconds}s
                </span>
                <div className="mt-1 mx-auto h-2 max-w-xs overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full bg-petal-500 transition-all duration-1000"
                    style={{ width: `${(timerSeconds / timerMax) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Microphone Interaction Box */}
            <div className="flex flex-col items-center justify-center py-6">
              <button
                onClick={isListening ? handleStopListening : handleStartListening}
                className={`relative flex size-20 items-center justify-center rounded-full text-3xl shadow-lg transition-transform ${
                  isListening
                    ? "bg-rose-500 text-white scale-110 animate-bounce"
                    : "bg-gradient-to-tr from-petal-500 to-petal-400 text-white hover:scale-105 active:scale-95"
                }`}
                title={isListening ? "Bấm để dừng nói" : "Bấm Micro để nói tiếng Anh"}
              >
                {isListening ? "⏹️" : "🎙️"}
                {isListening && (
                  <span className="absolute -inset-2 rounded-full border-2 border-rose-400 animate-ping" />
                )}
              </button>
              <p className="mt-3 text-sm font-medium text-slate-600">
                {isListening ? "Đang lắng nghe bạn nói..." : "Bấm Micro và nói câu tiếng Anh"}
              </p>

              {spokenTranscript && (
                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-800 max-w-md text-center">
                  <span className="text-xs text-slate-400 block">Bạn đã nói:</span>
                  “{spokenTranscript}”
                </div>
              )}

              {speechError && (
                <p className="mt-2 text-xs text-rose-500 text-center">{speechError}</p>
              )}
            </div>

            {/* Speaking Result & Evaluation */}
            {speakScore !== null ? (
              <div
                className={`rounded-2xl border p-4 text-center ${
                  speakScore.isPass
                    ? "border-emerald-200 bg-emerald-50/60"
                    : "border-amber-200 bg-amber-50/60"
                }`}
              >
                <p
                  className={`font-bold text-base ${
                    speakScore.isPass ? "text-emerald-700" : "text-amber-700"
                  }`}
                >
                  {speakScore.isPass ? "🎉 Phát âm rất tốt!" : "💪 Hãy luyện nói to rõ ràng hơn"}
                </p>
                <p className="text-xs text-slate-600 mt-1">
                  Độ tương đồng với câu mẫu: {speakScore.accuracy}%
                </p>
                <div className="mt-3 flex justify-center gap-2">
                  <button
                    onClick={() => speakSentence(currentSentence.en, playbackRate)}
                    className="btn-soft !py-1.5 !px-3 text-xs"
                  >
                    🔊 Nghe phát âm mẫu
                  </button>
                  <button onClick={handleNextSentence} className="btn !py-1.5 !px-4 text-xs">
                    Câu kế tiếp ➔
                  </button>
                </div>
              </div>
            ) : (
              /* Self-evaluation fallback */
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-slate-600">
                      Tự nhẩm / đối chiếu với bản xứ:
                    </p>
                    <p className="text-sm font-bold text-slate-800 mt-0.5">
                      “{currentSentence.en}”
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => speakSentence(currentSentence.en, playbackRate)}
                      className="grid size-9 place-items-center rounded-full bg-white text-slate-700 shadow-sm hover:bg-slate-100"
                      title="Nghe câu mẫu"
                    >
                      🔊
                    </button>
                    <button
                      onClick={() => handleSelfEvaluate(false)}
                      className="rounded-full bg-rose-100 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-200 transition"
                    >
                      Cần nói lại ✕
                    </button>
                    <button
                      onClick={() => handleSelfEvaluate(true)}
                      className="rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-200 transition"
                    >
                      Đã nói chuẩn ✓
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* MODE 3: FLASHCARD TỰ ĐỘNG (AUTO-PLAY) */}
        {mode === "flashcard" && (
          <div className="space-y-6">
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => {
                  playSound("tap");
                  setIsAutoPlaying((prev) => !prev);
                }}
                className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold shadow-md transition ${
                  isAutoPlaying
                    ? "bg-rose-500 text-white animate-pulse"
                    : "bg-petal-600 text-white hover:bg-petal-700"
                }`}
              >
                <span>{isAutoPlaying ? "⏸️ Tạm dừng Auto-play" : "▶️ Bật Chạy Tự Động"}</span>
              </button>
            </div>

            {/* Flippable card body */}
            <div
              onClick={() => {
                playSound("tap");
                setIsFlipped((prev) => !prev);
              }}
              className="cursor-pointer rounded-2xl border-2 border-dashed border-petal-200 bg-white p-8 text-center transition hover:border-petal-400 hover:shadow-md"
            >
              {!isFlipped ? (
                <div className="py-6">
                  <span className="chip bg-petal-100 text-petal-700 font-semibold mb-2">
                    Mặt trước (Tiếng Việt)
                  </span>
                  <p className="text-xl font-bold text-slate-800">{currentSentence.vi}</p>
                  <p className="mt-4 text-xs text-slate-400">
                    Bấm để lật xem đáp án tiếng Anh & nghe phát âm
                  </p>
                </div>
              ) : (
                <div className="py-6 animate-in zoom-in-95 duration-200">
                  <span className="chip bg-emerald-100 text-emerald-700 font-semibold mb-2">
                    Mặt sau (Tiếng Anh Bản Xứ)
                  </span>
                  <p className="text-2xl font-extrabold text-slate-900 leading-normal">
                    {currentSentence.en}
                  </p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      speakSentence(currentSentence.en, playbackRate);
                    }}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-petal-100 px-4 py-1.5 text-xs font-semibold text-petal-700 hover:bg-petal-200"
                  >
                    <span>🔊 Nghe lại</span>
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2">
              <button onClick={handlePrevSentence} className="btn-soft !py-2 !px-4 text-xs">
                ← Câu trước
              </button>
              <button onClick={handleNextSentence} className="btn !py-2 !px-5 text-xs">
                Câu tiếp theo ➔
              </button>
            </div>
          </div>
        )}

        {/* MODE 4: GHÉP TỪ PHẢN XẠ (SCRAMBLE) */}
        {mode === "scramble" && (
          <div className="space-y-6">
            {/* Drop / Selected Word Area */}
            <div className="min-h-24 rounded-2xl border-2 border-petal-200 bg-white p-4 shadow-inner flex flex-wrap gap-2 items-center">
              {selectedTokens.length === 0 ? (
                <span className="text-sm text-slate-400 italic">
                  Bấm các thẻ từ bên dưới để ghép thành câu hoàn chỉnh...
                </span>
              ) : (
                selectedTokens.map((tok, sIdx) => (
                  <button
                    key={tok.id}
                    onClick={() => handleRemoveScrambleToken(tok, sIdx)}
                    className="rounded-xl border border-petal-300 bg-petal-50 px-3 py-1.5 text-sm font-semibold text-petal-800 shadow-sm transition hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300"
                    title="Bấm để bỏ từ này ra"
                  >
                    {tok.word} ✕
                  </button>
                ))
              )}
            </div>

            {/* Word Chips Pool */}
            <div className="flex flex-wrap gap-2 justify-center py-2">
              {scrambleTokens.map((tok) => (
                <button
                  key={tok.id}
                  disabled={tok.used}
                  onClick={() => handleSelectScrambleToken(tok)}
                  className={`rounded-xl border px-3.5 py-2 text-sm font-semibold transition ${
                    tok.used
                      ? "border-slate-200 bg-slate-100 text-slate-300 cursor-not-allowed"
                      : "border-slate-300 bg-white text-slate-800 shadow-sm hover:border-petal-400 hover:bg-petal-50 hover:scale-105 active:scale-95"
                  }`}
                >
                  {tok.word}
                </button>
              ))}
            </div>

            {/* Feedback & Actions */}
            {scrambleSubmitted ? (
              <div
                className={`rounded-2xl border p-4 text-center ${
                  scrambleIsCorrect
                    ? "border-emerald-200 bg-emerald-50/70"
                    : "border-rose-200 bg-rose-50/70"
                }`}
              >
                <p
                  className={`font-bold text-sm ${
                    scrambleIsCorrect ? "text-emerald-800" : "text-rose-800"
                  }`}
                >
                  {scrambleIsCorrect ? "✨ Ghép câu hoàn toàn chuẩn xác!" : "⚠️ Thứ tự từ chưa đúng"}
                </p>
                <p className="text-sm font-medium text-slate-800 mt-1">“{currentSentence.en}”</p>
                <div className="mt-3 flex justify-center gap-2">
                  <button onClick={handleNextSentence} className="btn !py-2 !px-5 text-xs">
                    Câu kế tiếp ➔
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setSelectedTokens([]);
                    setScrambleTokens((prev) => prev.map((t) => ({ ...t, used: false })));
                  }}
                  className="btn-soft !py-2 !px-4 text-xs"
                >
                  Xếp lại
                </button>
                <button
                  disabled={selectedTokens.length === 0}
                  onClick={handleCheckScramble}
                  className="btn !py-2 !px-6 text-sm"
                >
                  Kiểm tra ghép từ
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bonus Collocations / Extra Vocabulary Table (if unit contains them) */}
      {unit.collocations && unit.collocations.length > 0 && (
        <div className="card !p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">💡</span>
            <h3 className="h-display text-lg font-bold text-slate-900">
              Collocations & Cụm từ chuẩn bản xứ
            </h3>
          </div>

          <div className="space-y-4">
            {unit.collocations.map((table, tIdx) => (
              <div key={tIdx} className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase font-bold text-slate-600 border-b border-slate-200">
                    <tr>
                      {table.rows[0]?.map((head, hIdx) => (
                        <th key={hIdx} className="px-4 py-2.5">
                          {head || (hIdx === 0 ? "English" : "Tiếng Việt")}
                        </th>
                      ))}
                      <th className="px-4 py-2.5 text-right">Phát âm</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {table.rows.slice(1).map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-petal-50/50 transition">
                        <td className="px-4 py-2.5 font-semibold text-slate-900">
                          {row[0]}
                        </td>
                        <td className="px-4 py-2.5 text-slate-600">{row[1]}</td>
                        <td className="px-4 py-2.5 text-right">
                          <button
                            onClick={() => speakSentence(row[0], playbackRate)}
                            className="rounded-full bg-slate-100 p-1.5 text-xs hover:bg-petal-200 transition"
                            title={`Nghe "${row[0]}"`}
                          >
                            🔊
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Navigation footer between Units */}
      <div className="flex items-center justify-between text-xs font-semibold text-slate-500 pt-2">
        {!isCustomSet && unit.unitNumber > 1 ? (
          <Link href={`/reflex/${unit.unitNumber - 1}`} className="hover:text-petal-600">
            ← Unit {unit.unitNumber - 1}
          </Link>
        ) : (
          <div />
        )}
        <Link href="/reflex" className="btn-soft !py-1.5 !px-3">
          📋 Trở về danh sách Unit
        </Link>
        {!isCustomSet && unit.unitNumber < 50 ? (
          <Link href={`/reflex/${unit.unitNumber + 1}`} className="hover:text-petal-600">
            Unit {unit.unitNumber + 1} →
          </Link>
        ) : (
          <div />
        )}
      </div>
    </div>
  );
}
