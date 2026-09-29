import Capacitor
import WidgetKit

// The web app's line to the home-screen widget. Mirrors the
// AudioAnalyzerPlugin registration pattern.
//
//   write  — stores the widget's JSON snapshot (lib/widget-snapshot.ts) in the
//            App Group, the only storage the widget extension can read.
//            @capacitor/preferences can't do this: its `group` option only
//            prefixes keys inside the app's own UserDefaults.
//   reload — asks WidgetKit to redraw now instead of at the next timeline tick.
@objc(WidgetBridgePlugin)
public class WidgetBridgePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "WidgetBridgePlugin"
    public let jsName = "WidgetBridge"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "reload", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "write", returnType: CAPPluginReturnPromise),
    ]

    static let appGroup = "group.com.voxu.app"
    static let snapshotKey = "widget_snapshot"

    @objc func reload(_ call: CAPPluginCall) {
        if #available(iOS 14.0, *) {
            WidgetCenter.shared.reloadAllTimelines()
        }
        call.resolve()
    }

    @objc func write(_ call: CAPPluginCall) {
        guard let json = call.getString("json") else {
            call.reject("json is required")
            return
        }
        // Without the App Group entitlement there is no shared container, and
        // UserDefaults(suiteName:) would still "work" — into storage the widget
        // can never read. Check the container, and report the truth so the
        // web side knows nothing reached the widget.
        guard FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: WidgetBridgePlugin.appGroup) != nil,
              let store = UserDefaults(suiteName: WidgetBridgePlugin.appGroup) else {
            call.resolve(["written": false])
            return
        }
        store.set(json, forKey: WidgetBridgePlugin.snapshotKey)
        call.resolve(["written": true])
    }
}
