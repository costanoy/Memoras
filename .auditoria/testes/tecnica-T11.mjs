// T11: esquema do Supabase sem endurecimento e createVault com upsert
import fs from 'node:fs';
const R = 'C:/Users/Vinicius Costa/Desktop/Memoras/';
const rd = f => fs.readFileSync(R + f, 'utf8');
let bug = false; const falha = m => { console.log('BUG: ' + m); bug = true; };

const q = rd('supabase/schema.sql'), y = rd('src/sync.ts');
if (!/search_path/.test(q)) falha('memoras_touch sem set search_path');
if (!/to authenticated/.test(q)) falha('políticas sem to authenticated');
if (!/\(select auth\.uid\(\)\)/.test(q)) falha('auth.uid() sem (select ...)');
if (/createVault[\s\S]{0,200}\.upsert\(/.test(y)) falha('createVault usa upsert (pode sobrescrever o cofre existente)');

if (!bug) console.log('OK');
process.exit(bug ? 1 : 0);
