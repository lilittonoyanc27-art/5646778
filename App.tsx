import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  SkipForward,
  HelpCircle,
  BookOpen,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Speech,
  Trophy,
  X
} from 'lucide-react';
import { LetterStatus, GameState } from './types.ts';
import { QUESTIONS, isAnswerCorrect } from './questions.ts';
import {
  playCorrectSound,
  playWrongSound,
  playPassSound,
  playTickSound,
  playVictorySound,
  speakSpanish
} from './sound.ts';
import { RoscoWheel } from './RoscoWheel.tsx';

const TOTAL_TIME_SECONDS = 30 * 60; // 30 minutes (1800 seconds)

export default function App() {
  const [gameState, setGameState] = useState<GameState>('idle');
  const [timeLeft, setTimeLeft] = useState<number>(TOTAL_TIME_SECONDS);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [letterStatuses, setLetterStatuses] = useState<Record<number, LetterStatus>>({});
  const [revealedAnswers, setRevealedAnswers] = useState<Record<number, boolean>>({});
  const [revealedTranslations, setRevealedTranslations] = useState<Record<number, boolean>>({});
  const [alwaysShowTranslation, setAlwaysShowTranslation] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(true);
  const [userInput, setUserInput] = useState<string>('');
  const [feedback, setFeedback] = useState<{ type: 'correct' | 'incorrect' | 'info'; message: string } | null>(null);
  const [showDictionaryModal, setShowDictionaryModal] = useState<boolean>(false);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const [showFinishModal, setShowFinishModal] = useState<boolean>(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // Stats calculation
  const correctCount = Object.values(letterStatuses).filter((s) => s === 'correct').length;
  const incorrectCount = Object.values(letterStatuses).filter((s) => s === 'incorrect').length;
  const pendingCount = QUESTIONS.length - (correctCount + incorrectCount);

  const currentQ = QUESTIONS[currentIndex];
  const isTranslationVisible = alwaysShowTranslation || !!revealedTranslations[currentIndex];
  const isAnswerRevealed = !!revealedAnswers[currentIndex];
  const currentStatus = letterStatuses[currentIndex] || 'pending';

  // Format timer into MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 30-minute Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (gameState === 'playing' && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setGameState('finished');
            setShowFinishModal(true);
            playWrongSound(soundEnabled);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [gameState, timeLeft, soundEnabled]);

  // Check victory condition
  useEffect(() => {
    if (gameState === 'playing' && pendingCount === 0) {
      setGameState('finished');
      setShowFinishModal(true);
      playVictorySound(soundEnabled);
    }
  }, [letterStatuses, gameState, pendingCount, soundEnabled]);

  // Auto focus input when active question changes
  useEffect(() => {
    if (gameState === 'playing') {
      inputRef.current?.focus();
    }
    setFeedback(null);
    setUserInput('');
  }, [currentIndex, gameState]);

  // Speak question automatically or when clicking speaker
  const handleSpeakQuestion = useCallback(() => {
    if (!currentQ) return;
    speakSpanish(`${currentQ.ruleES}. ${currentQ.questionES}`, voiceEnabled);
  }, [currentQ, voiceEnabled]);

  // Find next pending question in circular order
  const getNextPendingIndex = useCallback(
    (startIndex: number): number => {
      for (let offset = 1; offset <= QUESTIONS.length; offset++) {
        const nextIdx = (startIndex + offset) % QUESTIONS.length;
        if (!letterStatuses[nextIdx] || letterStatuses[nextIdx] === 'pending') {
          return nextIdx;
        }
      }
      return startIndex;
    },
    [letterStatuses]
  );

  // Start game handler
  const handleStartGame = () => {
    setGameState('playing');
    playTickSound(soundEnabled);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  // Pause / Resume handler
  const handleTogglePause = () => {
    if (gameState === 'playing') {
      setGameState('paused');
    } else if (gameState === 'paused') {
      setGameState('playing');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
    playTickSound(soundEnabled);
  };

  // Restart game handler
  const handleResetGame = () => {
    setGameState('idle');
    setTimeLeft(TOTAL_TIME_SECONDS);
    setCurrentIndex(0);
    setLetterStatuses({});
    setRevealedAnswers({});
    setRevealedTranslations({});
    setUserInput('');
    setFeedback(null);
    setShowFinishModal(false);
    playTickSound(soundEnabled);
  };

  // Submit Answer
  const handleSubmitAnswer = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!userInput.trim()) return;

    // Auto-start timer if not started yet
    if (gameState === 'idle') {
      setGameState('playing');
    }

    const isCorrect = isAnswerCorrect(userInput, currentQ);

    if (isCorrect) {
      setLetterStatuses((prev) => ({ ...prev, [currentIndex]: 'correct' }));
      setFeedback({ type: 'correct', message: `¡Correcto! ${currentQ.answerES} (${currentQ.answerHY})` });
      playCorrectSound(soundEnabled);
    } else {
      setLetterStatuses((prev) => ({ ...prev, [currentIndex]: 'incorrect' }));
      setFeedback({
        type: 'incorrect',
        message: `¡Incorrecto! La respuesta era: ${currentQ.answerES} (${currentQ.answerHY})`
      });
      playWrongSound(soundEnabled);
    }

    // Advance to next pending letter after short delay
    setTimeout(() => {
      const nextIdx = getNextPendingIndex(currentIndex);
      setCurrentIndex(nextIdx);
    }, 900);
  };

  // Pasapalabra (Pass / Skip to next pending question)
  const handlePasapalabra = () => {
    if (gameState === 'idle') {
      setGameState('playing');
    }
    playPassSound(soundEnabled);
    setFeedback({ type: 'info', message: '¡Pasapalabra! Հարցը հետաձգվեց հաջորդ շրջանի համար:' });
    const nextIdx = getNextPendingIndex(currentIndex);
    setCurrentIndex(nextIdx);
  };

  // Peek Answer Button: Does NOT mark as incorrect, just shows the answer!
  const handleTogglePeekAnswer = () => {
    playTickSound(soundEnabled);
    setRevealedAnswers((prev) => ({
      ...prev,
      [currentIndex]: !prev[currentIndex]
    }));
  };

  // Toggle Armenian translation for current question
  const handleToggleTranslation = () => {
    playTickSound(soundEnabled);
    setRevealedTranslations((prev) => ({
      ...prev,
      [currentIndex]: !prev[currentIndex]
    }));
  };

  // Manual self-grading buttons (helpful after peeking or for verbal play)
  const handleManualMark = (status: LetterStatus) => {
    setLetterStatuses((prev) => ({ ...prev, [currentIndex]: status }));
    if (status === 'correct') {
      playCorrectSound(soundEnabled);
    } else if (status === 'incorrect') {
      playWrongSound(soundEnabled);
    }
    setTimeout(() => {
      const nextIdx = getNextPendingIndex(currentIndex);
      setCurrentIndex(nextIdx);
    }, 400);
  };

  // Direct letter click from Rosco
  const handleSelectLetter = (idx: number) => {
    playTickSound(soundEnabled);
    setCurrentIndex(idx);
    setFeedback(null);
  };

  return (
    <div className="min-h-screen bg-[#040b18] text-slate-100 flex flex-col selection:bg-blue-600 selection:text-white">
      {/* Studio Lighting Background Glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[900px] h-[550px] bg-blue-600/10 blur-[140px] rounded-full" />
        <div className="absolute bottom-[-10%] left-1/4 w-[600px] h-[400px] bg-cyan-600/10 blur-[130px] rounded-full" />
        <div className="absolute top-1/3 right-[-5%] w-[500px] h-[400px] bg-indigo-600/10 blur-[130px] rounded-full" />
      </div>

      {/* Top Bar Contract: 1-line brand | links/actions | primary CTA */}
      <header className="relative z-20 border-b border-blue-900/40 bg-[#071328]/80 backdrop-blur-md px-4 sm:px-8 py-3.5 flex items-center justify-between gap-6">
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 p-0.5 shadow-lg shadow-blue-500/30 flex items-center justify-center">
            <span className="font-rosco font-black text-xl text-white">P</span>
          </div>
          <div>
            <h1 className="font-rosco font-extrabold text-lg sm:text-xl tracking-tight text-white flex items-center gap-2">
              PASAPALABRA
              <span className="text-xs font-normal text-cyan-400 tracking-normal px-2 py-0.5 bg-blue-950/80 rounded-md border border-blue-800/60">
                ES ⇄ HY
              </span>
            </h1>
          </div>
        </div>

        {/* Middle utility controls */}
        <div className="flex items-center gap-2 sm:gap-4 text-xs font-medium text-slate-300">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-lg border transition-colors ${
              soundEnabled
                ? 'bg-blue-900/40 border-blue-700/60 text-cyan-300 hover:bg-blue-900/70'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title={soundEnabled ? 'Ձայնային էֆեկտները միացված են' : 'Ձայնը անջատված է'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <button
            onClick={() => setVoiceEnabled(!voiceEnabled)}
            className={`p-2 rounded-lg border transition-colors ${
              voiceEnabled
                ? 'bg-blue-900/40 border-blue-700/60 text-cyan-300 hover:bg-blue-900/70'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title={voiceEnabled ? 'Իսպաներեն արտասանությունը ակտիվ է' : 'Արտասանությունն անջատված է'}
          >
            <Speech className="w-4 h-4" />
          </button>

          <button
            onClick={() => setShowDictionaryModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700/60 bg-slate-900/60 hover:bg-slate-800 text-slate-200 transition-colors whitespace-nowrap"
          >
            <BookOpen className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">Բառարան (27)</span>
          </button>

          <button
            onClick={() => setShowHelpModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700/60 bg-slate-900/60 hover:bg-slate-800 text-slate-200 transition-colors whitespace-nowrap"
          >
            <HelpCircle className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">Կանոններ</span>
          </button>
        </div>

        {/* Primary Action Zone: Start / Pause Game */}
        <div className="flex items-center gap-2 shrink-0">
          {gameState === 'idle' && (
            <button
              onClick={handleStartGame}
              className="px-4 py-2 text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 rounded-lg shadow-lg shadow-blue-500/25 hover:from-blue-500 hover:to-cyan-400 transition-all transform active:scale-95 whitespace-nowrap flex items-center gap-2"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Սկսել (30 րոպե)</span>
            </button>
          )}

          {gameState === 'playing' && (
            <button
              onClick={handleTogglePause}
              className="px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-amber-200 bg-amber-950/70 border border-amber-600/60 rounded-lg hover:bg-amber-900/70 transition-colors whitespace-nowrap flex items-center gap-1.5"
            >
              <Pause className="w-3.5 h-3.5 fill-current" />
              <span>Դադար</span>
            </button>
          )}

          {gameState === 'paused' && (
            <button
              onClick={handleTogglePause}
              className="px-4 py-1.5 text-xs sm:text-sm font-semibold text-emerald-200 bg-emerald-950/70 border border-emerald-600/60 rounded-lg hover:bg-emerald-900/70 transition-colors whitespace-nowrap flex items-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Շարունակել</span>
            </button>
          )}

          <button
            onClick={handleResetGame}
            title="Վերսկսել խաղը"
            className="p-2 rounded-lg border border-slate-700/60 bg-slate-900/60 hover:bg-slate-800 text-slate-300 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Studio Arena */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col justify-center">
        {/* Quick HUD Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div className="bg-[#0b1b36]/90 border border-blue-900/40 rounded-xl p-3 flex items-center justify-between shadow-sm">
            <div>
              <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wider block">Ժամանակ / Tiempo</span>
              <span className={`text-xl sm:text-2xl font-mono font-bold tabular-nums ${timeLeft <= 120 ? 'text-red-400 animate-pulse' : 'text-amber-400'}`}>
                {formatTime(timeLeft)}
              </span>
            </div>
            <div className="text-right text-xs text-slate-500 font-mono">
              30:00 max
            </div>
          </div>

          <div className="bg-[#0b1b36]/90 border border-emerald-900/40 rounded-xl p-3 flex items-center justify-between shadow-sm">
            <div>
              <span className="text-[11px] text-emerald-400/90 font-medium uppercase tracking-wider block">Ճիշտ / Aciertos</span>
              <span className="text-xl sm:text-2xl font-mono font-bold text-emerald-400 tabular-nums">
                {correctCount}
              </span>
            </div>
            <CheckCircle2 className="w-6 h-6 text-emerald-500/70" />
          </div>

          <div className="bg-[#0b1b36]/90 border border-rose-900/40 rounded-xl p-3 flex items-center justify-between shadow-sm">
            <div>
              <span className="text-[11px] text-rose-400/90 font-medium uppercase tracking-wider block">Սխալ / Fallos</span>
              <span className="text-xl sm:text-2xl font-mono font-bold text-rose-400 tabular-nums">
                {incorrectCount}
              </span>
            </div>
            <XCircle className="w-6 h-6 text-rose-500/70" />
          </div>

          <div className="bg-[#0b1b36]/90 border border-blue-900/40 rounded-xl p-3 flex items-center justify-between shadow-sm">
            <div>
              <span className="text-[11px] text-blue-400/90 font-medium uppercase tracking-wider block">Մնացած / Restantes</span>
              <span className="text-xl sm:text-2xl font-mono font-bold text-cyan-300 tabular-nums">
                {pendingCount}
              </span>
            </div>
            <div className="text-xs font-medium text-slate-400">
              {QUESTIONS.length - pendingCount} / {QUESTIONS.length}
            </div>
          </div>
        </div>

        {/* Split Studio Arena: Rosco Wheel on Left + Interactive Question Console on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Left Column: Rosco Wheel */}
          <div className="lg:col-span-6 flex flex-col items-center justify-center py-2">
            <RoscoWheel
              questions={QUESTIONS}
              currentIndex={currentIndex}
              letterStatuses={letterStatuses}
              revealedAnswers={revealedAnswers}
              onSelectLetter={handleSelectLetter}
              timerFormatted={formatTime(timeLeft)}
              correctCount={correctCount}
              incorrectCount={incorrectCount}
              isGameRunning={gameState === 'playing'}
            />

            {/* Quick Letter Navigation Bar */}
            <div className="mt-3 flex items-center justify-center gap-2">
              <button
                onClick={() => handleSelectLetter((currentIndex - 1 + QUESTIONS.length) % QUESTIONS.length)}
                className="p-1.5 rounded-lg border border-slate-800 bg-slate-900/70 text-slate-400 hover:text-white transition-colors"
                title="Նախորդ տառը"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-slate-400 font-mono">
                Տառ {currentIndex + 1} / {QUESTIONS.length} ({currentQ.letter})
              </span>
              <button
                onClick={() => handleSelectLetter((currentIndex + 1) % QUESTIONS.length)}
                className="p-1.5 rounded-lg border border-slate-800 bg-slate-900/70 text-slate-400 hover:text-white transition-colors"
                title="Հաջորդ տառը"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Right Column: Question & Interaction Card */}
          <div className="lg:col-span-6 flex flex-col">
            <div className="bg-[#09172f]/95 border border-blue-800/40 rounded-2xl shadow-2xl p-5 sm:p-7 relative overflow-hidden backdrop-blur-md">
              {/* Top Card Bar: Letter badge & Audio Pronunciation */}
              <div className="flex items-center justify-between pb-4 border-b border-blue-900/40 mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-700 flex items-center justify-center font-rosco font-black text-2xl text-white shadow-md shadow-blue-600/30">
                    {currentQ.letter}
                  </div>
                  <div>
                    <span className="text-xs uppercase font-bold text-cyan-400 tracking-wider block">
                      {currentQ.ruleES}
                    </span>
                    <span className="text-xs text-slate-400 font-armenian">
                      {currentQ.ruleHY}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSpeakQuestion}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-950 border border-blue-800/70 hover:bg-blue-900/80 text-cyan-300 text-xs font-semibold transition-colors"
                    title="Լսել իսպաներեն արտասանությունը"
                  >
                    <Volume2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Լսել</span>
                  </button>

                  <div className="px-2.5 py-1 rounded-md text-xs font-mono font-medium border border-blue-800/40 bg-blue-950/60 text-slate-300">
                    #{currentQ.id}
                  </div>
                </div>
              </div>

              {/* Spanish Question Card with Explicit Armenian Click-to-Translate Requirement */}
              <div
                onClick={handleToggleTranslation}
                className="group relative cursor-pointer rounded-xl p-4 sm:p-5 bg-gradient-to-br from-[#0c2144] to-[#071731] border border-blue-700/50 hover:border-cyan-400/70 transition-all duration-300 shadow-inner"
                title="Սեղմեք՝ հայերեն թարգմանությունը տեսնելու / թաքցնելու համար"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    Իսպաներեն հարց (Pregunta en Español)
                  </span>

                  <span className="text-[11px] text-cyan-400/90 group-hover:text-cyan-300 flex items-center gap-1 transition-colors">
                    {isTranslationVisible ? (
                      <>
                        <EyeOff className="w-3 h-3" />
                        <span>Թաքցնել հայերենը</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-3 h-3" />
                        <span className="underline underline-offset-2">Սեղմեք հայերեն թարգմանության համար</span>
                      </>
                    )}
                  </span>
                </div>

                {/* Spanish question text */}
                <p className="text-lg sm:text-xl font-medium text-white leading-relaxed tracking-wide">
                  {currentQ.questionES}
                </p>

                {currentQ.note && (
                  <p className="text-xs text-slate-400 mt-2 italic font-armenian">
                    {currentQ.note}
                  </p>
                )}

                {/* Armenian Translation Box (revealed on click) */}
                {isTranslationVisible && (
                  <div className="mt-4 pt-3.5 border-t border-cyan-800/40 bg-blue-950/40 -mx-1 px-3 py-2 rounded-lg transition-all animate-fadeIn">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-amber-300/90 block mb-1">
                      Հայերեն թարգմանություն
                    </span>
                    <p className="text-base sm:text-lg text-amber-100 font-armenian leading-relaxed">
                      {currentQ.questionHY}
                    </p>
                  </div>
                )}
              </div>

              {/* Translation quick switch options */}
              <div className="mt-2.5 flex items-center justify-between text-xs text-slate-400 px-1">
                <span className="italic text-[11px]">
                  💡 Կարող եք սեղմել հարցի վրա՝ հայերեն թարգմանությունը բացելու համար:
                </span>
                <button
                  onClick={() => setAlwaysShowTranslation(!alwaysShowTranslation)}
                  className={`text-[11px] hover:text-white transition-colors underline ${
                    alwaysShowTranslation ? 'text-cyan-400 font-semibold' : 'text-slate-400'
                  }`}
                >
                  {alwaysShowTranslation ? 'Միշտ բացել հայերենը: ԱՅՈ' : 'Միշտ բացել հայերենը: ՈՉ'}
                </button>
              </div>

              {/* Answer Input and Submit Controls */}
              <form onSubmit={handleSubmitAnswer} className="mt-5 space-y-3">
                <div className="relative">
                  <input
                    ref={inputRef}
                    type="text"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    placeholder="Գրեք պատասխանն իսպաներեն (օր.՝ Actor)..."
                    disabled={gameState === 'paused' || gameState === 'finished'}
                    className="w-full bg-[#051126] border-2 border-blue-700/60 focus:border-cyan-400 rounded-xl px-4 py-3 text-base sm:text-lg text-white placeholder-slate-500 focus:outline-none transition-all shadow-inner font-rosco"
                  />
                  {userInput && (
                    <button
                      type="button"
                      onClick={() => setUserInput('')}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Primary Action Buttons: Ответить, Pasapalabra, Посмотреть ответ */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                  {/* Comprobar / Submit */}
                  <button
                    type="submit"
                    disabled={!userInput.trim() || gameState === 'paused' || gameState === 'finished'}
                    className="px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-40 disabled:pointer-events-none text-white font-bold text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 active:scale-98"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Ответить / Ստուգել</span>
                  </button>

                  {/* Pasapalabra (Skip/Pass) */}
                  <button
                    type="button"
                    onClick={handlePasapalabra}
                    className="px-4 py-3 bg-gradient-to-r from-sky-700 to-blue-800 hover:from-sky-600 hover:to-blue-700 text-cyan-100 font-bold text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 active:scale-98"
                  >
                    <SkipForward className="w-4 h-4" />
                    <span>Pasapalabra</span>
                  </button>

                  {/* "Посмотреть ответ" Button (Does NOT mark as error!) */}
                  <button
                    type="button"
                    onClick={handleTogglePeekAnswer}
                    className={`px-4 py-3 border rounded-xl font-bold text-sm transition-all shadow-md flex items-center justify-center gap-1.5 active:scale-98 ${
                      isAnswerRevealed
                        ? 'bg-amber-950/80 border-amber-500/70 text-amber-200 hover:bg-amber-900/80'
                        : 'bg-slate-900/80 border-slate-700 hover:border-amber-400/60 text-amber-300 hover:bg-slate-800'
                    }`}
                  >
                    {isAnswerRevealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    <span>{isAnswerRevealed ? 'Փակել պատասխանը' : 'Посмотреть ответ'}</span>
                  </button>
                </div>
              </form>

              {/* Revealed Answer Box: Does NOT penalize or mark wrong! */}
              {isAnswerRevealed && (
                <div className="mt-4 p-4 rounded-xl bg-amber-950/40 border border-amber-500/50 text-amber-100 animate-fadeIn">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs uppercase font-bold tracking-wider text-amber-300 flex items-center gap-1.5">
                      <Eye className="w-4 h-4 text-amber-400" />
                      Ճիշտ պատասխանը (Սխալ չի հաշվվում / Не считается ошибкой):
                    </span>
                    <button
                      onClick={handleTogglePeekAnswer}
                      className="text-xs text-amber-300 hover:text-white"
                    >
                      Փակել ✕
                    </button>
                  </div>

                  <div className="flex flex-wrap items-baseline gap-2 text-xl font-bold text-white font-rosco">
                    <span className="text-emerald-400">{currentQ.answerES}</span>
                    <span className="text-slate-400 text-sm font-normal">—</span>
                    <span className="text-amber-200 text-base font-armenian font-medium">
                      {currentQ.answerHY}
                    </span>
                  </div>

                  {/* Self-grading affordances: Allow user to mark their answer if playing verbally */}
                  <div className="mt-3 pt-3 border-t border-amber-900/40 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="text-slate-300">
                      Խաղում եք բանավո՞ր: Կարող եք ինքնուրույն նշել արդյունքը՝
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleManualMark('correct')}
                        className="px-3 py-1 bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 border border-emerald-600/60 rounded-md font-semibold transition-colors flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Ճիշտ էր (✓)</span>
                      </button>
                      <button
                        onClick={() => handleManualMark('incorrect')}
                        className="px-3 py-1 bg-rose-900/60 hover:bg-rose-800 text-rose-200 border border-rose-600/60 rounded-md font-semibold transition-colors flex items-center gap-1"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Սխալ էր (✗)</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Real-time Feedback Banner */}
              {feedback && (
                <div
                  className={`mt-4 p-3.5 rounded-xl border text-sm font-medium animate-fadeIn ${
                    feedback.type === 'correct'
                      ? 'bg-emerald-950/70 border-emerald-600/70 text-emerald-200'
                      : feedback.type === 'incorrect'
                      ? 'bg-rose-950/70 border-rose-600/70 text-rose-200'
                      : 'bg-blue-950/70 border-blue-600/70 text-cyan-200'
                  }`}
                >
                  {feedback.message}
                </div>
              )}

              {/* Status for current question if already answered */}
              {currentStatus !== 'pending' && (
                <div className="mt-3 flex items-center gap-2 text-xs">
                  <span className="text-slate-400">Կարգավիճակը:</span>
                  {currentStatus === 'correct' ? (
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Պատասխանված է ճիշտ
                    </span>
                  ) : (
                    <span className="text-rose-400 font-bold flex items-center gap-1">
                      <XCircle className="w-3.5 h-3.5" /> Պատասխանված է սխալ
                    </span>
                  )}
                  <button
                    onClick={() => setLetterStatuses((prev) => ({ ...prev, [currentIndex]: 'pending' }))}
                    className="ml-auto text-slate-400 hover:text-cyan-300 underline"
                  >
                    Մաքրել և նորից փորձել
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Dictionary Modal (All 27 Questions & Answers) */}
      {showDictionaryModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#09172f] border border-blue-800/60 rounded-2xl max-w-4xl w-full max-h-[88vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-blue-900/50 flex items-center justify-between bg-[#061225]">
              <div className="flex items-center gap-2.5">
                <BookOpen className="w-5 h-5 text-cyan-400" />
                <h3 className="font-rosco font-bold text-lg text-white">
                  Բոլոր 27 հարցերը և պատասխանները (Pasapalabra ES ⇄ HY)
                </h3>
              </div>
              <button
                onClick={() => setShowDictionaryModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto p-6 space-y-3.5 divide-y divide-blue-900/30">
              {QUESTIONS.map((item, idx) => {
                const status = letterStatuses[idx] || 'pending';
                return (
                  <div key={item.id} className="pt-3.5 first:pt-0 flex items-start gap-4">
                    <div
                      className={`w-9 h-9 shrink-0 rounded-lg flex items-center justify-center font-rosco font-black text-base ${
                        status === 'correct'
                          ? 'bg-emerald-600 text-white'
                          : status === 'incorrect'
                          ? 'bg-rose-600 text-white'
                          : 'bg-blue-900 text-blue-200'
                      }`}
                    >
                      {item.letter}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-1">
                        <span>{item.ruleES}</span>
                        <span className="text-slate-500">·</span>
                        <span className="text-slate-400 lowercase">{item.ruleHY}</span>
                      </div>
                      <p className="text-sm text-white mb-1 font-medium">{item.questionES}</p>
                      <p className="text-xs text-amber-200/90 font-armenian mb-2">{item.questionHY}</p>
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-blue-950/80 border border-blue-800/40 text-xs">
                        <span className="text-emerald-400 font-bold font-rosco">{item.answerES}</span>
                        <span className="text-slate-400">—</span>
                        <span className="text-amber-300 font-armenian">{item.answerHY}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="px-6 py-3 border-t border-blue-900/50 bg-[#061225] flex justify-end">
              <button
                onClick={() => setShowDictionaryModal(false)}
                className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
              >
                Փակել
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Help / Rules Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#09172f] border border-blue-800/60 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setShowHelpModal(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-4">
              <HelpCircle className="w-6 h-6 text-cyan-400" />
              <h3 className="font-rosco font-bold text-xl text-white">Խաղի կանոնները</h3>
            </div>

            <div className="space-y-3.5 text-sm text-slate-300 font-armenian leading-relaxed">
              <p>
                <strong>«Pasapalabra»</strong>-ն հայտնի իսպանական հեռուստախաղ է: Այս տարբերակում ներկայացված է 27 հարց՝ իսպաներենի այբուբենի յուրաքանչյուր տառի համար:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-slate-300">
                <li>
                  <strong className="text-white">30 րոպե ժամանակ.</strong> «Սկսել» կոճակը սեղմելուն պես միանում է 30 րոպեանոց հետհաշվարկը:
                </li>
                <li>
                  <strong className="text-white">Թարգմանություն հայերեն.</strong> Սեղմեք իսպաներեն հարցի վրա, և կբացվի հայերեն թարգմանությունը:
                </li>
                <li>
                  <strong className="text-white">Պատասխանել (Comprobar).</strong> Գրեք բառն իսպաներեն և սեղմեք Enter կամ «Ответить / Ստուգել»:
                </li>
                <li>
                  <strong className="text-white">Pasapalabra (Բաց թողնել).</strong> Բաց է թողնում տառը և անցնում հաջորդին՝ պահպանելով այն հաջորդ շրջանի համար:
                </li>
                <li>
                  <strong className="text-white">Посмотреть ответ (Դիտել պատասխանը).</strong> Կարող եք դիտել ճիշտ պատասխանը: Սա <strong>չի հաշվվում որպես սխալ</strong>, այլ նախատեսված է ուսումնասիրության համար:
                </li>
              </ul>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowHelpModal(false)}
                className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
              >
                Հասկացա
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Finish / Game Over Modal */}
      {showFinishModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#09172f] border border-blue-700/70 rounded-2xl max-w-md w-full p-6 text-center shadow-2xl relative animate-fadeIn">
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-yellow-400 to-amber-600 mx-auto flex items-center justify-center shadow-lg shadow-amber-500/30 mb-4">
              <Trophy className="w-8 h-8 text-white" />
            </div>

            <h3 className="font-rosco font-black text-2xl text-white mb-1">
              Խաղն ավարտվեց!
            </h3>
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-5">
              ¡Juego completado!
            </p>

            <div className="grid grid-cols-2 gap-3 mb-6 font-mono">
              <div className="bg-emerald-950/60 border border-emerald-600/50 rounded-xl p-3">
                <span className="text-xs text-emerald-400 font-sans block mb-1">Ճիշտ (Aciertos)</span>
                <span className="text-3xl font-black text-emerald-400">{correctCount}</span>
                <span className="text-xs text-slate-400 block mt-1">/ 27</span>
              </div>
              <div className="bg-rose-950/60 border border-rose-600/50 rounded-xl p-3">
                <span className="text-xs text-rose-400 font-sans block mb-1">Սխալ (Fallos)</span>
                <span className="text-3xl font-black text-rose-400">{incorrectCount}</span>
                <span className="text-xs text-slate-400 block mt-1">/ 27</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleResetGame}
                className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl text-sm transition-all shadow-md"
              >
                Խաղալ նորից (30 րոպե)
              </button>
              <button
                onClick={() => {
                  setShowFinishModal(false);
                  setShowDictionaryModal(true);
                }}
                className="px-4 py-3 bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-200 font-medium rounded-xl text-sm transition-all"
              >
                Դիտել բառարանը
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clean Footer with metadata discipline */}
      <footer className="relative z-10 border-t border-blue-900/30 bg-[#040b18] px-4 py-3 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="font-armenian">
            «Pasapalabra» իսպաներեն-հայերեն ուսուցողական բառախաղ · 27 հարց (A-Z)
          </p>
          <div className="flex items-center gap-3 text-[11px] text-slate-400">
            <span>Enter: Պատասխանել</span>
            <span>·</span>
            <span>Pasapalabra: Բաց թողնել</span>
            <span>·</span>
            <span>Սեղմեք հարցին: Թարգմանություն</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
