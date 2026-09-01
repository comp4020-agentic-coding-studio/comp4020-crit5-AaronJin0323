// The cast, drawn as black-figure pottery: flat profile silhouettes, incised
// interior lines instead of shading, and never more than three colours in one
// figure. Every sprite carries two poses in the same SVG --- an idle and a
// wind-up --- and the stylesheet decides which one shows, so changing pose
// never reparses the markup.
//
// Palette comes from CSS custom properties, so the whole cast re-tints from
// one place: --ivory, --terracotta, --oxblood, --gold, --ink.

const wrap = (kind: string, body: string): string =>
  `<svg class="fig fig-${kind}" viewBox="0 0 32 32" aria-hidden="true" focusable="false">${body}</svg>`;

// --------------------------------------------------------------- Theseus ---
// A Corinthian helm in profile is the most legible "Greek" shape there is, but
// only if it is built like one: the crest has to stand clear of the dome so
// the silhouette reads before any detail does, and the nose-guard has to drop
// past the eye slot, or a pale dome with a gold swoosh on it is just a blond
// head. The crest is terracotta and not gold on purpose --- gold belongs to
// the blade, which is the thing Ares lights up.
//
// Shared between both poses: a helm that shifted between idle and wind-up
// would read as the head moving rather than the arm.

const HELM = `
    <path class="ivory" d="M10.3 10.4C10.3 6.4 12.4 4.2 15.1 4.2 17.8 4.2 19.9 6.2 19.9 10L19.9 12 18.5 13.6 12.2 13.6 12.2 15.4 10.3 15.4Z"/>
    <path class="ink" d="M10.5 9.4h6.6v0.8h-6.6z"/>
    <path class="ink" d="M11.4 10.8h3.1a0.9 0.9 0 0 1 0 1.8h-3.1a0.9 0.9 0 0 1 0-1.8z"/>
    <path class="terracotta" d="M11.9 6C12.6 1.4 16.6 -0.6 19.8 2.4 21.2 3.7 21.8 5.2 21.9 7.2L20.2 6.8C19.9 5 18.1 3.8 16 3.8 14.3 3.8 12.9 4.6 11.9 6Z"/>`;

/**
 * The aspis. A ring and a central boss, incised the way a painter would
 * scratch them --- a plain hole in the middle read as a washer.
 */
const shield = (cx: number, cy: number): string => `
    <path class="terracotta" d="M${cx} ${cy - 3.8}a3.8 3.8 0 1 1 0 7.6 3.8 3.8 0 0 1 0-7.6z"/>
    <path class="ink" fill-rule="evenodd" d="M${cx} ${cy - 2.9}a2.9 2.9 0 1 1 0 5.8 2.9 2.9 0 0 1 0-5.8zm0 0.75a2.15 2.15 0 1 0 0 4.3 2.15 2.15 0 0 0 0-4.3z"/>
    <path class="ink" d="M${cx} ${cy - 0.9}a0.9 0.9 0 1 1 0 1.8 0.9 0.9 0 0 1 0-1.8z"/>`;

const THESEUS_BODY = `
  <g class="pose calm">
    <path class="ink" d="M13 12h7l1.4 10.5h-9.8z"/>
    <path class="ink" d="M12.6 22.5h3.2l-.4 6.5h-3.1zM17 22.5h3.3l1 6.5h-3.1z"/>
    ${HELM}
    <path class="gold" d="M20.4 14.1 27 6.2l1.6 1.3-6.6 7.9zM21.1 15.6l2.6-2.1 1 1.2-2.6 2.1z"/>
    ${shield(11.5, 19.1)}
  </g>
  <g class="pose coil">
    <path class="ink" d="M12.4 12h7.2l1.2 10.5h-9.6z"/>
    <path class="ink" d="M11.6 22.5h3.4l-1.1 6.5h-3.1zM17.4 22.5h3.3l1.9 6.5h-3.2z"/>
    ${HELM}
    <path class="gold" d="M19.6 12.4 30 10.2l.4 2-10.4 2.2zM21.4 15l3.3-.7.3 1.5-3.3.7z"/>
    ${shield(11.1, 19.6)}
  </g>`;

