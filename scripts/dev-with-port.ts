#!/usr/bin/env node

/**
 * Custom dev script that automatically finds an available port
 * if the default port is already in use
 * 
 * Usage:
 *   pnpm dev              # Starts on port 3000 (or next available)
 *   pnpm dev -- -p 3005   # Starts on port 3005 (or next available)
 *   PORT=4000 pnpm dev    # Starts on port 4000 (or next available)
 *   pnpm dev --webpack    # Falls back to webpack when Turbopack's dev
 *                         # runtime crashes on a page (see below)
 */

import { spawn } from 'child_process';
import detectPort from 'detect-port';

// Parse command line arguments for -p or --port flag
function getPortFromArgs(): number | null {
  const args = process.argv.slice(2);
  const portIndex = args.findIndex(arg => arg === '-p' || arg === '--port');
  if (portIndex !== -1 && args[portIndex + 1]) {
    const port = parseInt(args[portIndex + 1], 10);
    if (!isNaN(port)) return port;
  }
  return null;
}

// Priority: CLI args > ENV variable > default (3000)
const CLI_PORT = getPortFromArgs();
const ENV_PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : null;
const DEFAULT_PORT = CLI_PORT || ENV_PORT || 3000;
const MAX_PORT_ATTEMPTS = 10;

async function findAvailablePort(startPort: number): Promise<number> {
  try {
    const port = await detectPort(startPort);

    if (port !== startPort) {
      console.log(`\n⚠️  Port ${startPort} is already in use.`);
      console.log(`✅ Using port ${port} instead.\n`);
    } else {
      console.log(`✅ Starting development server on port ${port}\n`);
    }

    return port;
  } catch (error) {
    console.error('❌ Error detecting available port:', error);
    throw error;
  }
}

async function startDevServer() {
  try {
    // Find an available port starting from the default
    const port = await findAvailablePort(DEFAULT_PORT);

    // Check if we've strayed too far from the default port
    if (port - DEFAULT_PORT > MAX_PORT_ATTEMPTS) {
      console.warn(`\n⚠️  Warning: Using port ${port}, which is ${port - DEFAULT_PORT} ports away from the default.`);
      console.warn(`   Consider closing some applications to free up ports.\n`);
    }

    // Turbopack is the default because it is much faster, but its dev runtime
    // can die with "Maximum call stack size exceeded" in visitAsyncNode on some
    // pages of this app (tour detail, next@16.2.x) — the server exits and the
    // page never renders, while `next build` compiles the same route cleanly.
    // Webpack serves those pages fine, so keep an escape hatch rather than
    // leaving the only local option a crashing one:
    //   pnpm dev --webpack      or      NEXT_BUNDLER=webpack pnpm dev
    const bundler = process.argv.slice(2).includes('--webpack')
      || process.env.NEXT_BUNDLER === 'webpack'
      ? '--webpack'
      : '--turbopack';
    if (bundler === '--webpack') {
      console.log('ℹ️  Using webpack for this dev session.\n');
    }

    // Start the Next.js dev server with the available port
    const devProcess = spawn('next', ['dev', bundler, '-p', port.toString()], {
      stdio: 'inherit',
      shell: true,
      env: {
        ...process.env,
        PORT: port.toString(),
      },
    });

    // Handle process events
    devProcess.on('error', (error) => {
      console.error('❌ Failed to start dev server:', error);
      process.exit(1);
    });

    devProcess.on('exit', (code) => {
      if (code !== 0 && code !== null) {
        console.error(`\n❌ Dev server exited with code ${code}`);
        process.exit(code);
      }
    });

    // Handle graceful shutdown
    const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
    signals.forEach((signal) => {
      process.on(signal, () => {
        console.log(`\n\n🛑 Received ${signal}, shutting down gracefully...`);
        devProcess.kill(signal);
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('❌ Error starting dev server:', error);
    process.exit(1);
  }
}

// Run the dev server
startDevServer();
