# Local Development Guide

This guide explains how to use `@enhancer/auth-client` locally in another project without publishing it to npm/registry. This is useful for testing changes or developing features in parallel with a consuming application.

## Prerequisites
- **Bun** (v1.0.0 or later)

## Step 1: Prepare the Library

Because this library points to a `./dist` folder in `package.json`, **you must build it** before linking.

1. Navigate to the library root directory:
```bash
   cd path/to/auth-client
```

2. Install dependencies and build the project:
```bash
bun install
bun run build
```


3. Register the package for local linking:
```bash
bun link
```

> You should see output confirming: `bun link: registered "@enhancer/auth-client"*`

## Step 2: Connect to Consumer App

1. Open a new terminal and navigate to the project where you want to **use** the library.
2. Link the package:
```bash
bun link @enhancer/auth-client

```


3. You can now import it in your code as usual:
```typescript
import { ... } from "@enhancer/auth-client";
```



## Step 3: Development Workflow (Watch Mode)

Since the consuming app reads from the `dist/` folder, editing TypeScript source files won't immediately update your app. You need to keep the builder running.

1. **In the library terminal**, run the dev script:
```bash
bun run dev
```


*This runs `bun run build.ts --watch`, which will automatically rebuild the `dist/` folder whenever you save a file in `src/`.*
2. **In the consumer app**, you may need to restart your server if it doesn't detect changes in `node_modules` automatically.

## Step 4: Unlinking (Cleanup)

When you are done developing locally and want to switch back to the published version (or stop using the local version):

1. **In the consumer app:**
```bash
bun unlink @enhancer/auth-client
bun install --force
```


2. **In the library (optional):**
```bash
bun unlink
```
