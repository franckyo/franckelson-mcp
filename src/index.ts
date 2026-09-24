#!/usr/bin/env node
/**
 * franckelson-mcp — a portfolio served over the Model Context Protocol.
 * Every tool reads from profile.json. Fork this, edit that one file, and it is yours.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

interface Project { id: string; name: string; type: string; status: string; install?: string;
  links?: Record<string, string>; summary: string; detail: string; why_it_matters: string }
interface Service { id: string; name: string; price_usd: number; delivery_days: number; includes: string[] }
interface Profile {
  person: { name: string; headline: string; location: string; timezone: string; remote: boolean;
    github: string; languages: { language: string; level: string }[]; summary: string };
  skills: Record<string, string[]>;
  projects: Project[];
  services: Service[];
  availability: { status: string; hours_per_week: number; earliest_start: string; note: string; contract_types: string[] };
  contact: Record<string, string>;
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (f: string) => JSON.parse(readFileSync(join(root, f), "utf8"));
const pkg = readJson("package.json") as { version: string };
const profile = readJson("profile.json") as Profile;

const server = new McpServer({ name: "franckelson-mcp", version: pkg.version });
const text = (s: string) => ({ content: [{ type: "text" as const, text: s }] });
const ro = { readOnlyHint: true };

server.registerTool("get_profile", {
  title: "Who this is",
  description: "Name, headline, location, time zone, languages and a summary of what this person does.",
  inputSchema: {}, annotations: ro,
}, async () => {
  const p = profile.person;
  return text([p.name, p.headline, "",
    `Location: ${p.location} (${p.timezone})${p.remote ? " — works remotely" : ""}`,
    `Languages: ${p.languages.map(l => `${l.language} (${l.level})`).join(", ")}`,
    `GitHub: ${p.github}`, "", p.summary].join("\n"));
});

server.registerTool("list_skills", {
  title: "Skills", description: "Skills grouped by area.", inputSchema: {}, annotations: ro,
}, async () => text(Object.entries(profile.skills).map(([k, v]) => `${k}:\n  ${v.join(", ")}`).join("\n\n")));

server.registerTool("list_projects", {
  title: "List projects",
  description: "One-line summary of each project with its id. Use get_project for full detail.",
  inputSchema: {}, annotations: ro,
}, async () => text(profile.projects.map(p =>
  `[${p.id}] ${p.name} — ${p.type} (${p.status})\n  ${p.summary}` + (p.install ? `\n  install: ${p.install}` : "")
).join("\n\n")));

server.registerTool("get_project", {
  title: "Project detail",
  description: "Full detail on one project: what it is, how it was built, and why it matters.",
  inputSchema: { id: z.string().describe(`Project id. One of: ${profile.projects.map(p => p.id).join(", ")}`) },
  annotations: ro,
}, async ({ id }) => {
  const p = profile.projects.find(x => x.id === id.trim().toLowerCase());
  if (!p) return { ...text(`No project "${id}". Known ids: ${profile.projects.map(x => x.id).join(", ")}`), isError: true };
  const out = [`${p.name} — ${p.type} (${p.status})`, ""];
  if (p.install) out.push(`Install: ${p.install}`);
  for (const [k, v] of Object.entries(p.links ?? {})) out.push(`${k}: ${v}`);
  out.push("", p.summary, "", p.detail, "", `Why it matters: ${p.why_it_matters}`);
  return text(out.join("\n"));
});

server.registerTool("get_services", {
  title: "Services and pricing",
  description: "What can be hired, at what fixed price, and how long it takes.",
  inputSchema: {}, annotations: ro,
}, async () => text(profile.services.map(s =>
  `${s.name} — $${s.price_usd} — ${s.delivery_days} days\n  ` + s.includes.map(i => `- ${i}`).join("\n  ")
).join("\n\n")));

server.registerTool("get_availability", {
  title: "Availability",
  description: "Whether this person is available now, hours per week, and how soon they can start.",
  inputSchema: {}, annotations: ro,
}, async () => {
  const a = profile.availability;
  return text([`Status: ${a.status}`, `Capacity: ${a.hours_per_week} hours/week`,
    `Earliest start: ${a.earliest_start}`, `Contract types: ${a.contract_types.join(", ")}`, "", a.note].join("\n"));
});

server.registerTool("get_contact", {
  title: "How to get in touch",
  description: "Preferred contact method, email, and expected response time.",
  inputSchema: {}, annotations: ro,
}, async () => text(Object.entries(profile.contact).map(([k, v]) => `${k}: ${v}`).join("\n")));

await server.connect(new StdioServerTransport());
console.error(`franckelson-mcp ${pkg.version} running on stdio`);
