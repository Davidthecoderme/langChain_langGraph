/**
 * env.ts
 *
 * Small helper that loads environment variables from a `.env` file
 * into `process.env` using the `dotenv` package. The loader is
 * idempotent — calling `loadEnv()` multiple times has no effect
 * after the first successful call.
 *
 * Usage:
 *   import { loadEnv } from './env';
 *   loadEnv(); // call once, early in your app startup
 *
 * Notes:
 *  - Do not commit your `.env` file to version control. Add it to
 *    `.gitignore` and use a secrets manager in production.
 *  - This module intentionally keeps behavior minimal so tests can
 *    control when environment variables are loaded.
 */

import dotenv from 'dotenv';

// Guard to ensure dotenv.config() runs only once.
let loaded = false;

/**
 * loadEnv
 * Ensures environment variables from a `.env` file are loaded into
 * `process.env`. Subsequent calls are no-ops.
 */
export function loadEnv(): void {
    if (loaded) return;

    // Read .env file (if present) and merge values into process.env
    dotenv.config();

    // Mark as loaded so future calls don't re-run dotenv.config()
    loaded = true;
}
