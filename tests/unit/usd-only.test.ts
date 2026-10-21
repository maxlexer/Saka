import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";

it("no Riel or KHR anywhere in the app source", () => {
  const hits = (readdirSync("src", { recursive: true }) as string[])
    .filter((file) => /\.(ts|tsx)$/.test(file))
    .flatMap((file) =>
      readFileSync(join("src", file), "utf8")
        .split("\n")
        .flatMap((line, i) => (/riel|KHR/i.test(line) ? [`src/${file}:${i + 1}`] : [])),
    );
  expect(hits).toEqual([]);
});
