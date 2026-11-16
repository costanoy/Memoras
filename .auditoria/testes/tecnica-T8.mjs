// T8: release.mjs não confere árvore limpa, branch, tag nem release existente
import fs from 'node:fs';
const R = 'C:/Users/Vinicius Costa/Desktop/Memoras/';
const rd = f => fs.readFileSync(R + f, 'utf8');
let bug = false; const falha = m => { console.log('BUG: ' + m); bug = true; };

const s = rd('scripts/release.mjs');
if (!/git status|porcelain/.test(s)) falha('não confere árvore limpa');
if (!/branch --show-current|rev-parse --abbrev-ref/.test(s)) falha('não confere o branch');
if (!/ls-remote|release view|tag_name === tag.*draft|already/i.test(s.replace(/drafts\.find/g,''))) falha('não confere versão já publicada');
if (/--clobber/.test(s)) falha('usa --clobber no upload (troca o APK de uma versão já publicada)');

if (!bug) console.log('OK');
process.exit(bug ? 1 : 0);
