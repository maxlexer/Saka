import { createServer } from "node:http";
import { createHash } from "node:crypto";

const fresh = () => ({ khqr: [], telegram: [] });
export const state = fresh();

// The slice of PostgREST that supabase-js uses for the catalog, prices, login attempts and admin reads.
// Looser than the real thing: it ignores the select column list and the return preference, enforces no
// CHECK constraints, and answers an empty .single() with null instead of 406. Keep app code to what real PostgREST accepts.
const tables = { products: [], size_prices: [], admin_login_attempts: [], orders: [] };
const KEYS = { products: "slug", size_prices: "size_ml", admin_login_attempts: "id", orders: "id" };
const RESERVED = new Set(["select", "order", "limit", "offset", "on_conflict", "columns"]);
let nextId = 1;

function matches(row, column, expr) {
  const [op, ...rest] = expr.split(".");
  const value = rest.join(".");
  const cell = row[column];
  if (op === "not") return !matches(row, column, value);
  if (op === "eq") return String(cell) === value;
  if (op === "neq") return String(cell) !== value;
  if (op === "gte") return String(cell) >= value;
  if (op === "lt") return String(cell) < value;
  if (op === "is") return value === "null" ? cell == null : String(cell) === value;
  if (op === "in") return value.slice(1, -1).split(",").map((v) => v.replace(/^"|"$/g, "")).includes(String(cell));
  return true;
}

function postgrest(req, res, url, body) {
  const name = url.pathname.slice("/rest/v1/".length);
  const table = tables[name];
  const prefer = String(req.headers.prefer ?? "");
  const reply = (rows, total = rows.length) => {
    const single = String(req.headers.accept ?? "").includes("vnd.pgrst.object");
    res.writeHead(200, { "content-type": "application/json", "content-range": `0-${Math.max(rows.length - 1, 0)}/${total}` });
    res.end(req.method === "HEAD" ? undefined : JSON.stringify(single ? (rows[0] ?? null) : rows));
  };
  if (!table) {
    res.writeHead(404, { "content-type": "application/json" });
    return res.end(JSON.stringify({ message: `unknown table ${name}` }));
  }
  const filters = [...url.searchParams].filter(([key]) => !RESERVED.has(key));
  const hit = (row) => filters.every(([column, expr]) => matches(row, column, expr));

  if (req.method === "GET" || req.method === "HEAD") {
    let rows = table.filter(hit);
    const order = url.searchParams.get("order");
    if (order) {
      const keys = order.split(",").map((key) => key.split("."));
      rows = [...rows].sort((a, b) => {
        for (const [column, dir] of keys) {
          const sign = dir === "desc" ? -1 : 1;
          if (a[column] !== b[column]) return a[column] > b[column] ? sign : -sign;
        }
        return 0;
      });
    }
    const offset = Number(url.searchParams.get("offset") ?? 0);
    const limit = url.searchParams.get("limit");
    if (prefer.includes("count=exact") && offset > 0 && offset >= rows.length) {
      res.writeHead(416, { "content-type": "application/json", "content-range": `*/${rows.length}` });
      return res.end(JSON.stringify({ code: "PGRST103", message: "Requested range not satisfiable" }));
    }
    return reply(rows.slice(offset, limit ? offset + Number(limit) : undefined), rows.length);
  }
  if (req.method === "POST") {
    const key = KEYS[name];
    const merge = prefer.includes("resolution=merge-duplicates");
    const out = (Array.isArray(body) ? body : [body]).map((row) => {
      const at = row[key] === undefined ? -1 : table.findIndex((r) => r[key] === row[key]);
      if (at >= 0 && merge) return Object.assign(table[at], row);
      const record = { ...(key === "id" ? { id: nextId++ } : {}), created_at: new Date().toISOString(), ...row };
      table.push(record);
      return record;
    });
    return reply(out);
  }
  if (req.method === "PATCH") {
    const rows = table.filter(hit);
    rows.forEach((row) => Object.assign(row, body));
    return reply(rows);
  }
  if (req.method === "DELETE") {
    const keep = table.filter((row) => !hit(row));
    const removed = table.length - keep.length;
    table.splice(0, table.length, ...keep);
    return reply([], removed);
  }
}

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

    if (url.pathname.startsWith("/rest/v1/")) {
      return postgrest(req, res, url, req.method === "POST" || req.method === "PATCH" ? await readJson(req) : undefined);
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
        return send(200, { responseCode: 0, data: { amount: entry.paidAmount ?? entry.amount, currency: "USD", status: "paid", tran_id: "T" } });
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
    send(404, { error: "not found" });
  });
  return new Promise((resolve) => server.listen(port, "127.0.0.1", () => resolve(server)));
}
