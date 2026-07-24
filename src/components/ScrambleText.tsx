/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';

export interface ScrambleTextProps {
  text: string;
  duration?: number;
  className?: string;
  scrambleColor?: string;
  repeatInterval?: number; // Time in ms before repeating scramble, default 6000ms
  scrambleOnHover?: boolean;
  flipInterval?: number; // Time in ms per character flip (default 75ms for clear readability)
}

// Thai Consonants (ก-ฮ)
const THAI_CONSONANTS = "กขฃคฅฆงจฉชซฌญฎฏฐฑฒณดตถทธนบปผฝพฟภมยรลวศษสหฬอฮ";

// English Letters (A-Z, a-z)
const ENGLISH_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

// Numbers & Cipher Symbols
const SYMBOLS_AND_NUMS = "0123456789!<>-_\\/[]{}—=+*^?#@%&$~";

// Comprehensive multi-language decoding character pool
const DECODE_CHARSET = (THAI_CONSONANTS + ENGLISH_LETTERS + SYMBOLS_AND_NUMS).split('');

// Pseudo-random character selector that stays stable for the duration of each flip step
const getCharForStep = (step: number, pos: number) => {
  const hash = Math.sin(step * 997 + pos * 31) * 10000;
  const index = Math.floor(Math.abs(hash) % DECODE_CHARSET.length);
  return DECODE_CHARSET[index];
};

export const ScrambleText: React.FC<ScrambleTextProps> = ({ 
  text, 
  duration = 3200,
  className = "",
  scrambleColor = "text-slate-400",
  repeatInterval = 6500,
  scrambleOnHover = false,
  flipInterval = 75
}) => {
  const [isReducedMotion, setIsReducedMotion] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  });
  const [trigger, setTrigger] = useState(0);
  const [elapsed, setElapsed] = useState(duration);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = (e: MediaQueryListEvent) => {
      setIsReducedMotion(e.matches);
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  // Repeat scramble decoding animation periodically if repeatInterval > 0
  useEffect(() => {
    if (isReducedMotion || repeatInterval <= 0) return;
    const intervalId = setInterval(() => {
      setTrigger((prev) => prev + 1);
    }, Math.max(duration + 1000, repeatInterval));
    return () => clearInterval(intervalId);
  }, [isReducedMotion, duration, repeatInterval]);

  useEffect(() => {
    if (isReducedMotion) {
      setElapsed(duration);
      return;
    }

    let animationFrameId: number;
    const startTime = performance.now();

    const tick = (now: number) => {
      const time = now - startTime;
      setElapsed(Math.min(time, duration));

      if (time < duration) {
        animationFrameId = requestAnimationFrame(tick);
      }
    };

    animationFrameId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [trigger, duration, isReducedMotion]);

  // Separate Thai combining vowels/diacritics to preserve proper typography structure during decoding
  const segments = useMemo(() => {
    const result: string[] = [];
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const code = char.charCodeAt(0);
      
      // Thai combining top/bottom marks & diacritics
      const isCombining = (code === 0x0e31) || 
                          (code >= 0x0e34 && code <= 0x0e3a) || 
                          (code >= 0x0e47 && code <= 0x0e4e);
      
      if (isCombining && result.length > 0) {
        result[result.length - 1] += char;
      } else {
        result.push(char);
      }
    }
    return result;
  }, [text]);

  const handleMouseEnter = () => {
    if (scrambleOnHover && !isReducedMotion) {
      setTrigger((prev) => prev + 1);
    }
  };

  return (
    <span 
      aria-label={text} 
      onMouseEnter={handleMouseEnter}
      className={`inline-flex items-center justify-center select-none font-sans font-bold text-slate-700 leading-normal ${className}`}
    >
      {segments.map((segment, idx) => {
        if (segment === ' ') {
          return (
            <span key={idx} className="w-[0.25em] inline-block">
              &nbsp;
            </span>
          );
        }

        const startSettle = (idx / segments.length) * (duration * 0.70);
        const settleDeadline = startSettle + 250;
        const isSettled = isReducedMotion || elapsed >= settleDeadline;

        let displayChar = segment;
        if (!isSettled) {
          const currentStep = Math.floor((elapsed + idx * 30) / flipInterval);
          displayChar = getCharForStep(currentStep, idx);
        }

        return (
          <span key={idx} className="relative inline-block overflow-hidden align-middle">
            {/* Invisible baseline preserving exact typography & width of the target character */}
            <span className="invisible select-none pointer-events-none" aria-hidden="true">
              {segment}
            </span>
            {/* Perfectly aligned absolute character overlay during decoding */}
            <span 
              className={`absolute inset-0 flex items-center justify-center whitespace-nowrap transition-colors duration-150 ${
                isSettled 
                  ? 'text-inherit font-sans font-bold' 
                  : `${scrambleColor} font-sans font-extrabold text-[0.95em]`
              }`} 
              aria-hidden="true"
            >
              {displayChar}
            </span>
          </span>
        );
      })}
    </span>
  );
};

export default ScrambleText;
