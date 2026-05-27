import Capacitor
import WidgetKit

// Tiny bridge so the web app can refresh the home-screen widget immediately
// after writing new streak/journey data (instead of waiting for the timeline
// policy). Mirrors the AudioAnalyzerPlugin registration pattern.
@objc(WidgetBridgePlugin)
public class WidgetBridgePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "WidgetBridgePlugin"
    public let jsName = "WidgetBridge"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "reload", returnType: CAPPluginReturnPromise),
    ]

    @objc func reload(_ call: CAPPluginCall) {
        if #available(iOS 14.0, *) {
            WidgetCenter.shared.reloadAllTimelines()
        }
        call.resolve()
    }
}
