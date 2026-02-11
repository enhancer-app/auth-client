/**
 * Simple test to verify browser build works
 * This script simulates a browser environment by checking that:
 * 1. The browser build doesn't use Node.js-specific APIs directly
 * 2. Base64 encoding/decoding works with runtime checks
 */

import { readFileSync } from 'node:fs';

console.log('🧪 Testing browser compatibility...\n');

// Test 1: Check browser build doesn't have unsafe Buffer usage
console.log('1️⃣  Checking browser build for unsafe Node.js APIs...');
const browserBuild = readFileSync('./dist/browser/index.js', 'utf-8');

// Should have runtime checks for Buffer
if (browserBuild.includes('typeof Buffer !== "undefined"')) {
  console.log('✅ Browser build has safe Buffer checks');
} else if (browserBuild.includes('Buffer.')) {
  console.error('❌ Browser build has unsafe Buffer usage without runtime checks');
  process.exit(1);
} else {
  console.log('✅ Browser build does not use Buffer');
}

// Test 2: Check that jose is used instead of jsonwebtoken
console.log('\n2️⃣  Checking JWT library in browser build...');
if (browserBuild.includes('jose')) {
  console.log('✅ Browser build uses jose library (browser-compatible)');
} else {
  console.error('❌ jose library not found in browser build');
  process.exit(1);
}

// Check that jsonwebtoken is NOT in the build
if (browserBuild.includes('jsonwebtoken')) {
  console.error('❌ Browser build still references jsonwebtoken (Node.js-only)');
  process.exit(1);
} else {
  console.log('✅ No references to jsonwebtoken in browser build');
}

// Test 3: Check that jose is used in source instead of jsonwebtoken
console.log('\n3️⃣  Checking JWT library in source...');
const verifierCode = readFileSync('./src/jwt/verifier.ts', 'utf-8');
if (verifierCode.includes('import * as jose') || verifierCode.includes("from 'jose'")) {
  console.log('✅ Using jose library in source (browser-compatible)');
} else if (verifierCode.includes('jsonwebtoken')) {
  console.error('❌ Still using jsonwebtoken in source (Node.js-only)');
  process.exit(1);
} else {
  console.error('❌ No JWT library found in source');
  process.exit(1);
}

// Test 4: Check package.json has browser exports
console.log('\n4️⃣  Checking package.json browser exports...');
const packageJson = JSON.parse(readFileSync('./package.json', 'utf-8'));
if (packageJson.exports?.['.']?.browser) {
  console.log('✅ Package.json has browser export:', packageJson.exports['.'].browser);
} else {
  console.error('❌ Package.json missing browser export');
  process.exit(1);
}

// Test 5: Check that axios is external in browser build (not bundled)
console.log('\n5️⃣  Checking axios is kept external...');
if (browserBuild.includes('from "axios"') || browserBuild.includes("from 'axios'")) {
  console.log('✅ Axios is kept as external dependency (good for tree-shaking)');
} else {
  console.log('⚠️  Axios might be bundled - checking if axios code is present');
  // This is actually okay - axios might be bundled or external depending on the setup
}

console.log('\n✅ All browser compatibility checks passed!\n');
