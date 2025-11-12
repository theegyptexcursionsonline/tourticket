#!/usr/bin/env node

/**
 * Custom dev script that automatically finds an available port
 * if the default port is already in use
 */

import { spawn } from 'child_process';
import detectPort from 'detect-port';

const DEFAULT_PORT = 3000;
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

    // Start the Next.js dev server with the available port
    const devProcess = spawn('next', ['dev', '--turbopack', '-p', port.toString()], {
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
