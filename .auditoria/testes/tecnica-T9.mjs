// T9: CSP só entra no build de desktop
import fs from 'node:fs';
const R = 'C:/Users/Vinicius Costa/Desktop/Memoras/';
const rd = f => fs.readFileSync(R + f, 'utf8');
let bug = false; const falha = m => { console.log('BUG: ' + m); bug = true; };

const v = rd('vite.config.ts');
if (/mode === 'desktop' && csp/.test(v)) falha('a CSP só é aplicada com mode === desktop (Android e web sem CSP)');

if (!bug) console.log('OK');
process.exit(bug ? 1 : 0);
