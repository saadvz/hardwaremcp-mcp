import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import SERVERS from "./data.js";

export const SITE = "https://hardwaremcp.khanex.ai";
export const VERSION = "0.1.0";

type Entry = (typeof SERVERS)[number];
const DL: Record<string, string> = {"home-assistant":"Home Assistant",esp32:"ESP32",rp2040:"RP2040","raspberry-pi":"Raspberry Pi","raspberry-pi-pico":"Raspberry Pi Pico",micropython:"MicroPython",mqtt:"MQTT",esphome:"ESPHome",arduino:"Arduino",serial:"Serial / UART",bluetooth:"Bluetooth LE","smart-home":"Smart home (generic)",arm:"ARM Cortex-M",octoprint:"OctoPrint",klipper:"Klipper",bambu:"Bambu Lab",prusa:"Prusa",duet:"Duet",elegoo:"Elegoo",spoolman:"Spoolman",unifi:"UniFi Protect",frigate:"Frigate NVR",onvif:"ONVIF cameras",zigbee:"Zigbee","philips-hue":"Philips Hue",smartthings:"SmartThings",homey:"Homey",tuya:"Tuya / Smart Life",sonos:"Sonos",ros:"ROS / ROS 2",oscilloscope:"Oscilloscopes",creality:"Creality",shelly:"Shelly","lab-instruments":"Lab instruments","logic-analyzer":"Logic analyzers","debug-probe":"Debug probes",meshtastic:"Meshtastic","flipper-zero":"Flipper Zero",mavlink:"MAVLink drones",px4:"PX4",ardupilot:"ArduPilot",govee:"Govee",wled:"WLED"};
const CATS = ["smart-home","microcontrollers","3d-printers","cameras","robots","dev-tools","lab-gear"] as const;
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");

export function resolveDevice(q: string): string | undefined {
  const n = norm(q);
  const keys = Object.keys(DL);
  return keys.find(k => norm(k) === n || norm(DL[k]) === n)
    ?? keys.find(k => n.includes(norm(k)) || n.includes(norm(DL[k])) || norm(DL[k]).includes(n))
    ?? (/(x1c|x1|p1s|p1p|a1|h2d|bambu)/.test(n) ? "bambu" : /(mk4|mk3|xl|mini|prusa)/.test(n) ? "prusa" : /(voron|moonraker)/.test(n) ? "klipper" : /(pico)/.test(n) ? "raspberry-pi-pico" : /(rpi|raspi)/.test(n) ? "raspberry-pi" : /(ha|hass)$/.test(n) ? "home-assistant" : /(uart|usb)/.test(n) ? "serial" : /(ble)/.test(n) ? "bluetooth" : /(scope|siglent|rigol|lecroy)/.test(n) ? "oscilloscope" : undefined);
}
const summary = (s: Entry) => ({ slug: s.slug, name: s.name, type: s.kind, devices: s.devices.map(d => DL[d] ?? d), category: s.category, language: s.language, transport: s.transport, stars: s.stars, last_updated: s.last_updated, description: s.description, url: `${SITE}/servers/${s.slug}/`, repo: s.repo });
const byStars = (a: Entry, b: Entry) => (b.stars ?? 1e9) - (a.stars ?? 1e9);
const text = (o: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(o, null, 2) }] });

export function search(query: string, device?: string, category?: string) {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const dev = device ? resolveDevice(device) : undefined;
  return SERVERS.filter(s => {
    if (dev && !s.devices.includes(dev)) return false;
    if (category && s.category !== category) return false;
    const hay = [s.name, s.owner, s.description, ...s.can_do, ...s.devices, ...s.devices.map(d => DL[d] ?? d), s.language ?? ""].join(" ").toLowerCase();
    return terms.every(t => hay.includes(t) || (resolveDevice(t) && s.devices.includes(resolveDevice(t)!)));
  }).sort(byStars);
}

