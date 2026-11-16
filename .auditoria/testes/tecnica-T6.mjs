// T6: o pacote inicial importa o Supabase e as telas de forma estática
import fs from 'node:fs';
const R = 'C:/Users/Vinicius Costa/Desktop/Memoras/';
const rd = f => fs.readFileSync(R + f, 'utf8');
let bug = false; const falha = m => { console.log('BUG: ' + m); bug = true; };

const m = rd('src/main.tsx');
if (/from '.\/sync'/.test(m)) falha('main.tsx importa ./sync (com o supabase-js) direto no pacote inicial');
if (!/import\(/.test(rd('src/sync.ts')) && /from '@supabase\/supabase-js'/.test(rd('src/sync.ts'))) falha('sync.ts importa o supabase-js estaticamente');
if (!/React.lazy|lazy\(/.test(rd('src/App.tsx'))) falha('nenhuma tela usa lazy');

if (!bug) console.log('OK');
process.exit(bug ? 1 : 0);
