package com.feliciety02.thesistracker;

import android.content.Context;
import android.Manifest;
import android.os.Build;
import androidx.work.ExistingWorkPolicy;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.PermissionState;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import org.json.JSONObject;

@CapacitorPlugin(name = "BackgroundUpload", permissions = {
    @Permission(alias = "legacyGallery", strings = { Manifest.permission.WRITE_EXTERNAL_STORAGE })
})
public class BackgroundUploadPlugin extends Plugin {
    @PluginMethod
    public void saveNamedPhoto(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q && getPermissionState("legacyGallery") != PermissionState.GRANTED) {
            requestPermissionForAlias("legacyGallery", call, "galleryPermissionResult");
            return;
        }
        try {
            call.resolve(new JSObject().put("uri", NamedGallery.save(getContext(), call.getString("name", ""),
                call.getString("uri", ""), call.getString("b64", ""))));
        } catch (Exception e) { call.reject("Could not save named photo to Gallery", e); }
    }

    @PermissionCallback
    private void galleryPermissionResult(PluginCall call) {
        if (getPermissionState("legacyGallery") == PermissionState.GRANTED) saveNamedPhoto(call);
        else call.reject("Allow photo storage access to save the named Gallery copy");
    }

    @PluginMethod
    public void deleteNamedPhoto(PluginCall call) {
        try { call.resolve(new JSObject().put("deleted", NamedGallery.delete(getContext(), call.getString("name", "")))); }
        catch (Exception e) { call.reject("Could not delete named photo from Gallery", e); }
    }

    @PluginMethod
    public void setSession(PluginCall call) {
        String token = call.getString("token", ""), url = call.getString("url", "");
        if (token.isEmpty() || !url.matches("https://script\\.google\\.com/macros/s/[^/]+/exec")) {
            call.reject("Invalid upload session");
            return;
        }
        boolean saved = getContext().getSharedPreferences("drive-upload-session", Context.MODE_PRIVATE)
            .edit().putString("token", token).putString("url", url).commit();
        if (!saved) { call.reject("Cannot save upload session"); return; }
        try {
            if (UploadStore.hasPending(getContext())) PhotoUploadWorker.schedule(getContext(), ExistingWorkPolicy.KEEP);
            call.resolve();
        } catch (Exception e) { call.reject("Cannot schedule pending uploads", e); }
    }

    @PluginMethod
    public void clearSession(PluginCall call) {
        getContext().getSharedPreferences("drive-upload-session", Context.MODE_PRIVATE).edit().clear().apply();
        PhotoUploadWorker.stop(getContext());
        call.resolve();
    }

    @PluginMethod
    public void enqueue(PluginCall call) {
        JSObject supplied = call.getObject("job");
        if (supplied == null) { call.reject("Missing photo upload"); return; }
        String token = getContext().getSharedPreferences("drive-upload-session", Context.MODE_PRIVATE).getString("token", "");
        if (token.isEmpty()) { call.reject("Sign in to queue the Drive upload"); return; }
        try {
            JSONObject job = new JSONObject(supplied.toString());
            UploadStore.enqueue(getContext(), job);
            PhotoUploadWorker.schedule(getContext(), ExistingWorkPolicy.APPEND_OR_REPLACE);
            call.resolve();
        } catch (Exception e) { call.reject("Cannot queue the background upload", e); }
    }

    @PluginMethod
    public void status(PluginCall call) {
        try { call.resolve(JSObject.fromJSONObject(UploadStore.status(getContext()))); }
        catch (Exception e) { call.reject("Cannot read upload status", e); }
    }

    @PluginMethod
    public void acknowledge(PluginCall call) {
        String key = call.getString("key", "");
        Long at = call.getLong("at", 0L);
        try { UploadStore.acknowledge(getContext(), key, at); call.resolve(); }
        catch (Exception e) { call.reject("Cannot clear upload confirmation", e); }
    }

    @PluginMethod
    public void cancel(PluginCall call) {
        String key = call.getString("key", "");
        try { UploadStore.cancel(getContext(), key); call.resolve(); }
        catch (Exception e) { call.reject("Cannot cancel upload", e); }
    }
}
