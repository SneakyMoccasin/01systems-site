'use strict';
const { Session } = require('./session.cjs');
try {
  if (process.argv.length !== 4) throw new Error('Usage: node migrate.cjs existing-session-1.json new-session-2.json');
  const session = Session.migrateFile(process.argv[2], process.argv[3]);
  console.log(JSON.stringify({ format: session.serialize().schema_version, origin: session.view().origin, statuses: session.view().statuses, external_ai_calls: 0 }, null, 2));
} catch (error) { console.error(error.message); process.exitCode = 1; }
