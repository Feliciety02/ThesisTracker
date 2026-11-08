package com.feliciety02.thesistracker;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import android.content.Context;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.json.JSONObject;
import org.junit.Test;
import org.junit.runner.RunWith;

@RunWith(AndroidJUnit4.class)
public class PhotoUploadWorkerTest {
    @Test public void followsTheAppsScriptRedirectAndReadsTheResponse() throws Exception {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        ByteArrayOutputStream text = new ByteArrayOutputStream();
        try (InputStream in = context.getAssets().open("public/config.js")) {
            byte[] buffer = new byte[4096];
            int n;
            while ((n = in.read(buffer)) != -1) text.write(buffer, 0, n);
        }
        Matcher url = Pattern.compile("https://script\\.google\\.com/macros/s/[^']+/exec")
            .matcher(text.toString(StandardCharsets.UTF_8.name()));
        assertTrue(url.find());
        JSONObject job = new JSONObject();
        job.put("id", "ZZ-999");
        job.put("angle", 1);
        char[] fakePhoto = new char[120];
        Arrays.fill(fakePhoto, 'A');
        job.put("b64", new String(fakePhoto));
        job.put("date", "");
        JSONObject response = PhotoUploadWorker.post(url.group(), "invalid-test-token", job);
        assertFalse(response.optBoolean("ok"));
        assertTrue(response.optBoolean("auth")); // the request never reaches Drive or the sheet
    }
}
