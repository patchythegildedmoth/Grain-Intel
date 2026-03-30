import { useEffect, useRef, useState } from 'react';

interface AnimatedNumberProps {
  value: number;
  format: (n: number) => string;
  duration?: number;
  className?: string;
}

/** Check once at module load — value is stable for the lifetime of the page */
const prefersReducedMotion =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Counts from the previous value to the new value over `duration` ms.
 * Triggers on initial mount (from 0) and on subsequent value changes.
 *
 * Edge cases handled:
 * - NaN value: renders format(0) rather than "NaN%" / "$NaN"
 * - prefers-reduced-motion: jumps immediately to final value
 * - Interrupted animation: starts from current displayed position, not last completed
 */
export function AnimatedNumber({ value, format, duration = 400, className }: AnimatedNumberProps) {
  // Guard: NaN from upstream hooks (e.g. 0/0 hedge ratio) should not reach format()
  const safeValue = Number.isFinite(value) ? value : 0;

  const [displayValue, setDisplayValue] = useState(0);
  const prevValueRef = useRef(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    // BUG FIX: capture current display position before cancelling the in-flight animation.
    // Without this, an interrupted animation always restarts from the last *completed* value,
    // causing the counter to jump backward (e.g. 0 → 125k, interrupted at 109k → restarts from 0).
    const start = prevValueRef.current;
    const end = safeValue;

    // Accessibility: skip animation for users who prefer reduced motion
    if (prefersReducedMotion) {
      prevValueRef.current = end;
      setDisplayValue(end);
      return;
    }

    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Cubic ease-out: starts fast, decelerates toward target
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = start + (end - start) * eased;

      if (progress < 1) {
        setDisplayValue(current);
        // Update prevValueRef continuously so an interruption starts from here
        prevValueRef.current = current;
        rafRef.current = requestAnimationFrame(tick);
      } else {
        prevValueRef.current = end;
        setDisplayValue(end);
      }
    };

    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(rafRef.current);
  }, [safeValue, duration]);

  return <span className={className}>{format(displayValue)}</span>;
}
