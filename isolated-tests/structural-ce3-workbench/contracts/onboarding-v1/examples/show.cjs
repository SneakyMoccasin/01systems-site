"use strict";
const fixtures = require("./fixtures.cjs");
const catalog = require("./catalog.json");
const { validatePacket, validateTransition } = require("../contract.cjs");
const id = process.argv[2] || "base";
if (!catalog.some(c => c.id === id)) throw new Error(`Choose one of: ${catalog.map(c => c.id).join(", ")}`);
const result = fixtures[id]();
if (result.before) validateTransition(result.before, result.after); else validatePacket(result);
process.stdout.write(JSON.stringify(result, null, 2) + "\n");