// -------------------------------------------------------------- skeleton ---
// Ivory bone on the dark ground, incised the way a painter would scratch
// through slip: ribs as three straight cuts, the skull as two hollows.

const SKELETON_BODY = `
  <g class="pose calm">
    <path class="ivory" d="M16 3.4c3.6 0 6.2 2.5 6.2 5.8 0 2.2-1 3.9-2.6 4.8l.5 2.5h-8.2l.5-2.5c-1.6-.9-2.6-2.6-2.6-4.8 0-3.3 2.6-5.8 6.2-5.8z"/>
    <path class="ink" d="M12.7 8.2a1.9 2.2 0 1 1 0 4.4 1.9 2.2 0 0 1 0-4.4zM19.3 8.2a1.9 2.2 0 1 1 0 4.4 1.9 2.2 0 0 1 0-4.4zM15 13.3h2v2.2h-2z"/>
    <path class="ivory" d="M15 17.4h2v11.4h-2z"/>
    <path class="ivory" d="M9.6 18.6h12.8v1.9H9.6zM10.8 22.2h10.4v1.8H10.8zM12.2 25.6h7.6v1.7h-7.6z"/>
    <path class="ivory" d="M8.6 17.6h1.9l-1.6 8.4h-1.9zM21.5 17.6h1.9l1.6 8.4h-1.9z"/>
  </g>
  <g class="pose coil">
    <path class="ivory" d="M16 2.6c3.6 0 6.2 2.5 6.2 5.8 0 2.2-1 3.9-2.6 4.8l.5 2.5h-8.2l.5-2.5c-1.6-.9-2.6-2.6-2.6-4.8 0-3.3 2.6-5.8 6.2-5.8z"/>
    <path class="oxblood" d="M12.5 7.4a2.1 2.4 0 1 1 0 4.8 2.1 2.4 0 0 1 0-4.8zM19.5 7.4a2.1 2.4 0 1 1 0 4.8 2.1 2.4 0 0 1 0-4.8z"/>
    <path class="ivory" d="M14 12.4h4v3.4h-4z"/>
    <path class="ivory" d="M15 16.6h2v12.2h-2z"/>
    <path class="ivory" d="M9.6 17.8h12.8v1.9H9.6zM10.8 21.4h10.4v1.8H10.8zM12.2 24.8h7.6v1.7h-7.6z"/>
    <path class="ivory" d="M8.2 16.8h2l-3.4 6.2-1.7-.9zM21.8 16.8h2l3.1 5.3-1.7.9z"/>
  </g>`;

// ---------------------------------------------------------------- medusa ---
// Serpents instead of hair, radiating. In the wind-up they straighten and
// point, which is the whole tell: she is aiming down a line.

const snakes = (spread: number): string => {
  const out: string[] = [];
  for (let i = 0; i < 7; i++) {
    const a = (-Math.PI * (0.08 + 0.84 * (i / 6))) - Math.PI * 0.08;
    const len = 8 + (i % 2 === 0 ? 1.8 : 0);
    const cx = 16 + Math.cos(a) * 4.4;
    const cy = 11 + Math.sin(a) * 4.4;
    const ex = 16 + Math.cos(a) * (4.4 + len);
    const ey = 11 + Math.sin(a) * (4.4 + len);
    const mx = (cx + ex) / 2 + Math.sin(a) * spread;
    const my = (cy + ey) / 2 - Math.cos(a) * spread;
    out.push(`<path class="stroke-ivory" d="M${cx.toFixed(1)} ${cy.toFixed(1)}Q${mx.toFixed(1)} ${my.toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}"/>`);
  }
  return out.join("");
};

