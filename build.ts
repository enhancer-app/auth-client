/**
 * Build script for @enhancer/auth-client
 * Generates dual CJS/ESM output with TypeScript declarations
 */

const entryPoints = [
  'src/index.ts',
  'src/middleware/express.ts',
  'src/middleware/fastify.ts',
  'src/middleware/nextauth-provider.ts',
];

async function build() {
  console.log('🔨 Building @enhancer/auth-client...\n');

  // Clean dist directory
  await Bun.$`rm -rf dist`;

  // Build ESM
  console.log('📦 Building ESM modules...');
  await Bun.build({
    entrypoints: entryPoints,
    outdir: './dist',
    target: 'node',
    format: 'esm',
    sourcemap: 'external',
    minify: false,
    naming: '[dir]/[name].mjs',
  });

  // Build CJS
  console.log('📦 Building CommonJS modules...');
  await Bun.build({
    entrypoints: entryPoints,
    outdir: './dist',
    target: 'node',
    format: 'cjs',
    sourcemap: 'external',
    minify: false,
    naming: '[dir]/[name].js',
  });

  // Generate TypeScript declarations
  console.log('📝 Generating TypeScript declarations...');
  await Bun.$`tsc --emitDeclarationOnly --declaration --declarationMap`;

  console.log('\n✅ Build complete!\n');
}

build().catch((error) => {
  console.error('❌ Build failed:', error);
  process.exit(1);
});
