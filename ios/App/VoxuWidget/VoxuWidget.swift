import WidgetKit
import SwiftUI

// MARK: - What the widget shows
//
// The app writes one JSON snapshot into the App Group (WidgetBridgePlugin
// .write, built by lib/widget-snapshot.ts): the era's title and day, today's
// promise and mission, the streak — and Pulse (lib/pulse/engine.ts): the one
// thing right now and today's list.
//
// The widget keeps it current ON ITS OWN CLOCK. A timed item turns "due now"
// fifteen minutes before its time and "before it slips" an hour after, and a
// timeline entry sits at each of those moments — so the widget changes
// through the day without the app being opened. It never ticks anything the
// app didn't record, and it drops yesterday's words at midnight.
//
// With no era and no Pulse it falls back to the daily quote from the public
// endpoint, which needs no sign-in.

private let APP_GROUP = "group.com.voxu.app"
private let SNAPSHOT_KEY = "widget_snapshot"
private let QUOTE_URL = "https://voxu.app/api/widget?type=quote"
private let DUE_BEFORE = 15   // minutes before a time it becomes "due now"
private let SLIP_AFTER = 60   // minutes after a time it is "before it slips"

struct Snapshot: Decodable {
    struct Era: Decodable { let title: String; let day: Int; let length: Int; let stage: String }
    struct Promise: Decodable { let text: String; let kept: Bool? }
    struct Mission: Decodable { let text: String; let done: Bool }
    struct PulseSnap: Decodable {
        struct RightNow: Decodable { let eyebrow: String; let title: String; let quote: String? }
        struct Item: Decodable { let title: String; let time: String?; let status: String; let kind: String }
        let rightNow: RightNow?
        let done: Int
        let total: Int
        let items: [Item]
    }
    let v: Int
    let date: String
    let era: Era?
    let promise: Promise?
    let mission: Mission?
    let streak: Int
    let pulse: PulseSnap?
    /// The era skin's accent, "#rrggbb" — fills and glow only, never text.
    let accent: String?
    /// Tomorrow's promise already written tonight.
    let tomorrowReady: Bool?
}

extension Color {
    /// "#rrggbb" → Color; white for anything unreadable.
    init(hex: String?) {
        var s = (hex ?? "").trimmingCharacters(in: .whitespaces)
        if s.hasPrefix("#") { s.removeFirst() }
        guard s.count == 6, let v = UInt32(s, radix: 16) else { self = .white; return }
        self = Color(
            red: Double((v >> 16) & 0xFF) / 255,
            green: Double((v >> 8) & 0xFF) / 255,
            blue: Double(v & 0xFF) / 255
        )
    }
}

struct DayItem {
    let title: String
    let time: String?
    /// done, minimum, kept, missed, open, due, upcoming — plus "slipping",
    /// which only the widget's own clock produces.
    let status: String
    let kind: String

    var ticked: Bool { status == "done" || status == "minimum" || status == "kept" }
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
    // Pulse
    var nowEyebrow: String? = nil
    var nowTitle: String? = nil
    var nowQuote: String? = nil
    var items: [DayItem] = []
    var done = 0
    var total = 0
    var next: DayItem? = nil
    var accent: Color = .white
    /// Evening: "Close the day" instead of what's next.
    var closing = false
    var tomorrowReady = false
    // Fallback
    var quote = "Small steps, repeated, become a life."
    var author = "Voxu"

    var hasEra: Bool { eraTitle != nil }
    var hasPulse: Bool { nowTitle != nil || !items.isEmpty }
    var eraFinished: Bool { hasEra && day > length }
    var progress: Double { length > 0 ? min(1, Double(day) / Double(length)) : 0 }
    var left: Int { max(0, total - done) }
}

private func localDate(_ ymd: String) -> Date? {
    let f = DateFormatter()
    f.calendar = Calendar.current
    f.timeZone = TimeZone.current
    f.dateFormat = "yyyy-MM-dd"
    return f.date(from: ymd)
}

