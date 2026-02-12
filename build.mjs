/**
 * Build script for @enhancer/auth-client
 * Generates dual CJS/ESM output with TypeScript declarations for both Node.js and browser
 */

import { build as esbuild } from 'esbuild';
import { execSync } from 'node:child_process';
import { rmSync } from 'node:fs';

const entryPoints = [
  'src/index.ts',
  'src/middleware/express.ts',
  'src/middleware/fastify.ts',
  'src/middleware/nextauth-provider.ts',
];

async function build() {
  console.log('🔨 Building @enhancer/auth-client...\n');

  // Clean dist directory
  rmSync('dist', { recursive: true, force: true });

  // Build ESM for Node.js
  console.log('📦 Building ESM modules (Node.js)...');
  await esbuild({
    entryPoints,
    outdir: './dist',
    platform: 'node',
    target: 'node18',
    format: 'esm',
    sourcemap: true,
    minify: false,
    outExtension: { '.js': '.mjs' },
    bundle: false,
  });

  // Build CJS for Node.js
  console.log('📦 Building CommonJS modules (Node.js)...');
  await esbuild({
    entryPoints,
    outdir: './dist',
    platform: 'node',
    target: 'node18',
    format: 'cjs',
    sourcemap: true,
    minify: false,
    outExtension: { '.js': '.js' },
    bundle: false,
  });

  // Build ESM for Browser
  console.log('📦 Building ESM modules (Browser)...');
  await esbuild({
    entryPoints: ['src/index.ts'], // Only build main entry for browser
    outdir: './dist/browser',
    platform: 'browser',
    target: ['es2020'],
    format: 'esm',
    sourcemap: true,
    minify: false,
    bundle: true,
    external: ['axios'], // Keep axios as external since it's already browser-compatible
  });

  // Generate TypeScript declarations
  console.log('📝 Generating TypeScript declarations...');
  execSync('tsc --emitDeclarationOnly --declaration --declarationMap', { stdio: 'inherit' });

  console.log('\n✅ Build complete!\n');
}

build().catch((error) => {
  console.error('❌ Build failed:', error);
  process.exit(1);
});
