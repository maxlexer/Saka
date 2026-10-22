export type Box = [number, number, number, number];

export const MIST_COLORS = ["#AD9883", "#8C7964", "#685846"] as const;
export const MIST_COLORS_DARK = ["#8C7964", "#BDAE9B", "#DCD0BF"] as const;

/** Shader time of the captured still. The live mist starts its clock here, so swapping the still for the canvas does not jump. */
export const MIST_STILL_TIME = 40;

/** The hero floor picture: its size and the horizon as a share of its height from the top. */
export const FLOOR_SIZE = [2400, 1600] as const;
export const FLOOR_HORIZON = 0.5656;
/** The horizon never sits lower than this share of the hero height. Wide screens lift the picture, so a floor band always shows. */
export const HORIZON_MAX = 0.75;

/**
 * The hero's floor frame in CSS, set on the hero (a size container), so the floor, the smoke stills and the bottle all
 * share it: the picture's height, the horizon's distance from the hero top, and how far the picture is lifted.
 */
export const FLOOR_VARS = {
  "--floor-h": `max(${(100 * FLOOR_SIZE[1]) / FLOOR_SIZE[0]}cqw, 100cqh)`,
  "--horizon": `min(${FLOOR_HORIZON} * var(--floor-h), ${HORIZON_MAX * 100}cqh)`,
  "--lift": `calc(var(--horizon) - ${FLOOR_HORIZON} * var(--floor-h))`,
};

/**
 * Where the floor picture lands over a width by height hero (object-fit cover, pinned to the top, lifted on wide
 * screens), as [left, bottom, width, height] in the same pixels with the y axis up. Matches FLOOR_VARS. The smoke is
 * laid out in this frame, so it rests on the floor whatever the screen shape.
 */
export function floorFrame(width: number, height: number): Box {
  const scale = Math.max(width / FLOOR_SIZE[0], height / FLOOR_SIZE[1]);
  const [w, h] = [FLOOR_SIZE[0] * scale, FLOOR_SIZE[1] * scale];
  const lift = Math.min(0, HORIZON_MAX * height - FLOOR_HORIZON * h);
  return [(width - w) / 2, height - h - lift, w, h];
}

export function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/** CSS pixels relative to the page to canvas pixels relative to the hero, with the y axis flipped for WebGL. */
export function toCanvasRect(
  el: { left: number; right: number; top: number; bottom: number },
  hero: { left: number; top: number; height: number },
  scale: number,
  pad = 0,
): Box {
  return [
    (el.left - hero.left - pad) * scale,
    (hero.height - (el.bottom - hero.top) - pad) * scale,
    (el.right - hero.left + pad) * scale,
    (hero.height - (el.top - hero.top) + pad) * scale,
  ];
}

/** True once frames have been slower than `slowMs` for `windowMs` in a row. A healthy 30fps loop sits near 33ms. */
export function createBudget(slowMs = 45, windowMs = 2000) {
  let slow = 0;
  return (frameMs: number) => {
    slow = frameMs > slowMs ? slow + frameMs : 0;
    return slow >= windowMs;
  };
}
