import { gzipSync } from "node:zlib";
import { expect, test } from "@playwright/test";

const BUDGET_BYTES = 170 * 1024;

test.skip(({ isMobile }) => isMobile, "The HTML and its scripts are the same on every device");

// Initial JavaScript is every script the page's own HTML loads. Later loads are not counted: Next prefetching
// other routes in idle time (measured on their own route) and lazy chunks such as the product modal and the mist.
// `nomodule` scripts are skipped because modern browsers never download them.
for (const path of ["/", "/products"]) {
  test(`initial JavaScript on ${path} stays under 170KB gzipped`, async ({ request }) => {
    const html = await (await request.get(path)).text();
    const srcs = [...html.matchAll(/<script\b[^>]*>/g)]
      .map(([tag]) => tag)
      .filter((tag) => !/nomodule/i.test(tag))
      .flatMap((tag) => tag.match(/\bsrc="([^"]+)"/)?.[1] ?? []);
    const sizes = await Promise.all(srcs.map(async (src) => gzipSync(await (await request.get(src)).body()).length));
    const total = sizes.reduce((sum, n) => sum + n, 0);
    console.log(`${path}: ${(total / 1024).toFixed(1)}KB gzipped across ${sizes.length} scripts`);
    expect(sizes.length).toBeGreaterThan(5);
    expect(total).toBeLessThan(BUDGET_BYTES);
  });
}
