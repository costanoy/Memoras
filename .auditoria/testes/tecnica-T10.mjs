// T10: FileProvider expõe a raiz do armazenamento externo
import fs from 'node:fs';
const R = 'C:/Users/Vinicius Costa/Desktop/Memoras/';
const rd = f => fs.readFileSync(R + f, 'utf8');
let bug = false; const falha = m => { console.log('BUG: ' + m); bug = true; };

const x = rd('android/app/src/main/res/xml/file_paths.xml');
if (/<external-path[^>]*path="\."/.test(x)) falha('external-path com path="." expõe a raiz do armazenamento externo');

if (!bug) console.log('OK');
process.exit(bug ? 1 : 0);
