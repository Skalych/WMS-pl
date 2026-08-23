import type { CSSProperties } from 'react';

/** Cap so long lists don't stagger for many seconds. */
export const ROW_STAGGER_CAP = 24;

/** Inline style for staggered row entrance (`--row-i` used in CSS). */
export function rowStaggerStyle(index: number): CSSProperties {
  return { '--row-i': Math.min(index, ROW_STAGGER_CAP) } as CSSProperties;
}
