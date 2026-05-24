import { buildApp } from './app.ts';
import { openDb } from './db.ts';

const port = Number(process.env.PORT ?? 4123);
// Default to the IPv6 dual-stack wildcard so the server accepts both
// `http://[::1]:PORT` and `http://127.0.0.1:PORT`. Browsers resolve
// `localhost` to `::1` first via Happy Eyeballs; an IPv4-only bind
// (`127.0.0.1`) silently misses those requests and surfaces in the UI as
// "Failed to fetch". Override with `HOST` if you need a stricter bind.
const host = process.env.HOST ?? '::';

const db = openDb();
const app = buildApp({ db, logger: true });

const stop = async (signal: NodeJS.Signals) => {
  app.log.info({ signal }, 'shutting down');
  try {
    await app.close();
  } finally {
    db.close();
    process.exit(0);
  }
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);

try {
  const url = await app.listen({ port, host });
  app.log.info({ url }, 'idea-garden server listening');
} catch (err) {
  if (err instanceof Error && 'code' in err && err.code === 'EADDRINUSE') {
    process.stderr.write(
      `\nidea-garden server: port ${port} is already in use.\n` +
        `Free the port (try: lsof -i :${port}) or pick another:\n` +
        `  PORT=4124 VITE_API_BASE_URL=http://localhost:4124 npm run dev\n\n`,
    );
  } else {
    app.log.error(err, 'failed to start server');
  }
  db.close();
  process.exit(1);
}
