// T12: ::-webkit-scrollbar global, sem restringir ao Electron
import fs from 'node:fs';
const R = 'C:/Users/Vinicius Costa/Desktop/Memoras/';
const rd = f => fs.readFileSync(R + f, 'utf8');
let bug = false; const falha = m => { console.log('BUG: ' + m); bug = true; };

const c = rd('src/styles.css');
const l = c.split('\n').filter(x => x.includes('::-webkit-scrollbar'));
if (l.length && l.some(x => !/electron|pointer:\s*fine/.test(x))) falha('::-webkit-scrollbar vale para todas as plataformas');

if (!bug) console.log('OK');
process.exit(bug ? 1 : 0);
