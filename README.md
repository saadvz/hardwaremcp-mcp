# hardwaremcp

An MCP server that helps your AI agent find **MCP servers for physical hardware**: ESP32, Arduino, Raspberry Pi, RP2040, 3D printers (Bambu, Prusa, Klipper, OctoPrint), Home Assistant, cameras (Frigate, UniFi Protect, ONVIF), Zigbee, serial/BLE and lab gear.

It's a thin layer over the [HardwareMCP catalog](https://hardwaremcp.khanex.ai): 59 servers with install commands and client configs copied from their READMEs.

## Tools

| Tool | What it does |
|---|---|
| `search_servers(query, device?, category?)` | Search the catalog. Results sorted by GitHub stars. |
| `get_server(slug)` | Full details: what it does, requirements, install commands, client config snippet. |
| `list_devices()` | Every device family with server counts. |
| `recommend_for_device(device, goal?)` | Top picks for a device or model (e.g. "Bambu P1S", "Voron", "ESP32-S3"), optionally ranked by a goal. |

## Use the hosted server (no install)

Endpoint: `https://hardwaremcp.khanex.ai/mcp` (Streamable HTTP, stateless, no auth, CORS open, JSON responses). `POST` handles JSON-RPC, `OPTIONS` returns 204 with CORS headers, and `GET`/`DELETE` return 405 because there are no sessions or server-initiated streams.

**Claude Code**
```bash
claude mcp add --transport http hardwaremcp https://hardwaremcp.khanex.ai/mcp
```

**Cursor** (`~/.cursor/mcp.json`)
```json
{ "mcpServers": { "hardwaremcp": { "url": "https://hardwaremcp.khanex.ai/mcp" } } }
```

**Claude Desktop** (`claude_desktop_config.json`)
```json
{ "mcpServers": { "hardwaremcp": { "command": "npx", "args": ["-y", "mcp-remote", "https://hardwaremcp.khanex.ai/mcp"] } } }
```

**Grok Bot** (desktop app): there's no settings field for MCP URLs. In a Bot chat, send:
```
Add a custom MCP server named hardwaremcp at https://hardwaremcp.khanex.ai/mcp
```
Confirm when asked (no sign-in needed), then type `@` and pick hardwaremcp. ([Cursor forum answer](https://forum.cursor.com/t/grokbot-custom-connectors/169965))

**Muse** (Meta): ask Muse in chat to create a Custom Connector ([Meta Help Center](https://www.meta.com/help/artificial-intelligence/1687253048996149/)):
```
Create a Custom Connector for a new remote MCP server, then connect to it:
- Name: hardwaremcp
- Transport: remote streamable HTTP
- URL: https://hardwaremcp.khanex.ai/mcp
- Auth: none (public, no API key or OAuth)
Then list its tools and call list_devices to confirm it works.
```

## Run locally (stdio)

```bash
npx -y hardwaremcp   # once published to npm
```
```json
{ "mcpServers": { "hardwaremcp": { "command": "npx", "args": ["-y", "hardwaremcp"] } } }
```

## Develop

```bash
npm install
npm run gen-data      # regenerate src/data.ts from ../hardwaremcp/data/servers.json
npm run build
npm test              # scripted client over stdio
node test-client.mjs https://hardwaremcp.khanex.ai/mcp   # against the live endpoint
```

## Caveat

Install commands come from each project's README and haven't been bench-tested by HardwareMCP. Review code before giving an agent access to your hardware.

## License

MIT
