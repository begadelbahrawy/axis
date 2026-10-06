import { app } from './app';
import { env } from './lib/env';
import { prisma } from './lib/prisma';

const server = app.listen(env.port, () => {
  console.log(`AXIS backend listening on :${env.port}`);
});

async function shutdown(signal: string) {
  console.log(`${signal} received, shutting down gracefully...`);
  server.close(async (err) => {
    await prisma.$disconnect();
    if (err) {
      console.error(err);
      process.exit(1);
    }
    process.exit(0);
  });
  // Force-exit if close hangs (e.g. an idle keep-alive connection).
  setTimeout(() => process.exit(1), 10000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
