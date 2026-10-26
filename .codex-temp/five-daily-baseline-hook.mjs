import { registerHooks } from 'node:module';
registerHooks({ load(url, context, nextLoad) {
 const result = nextLoad(url, context);
 if (url.endsWith('/src/lib/generation-credits.ts')) {
  const source = Buffer.isBuffer(result.source) ? result.source.toString('utf8') : String(result.source);
  const changed = source.replace(/(DAILY_FREE_CREDIT_GRANT\s*=\s*)5\b/, '$110');
  if (changed === source) throw new Error('Baseline daily grant could not be restored');
  process.stderr.write('Baseline check: loading the previous 10-credit policy in memory.\n');
  return {...result, source: changed};
 }
 return result;
}});
