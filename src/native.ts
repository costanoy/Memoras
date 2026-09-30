import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { get, go, set } from './store';

export const isNative = Capacitor.isNativePlatform();

// No Android não há "baixar arquivo": grava e abre o menu de compartilhar,
// de onde a pessoa salva nos Arquivos, no Drive ou manda para onde quiser.
export async function saveTextFile(name: string, text: string) {
  if (!isNative) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
    return;
  }
  const { uri } = await Filesystem.writeFile({ path: name, data: text, directory: Directory.Cache, encoding: Encoding.UTF8 });
  await Share.share({ title: name, files: [uri] });
}

export function openExternal(url: string) {
  if (isNative) window.open(url, '_system');
  else location.href = url;
}

// Botão voltar do Android: faz o mesmo que o "Voltar" de cada tela.
export function setupBackButton() {
  if (!isNative) return;
  void App.addListener('backButton', () => {
    const s = get();
    if (s.confirm) return set({ confirm: null });
    switch (s.screen) {
      case 'editor': case 'search': case 'archive': case 'settings': return go('history');
      case 'onboard': return s.onStep > 1 && s.onStep < 4 ? set({ onStep: s.onStep - 1 }) : void App.exitApp();
      case 'auth': return s.authReturn === 'onboard' ? go('onboard', { onStep: 3 }) : go('settings');
      case 'forgot': return go('auth', { authMode: 'login', fStep: 1 });
      case 'forgotPin': return go('pin', { pinMode: 'unlock', pin: '' });
      case 'pin':
        if (s.pinMode === 'unlock') return void App.exitApp();
        set({ pinMode: 'unlock', pin: '', pinMsg: '', pinError: false });
        return go(s.pinReturn);
      case 'recovery': case 'pinkey': return;
      default: return void App.exitApp();
    }
  });
}
