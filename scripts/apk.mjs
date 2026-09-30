// Gera o APK assinado em release/Memoras.apk.
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const android = join(process.cwd(), 'android');
const gradlew = join(android, process.platform === 'win32' ? 'gradlew.bat' : 'gradlew');
// .bat só roda via cmd; o caminho vai entre aspas por causa do espaço em 'Vinicius Costa'.
if (process.platform === 'win32') execFileSync('cmd.exe', ['/d', '/s', '/c', '""' + gradlew + '" assembleRelease"'], { cwd: android, stdio: 'inherit', windowsVerbatimArguments: true });
else execFileSync(gradlew, ['assembleRelease'], { cwd: android, stdio: 'inherit' });
mkdirSync('release', { recursive: true });
copyFileSync(join(android, 'app/build/outputs/apk/release/app-release.apk'), 'release/Memoras.apk');
console.log('APK pronto: release/Memoras.apk');
