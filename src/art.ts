// Everyone on the board, drawn small. Silhouette and colour do the work: at
// thirty pixels a player reads "bone", "snake", "wings", "bull" long before
// they read detail, and that is all they need to tell a threat apart.

import type { EnemyKind } from "./types.ts";

const HERO = `
<svg viewBox="0 0 24 24" fill="none" stroke="#e0cfa6" stroke-width="1.9"
     stroke-linecap="round" stroke-linejoin="round">
  <circle cx="10" cy="5" r="3.1" fill="#e0cfa6" stroke="none"/>
  <path d="M10 8.6v6.4"/>
  <path d="M6.8 20.5 10 15l3.2 5.5"/>
  <path d="M6.2 11.8h7.2"/>
  <path d="m15.2 11.4 4.6-6.6" stroke="#f3cd6b" stroke-width="2.2"/>
  <path d="m13.4 10.4 2.9 2" stroke="#b8862c" stroke-width="1.6"/>
</svg>`;

const SKELETON = `
<svg viewBox="0 0 24 24">
  <path d="M12 2.2c4.9 0 7.9 3.3 7.9 7.5 0 2.8-1.4 4.5-2.9 5.5v3.2c0 .9-.7 1.6-1.6 1.6H8.6c-.9 0-1.6-.7-1.6-1.6v-3.2c-1.5-1-2.9-2.7-2.9-5.5 0-4.2 3-7.5 7.9-7.5z" fill="#e8e2d0"/>
  <circle cx="9" cy="10" r="2.2" fill="#0d1222"/>
  <circle cx="15" cy="10" r="2.2" fill="#0d1222"/>
  <path d="M11 14.4h2v2.1h-2z" fill="#0d1222"/>
  <path d="M9.4 20V17M12 20v-3M14.6 20V17" stroke="#0d1222" stroke-width="1.1"/>
</svg>`;

const GORGON = `
<svg viewBox="0 0 24 24" stroke-linecap="round">
  <g fill="none" stroke="#4fae80" stroke-width="1.6">
    <path d="M11 5C8.6 2.4 5.4 3 4.6 5.4"/>
    <path d="M13 5c2.4-2.6 5.6-2 6.4.4"/>
    <path d="M12 4.4C11.4 1.6 9.4.8 7.8 1.6"/>
    <path d="M12.4 4.6C13.2 2 15.2 1.2 16.8 2.2"/>
  </g>
  <ellipse cx="12" cy="13.6" rx="6" ry="6.9" fill="#79d3a5"/>
  <path d="m9.2 12.2 2.1 1.5-2.1 1.5M14.8 12.2l-2.1 1.5 2.1 1.5"
        fill="none" stroke="#0d1222" stroke-width="1.5"/>
  <path d="M10.2 18.2h3.6" stroke="#0d1222" stroke-width="1.3"/>
</svg>`;

const HARPY = `
<svg viewBox="0 0 24 24">
  <path d="M12 8.4C8.2 3.2 3 3 1 6.2c3 .1 3.9 2.1 4.9 5 .6 1.9 3.1 3.2 6.1 3.2s5.5-1.3 6.1-3.2c1-2.9 1.9-4.9 4.9-5-2-3.2-7.2-3-11 2.2z" fill="#b48cd6"/>
  <circle cx="12" cy="10.4" r="2.7" fill="#efe6f8"/>
  <circle cx="12" cy="10.1" r="1.05" fill="#0d1222"/>
  <path d="m12 14.2-2.2 7M12 14.2l2.2 7" stroke="#8f68b4" stroke-width="1.7" stroke-linecap="round"/>
</svg>`;

const MINOTAUR = `
<svg viewBox="0 0 24 24">
  <g fill="none" stroke="#efe6d2" stroke-width="2.1" stroke-linecap="round">
    <path d="M5.6 5.4C3.4 4.6 2.6 2.8 3.4 1.4"/>
    <path d="M18.4 5.4c2.2-.8 3-2.6 2.2-4"/>
  </g>
  <path d="M12 3.6c4.6 0 7.2 2.8 7.2 6.8 0 4.7-3.1 9.3-7.2 9.3s-7.2-4.6-7.2-9.3C4.8 6.4 7.4 3.6 12 3.6z" fill="#8c2f3d"/>
  <circle cx="9.1" cy="9.8" r="1.6" fill="#f3cd6b"/>
  <circle cx="14.9" cy="9.8" r="1.6" fill="#f3cd6b"/>
  <circle cx="10.4" cy="13.4" r=".8" fill="#12060a"/>
  <circle cx="13.6" cy="13.4" r=".8" fill="#12060a"/>
  <path d="M9.4 16.4c1.7 1.3 3.5 1.3 5.2 0" fill="none" stroke="#12060a" stroke-width="1.5" stroke-linecap="round"/>
</svg>`;

const CREATURES: Record<EnemyKind, string> = {
  skeleton: SKELETON,
  gorgon: GORGON,
  harpy: HARPY,
  minotaur: MINOTAUR,
};

export const heroArt = (): string => HERO;
export const creatureArt = (kind: EnemyKind): string => CREATURES[kind];
