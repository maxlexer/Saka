import { createServer } from "node:http";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const load = (name) => JSON.parse(readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url), "utf8"));
const fresh = () => ({ catalog: load("catalog"), settings: load("settings"), khqr: [], telegram: [] });

export const state = fresh();

const readJson = (req) =>
  new Promise((resolve) => {
    let raw = "";
    req.on("data", (chunk) => (raw += chunk));
    req.on("end", () => resolve(raw ? JSON.parse(raw) : {}));
  });

export function startMock(port = 4010) {
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const send = (code, body) => {
      res.writeHead(code, { "content-type": "application/json" });
      res.end(JSON.stringify(body));
    };

    if (url.pathname.includes("/data/query/")) {
      const query = url.searchParams.get("query") ?? "";
      if (query.includes("siteSettings")) return send(200, { result: state.settings });
      const ids = url.searchParams.get("$ids");
      const result = ids ? state.catalog.filter((p) => JSON.parse(ids).includes(p.id)) : state.catalog;
      return send(200, { result });
    }

    if (url.pathname.startsWith("/v1/")) {
      if (req.headers.authorization !== "Bearer test-khqr-token") return send(401, { responseCode: 1, errorCode: 6 });
      const body = await readJson(req);
      if (url.pathname === "/v1/generate_qr") {
        const qr = `00020101021229MOCKQR${state.khqr.length}A${body.amount}`;
        const md5 = createHash("md5").update(qr).digest("hex");
        state.khqr.push({ md5, amount: body.amount, paid: false });
        return send(200, { responseCode: 0, data: { qr, md5, tran_id: `T${state.khqr.length}`, checkout_url: "https://checkout.mock/x" } });
      }
      if (url.pathname === "/v1/generate_deeplink_by_qr") {
        return send(200, { responseCode: 0, data: { shortLink: "https://link.khqr.dev/mock" } });
      }
      if (url.pathname === "/v1/check_transaction_by_md5") {
        const entry = state.khqr.find((e) => e.md5 === body.md5);
        if (!entry?.paid) return send(404, { responseCode: 1, errorCode: 1, responseMessage: "Transaction could not be found." });
        return send(200, { responseCode: 0, data: { amount: entry.paidAmount ?? entry.amount, currency: "USD", tran_id: "T" } });
      }
    }

    if (/^\/bot[^/]+\/sendMessage$/.test(url.pathname)) {
      state.telegram.push(await readJson(req));
      return send(200, { ok: true, result: {} });
    }

    if (url.pathname === "/__mock/reset") return Object.assign(state, fresh()), send(200, {});
    if (url.pathname === "/__mock/messages") return send(200, state.telegram);
    if (url.pathname === "/__mock/pay") {
      const body = await readJson(req);
      const entry = state.khqr.at(-1);
      entry.paid = true;
      if (body.amount) entry.paidAmount = body.amount;
      return send(200, { md5: entry.md5 });
    }
    if (url.pathname === "/__mock/stock") {
      const { id, available } = await readJson(req);
      state.catalog.find((p) => p.id === id).available = available;
      return send(200, {});
    }
    send(404, { error: "not found" });
  });
  return new Promise((resolve) => server.listen(port, "127.0.0.1", () => resolve(server)));
}
