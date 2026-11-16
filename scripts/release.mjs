// Publica uma versão nova: gera o APK e o instalador de Windows e sobe os dois
// para o release v<versão> do GitHub. O app de Windows se atualiza a partir dele,
// e os links do site (latest/download/...) passam a apontar para esta versão.
import { execSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadEnv } from 'vite';

const REPO = 'costanoy/Memoras';
const { version } = JSON.parse(readFileSync('package.json', 'utf8'));
const tag = 'v' + version;
const run = cmd => execSync(cmd, { stdio: 'inherit', env: process.env });
const out = cmd => execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const json = cmd => JSON.parse(execSync(cmd, { encoding: 'utf8' }));
const cancela = msg => { console.error(msg + ' Publicação cancelada.'); process.exit(1); };

// Travas antes de qualquer build: o que sai tem que ser exatamente o que está no main do GitHub,
// e uma versão já publicada nunca é trocada (o app instalado e os links do site já apontam para ela).
if (out('git status --porcelain')) cancela('Há mudanças sem commit.');
out('git fetch origin main');
console.log('Branch: ' + out('git rev-parse --abbrev-ref HEAD') + ' (' + out('git rev-parse --short HEAD') + ')');
if (out('git rev-parse HEAD') !== out('git rev-parse origin/main')) cancela('O commit desta versão não está no main do GitHub.');
process.env.GH_TOKEN ||= out('gh auth token');
let existente = null;
try { existente = JSON.parse(out(`gh release view ${tag} -R ${REPO} --json isDraft`)); }
catch (e) { if (!/not found/i.test(String(e.stderr ?? e.message))) cancela('Não deu para consultar o release ' + tag + ' no GitHub.'); }
if (existente && !existente.isDraft) cancela('A versão já foi publicada. Suba a versão.');

// Sem a URL e a chave do Supabase no .env, o app sai sem contas nem sincronização (foi o que aconteceu até a 1.0.2).
for (const mode of ['mobile', 'desktop']) {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  if (!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_ANON_KEY) throw new Error('Faltam VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env: o app sairia sem contas. Publicação cancelada.');
}

// Os testes automáticos têm que passar (o tsc já roda dentro dos builds).
try { run('npm test'); } catch { cancela('Os testes falharam.'); }

run('npm run apk');

// O APK tem que sair assinado com a mesma chave de sempre. Com outra chave, o Android
// recusa instalar por cima e a pessoa teria de desinstalar, perdendo as anotações do aparelho.
const APK_CERT = '7d7f2d84709cafd28244d82292ee27ef7006f6de77b8505fccea1081e03db1b2';
const sdk = process.env.ANDROID_HOME || join(process.env.LOCALAPPDATA ?? '', 'Android', 'Sdk');
const tools = readdirSync(join(sdk, 'build-tools')).sort().at(-1);
const certs = execSync(`"${join(sdk, 'build-tools', tools, 'apksigner.bat')}" verify --print-certs release/Memoras.apk`, { encoding: 'utf8' });
if (!certs.includes(APK_CERT)) throw new Error('O APK não está assinado com a chave do Memoras (~/.memoras). Publicação cancelada.');

run('npm run build:desktop');
// O envio ao GitHub às vezes falha de primeira; uma segunda tentativa costuma passar.
try { run('npx electron-builder --win --publish always'); }
catch { console.log('Falhou o envio do instalador, tentando de novo…'); run('npx electron-builder --win --publish always'); }

// O electron-builder às vezes cria dois rascunhos para a mesma versão: fica o que tem o latest.yml.
const drafts = json(`gh api repos/${REPO}/releases`).filter(r => r.tag_name === tag);
const main = drafts.find(r => r.assets.some(a => a.name === 'latest.yml'));
if (!main) throw new Error('Nenhum release com latest.yml para ' + tag);
for (const r of drafts) if (r.id !== main.id && r.draft) run(`gh api -X DELETE repos/${REPO}/releases/${r.id}`);

// Sem sobrescrever: arquivo com o mesmo nome no rascunho é apagado antes, nunca trocado por cima de uma versão publicada.
const have = new Set(main.assets.map(a => a.name));
const files = ['release/Memoras-Setup.exe', 'release/Memoras-Setup.exe.blockmap'].filter(f => !have.has(f.split('/')[1]));
const todos = [...files, 'release/Memoras.apk'];
for (const f of todos) if (have.has(f.split('/')[1])) run(`gh release delete-asset ${tag} ${f.split('/')[1]} -y -R ${REPO}`);
run(`gh release upload ${tag} ${todos.join(' ')} -R ${REPO}`);
run(`gh api -X PATCH repos/${REPO}/releases/${main.id} -F draft=false -f name="Memoras ${version}" --silent`);
console.log(`Memoras ${version} publicado: https://github.com/${REPO}/releases/tag/${tag}`);
