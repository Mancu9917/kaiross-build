// Sincronizza la guida della landing solo da un commit già presente sul main dell'app.
// Eseguire con Node 24+, dopo il checkout completo di main e npm ci della landing.
// node .github/scripts/sync-landing-guide.ts --landing src --app app --sha <commit>
import { execFileSync } from 'node:child_process';
import { appendFileSync, existsSync, readFileSync, realpathSync } from 'node:fs';
import { join } from 'node:path';

function options(args: string[]): { landing: string; app: string; sha: string } {
  const values = new Map<string, string>();
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    const value = args[index + 1];
    if (!['--landing', '--app', '--sha'].includes(key ?? '') || !value || values.has(key!)) {
      throw new Error('Uso: --landing <cartella> --app <repository> --sha <commit completo>');
    }
    values.set(key!, value);
  }
  const landing = values.get('--landing');
  const app = values.get('--app');
  const sha = values.get('--sha');
  if (!landing || !app || !sha || !/^[0-9a-f]{40}$/.test(sha)) {
    throw new Error('Specificare landing, app e SHA completo di 40 caratteri esadecimali');
  }
  return { landing: realpathSync(landing), app: realpathSync(app), sha };
}

function git(app: string, args: string[]): string {
  return execFileSync('git', ['-C', app, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function summary(message: string): void {
  console.log(message);
  const path = process.env['GITHUB_STEP_SUMMARY'];
  if (path) appendFileSync(path, `${message}\n`);
}

try {
  const { landing, app, sha } = options(process.argv.slice(2));
  if (!existsSync(join(landing, 'package.json'))) throw new Error('Checkout della landing non valido');
  if (git(app, ['rev-parse', '--is-shallow-repository']) !== 'false') {
    throw new Error('La guida richiede lo storico Git completo dell’app (fetch-depth: 0)');
  }
  git(app, ['rev-parse', '--verify', 'refs/remotes/origin/main^{commit}']);
  if (git(app, ['cat-file', '-t', sha]) !== 'commit') throw new Error('Lo SHA deve identificare un commit');
  // Niente guide da uat, be-dev o rami frontend non ancora promossi sul main del prodotto.
  git(app, ['merge-base', '--is-ancestor', sha, 'refs/remotes/origin/main']);
  const entry = git(app, ['ls-tree', sha, '--', 'guide']);
  if (!entry) {
    summary('::notice::Guida assente sul main dell’app: sincronizzazione saltata, conservata la guida già presente nella landing.');
  } else {
    if (!/^040000 tree [0-9a-f]{40}\tguide$/.test(entry)) throw new Error('guide deve essere una cartella nel commit dell’app');
    const manifest = JSON.parse(readFileSync(join(landing, 'package.json'), 'utf8')) as { scripts?: Record<string, unknown> };
    if (typeof manifest.scripts?.['guide:sync'] !== 'string') throw new Error('Manca lo script guide:sync nella landing');
    execFileSync('npm', ['run', 'guide:sync', '--', '--app', app, '--ref', sha], { cwd: landing, stdio: 'inherit' });
    summary(`Guida sincronizzata dal main dell’app al commit ${sha}.`);
  }
} catch (error) {
  console.error(`Sincronizzazione guida non riuscita: ${error instanceof Error ? error.message : String(error)}`);
  const status = typeof error === 'object' && error !== null && 'status' in error ? error.status : undefined;
  process.exitCode = typeof status === 'number' && status > 0 ? status : 1;
}
