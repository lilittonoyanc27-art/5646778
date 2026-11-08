import React from 'react';
import { LetterStatus, QuestionItem } from './types.ts';

interface RoscoWheelProps {
  questions: QuestionItem[];
  currentIndex: number;
  letterStatuses: Record<number, LetterStatus>;
  revealedAnswers: Record<number, boolean>;
  onSelectLetter: (index: number) => void;
  timerFormatted: string;
  correctCount: number;
  incorrectCount: number;
  isGameRunning: boolean;
}

export const RoscoWheel: React.FC<RoscoWheelProps> = ({
  questions,
  currentIndex,
  letterStatuses,
  revealedAnswers,
  onSelectLetter,
  timerFormatted,
  correctCount,
  incorrectCount,
  isGameRunning,
}) => {
  const size = 520;
  const center = size / 2;
  const radius = 210;
  const nodeRadius = 22;

  const totalLetters = questions.length; // 27

  return (
    <div className="relative flex flex-col items-center justify-center select-none">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="w-full max-w-[440px] sm:max-w-[480px] lg:max-w-[510px] aspect-square drop-shadow-[0_10px_35px_rgba(14,165,233,0.18)]"
      >
        <defs>
          {/* Blue glossy sphere gradient */}
          <radialGradient id="grad-blue" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="45%" stopColor="#2563eb" />
            <stop offset="90%" stopColor="#1e40af" />
            <stop offset="100%" stopColor="#172554" />
          </radialGradient>

          {/* Green (Correct) glossy sphere gradient */}
          <radialGradient id="grad-green" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#86efac" />
            <stop offset="45%" stopColor="#16a34a" />
            <stop offset="90%" stopColor="#15803d" />
            <stop offset="100%" stopColor="#052e16" />
          </radialGradient>

          {/* Red (Incorrect) glossy sphere gradient */}
          <radialGradient id="grad-red" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#fca5a5" />
            <stop offset="45%" stopColor="#dc2626" />
            <stop offset="90%" stopColor="#b91c1c" />
            <stop offset="100%" stopColor="#450a0a" />
          </radialGradient>

          {/* Active letter glowing sphere gradient */}
          <radialGradient id="grad-active" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="35%" stopColor="#eab308" />
            <stop offset="85%" stopColor="#ca8a04" />
            <stop offset="100%" stopColor="#713f12" />
          </radialGradient>

          {/* Ambient center radial glow */}
          <radialGradient id="center-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#0284c7" stopOpacity="0.22" />
            <stop offset="50%" stopColor="#0369a1" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#082f49" stopOpacity="0" />
          </radialGradient>

          {/* Sphere shadow filter */}
          <filter id="sphere-shadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#000000" floodOpacity="0.55" />
          </filter>

          {/* Active pulse glow */}
          <filter id="active-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Outer subtle ring track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="#1e3a8a"
          strokeWidth="3"
          strokeDasharray="4 8"
          opacity="0.35"
        />

        {/* Ambient center backdrop */}
        <circle cx={center} cy={center} r={radius - 35} fill="url(#center-glow)" />

        {/* Concentric decorative ring */}
        <circle
          cx={center}
          cy={center}
          r={radius - 45}
          fill="#061229"
          fillOpacity="0.75"
          stroke="#1d4ed8"
          strokeWidth="1.5"
          strokeOpacity="0.4"
        />

        {/* Center Game HUD inside Rosco */}
        <g transform={`translate(${center}, ${center})`}>
          {/* Active Letter Big Avatar */}
          <circle
            cx="0"
            cy="-45"
            r="38"
            fill="url(#grad-blue)"
            stroke="#60a5fa"
            strokeWidth="2.5"
            className="transition-all duration-300"
          />
          <text
            x="0"
            y="-34"
            textAnchor="middle"
            fill="#ffffff"
            className="font-rosco font-black text-3xl tracking-tight drop-shadow-md select-none"
          >
            {questions[currentIndex]?.letter || 'A'}
          </text>

          {/* Rule label in center */}
          <text
            x="0"
            y="2"
            textAnchor="middle"
            fill="#93c5fd"
            className="text-xs font-semibold uppercase tracking-wider"
          >
            {questions[currentIndex]?.ruleES}
          </text>

          {/* Studio Countdown Timer Display */}
          <g transform="translate(0, 36)">
            <rect
              x="-64"
              y="-16"
              width="128"
              height="32"
              rx="16"
              fill="#0f172a"
              stroke={isGameRunning ? '#f97316' : '#475569'}
              strokeWidth="2"
            />
            <text
              x="0"
              y="6"
              textAnchor="middle"
              fill={isGameRunning ? '#fdba74' : '#94a3b8'}
              className="font-mono font-bold text-lg tabular-nums tracking-wider"
            >
              ⏱ {timerFormatted}
            </text>
          </g>

          {/* Small Score tally under timer */}
          <g transform="translate(0, 72)">
            <text x="-32" y="0" textAnchor="middle" fill="#4ade80" className="text-xs font-bold font-mono">
              ✓ {correctCount}
            </text>
            <text x="0" y="0" textAnchor="middle" fill="#64748b" className="text-xs font-medium">
              |
            </text>
            <text x="32" y="0" textAnchor="middle" fill="#f87171" className="text-xs font-bold font-mono">
              ✗ {incorrectCount}
            </text>
          </g>
        </g>

        {/* 27 Letter Spheres */}
        {questions.map((q, idx) => {
          // Angle starts at top (A at -90 deg), distributes evenly clockwise
          const angleDeg = -90 + idx * (360 / totalLetters);
          const angleRad = (angleDeg * Math.PI) / 180;
          const x = center + radius * Math.cos(angleRad);
          const y = center + radius * Math.sin(angleRad);

          const status = letterStatuses[idx] || 'pending';
          const isActive = idx === currentIndex;
          const isPeeked = revealedAnswers[idx];

          let gradUrl = 'url(#grad-blue)';
          let strokeColor = '#3b82f6';
          let textColor = '#ffffff';

          if (status === 'correct') {
            gradUrl = 'url(#grad-green)';
            strokeColor = '#22c55e';
          } else if (status === 'incorrect') {
            gradUrl = 'url(#grad-red)';
            strokeColor = '#ef4444';
          } else if (isActive) {
            gradUrl = 'url(#grad-active)';
            strokeColor = '#fbbf24';
            textColor = '#0f172a';
          }

          return (
            <g
              key={q.letter}
              transform={`translate(${x}, ${y})`}
              onClick={() => onSelectLetter(idx)}
              className="cursor-pointer transition-transform duration-200 hover:scale-115 group"
              role="button"
              tabIndex={0}
              aria-label={`Letter ${q.letter}, status ${status}`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectLetter(idx);
                }
              }}
            >
              {/* Outer pulsing ring for active item */}
              {isActive && (
                <circle
                  cx="0"
                  cy="0"
                  r={nodeRadius + 6}
                  fill="none"
                  stroke="#fbbf24"
                  strokeWidth="2.5"
                  strokeDasharray="4 4"
                  className="animate-spin"
                  style={{ animationDuration: '8s' }}
                />
              )}

              {/* Sphere Body */}
              <circle
                cx="0"
                cy="0"
                r={isActive ? nodeRadius + 3 : nodeRadius}
                fill={gradUrl}
                stroke={isActive ? '#fef08a' : strokeColor}
                strokeWidth={isActive ? 2.5 : 1.5}
                filter="url(#sphere-shadow)"
                className="transition-all duration-300"
              />

              {/* Sphere Specular Highlight Reflection */}
              <ellipse
                cx="-4"
                cy="-7"
                rx={isActive ? 8 : 7}
                ry={isActive ? 4 : 3.5}
                fill="#ffffff"
                fillOpacity="0.4"
                transform="rotate(-25)"
                pointerEvents="none"
              />

              {/* Letter Glyph */}
              <text
                x="0"
                y="6"
                textAnchor="middle"
                fill={textColor}
                className="font-rosco font-black text-base sm:text-lg select-none pointer-events-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]"
              >
                {q.letter}
              </text>

              {/* Small "Eye" indicator if answer was peeked */}
              {isPeeked && status === 'pending' && (
                <circle
                  cx="12"
                  cy="-12"
                  r="4"
                  fill="#f59e0b"
                  stroke="#0f172a"
                  strokeWidth="1.5"
                />
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
};
