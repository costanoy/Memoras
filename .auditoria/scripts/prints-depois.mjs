// Agente Prints: tira prints das telas do Memoras (web, Vite em localhost:5190).
// Nunca toca no Supabase real: toda requisição para *.supabase.co é abortada.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const BASE = 'http://localhost:5190/';
const ROOT = 'C:/Users/Vinicius Costa/Desktop/Memoras/.auditoria';
const OUT = path.join(ROOT, 'prints/depois');
fs.mkdirSync(OUT, { recursive: true });

const VIEWS = {
  celular: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 },
  desktop: { viewport: { width: 1440, height: 900 } },
};

const consoleLog = [];
const shots = [];
const falhas = [];
let vpName = '';
let tela = 'inicio';

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function snap(page, nome, full = false) {
  const file = path.join(OUT, `${vpName}-${nome}.png`);
  try {
    await page.waitForTimeout(350);
    await page.screenshot({ path: file, fullPage: full, timeout: 10000, animations: 'disabled', caret: 'hide' });
    shots.push({ arquivo: path.basename(file), tela });
  } catch (e) {
    falhas.push({ vp: vpName, passo: 'print ' + nome, erro: String(e.message).split('\n')[0] });
  }
}

async function step(nome, fn) {
  console.log(new Date().toISOString().slice(11, 19), vpName, tela, '>', nome);
  try { await fn(); } catch (e) { falhas.push({ vp: vpName, passo: nome, erro: String(e.message).split('\n')[0].slice(0, 300) }); }
}

const btn = (page, name) => page.getByRole('button', { name, exact: true }).first();
const btnRe = (page, re) => page.getByRole('button', { name: re }).first();

async function goTab(page, name) {
  await btn(page, name).click({ timeout: 4000 });
  await page.waitForTimeout(400);
}

// Volta da tela atual: pelo botão Voltar quando ele existe (celular), senão pela aba.
async function voltar(page, aba = 'Diário') {
  const v = page.getByRole('button', { name: 'Voltar', exact: true }).first();
  if (await v.isVisible().catch(() => false)) { await v.click(); await page.waitForTimeout(400); return; }
  await goTab(page, aba);
}

async function digitar(page, digitos) {
  for (const d of digitos) { await page.keyboard.press(d); await page.waitForTimeout(120); }
}

async function esperarServidor() {
  for (let i = 0; i < 60; i++) {
    try { const r = await fetch(BASE); if (r.ok) return; } catch { /* ainda subindo */ }
    await sleep(1000);
  }
  throw new Error('Vite não respondeu em ' + BASE);
}

