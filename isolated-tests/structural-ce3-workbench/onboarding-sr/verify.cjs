'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const C=require('../contracts/onboarding-v1/contract.cjs');
const {verifyReceipt}=require('./adapter.cjs');
const manifest=require('./diagnostic/manifest.json');
for(const [file,digest] of Object.entries(manifest.files))assert.equal(C.hash(fs.readFileSync(path.join(__dirname,file),'utf8')),digest,`Changed diagnostic file: ${file}`);
for(const name of ['c3-r1','clear'])verifyReceipt(JSON.parse(fs.readFileSync(path.join(__dirname,`offline-records/${name}.receipt.json`))));
console.log('Diagnostic freeze and both saved offline SR receipts verified. No external calls.');
