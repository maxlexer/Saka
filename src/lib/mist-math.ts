export type Box = [number, number, number, number];

export const MIST_COLORS = ["#F2EBDF", "#DCD0BF", "#AD9883"] as const;
export const MIST_COLORS_DARK = ["#23261C", "#3A3A2C", "#8C7964"] as const;

/** Shader time of the captured still. The live mist starts its clock here, so swapping the still for the canvas does not jump. */
export const MIST_STILL_TIME = 40;

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
