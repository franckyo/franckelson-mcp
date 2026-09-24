import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const profile = JSON.parse(readFileSync(new URL("../profile.json", import.meta.url), "utf8"));
let p, buf = "", id = 0; const pending = new Map();

before(async () => {
  p = spawn(process.execPath, [new URL("../dist/index.js", import.meta.url).pathname], { stdio: ["pipe", "pipe", "ignore"] });
  p.stdout.on("data", d => {
    buf += d; let i;
    while ((i = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
      if (!line) continue;
      const m = JSON.parse(line);
      if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
    }
  });
});
after(() => p.kill());

const send = (method, params) => new Promise(r => { const n = ++id; pending.set(n, r);
  p.stdin.write(JSON.stringify({ jsonrpc: "2.0", id: n, method, params }) + "\n"); });
const call = async (name, args = {}) => {
  const r = await send("tools/call", { name, arguments: args });
  return { text: r.result.content.map(c => c.text).join("\n"), isError: !!r.result.isError };
};

test("initialize reports the package.json version", async () => {
  const r = await send("initialize", { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "t", version: "1" } });
  p.stdin.write(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) + "\n");
  assert.equal(r.result.serverInfo.version, pkg.version);
});

test("exposes exactly the seven documented tools", async () => {
  const names = (await send("tools/list", {})).result.tools.map(t => t.name).sort();
  assert.deepEqual(names, ["get_availability", "get_contact", "get_profile", "get_project",
    "get_services", "list_projects", "list_skills"]);
});

test("every tool is marked read-only", async () => {
  for (const t of (await send("tools/list", {})).result.tools) assert.equal(t.annotations?.readOnlyHint, true, t.name);
});

test("get_profile returns the name and every language", async () => {
  const { text } = await call("get_profile");
  assert.match(text, new RegExp(profile.person.name));
  for (const l of profile.person.languages) assert.match(text, new RegExp(l.language));
});

test("list_projects lists every project id", async () => {
  const { text } = await call("list_projects");
  for (const pr of profile.projects) assert.match(text, new RegExp(`\\[${pr.id}\\]`));
});

test("get_project returns detail for every id", async () => {
  for (const pr of profile.projects) {
    const r = await call("get_project", { id: pr.id });
    assert.equal(r.isError, false, pr.id);
    assert.match(r.text, /Why it matters:/);
  }
});

test("get_project is case- and whitespace-insensitive", async () => {
  const r = await call("get_project", { id: "  EVM-RECON-MCP " });
  assert.equal(r.isError, false);
});

test("unknown project id is an error that lists valid ids", async () => {
  const r = await call("get_project", { id: "does-not-exist" });
  assert.equal(r.isError, true);
  assert.match(r.text, /evm-recon-mcp/);
});

test("get_services shows every price", async () => {
  const { text } = await call("get_services");
  for (const s of profile.services) assert.match(text, new RegExp(`\\$${s.price_usd}`));
});

test("availability and contact render", async () => {
  assert.match((await call("get_availability")).text, /Status: /);
  assert.match((await call("get_contact")).text, new RegExp(profile.contact.email));
});

test("profile.json contains no phone number or street address", () => {
  const raw = JSON.stringify(profile);
  assert.doesNotMatch(raw, /\+?\d[\d\s-]{8,}\d/, "looks like a phone number");
  assert.doesNotMatch(raw, /manzana|lote|\bCP\s?\d{5}/i, "looks like a street address");
});
