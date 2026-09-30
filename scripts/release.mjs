// Publica uma versão nova: gera o APK e o instalador de Windows e sobe os dois
// para o release v<versão> do GitHub. O app de Windows se atualiza a partir dele,
// e os links do site (latest/download/...) passam a apontar para esta versão.
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const REPO = 'costanoy/Memoras';
const { version } = JSON.parse(readFileSync('package.json', 'utf8'));
const tag = 'v' + version;
const run = cmd => execSync(cmd, { stdio: 'inherit', env: process.env });
const json = cmd => JSON.parse(execSync(cmd, { encoding: 'utf8' }));

process.env.GH_TOKEN ||= execSync('gh auth token', { encoding: 'utf8' }).trim();

run('npm run apk');
run('npm run build:desktop');
// O envio ao GitHub às vezes falha de primeira; uma segunda tentativa costuma passar.
try { run('npx electron-builder --win --publish always'); }
catch { console.log('Falhou o envio do instalador, tentando de novo…'); run('npx electron-builder --win --publish always'); }

// O electron-builder às vezes cria dois rascunhos para a mesma versão: fica o que tem o latest.yml.
const drafts = json(`gh api repos/${REPO}/releases`).filter(r => r.tag_name === tag);
const main = drafts.find(r => r.assets.some(a => a.name === 'latest.yml'));
if (!main) throw new Error('Nenhum release com latest.yml para ' + tag);
for (const r of drafts) if (r.id !== main.id && r.draft) run(`gh api -X DELETE repos/${REPO}/releases/${r.id}`);

const have = new Set(main.assets.map(a => a.name));
const files = ['release/Memoras-Setup.exe', 'release/Memoras-Setup.exe.blockmap'].filter(f => !have.has(f.split('/')[1]));
run(`gh release upload ${tag} ${[...files, 'release/Memoras.apk'].join(' ')} --clobber -R ${REPO}`);
run(`gh api -X PATCH repos/${REPO}/releases/${main.id} -F draft=false -f name="Memoras ${version}" --silent`);
console.log(`Memoras ${version} publicado: https://github.com/${REPO}/releases/tag/${tag}`);
