package com.voxu.app;

import android.content.Context;
import android.content.SharedPreferences;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * The web app's line to the home-screen widget: the Android twin of
 * ios/App/App/WidgetBridgePlugin.swift, with the same three calls, so
 * lib/widget-sync.ts works unchanged on both phones.
 *
 *   write    — stores the widget's JSON snapshot (lib/widget-snapshot.ts)
 *   setToken — the widget buttons' key ('' removes it, on sign-out)
 *   reload   — redraws every Voxu widget now
 *
 * The widget runs in this same app, so plain private SharedPreferences are
 * the shared storage (iOS needs an App Group for the same thing).
 */
@CapacitorPlugin(name = "WidgetBridge")
public class WidgetBridgePlugin extends Plugin {

    static SharedPreferences prefs(Context c) {
        return c.getSharedPreferences(TodayWidget.PREFS, Context.MODE_PRIVATE);
    }

    @PluginMethod
    public void reload(PluginCall call) {
        TodayWidget.updateAll(getContext());
        call.resolve();
    }

    @PluginMethod
    public void write(PluginCall call) {
        String json = call.getString("json");
        if (json == null) {
            call.reject("json is required");
            return;
        }
        prefs(getContext()).edit().putString(TodayWidget.SNAPSHOT_KEY, json).apply();
        JSObject res = new JSObject();
        res.put("written", true);
        call.resolve(res);
    }

    @PluginMethod
    public void setToken(PluginCall call) {
        String token = call.getString("token", "");
        SharedPreferences.Editor e = prefs(getContext()).edit();
        if (token == null || token.isEmpty()) e.remove(TodayWidget.TOKEN_KEY);
        else e.putString(TodayWidget.TOKEN_KEY, token);
        e.apply();
        call.resolve();
    }
}
