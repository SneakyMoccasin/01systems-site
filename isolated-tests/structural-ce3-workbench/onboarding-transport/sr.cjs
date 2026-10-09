'use strict';
const path=require('node:path');
const R=require('../onboarding-sr/structured/runtime.cjs');
function load(root) {
  const sr=R.loadSR(root), loader=require(path.join(sr.root,'node_modules/tsx/dist/cjs/api/index.cjs'));
  const module=file=>loader.require(path.join(sr.root,'src/lib',file),__filename);
  return {...sr,...module('providers/openai.ts'),...module('pipeline/execution.ts')};
}
module.exports={load};
