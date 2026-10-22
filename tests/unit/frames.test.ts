import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { FRAMES, placeholderFrames, writeBottle } from "../../scripts/frames.ts";

// Cached input files stay locked on Windows, which would stop the temp folder from being removed.
sharp.cache(false);

describe("writeBottle", () => {
  it("writes a transparent 960 by 1200 still and a 6 by 6 sprite of 480 by 600 frames", async () => {
    const dir = await mkdtemp(join(tmpdir(), "saka-frames-"));
    try {
      const frames = await placeholderFrames();
      expect(frames).toHaveLength(FRAMES);
      await writeBottle(frames, dir);
      const still = await sharp(join(dir, "still.webp")).metadata();
      expect([still.width, still.height, still.hasAlpha]).toEqual([960, 1200, true]);
      const sprite = await sharp(join(dir, "spin.webp")).metadata();
      expect([sprite.width, sprite.height]).toEqual([2880, 3600]);
      const corner = await sharp(join(dir, "still.webp")).extract({ left: 0, top: 0, width: 1, height: 1 }).raw().toBuffer();
      expect(corner[3]).toBe(0);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 60_000);

  it("writes only a still from a single frame, standing in the same spot", async () => {
    const dir = await mkdtemp(join(tmpdir(), "saka-frames-"));
    try {
      const [front] = await placeholderFrames();
      await writeBottle([front], dir);
      expect(existsSync(join(dir, "spin.webp"))).toBe(false);
      const { info } = await sharp(join(dir, "still.webp")).trim().toBuffer({ resolveWithObject: true });
      expect(-(info.trimOffsetTop ?? 0) + info.height).toBe(Math.round(1200 * 0.92));
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("refuses the wrong number of frames", async () => {
    await expect(writeBottle([], "unused")).rejects.toThrow("1 or 36 frames");
  });
});
