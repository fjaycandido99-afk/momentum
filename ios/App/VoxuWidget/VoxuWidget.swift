import WidgetKit
import SwiftUI

// MARK: - What the widget shows
//
// The app writes one JSON snapshot into the App Group (WidgetBridgePlugin
// .write, built by lib/widget-snapshot.ts): the era's title and day, today's
// promise in the user's own words, today's mission, and the promise streak.
//
// The snapshot is dated. The widget moves the day forward itself, so a phone
// that hasn't opened the app since yesterday still says the right day — and
// it never shows yesterday's promise as today's.
//
// With no era (or no snapshot yet) it falls back to the daily quote from the
// public endpoint, which needs no sign-in.

private let APP_GROUP = "group.com.voxu.app"
private let SNAPSHOT_KEY = "widget_snapshot"
private let QUOTE_URL = "https://voxu.app/api/widget?type=quote"

struct Snapshot: Decodable {
    struct Era: Decodable { let title: String; let day: Int; let length: Int; let stage: String }
    struct Promise: Decodable { let text: String; let kept: Bool? }
    struct Mission: Decodable { let text: String; let done: Bool }
    let v: Int
    let date: String
    let era: Era?
    let promise: Promise?
    let mission: Mission?
    let streak: Int
}

/// The snapshot as it applies at `now`.
struct Today {
    var eraTitle: String? = nil
    var day: Int = 0
    var length: Int = 30
    var promise: String? = nil
    var kept: Bool? = nil
    var mission: String? = nil
    var missionDone = false
    var streak = 0
    var quote = "Small steps, repeated, become a life."
    var author = "Voxu"

    var hasEra: Bool { eraTitle != nil }
    var eraFinished: Bool { hasEra && day > length }
    var progress: Double { length > 0 ? min(1, Double(day) / Double(length)) : 0 }
}

private func localDate(_ ymd: String) -> Date? {
    let f = DateFormatter()
    f.calendar = Calendar.current
    f.timeZone = TimeZone.current
    f.dateFormat = "yyyy-MM-dd"
    return f.date(from: ymd)
}

func loadToday(at now: Date = Date()) -> Today {
    var t = Today()
    guard let store = UserDefaults(suiteName: APP_GROUP),
          let json = store.string(forKey: SNAPSHOT_KEY),
          let data = json.data(using: .utf8),
          let snap = try? JSONDecoder().decode(Snapshot.self, from: data),
          let written = localDate(snap.date) else { return t }

    let cal = Calendar.current
    let daysSince = max(0, cal.dateComponents([.day], from: cal.startOfDay(for: written), to: cal.startOfDay(for: now)).day ?? 0)

    if let era = snap.era {
        t.eraTitle = era.title
        t.length = era.length
        t.day = era.day + daysSince
    }
    // Today's words only on the day they were written.
    if daysSince == 0 {
        t.promise = snap.promise?.text
        t.kept = snap.promise?.kept
        t.mission = snap.mission?.text
        t.missionDone = snap.mission?.done ?? false
    }
    // The streak runs to today or yesterday; any longer gap and it's broken.
    t.streak = daysSince <= 1 ? snap.streak : 0
    return t
}

// MARK: - Timeline

