import { createCodyncClient } from './client.mjs';
try {
  const { ok, version, busy } = await createCodyncClient().health();
  console.log(JSON.stringify({ ok, version, busy }));
  if (!ok) process.exitCode = 1;
} catch (error) {
  console.error('Codync health check failed:', error.message);
  process.exitCode = 1;
}