func minutesOf(_ hhmm: String) -> Int {
    let parts = hhmm.split(separator: ":").compactMap { Int($0) }
    guard parts.count >= 2 else { return 0 }
    return parts[0] * 60 + parts[1]
}

func clockLabel(_ hhmm: String) -> String {
    let m = minutesOf(hhmm)
    let h = m / 60, mm = m % 60
    let h12 = h % 12 == 0 ? 12 : h % 12
    let suffix = h >= 12 ? "PM" : "AM"
    return mm == 0 ? "\(h12) \(suffix)" : String(format: "%d:%02d %@", h12, mm, suffix)
}

private func minutesNow(_ date: Date) -> Int {
    let c = Calendar.current.dateComponents([.hour, .minute], from: date)
    return (c.hour ?? 0) * 60 + (c.minute ?? 0)
}

private func loadSnapshot() -> Snapshot? {
    guard let store = UserDefaults(suiteName: APP_GROUP),
          let json = store.string(forKey: SNAPSHOT_KEY),
          let data = json.data(using: .utf8) else { return nil }
    return try? JSONDecoder().decode(Snapshot.self, from: data)
}

func loadToday(at now: Date = Date()) -> Today {
    var t = Today()
    guard let snap = loadSnapshot(), let written = localDate(snap.date) else { return t }

    let cal = Calendar.current
    let daysSince = max(0, cal.dateComponents([.day], from: cal.startOfDay(for: written), to: cal.startOfDay(for: now)).day ?? 0)

    if let era = snap.era {
        t.eraTitle = era.title
        t.length = era.length
        t.day = era.day + daysSince
    }
    t.streak = daysSince <= 1 ? snap.streak : 0
    t.accent = Color(hex: snap.accent)
    // Today's words and today's list only on the day they were written.
    guard daysSince == 0 else { return t }

    t.promise = snap.promise?.text
    t.kept = snap.promise?.kept
    t.mission = snap.mission?.text
    t.missionDone = snap.mission?.done ?? false

    guard let p = snap.pulse else { return t }
    let mins = minutesNow(now)
    t.done = p.done
    t.total = p.total

    // Move timed items along the clock. Only statuses the app set can be
    // "done"; the clock only ever moves upcoming → due → slipping.
    t.items = p.items.map { (it: Snapshot.PulseSnap.Item) -> DayItem in
        guard let time = it.time, it.status == "upcoming" || it.status == "due" else {
            return DayItem(title: it.title, time: it.time, status: it.status, kind: it.kind)
        }
        let at = minutesOf(time)
        let status: String
        if it.kind == "discipline" && mins > at + SLIP_AFTER { status = "slipping" }
        else if mins >= at - DUE_BEFORE { status = it.kind == "step" ? "upcoming" : "due" }
        else { status = "upcoming" }
        return DayItem(title: it.title, time: time, status: status, kind: it.kind)
    }
    // A routine step with no record is only shown while still ahead.
    t.items = t.items.filter { (item: DayItem) -> Bool in
        guard item.kind == "step", let time = item.time else { return true }
        return minutesOf(time) > mins
    }

    t.next = t.items.first(where: { (item: DayItem) -> Bool in
        guard let time = item.time else { return false }
        return minutesOf(time) > mins && (item.status == "upcoming" || item.status == "due")
    })

    // Right now: a timed discipline the clock has made urgent outranks what
    // the app last said; otherwise the app's own answer.
    if let slip = t.items.first(where: { $0.status == "slipping" }) {
        t.nowEyebrow = "Before it slips"
        t.nowTitle = "\(slip.title) — do the minimum."
        t.nowQuote = nil
    } else if let due = t.items.first(where: { $0.status == "due" && $0.time != nil && $0.kind == "discipline" }) {
        t.nowEyebrow = "Due now"
        t.nowTitle = "\(due.title) is due now."
        t.nowQuote = nil
    } else if let r = p.rightNow {
        t.nowEyebrow = r.eyebrow
        t.nowTitle = r.title
        t.nowQuote = r.quote
    }

    // Evening, and nothing urgent on the clock: close the day instead. The
    // spoken debrief is in the app — a widget can't play audio — so a tap
    // opens home, where it is.
    let hour = mins / 60
    let urgent = t.items.contains { (item: DayItem) -> Bool in
        item.status == "slipping" || (item.status == "due" && item.time != nil && item.kind == "discipline")
    }
    if (hour >= 19 || hour < 3) && !urgent && snap.era != nil {
        t.closing = true
        t.tomorrowReady = snap.tomorrowReady ?? false
        t.nowEyebrow = "Close the day"
        t.nowTitle = t.total > 0 ? "\(t.done) of \(t.total) done today." : "Today, closed."
        t.nowQuote = nil
    }
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
        t.eraTitle = "Locked In"; t.day = 9; t.length = 30; t.streak = 6
        t.nowEyebrow = "Right now"; t.nowTitle = "Keep today’s promise."
        t.nowQuote = "I’ll finish the thing I’ve been avoiding."
        t.items = [
            DayItem(title: "Read 10 pages", time: nil, status: "done", kind: "discipline"),
            DayItem(title: "Gym", time: "17:30", status: "upcoming", kind: "discipline"),
            DayItem(title: "Today’s promise", time: nil, status: "open", kind: "promise"),
            DayItem(title: "Reflection", time: "21:30", status: "upcoming", kind: "step"),
        ]
        t.done = 1; t.total = 3
        t.next = t.items[1]
        return VoxuEntry(date: Date(), today: t)
    }

    func getSnapshot(in context: Context, completion: @escaping (VoxuEntry) -> Void) {
        completion(context.isPreview ? placeholder(in: context) : VoxuEntry(date: Date(), today: loadToday()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<VoxuEntry>) -> Void) {
        let now = Date()
        let cal = Calendar.current
        let midnight = cal.startOfDay(for: cal.date(byAdding: .day, value: 1, to: now) ?? now.addingTimeInterval(86400))

        // An entry at every moment the day changes on its own: each timed
        // item turning due, and turning "before it slips".
        var moments: [Date] = [now]
        if let snap = loadSnapshot(), let items = snap.pulse?.items {
            let start = cal.startOfDay(for: now)
            for it in items {
                guard let time = it.time else { continue }
                let at = minutesOf(time)
                for m in [at - DUE_BEFORE, at, at + SLIP_AFTER + 1] where m > 0 {
                    if let d = cal.date(byAdding: .minute, value: m, to: start), d > now, d < midnight {
                        moments.append(d)
                    }
                }
            }
        }
        moments.append(midnight)
        let unique = Array(Set(moments)).sorted().prefix(24)

        let finish: (Today?) -> Void = { override in
            let entries = unique.map { d -> VoxuEntry in
                var t = loadToday(at: d)
                if let o = override, !t.hasEra && !t.hasPulse { t.quote = o.quote; t.author = o.author }
                return VoxuEntry(date: d, today: t)
            }
            let next = cal.date(byAdding: .hour, value: 4, to: now) ?? now.addingTimeInterval(14400)
            completion(Timeline(entries: entries, policy: .after(min(next, midnight.addingTimeInterval(60)))))
        }

        let today = loadToday(at: now)
        if today.hasEra || today.hasPulse {
            finish(nil)
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
private let titleFont = Font.system(size: 20, weight: .medium, design: .serif)

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

struct Bar: View {
    let progress: Double
    var fill: Color = .white
    var body: some View {
        GeometryReader { g in
            ZStack(alignment: .leading) {
                Capsule().fill(Color.white.opacity(0.14))
                Capsule().fill(fill).frame(width: max(4, g.size.width * progress))
            }
        }
        .frame(height: 4)
    }
}

struct Ring: View {
    let progress: Double
    let size: CGFloat
    var fill: Color = .white
    var body: some View {
        ZStack {
            Circle().stroke(Color.white.opacity(0.14), lineWidth: 4)
            Circle()
                .trim(from: 0, to: max(0.02, progress))
                .stroke(fill, style: StrokeStyle(lineWidth: 4, lineCap: .round))
                .rotationEffect(.degrees(-90))
        }
        .frame(width: size, height: size)
    }
}

struct ItemRow: View {
    let item: DayItem
    private var urgent: Bool { item.status == "due" || item.status == "slipping" }
    private var symbol: String { item.ticked ? "checkmark.circle.fill" : (urgent ? "circle.inset.filled" : "circle") }
    private var tint: Color { (item.ticked || urgent) ? Color.white : dim }
    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: symbol)
                .font(.system(size: 12))
                .foregroundColor(tint)
            Text(item.title)
                .font(.system(size: 12, weight: item.ticked ? .regular : .medium))
                .foregroundColor(item.ticked ? Color.white.opacity(0.6) : Color.white)
                .lineLimit(1)
            Spacer(minLength: 4)
            if let time = item.time {
                Text(clockLabel(time)).font(.system(size: 10)).foregroundColor(dim)
            }
        }
    }
}

