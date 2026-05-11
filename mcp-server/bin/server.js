#!/usr/bin/env node
import { startServer } from "../src/index.js";

startServer().catch((err) => {
  console.error("[versuz-mcp] fatal:", err?.stack || err?.message || err);
  process.exit(1);
});
