import { useEffect, useState } from 'react';

/** Seconds elapsed since `since` ISO timestamp; ticks every second when active. */
export function useLiveSeconds(since: string | null, active = true): number {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!since || !active) {
      setSeconds(0);
      return;
    }

    const compute = () => {
      const start = new Date(since).getTime();
      if (Number.isNaN(start)) {
        setSeconds(0);
        return;
      }
      setSeconds(Math.max(0, Math.floor((Date.now() - start) / 1000)));
    };

    compute();
    const id = setInterval(compute, 1000);
    return () => clearInterval(id);
  }, [since, active]);

  return seconds;
}

export function formatTimerSeconds(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
