import { Capacitor, registerPlugin } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { appAway, appBack, finishDoc, get, go, HOME, isLocked, set } from './store';

export const isNative = Capacitor.isNativePlatform();

// Digital do Android (android/.../BiometricPlugin.java). No Windows e no navegador não existe.
const Biometria = registerPlugin<{ check(): Promise<{ available: boolean }>; verify(o: { title: string; cancel: string }): Promise<{ ok: boolean }> }>('Biometria');
export const bioAvailable = async () => isNative && (await Biometria.check().catch(() => ({ available: false }))).available;
export const bioVerify = async () => isNative && (await Biometria.verify({ title: 'Abrir o Memoras', cancel: 'Usar o PIN' }).catch(() => ({ ok: false }))).ok;

// No Android não há "baixar arquivo": grava e abre o menu de compartilhar,
// de onde a pessoa salva nos Arquivos, no Drive ou manda para onde quiser.
export async function saveTextFile(name: string, text: string) {
  if (!isNative) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
    a.download = name;
    a.click();
    // O download (e a janela de salvar do Windows) ainda lê o arquivo depois do clique.
    setTimeout(() => URL.revokeObjectURL(a.href), 60000);
    return;
  }
  const { uri } = await Filesystem.writeFile({ path: name, data: text, directory: Directory.Cache, encoding: Encoding.UTF8 });
  await Share.share({ title: name, files: [uri] });
}

export function openExternal(url: string) {
  if (isNative) window.open(url, '_system');
  else location.href = url;
}

// Botão voltar do Android: leva à tela inicial da parte aberta (o histórico é a principal) e,
// de lá, sai do app, como nos outros apps. Nos fluxos faz o mesmo que o "Voltar" de cada tela.
// Sair só tira o app da tela (o que estava escrito já está salvo e vai para a conta na saída).
const leave = () => void App.minimizeApp();
export function setupBackButton() {
  if (!isNative) return;
  void App.addListener('backButton', () => {
    const s = get();
    if (s.confirm) return set({ confirm: null });
    switch (s.screen) {
      case 'loading': return leave();
      case 'history': return s.day || s.calOpen ? set({ day: null, calOpen: false }) : leave();
      case 'editor': case 'docs': case 'agenda': return go('history');
      case 'doc': if (s.docEdit) return finishDoc(); return go('docs');
      case 'search': case 'archive': case 'settings': return go(HOME[s.section]);
      case 'onboard': return s.onStep > 1 && s.onStep < 4 ? set({ onStep: s.onStep - 1 }) : leave();
      case 'auth': return s.authReturn === 'onboard' ? go('onboard', { onStep: 3 }) : go('settings');
      // Com o app travado, o "Esqueci minha senha" veio do "Esqueci o PIN" e volta para ele, nunca para o login.
      case 'forgot': return isLocked() ? go('forgotPin', { fStep: 1 }) : go('auth', { authMode: 'login', fStep: 1 });
      case 'forgotPin': return go('pin', { pinMode: 'unlock', pin: '' });
      case 'pin':
        if (s.pinMode === 'unlock') return leave();
        set({ pinMode: 'unlock', pin: '', pinMsg: '', pinError: false });
        return go(s.pinReturn);
      default: return;
    }
  });
}

// Saídas da tela que o navegador não conta como "página escondida": o celular avisa quando o app
// vai para segundo plano; o Windows, quando o computador bloqueia ou entra em suspensão.
// Com PIN, mais de 1 minuto fora trava o app de novo (ver relock em store.ts).
export function watchAway() {
  if (isNative) void App.addListener('appStateChange', ({ isActive }) => isActive ? appBack() : appAway());
  (window as unknown as { memorasWin?: { onAway?(cb: (away: boolean) => void): void } }).memorasWin?.onAway?.(away => away ? appAway() : appBack());
}