export function createServer() {
  const server = new McpServer({ name: "hardwaremcp", version: VERSION });
  server.registerTool("search_servers", {
    description: "Search the HardwareMCP catalog of MCP servers for physical hardware (ESP32, Arduino, Raspberry Pi, 3D printers like Bambu/Prusa/Klipper/OctoPrint, Home Assistant, cameras, Zigbee, serial, oscilloscopes). Returns matching servers sorted by GitHub stars.",
    inputSchema: { query: z.string().describe("Free-text search, e.g. 'bambu', 'flash firmware', 'frigate'. Use '' with a device/category filter to list all."), device: z.string().optional().describe("Device filter, e.g. 'esp32', 'Bambu X1C', 'Home Assistant'"), category: z.enum(CATS).optional() },
  }, async ({ query, device, category }) => { const r = search(query, device, category); return text({ count: r.length, results: r.slice(0, 15).map(summary) }); });
  server.registerTool("get_server", {
    description: "Get full details for one server by slug: what it does, requirements, install commands, notes, and the MCP client config snippet copied from its README.",
    inputSchema: { slug: z.string().describe("Server slug from search_servers, e.g. 'griches-bambu-mcp'") },
  }, async ({ slug }) => {
    const s = SERVERS.find(x => x.slug === slug) ?? SERVERS.find(x => x.slug.includes(slug.toLowerCase()) || x.name.toLowerCase() === slug.toLowerCase());
    if (!s) return { ...text({ error: `No server with slug '${slug}'. Use search_servers first.` }), isError: true };
    return text({ ...summary(s), what_it_does: s.can_do, requirements: s.requires, install_commands: s.commands, install_notes: s.notes, client_config: s.config, caveat: "Install steps are taken from the project README (its recommended path first) and not bench-tested by HardwareMCP. Replace placeholders and review the code before running." });
  });
  server.registerTool("list_devices", { description: "List every device family in the catalog with how many MCP servers support it.", inputSchema: {} }, async () => {
    const c: Record<string, number> = {}; SERVERS.forEach(s => s.devices.forEach(d => c[d] = (c[d] ?? 0) + 1));
    return text(Object.entries(c).sort((a, b) => b[1] - a[1]).map(([id, count]) => ({ id, name: DL[id] ?? id, count, url: `${SITE}/devices/${id}/` })));
  });
  server.registerTool("recommend_for_device", {
    description: "Recommend the best MCP servers for a specific device, optionally for a goal (e.g. 'monitor prints', 'flash firmware', 'control lights'). Prefers maintained servers with ready client configs.",
    inputSchema: { device: z.string().describe("Device name or model, e.g. 'Bambu P1S', 'ESP32-S3', 'Klipper', 'Philips Hue'"), goal: z.string().optional() },
  }, async ({ device, goal }) => {
    const dev = resolveDevice(device);
    if (!dev) return text({ device, matched: null, message: "No device family matched. Call list_devices to see supported families.", recommendations: [] });
    const goalTerms = (goal ?? "").toLowerCase().split(/\W+/).filter(t => t.length > 3);
    const now = Date.parse("2026-10-15");
    const scored = SERVERS.filter(s => s.devices.includes(dev)).map(s => {
      const hay = [s.description, ...s.can_do].join(" ").toLowerCase();
      const g = goalTerms.filter(t => hay.includes(t)).length;
      const age = s.last_updated ? (now - Date.parse(s.last_updated)) / 864e5 : 0;
      const score = Math.log10((s.stars ?? 1000) + 1) + (s.kind === "server" || s.kind === "integration" ? 1 : 0) + (s.config || s.commands.length ? 0.5 : 0) + (age < 60 ? 0.5 : age > 300 ? -0.5 : 0) + g * 1.5;
      return { s, score, g };
    }).sort((a, b) => b.score - a.score).slice(0, 5);
    return text({ device, matched: DL[dev], goal: goal ?? null, recommendations: scored.map(({ s, g }) => ({ ...summary(s), why: [s.stars != null ? `${s.stars} stars` : "official integration", s.last_updated ? `last push ${s.last_updated}` : null, s.config ? "ready client config" : null, g ? "matches your goal" : null].filter(Boolean).join(", "), next: `get_server('${s.slug}')` })) });
  });
  return server;
}
