# franckelson-mcp

[![npm](https://img.shields.io/npm/v/franckelson-mcp)](https://www.npmjs.com/package/franckelson-mcp)
[![CI](https://github.com/franckyo/franckelson-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/franckyo/franckelson-mcp/actions/workflows/ci.yml)

**My portfolio, as an MCP server.** Install it and ask your AI assistant who I am, what I've
built, what I charge, and whether I'm available.

```bash
claude mcp add franckelson -- npx -y franckelson-mcp
```

Then just ask:

> What has Franckelson built? Is he available, and what would an MCP server for our API cost?

I build MCP servers for a living, so this is the most direct demo I can give you: you're
evaluating my work *through* my work.

---

## Tools

| Tool | Returns |
|---|---|
| `get_profile` | Who I am, where, languages, summary |
| `list_skills` | Skills by area |
| `list_projects` | Every project, one line each |
| `get_project` | Full detail on one project and why it matters |
| `get_services` | Fixed-price offers and delivery times |
| `get_availability` | Whether I'm free, hours/week, earliest start |
| `get_contact` | How to reach me |

All read-only. No network access, no credentials, nothing stored.

**Claude Desktop** — add to `claude_desktop_config.json`:
```json
{ "mcpServers": { "franckelson": { "command": "npx", "args": ["-y", "franckelson-mcp"] } } }
```

---

## Make it yours

Every tool reads from a single file, [`profile.json`](./profile.json). To turn this into your
own portfolio server:

1. Fork the repo
2. Edit `profile.json`
3. Change `name` in `package.json`
4. `npm publish`

The test suite includes a check that fails if `profile.json` contains something that looks
like a phone number or street address — a portfolio is public, and it's easy to paste in more
than you meant to.

---

## Also by me

[`evm-recon-mcp`](https://github.com/franckyo/evm-recon-mcp) — an MCP server for EVM
contract analysis: disassembly with invalid-jump detection, storage-slot derivation, calldata
decoding across 14 chains. `npx evm-recon-mcp`

## License

MIT
