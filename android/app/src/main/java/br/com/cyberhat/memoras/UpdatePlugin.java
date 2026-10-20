package br.com.cyberhat.memoras;

import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

// Atualização do app no Android: baixa o APK novo dos Releases do Memoras e abre o instalador do
// sistema. O Android só aceita a atualização se o APK tiver a mesma assinatura do app instalado,
// e as anotações continuam no aparelho (é a mesma instalação, só que mais nova).
@CapacitorPlugin(name = "Atualizador")
public class UpdatePlugin extends Plugin {
    private static final String ORIGEM = "https://github.com/costanoy/Memoras/releases/";

    private File apk() {
        return new File(getContext().getCacheDir(), "memoras-atualizacao.apk");
    }

    @SuppressWarnings("deprecation")
    private static long versao(PackageInfo p) {
        return Build.VERSION.SDK_INT >= 28 ? p.getLongVersionCode() : p.versionCode;
    }

    @PluginMethod
    public void baixar(PluginCall call) {
        String url = call.getString("url", "");
        if (url == null || !url.startsWith(ORIGEM)) {
            call.reject("Endereço fora dos Releases do Memoras");
            return;
        }
        new Thread(() -> {
            File out = apk();
            try {
                HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
                c.setInstanceFollowRedirects(true);
                c.setConnectTimeout(15000);
                c.setReadTimeout(30000);
                if (c.getResponseCode() != 200) throw new IOException("HTTP " + c.getResponseCode());
                long total = c.getContentLengthLong(), got = 0;
                int last = -1;
                try (InputStream in = c.getInputStream(); OutputStream os = new FileOutputStream(out)) {
                    byte[] buf = new byte[64 * 1024];
                    int n;
                    while ((n = in.read(buf)) > 0) {
                        os.write(buf, 0, n);
                        got += n;
                        int p = total > 0 ? (int) (got * 100 / total) : -1;
                        if (p >= 0 && p != last) {
                            last = p;
                            JSObject e = new JSObject();
                            e.put("percent", p);
                            notifyListeners("progresso", e);
                        }
                    }
                }
                // Só segue se o arquivo for o Memoras, numa versão mais nova que a instalada.
                PackageManager pm = getContext().getPackageManager();
                PackageInfo novo = pm.getPackageArchiveInfo(out.getPath(), 0);
                PackageInfo atual = pm.getPackageInfo(getContext().getPackageName(), 0);
                if (novo == null || !getContext().getPackageName().equals(novo.packageName)) throw new IOException("O arquivo baixado não é o Memoras");
                if (versao(novo) <= versao(atual)) throw new IOException("A versão baixada não é mais nova que a instalada");
                JSObject r = new JSObject();
                r.put("path", out.getAbsolutePath());
                call.resolve(r);
            } catch (Exception e) {
                //noinspection ResultOfMethodCallIgnored
                out.delete();
                call.reject("Não deu para baixar a atualização", e);
            }
        }).start();
    }

    @PluginMethod
    public void instalar(PluginCall call) {
        File f = apk();
        if (!f.exists()) {
            call.reject("A atualização ainda não foi baixada");
            return;
        }
        // Na primeira vez, o Android pede para permitir que o Memoras instale atualizações.
        if (Build.VERSION.SDK_INT >= 26 && !getContext().getPackageManager().canRequestPackageInstalls()) {
            getActivity().startActivity(new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + getContext().getPackageName())));
            JSObject r = new JSObject();
            r.put("permissao", true);
            call.resolve(r);
            return;
        }
        Uri uri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", f);
        Intent i = new Intent(Intent.ACTION_VIEW).setDataAndType(uri, "application/vnd.android.package-archive").addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        getActivity().startActivity(i);
        JSObject r = new JSObject();
        r.put("aberto", true);
        call.resolve(r);
    }
}