async function rodar(browser, vp) {
  vpName = vp;
  tela = 'inicio';
  const ctx = await browser.newContext({ ...VIEWS[vp], locale: 'pt-BR', serviceWorkers: 'block' });
  await ctx.route(/supabase\.co/, r => r.abort());
  const page = await ctx.newPage();
  page.setDefaultTimeout(5000);
  page.on('console', m => {
    if (m.type() === 'error' || m.type() === 'warning')
      consoleLog.push({ vp, tela, tipo: m.type(), texto: m.text().slice(0, 400) });
  });
  page.on('pageerror', e => consoleLog.push({ vp, tela, tipo: 'pageerror', texto: String(e.message).slice(0, 400) }));

  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForTimeout(1500);

  // 1. Primeiro uso (onboarding)
  tela = 'primeiro-uso';
  await snap(page, 'primeiro-uso-boas-vindas');
  for (let i = 1; i <= 6; i++) {
    const fim = page.getByRole('button', { name: /Criar PIN|Começar a escrever|Usar o PIN da conta/ }).first();
    if (await fim.isVisible().catch(() => false)) break;
    const cont = page.getByRole('button', { name: 'Continuar', exact: true }).first();
    if (!(await cont.isVisible().catch(() => false))) break;
    await step('onboard passo ' + i, async () => { await cont.click({ timeout: 3000 }); await page.waitForTimeout(400); });
    await snap(page, 'onboard-passo-' + (i + 1));
  }

  // 2. Criar PIN (com a opção de PIN ativada)
  // O PIN já vem ativado por padrão no onboarding (o botão "Ativar PIN" começa marcado).
  tela = 'criar-pin';
  await snap(page, 'onboard-opcao-pin');
  await step('criar PIN', async () => { await btnRe(page, /^Criar PIN$/).click({ timeout: 4000 }); });
  await page.waitForTimeout(500);
  await snap(page, 'criar-pin-1-digito-novo');
  await step('digitar PIN', async () => {
    await digitar(page, '1234');
    await page.waitForTimeout(500);
  });
  await snap(page, 'criar-pin-confirmar');
  await step('confirmar PIN', async () => { await digitar(page, '1234'); });

  // 3. Chave do PIN
  tela = 'chave-do-pin';
  await page.waitForTimeout(800);
  await snap(page, 'chave-do-pin');
  await step('guardar chave do PIN', async () => {
    await page.getByRole('button', { name: /Guardei minha chave/ }).click({ timeout: 4000 });
    await page.waitForTimeout(200);
    await page.getByRole('button', { name: /^Continuar$/ }).first().click({ timeout: 4000 });
  });

  // 4. Principal vazia
  tela = 'principal-vazia';
  await page.waitForTimeout(800);
  await snap(page, 'principal-vazia');

  // Busca sem resultado (base vazia)
  tela = 'busca-sem-resultado';
  await step('abrir busca', async () => { await btnRe(page, /^Busca$/).click({ timeout: 4000 }); await page.waitForTimeout(300); });
  await step('buscar sem resultado', async () => {
    await page.getByLabel('Buscar no diário, nos cadernos e na agenda').fill('xyzinexistente', { timeout: 4000 });
    await page.waitForTimeout(400);
  });
  await snap(page, 'busca-sem-resultado');
  await step('sair da busca', async () => voltar(page));

  // 5. Ajustes e temas
  tela = 'ajustes';
  await step('abrir ajustes', async () => goTab(page, 'Ajustes'));
  await snap(page, 'ajustes');
  await snap(page, 'ajustes-pagina-inteira', true);
  for (const t of ['noite', 'turquesa']) {
    tela = 'tema-' + t;
    await step('tema ' + t, async () => {
      await page.getByRole('button', { name: new RegExp('^' + t, 'i') }).first().click({ timeout: 3000 });
      await page.waitForTimeout(600);
    });
    await snap(page, 'tema-' + t);
  }

  // 6. Login, cadastro e esqueci a senha (só validação local, nada enviado)
  tela = 'login';
  await step('abrir login', async () => btn(page, 'Entrar').click({ timeout: 4000 }));
  await page.waitForTimeout(500);
  await snap(page, 'login-vazio');
  await step('login email inválido', async () => {
    await page.locator('input[type=email]').fill('abc');
    await page.locator('button.gel').first().click({ timeout: 3000 });
    await page.waitForTimeout(400);
  });
  await snap(page, 'login-erro-email-invalido');
  await step('login sem senha', async () => {
    await page.locator('input[type=email]').fill('teste@exemplo.com');
    await page.locator('button.gel').first().click({ timeout: 3000 });
    await page.waitForTimeout(400);
  });
  await snap(page, 'login-erro-sem-senha');

  tela = 'cadastro';
  await step('ir para cadastro', async () => {
    await btn(page, 'Criar conta').click({ timeout: 3000 });
    await page.locator('input[type=email]').fill('teste@exemplo.com');
    await page.locator('input[type=password]').fill('123');
    await page.locator('button.gel').first().click({ timeout: 3000 });
    await page.waitForTimeout(400);
  });
  await snap(page, 'cadastro-senha-curta');

  tela = 'esqueci-senha';
  await step('esqueci a senha', async () => {
    await page.locator('button[aria-pressed]').filter({ hasText: 'Entrar' }).first().click({ timeout: 3000 });
    await page.getByRole('button', { name: 'Esqueci minha senha' }).first().click({ timeout: 3000 });
    await page.waitForTimeout(500);
  });
  await snap(page, 'esqueci-senha-passo-1');
  await step('esqueci a senha email inválido', async () => {
    const em = page.getByLabel(/Seu email|^Email$/).first();
    await em.fill('abc', { timeout: 3000 });
    await page.locator('button.gel').first().click({ timeout: 3000 });
    await page.waitForTimeout(400);
  });
  await snap(page, 'esqueci-senha-email-invalido');

  // Recarrega: o app volta travado pelo PIN.
  tela = 'tela-pin';
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(1500);
  await snap(page, 'tela-pin');
  await step('PIN errado', async () => { await digitar(page, '9999'); await page.waitForTimeout(250); });
  await snap(page, 'pin-errado');
  await page.waitForTimeout(1200);

  tela = 'esqueci-pin';
  await step('esqueci o PIN', async () => {
    await page.getByRole('button', { name: 'Esqueci o PIN' }).click({ timeout: 3000 });
    await page.waitForTimeout(400);
  });
  await snap(page, 'esqueci-pin');
  await step('voltar do esqueci o PIN', async () => {
    await page.getByRole('button', { name: 'Voltar', exact: true }).first().click({ timeout: 3000 });
    await page.waitForTimeout(400);
  });

  tela = 'desbloqueio';
  await step('desbloquear com PIN certo', async () => { await digitar(page, '1234'); await page.waitForTimeout(1000); });

  // 7. Criar dados: 25 anotações
  tela = 'principal-com-dados';
  await step('ir ao diário', async () => goTab(page, 'Diário'));
  for (let i = 1; i <= 25; i++) {
    await step('anotação ' + i, async () => {
      await btnRe(page, /^Nova anotação/).click({ timeout: 4000 });
      await page.waitForTimeout(300);
      if (i === 1) await snap(page, 'editor-nova-anotacao-vazia');
      const ed = page.locator('[contenteditable="true"], textarea').first();
      await ed.click({ timeout: 3000 });
      await page.keyboard.type(`Anotação ${i}: lembrete de teste para revisar a tela principal.`);
      await page.waitForTimeout(150);
      await voltar(page);
    });
  }
  await step('anotação longa', async () => {
    await btnRe(page, /^Nova anotação/).click({ timeout: 4000 });
    await page.waitForTimeout(300);
    const ed = page.locator('[contenteditable="true"], textarea').first();
    await ed.click({ timeout: 3000 });
    await page.keyboard.type('Primeira linha da anotação longa.\nSegunda linha com mais texto para ver como o editor quebra as linhas em telas pequenas e grandes, com acentuação e pontuação, ok.');
    await page.waitForTimeout(400);
  });
  tela = 'editor-anotacao';
  await snap(page, 'editor-anotacao');
  await step('voltar do editor', async () => voltar(page));

  tela = 'principal-muitos-dados';
  await step('ir ao diário (dados)', async () => goTab(page, 'Diário'));
  await page.waitForTimeout(500);
  await snap(page, 'principal-muitos-dados');

  // Menu do botão direito (ou toque longo) numa anotação
  tela = 'menu-contexto-anotacao';
  await step('menu do botão direito', async () => {
    await page.getByText('Anotação 5:', { exact: false }).first().click({ button: 'right', timeout: 4000 });
    await page.waitForTimeout(400);
  });
  await snap(page, 'menu-contexto-anotacao');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  // Diálogo de confirmação: mover para a lixeira
  tela = 'dialogo-lixeira';
  await step('abrir anotação para lixeira', async () => {
    await page.getByText('Anotação 3:', { exact: false }).first().click({ timeout: 4000 });
    await page.waitForTimeout(400);
    await page.getByRole('button', { name: 'Mover para a lixeira' }).first().click({ timeout: 4000 });
    await page.waitForTimeout(400);
  });
  await snap(page, 'dialogo-lixeira-anotacao');
  await step('cancelar diálogo', async () => {
    await page.getByRole('button', { name: 'Cancelar' }).first().click({ timeout: 3000 });
  });
  await step('voltar após diálogo', async () => voltar(page));

  // Busca com resultado
  tela = 'busca-com-resultado';
  await step('busca com resultado', async () => {
    await goTab(page, 'Diário');
    await btnRe(page, /^Busca$/).click({ timeout: 4000 });
    await page.getByLabel('Buscar no diário, nos cadernos e na agenda').fill('Anotação 7', { timeout: 4000 });
    await page.waitForTimeout(500);
  });
  await snap(page, 'busca-com-resultado');
  await step('sair da busca com resultado', async () => voltar(page));

  // 8. Cadernos
  tela = 'cadernos-vazio';
  await step('ir a cadernos', async () => goTab(page, 'Cadernos'));
  await snap(page, 'cadernos-vazio');
  tela = 'caderno-editor';
  for (let i = 1; i <= 3; i++) {
    await step('caderno ' + i, async () => {
      await btnRe(page, /^(Criar o primeiro|Novo caderno)$/).click({ timeout: 4000 });
      await page.waitForTimeout(400);
      if (i === 1) await snap(page, 'caderno-editor-novo');
      await page.getByLabel('Título do caderno').fill(`Caderno ${i} de estudos`, { timeout: 4000 });
      await page.waitForTimeout(200);
      await voltar(page, 'Cadernos');
    });
  }
  tela = 'cadernos-com-dados';
  await step('ir a cadernos com dados', async () => goTab(page, 'Cadernos'));
  await snap(page, 'cadernos-com-dados');
  tela = 'resumao';
  await step('abrir Resumão', async () => {
    await page.getByText('Resumão', { exact: false }).first().click({ timeout: 4000 });
    await page.waitForTimeout(500);
  });
  await snap(page, 'resumao');
  await step('voltar do Resumão', async () => voltar(page, 'Cadernos'));

  // 9. Agenda
  tela = 'agenda-vazia';
  await step('ir à agenda', async () => goTab(page, 'Agenda'));
  await snap(page, 'agenda-vazia');
  tela = 'agenda-com-tarefas';
  for (const t of ['Ligar para o dentista', 'Pagar a conta de luz', 'Estudar 30 minutos', 'Comprar pão', 'Revisar o relatório', 'Treinar às 7h']) {
    await step('tarefa ' + t, async () => {
      const inp = page.getByLabel('Adicionar tarefa');
      await inp.fill(t, { timeout: 4000 });
      await inp.press('Enter');
      await page.waitForTimeout(150);
    });
  }
  await step('marcar tarefa feita', async () => { await page.getByRole('checkbox').first().click({ timeout: 3000 }); });
  await snap(page, 'agenda-com-tarefas');
  tela = 'agenda-calendario';
  await step('calendário da agenda', async () => {
    await btnRe(page, /^Calendário$/).click({ timeout: 3000 });
    await page.waitForTimeout(400);
  });
  await snap(page, 'agenda-calendario');
  await step('fechar calendário', async () => { await btnRe(page, /^Calendário$/).click({ timeout: 3000 }); });

  // 10. Sem conexão (o app é local, então só a tela de ajustes muda)
  tela = 'sem-conexao';
  await step('modo offline', async () => {
    await ctx.setOffline(true);
    await goTab(page, 'Ajustes');
    await page.waitForTimeout(500);
  });
  await snap(page, 'ajustes-sem-conexao');
  await step('voltar online', async () => ctx.setOffline(false));

  await ctx.close();
}

async function main() {
  await esperarServidor();
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    for (const vp of ['celular', 'desktop']) {
      try { await rodar(browser, vp); }
      catch (e) { falhas.push({ vp, passo: 'rodada inteira', erro: String(e.message).split('\n')[0].slice(0, 300) }); }
    }
  } finally {
    await browser.close();
  }
  fs.writeFileSync(path.join(ROOT, 'scripts/prints-log-depois.json'), JSON.stringify({ shots, falhas, consoleLog }, null, 2), 'utf8');
  console.log('PRINTS', shots.length, 'FALHAS', falhas.length, 'CONSOLE', consoleLog.length);
}

main().catch(e => { console.error('ERRO FATAL', e); process.exit(1); });
