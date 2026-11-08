package com.feliciety02.thesistracker;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;

import android.content.Context;
import android.database.Cursor;
import android.graphics.Bitmap;
import android.net.Uri;
import android.provider.MediaStore;
import android.util.Base64;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import java.io.ByteArrayOutputStream;
import org.junit.Test;
import org.junit.runner.RunWith;

@RunWith(AndroidJUnit4.class)
public class NamedGalleryTest {
    @Test public void savesTheSampleFilenameInPhoneGallery() throws Exception {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        Bitmap image = Bitmap.createBitmap(2, 2, Bitmap.Config.ARGB_8888);
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        image.compress(Bitmap.CompressFormat.JPEG, 90, bytes);
        String b64 = Base64.encodeToString(bytes.toByteArray(), Base64.NO_WRAP);
        Uri first = Uri.parse(NamedGallery.save(context, "ZZ-999_01.jpg", "", b64));
        Uri replacement = Uri.parse(NamedGallery.save(context, "ZZ-999_01.jpg", "", b64));
        try (Cursor row = context.getContentResolver().query(replacement,
            new String[] { MediaStore.Images.Media.DISPLAY_NAME }, null, null, null)) {
            assertNotNull(row);
            row.moveToFirst();
            assertEquals("ZZ-999_01.jpg", row.getString(0));
            try (Cursor old = context.getContentResolver().query(first,
                new String[] { MediaStore.Images.Media.DISPLAY_NAME }, null, null, null)) {
                if (old != null) assertEquals(0, old.getCount());
            }
        } finally {
            context.getContentResolver().delete(replacement, null, null);
        }
    }
}
