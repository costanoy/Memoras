// T14: não existe nenhum teste automatizado das regras de compatibilidade
import fs from 'node:fs';
const R = 'C:/Users/Vinicius Costa/Desktop/Memoras/';
const rd = f => fs.readFileSync(R + f, 'utf8');
let bug = false; const falha = m => { console.log('BUG: ' + m); bug = true; };

const p = JSON.parse(rd('package.json'));
const deps = { ...p.dependencies, ...p.devDependencies };
if (!p.scripts.test && !deps.vitest && !deps.jest) falha('sem script test e sem framework de testes');

if (!bug) console.log('OK');
process.exit(bug ? 1 : 0);