const MEDUSA_BODY = `
  <g class="pose calm">
    ${snakes(3.2)}
    <path class="ink" d="M16 5.6c3.5 0 5.8 2.4 5.8 5.6S19.5 17 16 17s-5.8-2.6-5.8-5.8S12.5 5.6 16 5.6z"/>
    <path class="gold" d="M13.1 10.1a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zM18.9 10.1a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3z"/>
    <path class="ivory" d="M13.6 14.4h4.8v1.2h-4.8z"/>
    <path class="ink" d="M13.4 17h5.2l3 11.8H10.4z"/>
    <path class="terracotta" d="M11.6 22.2h8.8v1.5h-8.8z"/>
  </g>
  <g class="pose coil">
    ${snakes(0)}
    <path class="ink" d="M16 5c3.5 0 5.8 2.4 5.8 5.6s-2.3 5.8-5.8 5.8-5.8-2.6-5.8-5.8S12.5 5 16 5z"/>
    <path class="gold gaze" d="M12.6 9.2a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM19.4 9.2a2 2 0 1 1 0 4 2 2 0 0 1 0-4z"/>
    <path class="oxblood" d="M13.2 14h5.6v1.6h-5.6z"/>
    <path class="ink" d="M13.4 16.6h5.2l3 12.2H10.4z"/>
    <path class="terracotta" d="M11.6 21.8h8.8v1.5h-8.8z"/>
  </g>`;

// -------------------------------------------------------------- Minotaur ---
// Bull's head on a man's shoulders, filling more of the tile than anything
// else on the board. Horns are gold so the wind-up reads from across the room.

const MINOTAUR_BODY = `
  <g class="pose calm">
    <path class="ink" d="M9.4 15.6h13.2l2 13.2H7.4z"/>
    <path class="oxblood" d="M16 3.2c4 0 6.8 2.7 6.8 6.4 0 2.3-1.1 4.2-2.9 5.3l.6 2.4H11.5l.6-2.4c-1.8-1.1-2.9-3-2.9-5.3 0-3.7 2.8-6.4 6.8-6.4z"/>
    <path class="gold" d="M9.6 8.6C7.1 8.2 5.2 6.4 4.7 3.9l2.1-.5c.4 1.9 1.6 3 3.4 3.3zM22.4 8.6c2.5-.4 4.4-2.2 4.9-4.7l-2.1-.5c-.4 1.9-1.6 3-3.4 3.3z"/>
    <path class="gold" d="M12.7 8.5a1.7 1.7 0 1 1 0 3.4 1.7 1.7 0 0 1 0-3.4zM19.3 8.5a1.7 1.7 0 1 1 0 3.4 1.7 1.7 0 0 1 0-3.4z"/>
    <path class="ivory" d="M14.2 12.9h3.6v1.6h-3.6z"/>
    <path class="ivory" d="M10.6 19.4h10.8v1.8H10.6z"/>
  </g>
  <g class="pose coil">
    <path class="ink" d="M9 16.4h14l2.2 12.4H6.8z"/>
    <path class="oxblood" d="M16 4.4c4 0 6.8 2.7 6.8 6.4 0 2.3-1.1 4.2-2.9 5.3l.6 2.4H11.5l.6-2.4c-1.8-1.1-2.9-3-2.9-5.3 0-3.7 2.8-6.4 6.8-6.4z"/>
    <path class="gold" d="M9.6 9.4C6.8 8.6 5 6.1 5 3.1l2.2.1c0 2.2 1.1 3.9 2.9 4.4zM22.4 9.4c2.8-.8 4.6-3.3 4.6-6.3l-2.2.1c0 2.2-1.1 3.9-2.9 4.4z"/>
    <path class="gold gaze" d="M12.5 9.5a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM19.5 9.5a2 2 0 1 1 0 4 2 2 0 0 1 0-4z"/>
    <path class="ivory" d="M13.8 14.3h4.4v1.8h-4.4z"/>
    <path class="ivory" d="M10.2 20.2h11.6v1.8H10.2z"/>
    <path class="oxblood" d="M4.6 22.4h4.2v2H4.6zM23.2 22.4h4.2v2h-4.2z"/>
  </g>`;