// MARK: - Views

struct VoxuWidgetEntryView: View {
    @Environment(\.widgetFamily) var family
    let entry: VoxuEntry
    private var t: Today { entry.today }

    private var eraLine: String {
        guard let title = t.eraTitle else { return "Voxu" }
        return t.eraFinished ? "\(title) · complete" : "\(title) · Day \(t.day)"
    }

    private var countLine: String { t.total > 0 ? "\(t.done) of \(t.total) today" : "" }

    /// Small: what's next, and how the day is going.
    var small: some View {
        VStack(alignment: .leading, spacing: 6) {
            Eyebrow(text: "Voxu")
            Spacer(minLength: 0)
            if let n = t.next {
                Text("Next up").font(.system(size: 10)).foregroundColor(dim)
                Text(n.title).font(.system(size: 16, weight: .medium, design: .serif)).foregroundColor(.white).lineLimit(2)
                if let time = n.time { Text(clockLabel(time)).font(.system(size: 11)).foregroundColor(dim) }
            } else if let title = t.nowTitle {
                Text(title).font(.system(size: 15, weight: .medium, design: .serif)).foregroundColor(.white).lineLimit(3)
            }
            Spacer(minLength: 0)
            if t.total > 0 {
                HStack(spacing: 6) {
                    Ring(progress: Double(t.done) / Double(max(1, t.total)), size: 14, fill: t.accent)
                    Text(countLine).font(.system(size: 11, weight: .semibold)).foregroundColor(.white)
                }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }

    /// Medium: right now, in full, with the day underneath.
    var medium: some View {
        VStack(alignment: .leading, spacing: 6) {
            Eyebrow(text: eraLine)
            Text(t.nowEyebrow ?? "Right now").font(.system(size: 11)).foregroundColor(dim)
            Text(t.nowTitle ?? "").font(titleFont).foregroundColor(.white).lineLimit(2).minimumScaleFactor(0.85)
            if let q = t.nowQuote {
                Text("“\(q)”").font(.system(size: 12, design: .serif)).italic().foregroundColor(Color.white.opacity(0.7)).lineLimit(1)
            }
            if t.closing {
                Text(t.tomorrowReady ? "Tomorrow’s promise is set." : "Write tomorrow’s promise.")
                    .font(.system(size: 12)).foregroundColor(Color.white.opacity(0.7)).lineLimit(1)
            }
            Spacer(minLength: 0)
            HStack(spacing: 10) {
                if t.total > 0 {
                    Text(countLine).font(.system(size: 11, weight: .semibold)).foregroundColor(.white)
                    Bar(progress: Double(t.done) / Double(max(1, t.total)), fill: t.accent).frame(maxWidth: 90)
                }
                Spacer(minLength: 0)
                if let n = t.next, let time = n.time {
                    Text("\(n.title) · \(clockLabel(time))").font(.system(size: 11)).foregroundColor(dim).lineLimit(1)
                }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }

    /// Large: the era, right now, and today's list.
    var large: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Eyebrow(text: eraLine)
                Spacer()
                if t.streak > 1 {
                    Label("\(t.streak)", systemImage: "flame.fill").font(.system(size: 11, weight: .semibold)).foregroundColor(dim)
                }
            }
            if t.hasEra && !t.eraFinished { Bar(progress: t.progress, fill: t.accent) }
            VStack(alignment: .leading, spacing: 3) {
                Eyebrow(text: t.nowEyebrow ?? "Right now")
                Text(t.nowTitle ?? "").font(.system(size: 22, weight: .medium, design: .serif)).foregroundColor(.white).lineLimit(2)
                if let q = t.nowQuote {
                    Text("“\(q)”").font(.system(size: 13, design: .serif)).italic().foregroundColor(Color.white.opacity(0.7)).lineLimit(2)
                }
                if t.closing {
                    Text(t.tomorrowReady ? "Tomorrow’s promise is set. You’re done for tonight." : "Write tomorrow’s promise, then you’re done.")
                        .font(.system(size: 12)).foregroundColor(Color.white.opacity(0.7)).lineLimit(2)
                }
            }
            if !t.items.isEmpty {
                VStack(alignment: .leading, spacing: 7) {
                    HStack {
                        Eyebrow(text: "Today")
                        Spacer()
                        Text(countLine).font(.system(size: 10)).foregroundColor(dim)
                    }
                    ForEach(Array(t.items.prefix(5).enumerated()), id: \.offset) { _, it in ItemRow(item: it) }
                }
            }
            Spacer(minLength: 0)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }

    /// No era and no Pulse yet: the daily quote.
    var quote: some View {
        VStack(alignment: .leading, spacing: 6) {
            Eyebrow(text: "Voxu")
            Spacer(minLength: 2)
            Text("“\(t.quote)”")
                .font(.system(size: family == .systemSmall ? 13 : 16, weight: .medium))
                .foregroundColor(.white)
                .lineLimit(family == .systemSmall ? 5 : 4)
                .minimumScaleFactor(0.85)
            Text("— \(t.author)").font(.system(size: 10)).foregroundColor(dim).lineLimit(1)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }

    // Lock screen. The system tints these, so no colours of our own.
    var rectangular: some View {
        VStack(alignment: .leading, spacing: 1) {
            if t.total > 0 {
                Text(t.left == 0 ? "All done today" : "\(t.left) left today")
                    .font(.system(size: 12, weight: .semibold)).lineLimit(1)
            } else {
                Text(eraLine).font(.system(size: 12, weight: .semibold)).lineLimit(1)
            }
            if let n = t.next, let time = n.time {
                Text("Next: \(n.title) \(clockLabel(time))").font(.system(size: 12)).lineLimit(1)
            } else {
                Text(t.nowTitle ?? t.promise ?? t.quote).font(.system(size: 12)).lineLimit(2)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    var circular: some View {
        Gauge(value: t.total > 0 ? Double(t.done) / Double(t.total) : t.progress) {
            Text("Voxu")
        } currentValueLabel: {
            if t.total > 0 {
                VStack(spacing: -2) {
                    Text("\(t.left)").font(.system(size: 16, weight: .semibold))
                    Text("left").font(.system(size: 8))
                }
            } else {
                Text(t.hasEra ? "\(t.day)" : "–")
            }
        }
        .gaugeStyle(.accessoryCircular)
    }

    var body: some View {
        switch family {
        case .accessoryRectangular: rectangular
        case .accessoryCircular: circular
        case .systemLarge: (t.hasPulse || t.hasEra) ? AnyView(large) : AnyView(quote)
        case .systemMedium: t.hasPulse ? AnyView(medium) : AnyView(quote)
        default: (t.hasPulse || t.hasEra) ? AnyView(small) : AnyView(quote)
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
                    .containerBackground(for: .widget) {
                        // The era's light, faint, from the top — atmosphere only.
                        LinearGradient(
                            colors: [entry.today.accent.opacity(0.16), Color.black],
                            startPoint: .top, endPoint: .center
                        )
                    }
            } else {
                VoxuWidgetEntryView(entry: entry)
                    .padding(14)
                    .background(Color.black)
            }
        }
        .configurationDisplayName("Voxu")
        .description("What matters right now, and how today is going.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge, .accessoryRectangular, .accessoryCircular])
    }
}