struct VoxuEntry: TimelineEntry {
    let date: Date
    let today: Today
}

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> VoxuEntry {
        var t = Today()
        t.eraTitle = "Locked In"; t.day = 9; t.length = 30
        t.promise = "I'll finish the thing I've been avoiding before lunch."
        t.mission = "Say no to one request that pulls you away from what matters."
        t.streak = 6
        return VoxuEntry(date: Date(), today: t)
    }

    func getSnapshot(in context: Context, completion: @escaping (VoxuEntry) -> Void) {
        completion(context.isPreview ? placeholder(in: context) : VoxuEntry(date: Date(), today: loadToday()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<VoxuEntry>) -> Void) {
        let now = Date()
        let cal = Calendar.current
        let midnight = cal.startOfDay(for: cal.date(byAdding: .day, value: 1, to: now) ?? now.addingTimeInterval(86400))

        let finish: (Today) -> Void = { today in
            // One entry now and one at midnight, so the day counter turns over
            // on time even if the app isn't opened; then ask again in 4 hours.
            let entries = [
                VoxuEntry(date: now, today: today),
                VoxuEntry(date: midnight, today: loadToday(at: midnight)),
            ]
            let next = cal.date(byAdding: .hour, value: 4, to: now) ?? now.addingTimeInterval(14400)
            completion(Timeline(entries: entries, policy: .after(min(next, midnight.addingTimeInterval(60)))))
        }

        let today = loadToday(at: now)
        if today.hasEra {
            finish(today)
        } else {
            fetchQuote { quote, author in
                var t = today
                if let q = quote, !q.isEmpty { t.quote = q; t.author = author ?? "Voxu" }
                finish(t)
            }
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

// MARK: - Pieces (monochrome, the app's look)

private let dim = Color.white.opacity(0.45)

struct Eyebrow: View {
    let text: String
    var body: some View {
        Text(text.uppercased())
            .font(.system(size: 10, weight: .semibold))
            .tracking(1.6)
            .foregroundColor(dim)
            .lineLimit(1)
    }
}

struct DayBar: View {
    let progress: Double
    var body: some View {
        GeometryReader { g in
            ZStack(alignment: .leading) {
                Capsule().fill(Color.white.opacity(0.14))
                Capsule().fill(Color.white).frame(width: max(4, g.size.width * progress))
            }
        }
        .frame(height: 4)
    }
}

struct PromiseLine: View {
    let today: Today
    let size: CGFloat
    let lines: Int
    var body: some View {
        if let p = today.promise {
            VStack(alignment: .leading, spacing: 4) {
                Text(p)
                    .font(.system(size: size, weight: .medium))
                    .foregroundColor(.white)
                    .lineLimit(lines)
                    .minimumScaleFactor(0.85)
                if let kept = today.kept {
                    Label(kept ? "Kept" : "Not today", systemImage: kept ? "checkmark.circle.fill" : "circle")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundColor(kept ? .white : dim)
                }
            }
        } else {
            Text(today.eraFinished ? "Era complete. Open Voxu to see it." : "Make today's promise.")
                .font(.system(size: size, weight: .medium))
                .foregroundColor(Color.white.opacity(0.7))
                .lineLimit(lines)
        }
    }
}

// MARK: - Views

struct VoxuWidgetEntryView: View {
    @Environment(\.widgetFamily) var family
    let entry: VoxuEntry

    private var t: Today { entry.today }

    private var dayLabel: String {
        t.eraFinished ? "Era complete" : "Day \(t.day) of \(t.length)"
    }

    var small: some View {
        VStack(alignment: .leading, spacing: 8) {
            Eyebrow(text: dayLabel)
            DayBar(progress: t.progress)
            Spacer(minLength: 2)
            PromiseLine(today: t, size: 13, lines: 4)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }

    var medium: some View {
        HStack(alignment: .top, spacing: 16) {
            VStack(alignment: .leading, spacing: 6) {
                Text(t.eraFinished ? "✓" : "\(t.day)")
                    .font(.system(size: 40, weight: .semibold, design: .serif))
                    .foregroundColor(.white)
                Text(t.eraFinished ? "complete" : "of \(t.length)")
                    .font(.system(size: 11)).foregroundColor(dim)
                Spacer(minLength: 0)
                Text(t.eraTitle ?? "")
                    .font(.system(size: 12, weight: .semibold)).foregroundColor(.white)
                    .lineLimit(2)
                if t.streak > 1 {
                    Label("\(t.streak) in a row", systemImage: "flame.fill")
                        .font(.system(size: 10, weight: .semibold)).foregroundColor(dim)
                }
            }
            .frame(width: 84, alignment: .leading)

            VStack(alignment: .leading, spacing: 8) {
                Eyebrow(text: "Today's promise")
                PromiseLine(today: t, size: 14, lines: 3)
                Spacer(minLength: 0)
                if let m = t.mission {
                    HStack(alignment: .top, spacing: 5) {
                        Image(systemName: t.missionDone ? "checkmark.circle.fill" : "target")
                            .font(.system(size: 11))
                        Text(m).font(.system(size: 11)).lineLimit(2)
                    }
                    .foregroundColor(t.missionDone ? .white : dim)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }

    /// No era yet: the daily quote.
    var quote: some View {
        VStack(alignment: .leading, spacing: 6) {
            Eyebrow(text: "Voxu")
            Spacer(minLength: 2)
            Text("“\(t.quote)”")
                .font(.system(size: family == .systemSmall ? 13 : 16, weight: .medium))
                .foregroundColor(.white)
                .lineLimit(family == .systemSmall ? 5 : 3)
                .minimumScaleFactor(0.85)
            Text("— \(t.author)").font(.system(size: 10)).foregroundColor(dim).lineLimit(1)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }

    // Lock screen. The system tints these, so no colours of our own.
    var rectangular: some View {
        VStack(alignment: .leading, spacing: 1) {
            Text(t.hasEra ? "\(dayLabel) · \(t.eraTitle ?? "")" : "Voxu")
                .font(.system(size: 12, weight: .semibold)).lineLimit(1)
            Text(t.promise ?? (t.hasEra ? "Make today's promise." : t.quote))
                .font(.system(size: 12)).lineLimit(2)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    var circular: some View {
        Gauge(value: t.progress) {
            Text("Day")
        } currentValueLabel: {
            Text(t.hasEra ? (t.eraFinished ? "✓" : "\(t.day)") : "–")
        }
        .gaugeStyle(.accessoryCircular)
    }

    var body: some View {
        switch family {
        case .accessoryRectangular: rectangular
        case .accessoryCircular: circular
        case .systemMedium: t.hasEra ? AnyView(medium) : AnyView(quote)
        default: t.hasEra ? AnyView(small) : AnyView(quote)
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
                VoxuWidgetEntryView(entry: entry)
                    .containerBackground(for: .widget) { Color.black }
            } else {
                VoxuWidgetEntryView(entry: entry)
                    .padding(14)
                    .background(Color.black)
            }
        }
        .configurationDisplayName("Voxu")
        .description("Your era's day, today's promise and today's mission.")
        .supportedFamilies([.systemSmall, .systemMedium, .accessoryRectangular, .accessoryCircular])
    }
}
