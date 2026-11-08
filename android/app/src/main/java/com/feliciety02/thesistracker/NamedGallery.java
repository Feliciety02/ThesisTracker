package com.feliciety02.thesistracker;

import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.media.MediaScannerConnection;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;

/** Saves the exact sample filename in the phone's public Pictures collection. */
final class NamedGallery {
    private NamedGallery() {}

    private static InputStream source(Context context, String sourceUri, String b64) throws IOException {
        if (sourceUri != null && !sourceUri.isEmpty()) {
            Uri uri = Uri.parse(sourceUri);
            if ("content".equals(uri.getScheme()) || "file".equals(uri.getScheme())) {
                InputStream in = context.getContentResolver().openInputStream(uri);
                if (in != null) return in;
            } else if (uri.getScheme() == null) {
                return new FileInputStream(sourceUri);
            }
        }
        if (b64 == null || b64.length() < 100) throw new IOException("Photo is not readable");
        try { return new ByteArrayInputStream(Base64.decode(b64, Base64.DEFAULT)); }
        catch (IllegalArgumentException e) { throw new IOException("Invalid photo data", e); }
    }

    static String save(Context context, String name, String sourceUri, String b64) throws IOException {
        if (name == null || !name.matches("[A-Za-z0-9_-]{1,95}\\.jpg")) throw new IOException("Invalid Gallery filename");
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
            File dir = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES), "Banana Thesis Tracker");
            if (!dir.isDirectory() && !dir.mkdirs()) throw new IOException("Cannot create Gallery folder");
            File target = new File(dir, name);
            try (InputStream in = source(context, sourceUri, b64); OutputStream out = new FileOutputStream(target)) { copy(in, out); }
            MediaScannerConnection.scanFile(context, new String[] { target.getAbsolutePath() }, new String[] { "image/jpeg" }, null);
            return Uri.fromFile(target).toString();
        }
        ContentResolver resolver = context.getContentResolver();
        ContentValues values = new ContentValues();
        values.put(MediaStore.Images.Media.DISPLAY_NAME, name);
        values.put(MediaStore.Images.Media.MIME_TYPE, "image/jpeg");
        values.put(MediaStore.Images.Media.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/Banana Thesis Tracker");
        values.put(MediaStore.Images.Media.IS_PENDING, 1);
        Uri target = resolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values);
        if (target == null) throw new IOException("Cannot create Gallery photo");
        String old = context.getSharedPreferences("named-gallery", Context.MODE_PRIVATE).getString(name, "");
        try {
            try (InputStream in = source(context, sourceUri, b64); OutputStream out = resolver.openOutputStream(target)) {
                if (out == null) throw new IOException("Cannot write Gallery photo");
                copy(in, out);
            }
            if (!old.isEmpty() && !old.equals(target.toString())) {
                try { resolver.delete(Uri.parse(old), null, null); } catch (SecurityException ignored) { /* stale URI */ }
            }
            ContentValues ready = new ContentValues();
            ready.put(MediaStore.Images.Media.IS_PENDING, 0);
            ready.put(MediaStore.Images.Media.DISPLAY_NAME, name);
            if (resolver.update(target, ready, null, null) < 1) throw new IOException("Cannot publish Gallery photo");
        } catch (Exception e) {
            resolver.delete(target, null, null);
            throw e instanceof IOException ? (IOException) e : new IOException("Gallery save failed", e);
        }
        context.getSharedPreferences("named-gallery", Context.MODE_PRIVATE).edit().putString(name, target.toString()).apply();
        return target.toString();
    }

    private static void copy(InputStream in, OutputStream out) throws IOException {
        byte[] bytes = new byte[16384];
        int n;
        while ((n = in.read(bytes)) != -1) out.write(bytes, 0, n);
    }
}
