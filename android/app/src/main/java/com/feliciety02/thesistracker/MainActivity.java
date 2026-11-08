package com.feliciety02.thesistracker;

import com.getcapacitor.BridgeActivity;
import android.os.Bundle;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(BackgroundUploadPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
