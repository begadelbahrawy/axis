import { app } from './app';
import { env } from './lib/env';

app.listen(env.port, () => {
  console.log(`AXIS backend listening on :${env.port}`);
});