const CREATURES: Record<string, string> = {
  skeleton: SKELETON_BODY,
  medusa: MEDUSA_BODY,
  minotaur: MINOTAUR_BODY,
};

export const heroArt = (): string => wrap("hero", THESEUS_BODY);
export const creatureArt = (kind: string): string =>
  wrap(kind, CREATURES[kind] ?? SKELETON_BODY);

// ------------------------------------------------------------------ gifts ---
// The three gods, as objects rather than portraits: what the gift does, drawn.

const ARES_ICON = `
  <path class="gold" d="M16 2.5 19 9v13.5h-6V9z"/>
  <path class="ink" d="M13 22.5h6v2.2h-6z"/>
  <path class="gold" d="M9.5 22.6h13v2.1h-13z"/>
  <path class="oxblood" d="M16 25.2c1.6 2.1 2.4 3.5 2.4 4.4a2.4 2.4 0 0 1-4.8 0c0-.9.8-2.3 2.4-4.4z"/>`;

const HERMES_ICON = `
  <path class="ivory" d="M9.4 19.6h13.2l1.6 3.4H8z"/>
  <path class="ink" d="M9 23h14v2.2H9zM12.6 25.2h1.9v3.6h-1.9zM17.5 25.2h1.9v3.6h-1.9z"/>
  <path class="gold" d="M9.6 18.4C6 17.6 3.4 15 2.6 11.4c3.4 1 5.6 1.6 6.6 4.2zM22.4 18.4c3.6-.8 6.2-3.4 7-7-3.4 1-5.6 1.6-6.6 4.2z"/>
  <path class="gold" d="M11.4 13.2c-2.6-.9-4.3-2.6-5.1-5.2 2.6.9 4.3 2.6 5.1 5.2zM20.6 13.2c2.6-.9 4.3-2.6 5.1-5.2-2.6.9-4.3 2.6-5.1 5.2z"/>`;

const ATHENA_ICON = `
  <path class="ink" d="M16 2.6c4.4 0 8 1 10.4 2.2 0 11.6-4 19.4-10.4 22.6C9.6 24.2 5.6 16.4 5.6 4.8 8 3.6 11.6 2.6 16 2.6z"/>
  <path class="gold" d="M16 5.2c3.4 0 6.3.8 8.2 1.7-.1 9.3-3.3 15.6-8.2 18.2C11.1 22.5 7.9 16.2 7.8 6.9 9.7 6 12.6 5.2 16 5.2zm0 1.9c-2.7 0-5 .6-6.4 1.3.1 7.5 2.6 12.6 6.4 14.8 3.8-2.2 6.3-7.3 6.4-14.8-1.4-.7-3.7-1.3-6.4-1.3z"/>
  <path class="ivory" d="M12.4 10.6a2.1 2.1 0 1 1 0 4.2 2.1 2.1 0 0 1 0-4.2zM19.6 10.6a2.1 2.1 0 1 1 0 4.2 2.1 2.1 0 0 1 0-4.2z"/>
  <path class="oxblood" d="M13.2 17.4h5.6l-2.8 3.6z"/>`;

const ICONS: Record<string, string> = {
  ares: ARES_ICON,
  hermes: HERMES_ICON,
  athena: ATHENA_ICON,
};

export const godArt = (id: string): string =>
  `<svg class="fig fig-gift fig-${id}" viewBox="0 0 32 32" aria-hidden="true" focusable="false">${ICONS[id] ?? ""}</svg>`;

/** A heart, for the HUD. Two states, drawn by CSS rather than by swapping SVG. */
export const heartArt = (): string =>
  `<svg class="fig fig-heart" viewBox="0 0 32 32" aria-hidden="true" focusable="false"><path d="M16 27.4C7.6 21.6 3.4 16.6 3.4 12.2A6.9 6.9 0 0 1 16 8.2a6.9 6.9 0 0 1 12.6 4c0 4.4-4.2 9.4-12.6 15.2z"/></svg>`;
