package br.com.cyberhat.memoras;

import android.content.Context;
import android.media.AudioManager;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

// Diz ao app se o celular está no silencioso ou no vibrar, para os sons ficarem mudos.
@CapacitorPlugin(name = "RingerMode")
public class RingerModePlugin extends Plugin {
    @PluginMethod
    public void get(PluginCall call) {
        AudioManager audio = (AudioManager) getContext().getSystemService(Context.AUDIO_SERVICE);
        JSObject result = new JSObject();
        result.put("silent", audio != null && audio.getRingerMode() != AudioManager.RINGER_MODE_NORMAL);
        call.resolve(result);
    }
}
