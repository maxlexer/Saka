import { createServer } from "node:http";
import { readFileSync } from "node:fs";

const load = (name) => JSON.parse(readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url), "utf8"));

export const state = { catalog: load("catalog"), settings: load("settings") };

export function startMock(port = 4010) {
  const server = createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const send = (code, body) => {
      res.writeHead(code, { "content-type": "application/json" });
      res.end(JSON.stringify(body));
    };
    if (url.pathname.includes("/data/query/")) {
      const query = url.searchParams.get("query") ?? "";
      return send(200, { result: query.includes("siteSettings") ? state.settings : state.catalog });
    }
    send(404, { error: "not found" });
  });
  return new Promise((resolve) => server.listen(port, "127.0.0.1", () => resolve(server)));
}
