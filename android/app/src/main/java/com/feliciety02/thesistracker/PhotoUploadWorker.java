package com.feliciety02.thesistracker;

import android.content.Context;
import androidx.annotation.NonNull;
import androidx.work.BackoffPolicy;
import androidx.work.Constraints;
import androidx.work.ExistingWorkPolicy;
import androidx.work.NetworkType;
import androidx.work.OneTimeWorkRequest;
import androidx.work.Worker;
import androidx.work.WorkerParameters;
import androidx.work.WorkManager;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.TimeUnit;
import org.json.JSONArray;
import org.json.JSONObject;

/** Uploads private queued photos even after the app UI closes. */
public final class PhotoUploadWorker extends Worker {
    private static final String WORK_NAME = "thesis-drive-uploads";

    public PhotoUploadWorker(@NonNull Context context, @NonNull WorkerParameters params) {
        super(context, params);
    }

    static void schedule(Context context, ExistingWorkPolicy policy) {
        Constraints connected = new Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build();
        OneTimeWorkRequest request = new OneTimeWorkRequest.Builder(PhotoUploadWorker.class)
            .setConstraints(connected)
            .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS)
            .build();
        WorkManager.getInstance(context).enqueueUniqueWork(WORK_NAME, policy, request);
    }

    static void stop(Context context) {
        WorkManager.getInstance(context).cancelUniqueWork(WORK_NAME);
    }

    @NonNull @Override
    public Result doWork() {
        Context context = getApplicationContext();
        String token = context.getSharedPreferences("drive-upload-session", Context.MODE_PRIVATE).getString("token", "");
        String url = context.getSharedPreferences("drive-upload-session", Context.MODE_PRIVATE).getString("url", "");
        if (token.isEmpty() || url.isEmpty()) return Result.success(); // sign in again; keep the photos
        try {
            JSONObject job;
            while (!isStopped() && (job = UploadStore.next(context)) != null) {
                if (job.optBoolean("firstCapture") && job.optString("date", "").matches("\\d{4}-\\d{2}-\\d{2}")) {
                    JSONArray dateArgs = new JSONArray();
                    dateArgs.put(job.getString("id"));
                    dateArgs.put("date");
                    dateArgs.put(job.getString("date"));
                    JSONObject dateResponse = postRequest(url, token, "updateSample", dateArgs);
                    if (!dateResponse.optBoolean("ok")) {
                        UploadStore.markError(context, job, dateResponse.optString("error", "Could not save capture date"));
                        return Result.retry();
                    }
                }
                JSONObject response = post(url, token, job);
                if (!response.optBoolean("ok")) {
                    UploadStore.markError(context, job, response.optString("error", "Google Drive upload failed"));
                    return Result.retry();
                }
                UploadStore.complete(context, job, response.optJSONObject("data"));
            }
            return isStopped() ? Result.retry() : Result.success();
        } catch (Exception e) {
            return Result.retry();
        }
    }

    static JSONObject post(String apiUrl, String token, JSONObject job) throws Exception {
        JSONArray args = new JSONArray();
        String fn;
        if ("receipt".equals(job.optString("kind"))) {
            fn = "uploadReceipt";
            args.put(job.getInt("row"));
            args.put(job.getString("b64"));
        } else {
            fn = "uploadPhoto";
            args.put(job.getString("id"));
            args.put(job.getInt("angle"));
            args.put(job.getString("b64"));
            args.put(job.optString("date", ""));
            args.put(job.optLong("at", 0));
        }
        return postRequest(apiUrl, token, fn, args);
    }

    static JSONObject postRequest(String apiUrl, String token, String fn, JSONArray args) throws Exception {
        JSONObject request = new JSONObject();
        request.put("token", token);
        request.put("fn", fn);
        request.put("args", args);
        byte[] body = request.toString().getBytes(StandardCharsets.UTF_8);
        URL endpoint = new URL(apiUrl);
        for (int redirects = 0; redirects < 5; redirects++) {
            String host = endpoint.getHost();
            if (!"https".equals(endpoint.getProtocol()) ||
                !("script.google.com".equals(host) || "script.googleusercontent.com".equals(host)))
                throw new IOException("Unexpected upload destination");
            HttpURLConnection connection = (HttpURLConnection) endpoint.openConnection();
            connection.setInstanceFollowRedirects(false);
            connection.setConnectTimeout(20000);
            connection.setReadTimeout(60000);
            boolean submit = redirects == 0;
            if (submit) {
                connection.setRequestMethod("POST");
                connection.setDoOutput(true);
                connection.setRequestProperty("Content-Type", "text/plain;charset=utf-8");
                try (OutputStream out = connection.getOutputStream()) { out.write(body); }
            }
            try {
                int code = connection.getResponseCode();
                if (code == 301 || code == 302 || code == 303 || code == 307 || code == 308) {
                    String location = connection.getHeaderField("Location");
                    if (location == null) throw new IOException("Upload redirect had no location");
                    endpoint = new URL(endpoint, location);
                    continue;
                }
                if (code < 200 || code >= 300) throw new IOException("Upload server returned HTTP " + code);
                try (InputStream in = connection.getInputStream(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
                    byte[] buffer = new byte[16384];
                    int n;
                    while ((n = in.read(buffer)) != -1) out.write(buffer, 0, n);
                    return new JSONObject(out.toString(StandardCharsets.UTF_8.name()));
                }
            } finally {
                connection.disconnect();
            }
        }
        throw new IOException("Too many upload redirects");
    }
}
