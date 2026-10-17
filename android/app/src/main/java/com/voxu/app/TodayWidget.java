package com.voxu.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.res.ColorStateList;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.RectF;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.text.SpannableString;
import android.text.Spanned;
import android.text.style.StrikethroughSpan;
import android.util.SizeF;
import android.view.View;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Voxu · Today — the Android twin of the iPhone's Today widget
 * (ios/App/VoxuWidget/VoxuWidget.swift, TodayWidgetView). Keep the two in step.
 *
 * Three sizes, picked by how big it's placed: small (the era day, a ring,
 * what's left), medium (today's promise, with Mark Done) and large (right now,
 * today's session, the count and the list).
 *
 * It reads the snapshot the app writes (WidgetBridgePlugin.write, built by
 * lib/widget-snapshot.ts) and moves timed items along its own clock, exactly
 * like iOS: "due now" 15 minutes before, "before it slips" an hour after. It
 * never ticks anything the app didn't record, and drops yesterday's words at
 * midnight. Mark Done is the one write, sent with the widget's own key to
 * /api/widget/action; with no key it opens the app instead.
 */
public class TodayWidget extends AppWidgetProvider {

    static final String PREFS = "voxu_widget";
    static final String SNAPSHOT_KEY = "widget_snapshot";
    static final String TOKEN_KEY = "widget_token";
    /** Today's date once Mark Done worked, so it shows before the app writes again. */
    static final String DONE_PROMISE_KEY = "widget_done_promise";
    static final String ACTION_PROMISE_DONE = "com.voxu.app.widget.PROMISE_DONE";
    static final String ACTION_URL = "https://voxu.app/api/widget/action";
    static final int DUE_BEFORE = 15;
    static final int SLIP_AFTER = 60;

    static final int DIM = 0x8CFFFFFF;    // white at 55%
    static final int FAINT = 0x26FFFFFF;  // white at 15%

    private enum Size { SMALL, MEDIUM, LARGE }

    // ── Lifecycle ─────────────────────────────────────────────────────────

    /** Redraw every placed Voxu widget (WidgetBridge.reload, and after Mark Done). */
    static void updateAll(Context c) {
        AppWidgetManager m = AppWidgetManager.getInstance(c);
        int[] ids = m.getAppWidgetIds(new ComponentName(c, TodayWidget.class));
        for (int id : ids) render(c, m, id);
    }

    @Override
    public void onUpdate(Context c, AppWidgetManager m, int[] ids) {
        for (int id : ids) render(c, m, id);
    }

    @Override
    public void onAppWidgetOptionsChanged(Context c, AppWidgetManager m, int id, Bundle options) {
        render(c, m, id);
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        if (ACTION_PROMISE_DONE.equals(intent.getAction())) {
            final PendingResult pending = goAsync();
            final Context app = context.getApplicationContext();
            new Thread(() -> {
                try {
                    if (send(app, "{\"action\":\"promise_done\"}")) {
                        prefs(app).edit().putString(DONE_PROMISE_KEY, todayString()).apply();
                    }
                    updateAll(app);
                } finally {
                    pending.finish();
                }
            }).start();
            return;
        }
        super.onReceive(context, intent);
    }

    // ── The one write ─────────────────────────────────────────────────────

    /** POSTs an action with the widget's key. A 401 drops the key, so the button opens the app again. */
    static boolean send(Context c, String body) {
        SharedPreferences p = prefs(c);
        String token = p.getString(TOKEN_KEY, "");
        if (token == null || token.isEmpty()) return false;
        HttpURLConnection conn = null;
        try {
            conn = (HttpURLConnection) new URL(ACTION_URL).openConnection();
            conn.setRequestMethod("POST");
            conn.setConnectTimeout(15000);
            conn.setReadTimeout(15000);
            conn.setDoOutput(true);
            conn.setRequestProperty("Authorization", "Bearer " + token);
            conn.setRequestProperty("Content-Type", "application/json");
            try (OutputStream out = conn.getOutputStream()) {
                out.write(body.getBytes(StandardCharsets.UTF_8));
            }
            int code = conn.getResponseCode();
            if (code == 401) p.edit().remove(TOKEN_KEY).apply();
            return code >= 200 && code < 300;
        } catch (Exception e) {
            return false;
        } finally {
            if (conn != null) conn.disconnect();
        }
    }

    // ── Drawing ───────────────────────────────────────────────────────────

    static void render(Context c, AppWidgetManager m, int id) {
        Today t = Today.load(c, new Date());
        RemoteViews views;
        if (Build.VERSION.SDK_INT >= 31) {
            // The launcher picks the layout that fits as it's resized.
            Map<SizeF, RemoteViews> bySize = new HashMap<>();
            bySize.put(new SizeF(110f, 110f), build(c, t, Size.SMALL));
            bySize.put(new SizeF(250f, 110f), build(c, t, Size.MEDIUM));
            bySize.put(new SizeF(250f, 250f), build(c, t, Size.LARGE));
            views = new RemoteViews(bySize);
        } else {
            Bundle o = m.getAppWidgetOptions(id);
            int w = o.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH);
            int h = o.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT);
            Size s = w >= 220 && h >= 230 ? Size.LARGE : (w >= 220 ? Size.MEDIUM : Size.SMALL);
            views = build(c, t, s);
        }
        m.updateAppWidget(id, views);
    }

    private static RemoteViews build(Context c, Today t, Size size) {
        if (!t.hasEra() && !t.hasPulse()) return quote(c, t, size);
        switch (size) {
            case LARGE: return large(c, t);
            case MEDIUM: return medium(c, t);
            default: return small(c, t);
        }
    }

    private static String eraLine(Today t) {
        if (t.eraTitle == null) return "Voxu";
        return t.eraFinished() ? t.eraTitle + " · complete" : t.eraTitle + " · Day " + t.day;
    }

    private static String leftLine(Today t) {
        if (!t.hasEra() && !t.hasPulse()) return "Start an era";
        if (t.total > 0) return t.left() == 0 ? "All done today" : t.left() + " left today";
        return t.promise == null ? "Make today’s promise" : "Check in tonight";
    }

    /** Small — Progress: the day of the era, a ring, what's left. */
    private static RemoteViews small(Context c, Today t) {
        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.widget_today_small);
        v.setTextViewText(R.id.w_day, t.hasEra() ? "Day " + Math.min(t.day, t.length) : "Voxu");
        v.setTextViewText(R.id.w_era, t.eraTitle != null ? t.eraTitle : "Your era");
        v.setImageViewBitmap(R.id.w_ring, ring(c, t.progress(), 30, 4, t.accent));
        v.setTextViewText(R.id.w_left, leftLine(t));
        v.setOnClickPendingIntent(android.R.id.background, open(c, "/"));
        return v;
    }

    /** Medium — Today's Promise. */
    private static RemoteViews medium(Context c, Today t) {
        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.widget_today_medium);
        v.setTextViewText(R.id.w_eyebrow, eraLine(t));
        promiseIcon(v, R.id.w_promise_icon, t);
        v.setTextViewText(R.id.w_promise, t.promise != null ? t.promise : "Make one small promise for today.");
        markDone(c, v, t, "Mark Done", R.id.w_mark, R.id.w_status);
        v.setOnClickPendingIntent(android.R.id.background, open(c, "/era"));
        return v;
    }

    /** Large — the whole day: right now, today's session, the count and the list. */
    private static RemoteViews large(Context c, Today t) {
        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.widget_today_large);
        v.setTextViewText(R.id.w_eyebrow, eraLine(t));
        v.setTextViewText(R.id.w_now, t.nowTitle != null ? t.nowTitle : (t.promise != null ? t.promise : "One promise a day."));
        String sub = null;
        if (t.closing) {
            sub = t.tomorrowReady ? "Tomorrow’s promise is set. You’re done for tonight." : "Write tomorrow’s promise, then you’re done.";
        } else if (t.nowQuote != null) {
            sub = "“" + t.nowQuote + "”";
        }
        text(v, R.id.w_sub, sub);

        if (t.guideId != null) {
            v.setViewVisibility(R.id.w_guide, View.VISIBLE);
            v.setTextViewText(R.id.w_guide_name, t.guideName != null ? t.guideName : "Guided");
            v.setInt(R.id.w_play_ring, "setColorFilter", t.accent);
            v.setOnClickPendingIntent(R.id.w_guide, open(c, "/?play=guide:" + t.guideId));
        } else {
            v.setViewVisibility(R.id.w_guide, View.GONE);
        }

        if (t.total > 0) {
            v.setViewVisibility(R.id.w_count, View.VISIBLE);
            v.setImageViewBitmap(R.id.w_count_ring, ring(c, (double) t.done / Math.max(1, t.total), 22, 3, t.accent));
            v.setTextViewText(R.id.w_count_text, t.done + " / " + t.total);
        } else {
            v.setViewVisibility(R.id.w_count, View.GONE);
        }
        if (t.streak > 1) {
            v.setViewVisibility(R.id.w_streak, View.VISIBLE);
            v.setInt(R.id.w_flame, "setColorFilter", t.accent);
            v.setTextViewText(R.id.w_streak_text, String.valueOf(t.streak));
        } else {
            v.setViewVisibility(R.id.w_streak, View.GONE);
        }
        if (t.hasEra() && !t.eraFinished()) {
            v.setViewVisibility(R.id.w_progress, View.VISIBLE);
            v.setTextViewText(R.id.w_progress_text, "Day " + t.day + " of " + t.length);
            v.setImageViewBitmap(R.id.w_bar, bar(c, t.progress(), 70, t.accent));
        } else {
            v.setViewVisibility(R.id.w_progress, View.GONE);
        }

        int[] rows = { R.id.w_row0, R.id.w_row1, R.id.w_row2, R.id.w_row3 };
        int[] icons = { R.id.w_row0_icon, R.id.w_row1_icon, R.id.w_row2_icon, R.id.w_row3_icon };
        int[] titles = { R.id.w_row0_title, R.id.w_row1_title, R.id.w_row2_title, R.id.w_row3_title };
        int[] times = { R.id.w_row0_time, R.id.w_row1_time, R.id.w_row2_time, R.id.w_row3_time };
        int[] tags = { R.id.w_row0_tag, R.id.w_row1_tag, R.id.w_row2_tag, R.id.w_row3_tag };
        v.setViewVisibility(R.id.w_today, t.items.isEmpty() ? View.GONE : View.VISIBLE);
        for (int i = 0; i < rows.length; i++) {
            if (i >= t.items.size()) {
                v.setViewVisibility(rows[i], View.GONE);
                continue;
            }
            DayItem it = t.items.get(i);
            v.setViewVisibility(rows[i], View.VISIBLE);
            boolean urgent = "due".equals(it.status) || "slipping".equals(it.status);
            v.setImageViewResource(icons[i], it.ticked() ? R.drawable.wg_check_circle
                    : ("slipping".equals(it.status) ? R.drawable.wg_alert_circle : R.drawable.wg_circle));
            v.setInt(icons[i], "setColorFilter", it.ticked() ? Color.WHITE : (urgent ? t.accent : DIM));
            if (it.ticked()) {
                SpannableString s = new SpannableString(it.title);
                s.setSpan(new StrikethroughSpan(), 0, s.length(), Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
                v.setTextViewText(titles[i], s);
                v.setTextColor(titles[i], DIM);
            } else {
                v.setTextViewText(titles[i], it.title);
                v.setTextColor(titles[i], Color.WHITE);
            }
            if (urgent) {
                v.setViewVisibility(times[i], View.GONE);
                v.setViewVisibility(tags[i], View.VISIBLE);
                v.setTextViewText(tags[i], "slipping".equals(it.status) ? "Slipping" : "Due");
                tint(v, tags[i], t.accent);
            } else {
                v.setViewVisibility(tags[i], View.GONE);
                text(v, times[i], it.time != null ? clockLabel(it.time) : null);
            }
        }

        markDone(c, v, t, "Mark Today Done", R.id.w_mark, 0);
        v.setOnClickPendingIntent(R.id.w_open, open(c, "/"));
        v.setOnClickPendingIntent(android.R.id.background, open(c, "/"));
        return v;
    }

    /** Nothing to show yet: a line, and why, in small type — never a silent quote. */
    private static RemoteViews quote(Context c, Today t, Size size) {
        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.widget_today_quote);
        v.setTextViewText(R.id.w_quote, "“" + t.quote + "”");
        v.setTextViewText(R.id.w_author, "— " + t.author);
        text(v, R.id.w_reason, t.reason);
        v.setOnClickPendingIntent(android.R.id.background, open(c, "/"));
        return v;
    }

    private static void promiseIcon(RemoteViews v, int id, Today t) {
        int res = Boolean.TRUE.equals(t.kept) ? R.drawable.wg_check_circle
                : (Boolean.FALSE.equals(t.kept) ? R.drawable.wg_x_circle : R.drawable.wg_circle);
        v.setImageViewResource(id, res);
        v.setInt(id, "setColorFilter", Boolean.TRUE.equals(t.kept) ? t.accent : DIM);
    }

    private static String promiseStatus(Today t) {
        if (t.promise == null) return "No promise yet today";
        if (Boolean.TRUE.equals(t.kept)) return "Kept today";
        if (Boolean.FALSE.equals(t.kept)) return "Not kept today";
        return t.closing ? "Did you keep it? Check in." : "Check in tonight";
    }

    /** The pill acts in place with a key; without one it opens the era screen. */
    private static void markDone(Context c, RemoteViews v, Today t, String title, int pill, int status) {
        boolean show = t.promise != null && t.kept == null;
        v.setViewVisibility(pill, show ? View.VISIBLE : View.GONE);
        if (status != 0) {
            v.setViewVisibility(status, show ? View.GONE : View.VISIBLE);
            v.setTextViewText(status, promiseStatus(t));
        }
        if (!show) return;
        v.setTextViewText(R.id.w_mark_text, title);
        if (t.canAct) {
            Intent i = new Intent(c, TodayWidget.class).setAction(ACTION_PROMISE_DONE);
            v.setOnClickPendingIntent(pill, PendingIntent.getBroadcast(c, 1, i,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
        } else {
            v.setOnClickPendingIntent(pill, open(c, "/era"));
        }
    }

    /** A screen in the app, through its URL scheme (voxu://app/<path> → hooks/useDeepLink). */
    private static PendingIntent open(Context c, String path) {
        Intent i = new Intent(Intent.ACTION_VIEW, Uri.parse("voxu://app" + path), c, MainActivity.class);
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        return PendingIntent.getActivity(c, path.hashCode(), i,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static void text(RemoteViews v, int id, CharSequence s) {
        v.setViewVisibility(id, s == null ? View.GONE : View.VISIBLE);
        if (s != null) v.setTextViewText(id, s);
    }

    /** The era accent behind a small label (rounded shape kept on Android 12+, plain text colour before). */
    private static void tint(RemoteViews v, int id, int color) {
        if (Build.VERSION.SDK_INT >= 31) {
            v.setColorStateList(id, "setBackgroundTintList", ColorStateList.valueOf(color));
            v.setTextColor(id, Color.BLACK);
        } else {
            v.setInt(id, "setBackgroundColor", Color.TRANSPARENT);
            v.setTextColor(id, color);
        }
    }

    private static Bitmap ring(Context c, double progress, int dp, int lineDp, int fill) {
        float d = c.getResources().getDisplayMetrics().density;
        int px = Math.round(dp * d);
        float line = lineDp * d;
        Bitmap b = Bitmap.createBitmap(px, px, Bitmap.Config.ARGB_8888);
        Canvas cv = new Canvas(b);
        Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
        p.setStyle(Paint.Style.STROKE);
        p.setStrokeWidth(line);
        p.setStrokeCap(Paint.Cap.ROUND);
        RectF r = new RectF(line / 2, line / 2, px - line / 2, px - line / 2);
        p.setColor(FAINT);
        cv.drawArc(r, 0, 360, false, p);
        p.setColor(fill);
        cv.drawArc(r, -90, (float) (360 * Math.max(0.02, Math.min(1, progress))), false, p);
        return b;
    }

    private static Bitmap bar(Context c, double progress, int dp, int fill) {
        float d = c.getResources().getDisplayMetrics().density;
        int w = Math.round(dp * d);
        int h = Math.round(4 * d);
        Bitmap b = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888);
        Canvas cv = new Canvas(b);
        Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
        p.setColor(FAINT);
        cv.drawRoundRect(new RectF(0, 0, w, h), h / 2f, h / 2f, p);
        p.setColor(fill);
        float fw = Math.max(h, (float) (w * Math.max(0, Math.min(1, progress))));
        cv.drawRoundRect(new RectF(0, 0, fw, h), h / 2f, h / 2f, p);
        return b;
    }

    // ── Reading the snapshot ──────────────────────────────────────────────

    static SharedPreferences prefs(Context c) {
        return c.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    static String todayString() {
        return new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date());
    }

    static int minutesOf(String hhmm) {
        String[] parts = hhmm.split(":");
        if (parts.length < 2) return 0;
        try {
            return Integer.parseInt(parts[0].trim()) * 60 + Integer.parseInt(parts[1].trim());
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    static String clockLabel(String hhmm) {
        int m = minutesOf(hhmm);
        int h = m / 60, mm = m % 60;
        int h12 = h % 12 == 0 ? 12 : h % 12;
        String suffix = h >= 12 ? "PM" : "AM";
        return mm == 0 ? h12 + " " + suffix : String.format(Locale.US, "%d:%02d %s", h12, mm, suffix);
    }

    static int parseColor(String hex) {
        if (hex == null) return Color.WHITE;
        String s = hex.trim();
        if (!s.startsWith("#")) s = "#" + s;
        if (s.length() != 7) return Color.WHITE;
        try {
            return Color.parseColor(s);
        } catch (IllegalArgumentException e) {
            return Color.WHITE;
        }
    }

    static String str(JSONObject o, String key) {
        if (o == null || !o.has(key) || o.isNull(key)) return null;
        String s = o.optString(key, null);
        return s == null || s.isEmpty() ? null : s;
    }

    static Boolean bool(JSONObject o, String key) {
        if (o == null || !o.has(key) || o.isNull(key)) return null;
        return o.optBoolean(key);
    }

    static final class DayItem {
        final String title, time, status, kind;
        DayItem(String title, String time, String status, String kind) {
            this.title = title; this.time = time; this.status = status; this.kind = kind;
        }
        boolean ticked() { return "done".equals(status) || "minimum".equals(status) || "kept".equals(status); }
    }

    /** The snapshot as it applies right now — a line-for-line port of loadToday() on iOS. */
    static final class Today {
        String eraTitle;
        int day = 0, length = 30;
        String promise;
        Boolean kept;
        int streak = 0;
        String nowTitle, nowQuote;
        List<DayItem> items = new ArrayList<>();
        int done = 0, total = 0;
        int accent = Color.WHITE;
        boolean closing = false, tomorrowReady = false, canAct = false;
        String guideId, guideName;
        String quote = "Small steps, repeated, become a life.";
        String author = "Voxu";
        String reason;

        boolean hasEra() { return eraTitle != null; }
        boolean hasPulse() { return nowTitle != null || !items.isEmpty(); }
        boolean eraFinished() { return hasEra() && day > length; }
        double progress() { return length > 0 ? Math.min(1, (double) day / length) : 0; }
        int left() { return Math.max(0, total - done); }

        static Today load(Context c, Date now) {
            Today t = new Today();
            SharedPreferences p = prefs(c);
            String json = p.getString(SNAPSHOT_KEY, null);
            if (json == null) {
                t.reason = "Open Voxu once to connect.";
                return t;
            }
            JSONObject snap;
            Date written;
            try {
                snap = new JSONObject(json);
                SimpleDateFormat f = new SimpleDateFormat("yyyy-MM-dd", Locale.US);
                f.setLenient(false);
                written = f.parse(snap.getString("date"));
            } catch (Exception e) {
                t.reason = "Couldn’t read today from Voxu. Open it to refresh.";
                return t;
            }
            if (written == null) {
                t.reason = "Couldn’t read today from Voxu. Open it to refresh.";
                return t;
            }
            String date = snap.optString("date");

            int daysSince = Math.max(0, daysBetween(written, now));
            JSONObject era = snap.optJSONObject("era");
            if (era != null && str(era, "title") != null) {
                t.eraTitle = str(era, "title");
                t.length = era.optInt("length", 30);
                t.day = era.optInt("day", 0) + daysSince;
            }
            t.streak = daysSince <= 1 ? snap.optInt("streak", 0) : 0;
            t.accent = parseColor(str(snap, "accent"));
            // Today's words, session and list only on the day they were written.
            if (daysSince != 0) return t;

            JSONObject promise = snap.optJSONObject("promise");
            t.promise = str(promise, "text");
            t.kept = bool(promise, "kept");
            JSONObject guide = snap.optJSONObject("guide");
            t.guideId = str(guide, "id");
            t.guideName = str(guide, "name");
            t.tomorrowReady = snap.optBoolean("tomorrowReady", false);
            String token = p.getString(TOKEN_KEY, "");
            t.canAct = token != null && !token.isEmpty();
            // A Mark Done that worked shows at once, before the app writes again.
            if (date.equals(p.getString(DONE_PROMISE_KEY, null)) && t.promise != null) t.kept = true;

            JSONObject pulse = snap.optJSONObject("pulse");
            if (pulse == null) return t;
            Calendar cal = Calendar.getInstance();
            cal.setTime(now);
            int mins = cal.get(Calendar.HOUR_OF_DAY) * 60 + cal.get(Calendar.MINUTE);
            t.done = pulse.optInt("done", 0);
            t.total = pulse.optInt("total", 0);

            // Move timed items along the clock. Only statuses the app set can be
            // "done"; the clock only ever moves upcoming → due → slipping.
            JSONArray raw = pulse.optJSONArray("items");
            if (raw != null) {
                for (int i = 0; i < raw.length(); i++) {
                    JSONObject it = raw.optJSONObject(i);
                    if (it == null || str(it, "title") == null) continue;
                    String title = str(it, "title");
                    String time = str(it, "time");
                    String status0 = str(it, "status") != null ? str(it, "status") : "open";
                    String kind = str(it, "kind") != null ? str(it, "kind") : "";
                    String status = status0;
                    if (time != null && ("upcoming".equals(status0) || "due".equals(status0))) {
                        int at = minutesOf(time);
                        if ("discipline".equals(kind) && mins > at + SLIP_AFTER) status = "slipping";
                        else if (mins >= at - DUE_BEFORE) status = "step".equals(kind) ? "upcoming" : "due";
                        else status = "upcoming";
                    }
                    // A routine step with no record is only shown while still ahead.
                    if ("step".equals(kind) && time != null && minutesOf(time) <= mins) continue;
                    t.items.add(new DayItem(title, time, status, kind));
                }
            }

            // Right now: a timed discipline the clock has made urgent outranks
            // what the app last said; otherwise the app's own answer.
            DayItem slip = null, due = null;
            for (DayItem it : t.items) {
                if (slip == null && "slipping".equals(it.status)) slip = it;
                if (due == null && "due".equals(it.status) && it.time != null && "discipline".equals(it.kind)) due = it;
            }
            JSONObject rightNow = pulse.optJSONObject("rightNow");
            if (slip != null) {
                t.nowTitle = slip.title + " — do the minimum.";
            } else if (due != null) {
                t.nowTitle = due.title + " is due now.";
            } else if (rightNow != null && str(rightNow, "title") != null) {
                t.nowTitle = str(rightNow, "title");
                t.nowQuote = str(rightNow, "quote");
            }

            // Evening, and nothing urgent on the clock: close the day instead.
            int hour = mins / 60;
            boolean urgent = slip != null || due != null;
            if ((hour >= 19 || hour < 3) && !urgent && era != null) {
                t.closing = true;
                t.nowTitle = t.total > 0 ? t.done + " of " + t.total + " done today." : "Today, closed.";
                t.nowQuote = null;
            }
            return t;
        }

        private static int daysBetween(Date from, Date to) {
            Calendar a = Calendar.getInstance();
            a.setTime(from);
            Calendar b = Calendar.getInstance();
            b.setTime(to);
            for (Calendar x : new Calendar[] { a, b }) {
                x.set(Calendar.HOUR_OF_DAY, 12);
                x.set(Calendar.MINUTE, 0);
                x.set(Calendar.SECOND, 0);
                x.set(Calendar.MILLISECOND, 0);
            }
            return (int) Math.round((b.getTimeInMillis() - a.getTimeInMillis()) / 86400000.0);
        }
    }
}
