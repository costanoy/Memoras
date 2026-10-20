package br.com.cyberhat.memoras;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(RingerModePlugin.class);
        registerPlugin(BiometricPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
