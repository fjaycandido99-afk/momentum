import WidgetKit
import SwiftUI

// MARK: - Data
//
// The widget shows two things:
//   • Daily quote  — fetched live from the PUBLIC endpoint (no auth needed),
//     so it works the moment the target builds, with zero web changes.
//   • Streak + journey — read from the App Group the app writes to. Optional:
//     if the App Group isn't wired yet, the streak line just hides.

private let APP_GROUP = "group.com.voxu.app"
private let QUOTE_URL = "https://voxu.app/api/widget?type=quote"

struct VoxuData {
    var streak: Int = 0
    var stage: String = ""
    var quote: String = "Small steps, repeated, become a life."
    var author: String = "Voxu"

    // Streak/journey written by the app (via @capacitor/preferences with the
    // App Group). Capacitor's key format can vary, so we try a few candidates.
    static func loadShared() -> VoxuData {
        var d = VoxuData()
        guard let store = UserDefaults(suiteName: APP_GROUP) else { return d }
        func str(_ key: String) -> String? {
            store.string(forKey: key) ?? store.string(forKey: "CapacitorStorage.\(key)")
        }
        if let s = str("widget_streak"), let n = Int(s) { d.streak = n }
        if let st = str("widget_stage") { d.stage = st }
        if let q = str("widget_quote") { d.quote = q }
        if let a = str("widget_author") { d.author = a }
        return d
    }
}

// MARK: - Timeline

struct VoxuEntry: TimelineEntry {
    let date: Date
    let data: VoxuData
}

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> VoxuEntry {
        VoxuEntry(date: Date(), data: VoxuData(streak: 12, stage: "Building Momentum",
                                               quote: "Discipline is the bridge between goals and accomplishment.", author: "Jim Rohn"))
    }

    func getSnapshot(in context: Context, completion: @escaping (VoxuEntry) -> Void) {
        completion(VoxuEntry(date: Date(), data: VoxuData.loadShared()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<VoxuEntry>) -> Void) {
        let shared = VoxuData.loadShared()
        fetchQuote { quote, author in
            var data = shared
            if let q = quote, !q.isEmpty { data.quote = q; data.author = author ?? "Voxu" }
            let entry = VoxuEntry(date: Date(), data: data)
            // Refresh every ~4 hours (a new day's quote + latest streak).
            let next = Calendar.current.date(byAdding: .hour, value: 4, to: Date()) ?? Date().addingTimeInterval(14400)
            completion(Timeline(entries: [entry], policy: .after(next)))
        }
    }

    private func fetchQuote(completion: @escaping (String?, String?) -> Void) {
        guard let url = URL(string: QUOTE_URL) else { completion(nil, nil); return }
        URLSession.shared.dataTask(with: url) { data, _, _ in
            guard let data = data,
                  let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
                completion(nil, nil); return
            }
            completion(json["quote"] as? String, json["author"] as? String)
        }.resume()
    }
}

// MARK: - Views (monochrome, matching the app's aura)

struct VoxuWidgetEntryView: View {
    @Environment(\.widgetFamily) var family
    var entry: VoxuEntry

    private var streakLine: some View {
        HStack(spacing: 5) {
            Image(systemName: "flame.fill").font(.system(size: 12)).foregroundColor(.white.opacity(0.7))
            Text(entry.data.stage.isEmpty ? "Day \(entry.data.streak)" : "Day \(entry.data.streak) · \(entry.data.stage)")
                .font(.system(size: 12, weight: .semibold)).foregroundColor(.white).lineLimit(1)
        }
    }

    private var smallView: some View {
        VStack(alignment: .leading, spacing: 6) {
            if entry.data.streak > 0 { streakLine }
            Spacer(minLength: 4)
            Text("“\(entry.data.quote)”")
                .font(.system(size: 13, weight: .medium)).foregroundColor(.white)
                .lineLimit(4).minimumScaleFactor(0.85)
            Text("— \(entry.data.author)").font(.system(size: 10)).foregroundColor(.white.opacity(0.45)).lineLimit(1)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .padding(14)
    }

    private var mediumView: some View {
        VStack(alignment: .leading, spacing: 8) {
            if entry.data.streak > 0 {
                streakLine
            } else {
                Text("VOXU").font(.system(size: 10, weight: .semibold)).tracking(2).foregroundColor(.white.opacity(0.4))
            }
            Spacer(minLength: 4)
            Text("“\(entry.data.quote)”")
                .font(.system(size: 16, weight: .medium)).foregroundColor(.white)
                .lineLimit(3).minimumScaleFactor(0.85)
            Text("— \(entry.data.author)").font(.system(size: 11)).foregroundColor(.white.opacity(0.5))
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .padding(18)
    }

    var body: some View {
        Group {
            if family == .systemSmall { smallView } else { mediumView }
        }
    }
}

// MARK: - Widget

@main
struct VoxuWidget: Widget {
    let kind = "VoxuWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            if #available(iOS 17.0, *) {
                VoxuWidgetEntryView(entry: entry).containerBackground(.black, for: .widget)
            } else {
                VoxuWidgetEntryView(entry: entry).background(Color.black)
            }
        }
        .configurationDisplayName("Voxu")
        .description("Your streak, your journey, and a daily quote.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
