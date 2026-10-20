package br.com.cyberhat.memoras;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.biometric.BiometricManager;
import androidx.biometric.BiometricPrompt;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

// Abre o diário com a digital (ou outra biometria forte do aparelho), no lugar de digitar o PIN.
// O PIN continua valendo: se a pessoa cancelar ou a digital falhar, o app volta para o teclado.
@CapacitorPlugin(name = "Biometria")
public class BiometricPlugin extends Plugin {
    private static final int FORTE = BiometricManager.Authenticators.BIOMETRIC_STRONG;

    @PluginMethod
    public void check(PluginCall call) {
        JSObject r = new JSObject();
        r.put("available", BiometricManager.from(getContext()).canAuthenticate(FORTE) == BiometricManager.BIOMETRIC_SUCCESS);
        call.resolve(r);
    }

    @PluginMethod
    public void verify(PluginCall call) {
        AppCompatActivity activity = getActivity();
        activity.runOnUiThread(() -> {
            BiometricPrompt.PromptInfo info = new BiometricPrompt.PromptInfo.Builder()
                .setTitle(call.getString("title", "Abrir o Memoras"))
                .setNegativeButtonText(call.getString("cancel", "Usar o PIN"))
                .setAllowedAuthenticators(FORTE)
                .build();
            BiometricPrompt prompt = new BiometricPrompt(activity, ContextCompat.getMainExecutor(getContext()), new BiometricPrompt.AuthenticationCallback() {
                @Override
                public void onAuthenticationSucceeded(@NonNull BiometricPrompt.AuthenticationResult result) {
                    JSObject r = new JSObject();
                    r.put("ok", true);
                    call.resolve(r);
                }

                // Cancelou, escolheu o PIN ou o aparelho travou a digital por muitas tentativas.
                @Override
                public void onAuthenticationError(int code, @NonNull CharSequence message) {
                    JSObject r = new JSObject();
                    r.put("ok", false);
                    r.put("code", code);
                    call.resolve(r);
                }
            });
            prompt.authenticate(info);
        });
    }
}
