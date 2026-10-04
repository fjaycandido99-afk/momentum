import WidgetKit
import SwiftUI
import AppIntents

// MARK: - What the widgets show
//
// The app writes one JSON snapshot into the App Group (WidgetBridgePlugin
// .write, built by lib/widget-snapshot.ts): the era's title and day, today's
// promise and mission, the streak, Pulse (the one thing right now and today's
// list), today's guided session, and their newest solid law.
//
// The widgets keep it current ON THEIR OWN CLOCK. A timed item turns "due
// now" fifteen minutes before its time and "before it slips" an hour after,
// and a timeline entry sits at each of those moments — so the widget changes
// through the day without the app being opened. It never ticks anything the
// app didn't record, and it drops yesterday's words at midnight.
//
// Reading is forgiving: everything but the date may be missing, and a field
// the widget doesn't know is ignored — so a newer app never blanks an older
// widget. When there's nothing to show it says why in small type, instead of
// silently falling back to a quote.
//
// Taps open the app at the right screen through its URL scheme
// (voxu://app/<path> → hooks/useDeepLink). Nothing here changes data: a
// widget is a glance and a door, never a write.

private let APP_GROUP = "group.com.voxu.app"
private let SNAPSHOT_KEY = "widget_snapshot"
private let QUOTE_URL = "https://voxu.app/api/widget?type=quote"
private let ACTION_URL = "https://voxu.app/api/widget/action"
/// The buttons' key, from the app (WidgetBridgePlugin.setToken). No key → buttons open the app.
private let TOKEN_KEY = "widget_token"
/// Set to today's date after a button worked, so the widget shows it at once —
/// before the app has written a new snapshot.
private let DONE_PROMISE_KEY = "widget_done_promise"
private let DONE_CHECKIN_KEY = "widget_done_checkin"
private let DONE_TOMORROW_KEY = "widget_done_tomorrow"
private let DUE_BEFORE = 15   // minutes before a time it becomes "due now"
private let SLIP_AFTER = 60   // minutes after a time it is "before it slips"

/// A screen in the app, opened from a widget.
func appLink(_ path: String) -> URL {
    let encoded = path.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? path
    return URL(string: "voxu://app" + encoded) ?? URL(string: "voxu://app/")!
}

// MARK: - Snapshot (lib/widget-snapshot.ts)

struct Snapshot: Decodable {
    struct Era: Decodable { let title: String; let day: Int; let length: Int; let stage: String? }
    struct Promise: Decodable { let text: String; let kept: Bool? }
    struct Mission: Decodable { let text: String; let done: Bool? }
    struct Guide: Decodable { let id: String; let name: String }
    struct PulseSnap: Decodable {
        struct RightNow: Decodable { let eyebrow: String?; let title: String; let quote: String? }
        struct Item: Decodable { let title: String; let time: String?; let status: String?; let kind: String? }
        let rightNow: RightNow?
        let done: Int?
        let total: Int?
        let items: [Item]?
    }
    let v: Int?
    let date: String
    let era: Era?
    let promise: Promise?
    let mission: Mission?
    let streak: Int?
    let pulse: PulseSnap?
    /// The era skin's accent, "#rrggbb" — fills and glow only, never text.
    let accent: String?
    /// Tomorrow's promise already written tonight.
    let tomorrowReady: Bool?
    let guide: Guide?
    let law: String?
    /// Premium unlocks the Guided and Noticed widgets. Absent (an older app) = shown.
    let premium: Bool?
    /// Kept of answered by weekday, Monday first (Premium's charts).
    struct WeekBar: Decodable { let label: String; let kept: Int; let answered: Int }
    let week: [WeekBar]?
    /// "ask" | "done" | "off" — wellness check-ins, by their own consent.
    let checkin: String?
    struct Suggestion: Decodable { let text: String; let why: String }
    let suggestion: Suggestion?
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
    // Guided + noticed
    var guideId: String? = nil
    var guideName: String? = nil
    var law: String? = nil
    /// false only when the app said so — Guided and Noticed then show the unlock card.
    var premium: Bool? = nil
    /// (label, kept, answered) × 7, or empty.
    var week: [(String, Int, Int)] = []
    // Buttons
    var checkin = "off"
    var suggestion: String? = nil
    var suggestionWhy: String? = nil
    /// The app gave this widget its key: buttons act here; otherwise they open Voxu.
    var canAct = false
    // Fallback
    var quote = "Small steps, repeated, become a life."
    var author = "Voxu"
    /// Why there's nothing to show, in small type — never a silent quote.
    var reason: String? = nil

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

private enum Loaded {
    case missing
    case unreadable
    case ok(Snapshot)
}

private func loadSnapshot() -> Loaded {
    guard let store = UserDefaults(suiteName: APP_GROUP),
          let json = store.string(forKey: SNAPSHOT_KEY),
          let data = json.data(using: .utf8) else { return .missing }
    guard let snap = try? JSONDecoder().decode(Snapshot.self, from: data) else { return .unreadable }
    return .ok(snap)
}

func loadToday(at now: Date = Date()) -> Today {
    var t = Today()
    let snap: Snapshot
    switch loadSnapshot() {
    case .missing:
        t.reason = "Open Voxu once to connect."
        return t
    case .unreadable:
        t.reason = "Couldn’t read today from Voxu. Open it to refresh."
        return t
    case .ok(let s):
        snap = s
    }
    guard let written = localDate(snap.date) else {
        t.reason = "Couldn’t read today from Voxu. Open it to refresh."
        return t
    }

    let cal = Calendar.current
    let daysSince = max(0, cal.dateComponents([.day], from: cal.startOfDay(for: written), to: cal.startOfDay(for: now)).day ?? 0)

    if let era = snap.era {
        t.eraTitle = era.title
        t.length = era.length
        t.day = era.day + daysSince
    }
    t.streak = daysSince <= 1 ? (snap.streak ?? 0) : 0
    t.accent = Color(hex: snap.accent)
    t.law = snap.law
    t.premium = snap.premium
    if let w = snap.week, w.count == 7 { t.week = w.map { ($0.label, $0.kept, $0.answered) } }
    // Today's words, guide and list only on the day they were written.
    guard daysSince == 0 else { return t }

    t.promise = snap.promise?.text
    t.kept = snap.promise?.kept
    t.mission = snap.mission?.text
    t.missionDone = snap.mission?.done ?? false
    t.guideId = snap.guide?.id
    t.guideName = snap.guide?.name
    t.tomorrowReady = snap.tomorrowReady ?? false
    t.checkin = snap.checkin ?? "off"
    t.suggestion = snap.suggestion?.text
    t.suggestionWhy = snap.suggestion?.why
    if let store = UserDefaults(suiteName: APP_GROUP) {
        t.canAct = !(store.string(forKey: TOKEN_KEY) ?? "").isEmpty
        // A button that worked shows at once, before the app writes again.
        if store.string(forKey: DONE_PROMISE_KEY) == snap.date, t.promise != nil { t.kept = true }
        if store.string(forKey: DONE_CHECKIN_KEY) == snap.date, t.checkin == "ask" { t.checkin = "done" }
        if store.string(forKey: DONE_TOMORROW_KEY) == snap.date { t.tomorrowReady = true; t.suggestion = nil }
    }

    guard let p = snap.pulse else { return t }
    let mins = minutesNow(now)
    t.done = p.done ?? 0
    t.total = p.total ?? 0

    // Move timed items along the clock. Only statuses the app set can be
    // "done"; the clock only ever moves upcoming → due → slipping.
    t.items = (p.items ?? []).map { (it: Snapshot.PulseSnap.Item) -> DayItem in
        let status0 = it.status ?? "open"
        let kind = it.kind ?? ""
        guard let time = it.time, status0 == "upcoming" || status0 == "due" else {
            return DayItem(title: it.title, time: it.time, status: status0, kind: kind)
        }
        let at = minutesOf(time)
        let status: String
        if kind == "discipline" && mins > at + SLIP_AFTER { status = "slipping" }
        else if mins >= at - DUE_BEFORE { status = kind == "step" ? "upcoming" : "due" }
        else { status = "upcoming" }
        return DayItem(title: it.title, time: time, status: status, kind: kind)
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
        t.nowEyebrow = r.eyebrow ?? "Right now"
        t.nowTitle = r.title
        t.nowQuote = r.quote
    }

    // Evening, and nothing urgent on the clock: close the day instead.
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

// MARK: - Buttons (iOS 17 interactive widgets)

/// Today in the widget's own calendar, the way the app writes `date`.
private func todayString() -> String {
    let f = DateFormatter()
    f.calendar = Calendar.current
    f.timeZone = TimeZone.current
    f.dateFormat = "yyyy-MM-dd"
    return f.string(from: Date())
}

enum WidgetAPI {
    /// POSTs one action with the widget's key. A 401 drops the key, so the
    /// buttons go back to opening the app until it hands over a new one.
    static func send(_ body: [String: String]) async -> Bool {
        guard let store = UserDefaults(suiteName: APP_GROUP),
              let token = store.string(forKey: TOKEN_KEY), !token.isEmpty,
              let url = URL(string: ACTION_URL) else { return false }
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.timeoutInterval = 15
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = try? JSONSerialization.data(withJSONObject: body)
        do {
            let (_, resp) = try await URLSession.shared.data(for: req)
            let code = (resp as? HTTPURLResponse)?.statusCode ?? 0
            if code == 401 { store.removeObject(forKey: TOKEN_KEY) }
            return (200..<300).contains(code)
        } catch {
            return false
        }
    }

    static func remember(_ key: String) {
        UserDefaults(suiteName: APP_GROUP)?.set(todayString(), forKey: key)
    }
}

@available(iOS 17.0, *)
struct MarkPromiseDoneIntent: AppIntent {
    static var title: LocalizedStringResource = "Mark today’s promise kept"
    static var isDiscoverable: Bool = false
    func perform() async throws -> some IntentResult {
        if await WidgetAPI.send(["action": "promise_done"]) { WidgetAPI.remember(DONE_PROMISE_KEY) }
        return .result()
    }
}

@available(iOS 17.0, *)
struct CheckInIntent: AppIntent {
    static var title: LocalizedStringResource = "Check in"
    static var isDiscoverable: Bool = false
    @Parameter(title: "Level") var level: String
    init() {}
    init(level: String) { self.level = level }
    func perform() async throws -> some IntentResult {
        if await WidgetAPI.send(["action": "checkin", "level": level]) { WidgetAPI.remember(DONE_CHECKIN_KEY) }
        return .result()
    }
}

@available(iOS 17.0, *)
struct KeepTomorrowIntent: AppIntent {
    static var title: LocalizedStringResource = "Keep tomorrow’s promise"
    static var isDiscoverable: Bool = false
    @Parameter(title: "Promise") var text: String
    init() {}
    init(text: String) { self.text = text }
    func perform() async throws -> some IntentResult {
        if await WidgetAPI.send(["action": "tomorrow_keep", "text": text]) { WidgetAPI.remember(DONE_TOMORROW_KEY) }
        return .result()
    }
}

/// A pill that acts in place on iOS 17 with a key, and opens the app otherwise.
struct PillLabel: View {
    let title: String
    let symbol: String?
    var filled = false
    var body: some View {
        HStack(spacing: 6) {
            if let symbol = symbol { Image(systemName: symbol).font(.system(size: 11, weight: .semibold)) }
            Text(title).font(.system(size: 12, weight: .semibold)).lineLimit(1)
        }
        .foregroundColor(filled ? .black : .white)
        .padding(.horizontal, 12).padding(.vertical, 8)
        .frame(maxWidth: .infinity)
        .background(Capsule().fill(filled ? Color.white : Color.white.opacity(0.12)))
    }
}

@ViewBuilder
func markDoneButton(_ t: Today, title: String = "Mark Done") -> some View {
    if #available(iOS 17.0, *), t.canAct {
        Button(intent: MarkPromiseDoneIntent()) { PillLabel(title: title, symbol: "checkmark") }.buttonStyle(.plain)
    } else {
        Link(destination: appLink("/era")) { PillLabel(title: title, symbol: "checkmark") }
    }
}

// MARK: - Timeline

struct VoxuEntry: TimelineEntry {
    let date: Date
    let today: Today
}

private func sampleToday() -> Today {
    var t = Today()
    t.eraTitle = "Locked In"; t.day = 13; t.length = 30; t.streak = 6
    t.nowEyebrow = "Right now"; t.nowTitle = "Keep today’s promise."
    t.promise = "Work on my business for 20 minutes."
    t.items = [
        DayItem(title: "Read 10 pages", time: nil, status: "done", kind: "discipline"),
        DayItem(title: "Gym", time: "17:30", status: "due", kind: "discipline"),
        DayItem(title: "Today’s promise", time: nil, status: "open", kind: "promise"),
        DayItem(title: "Focus · guided", time: nil, status: "open", kind: "guide"),
    ]
    t.done = 1; t.total = 4
    t.guideId = "focus"; t.guideName = "Focus"
    t.law = "Promises made before 9 AM: kept 18 of 20. After 6 PM: 6 of 15."
    return t
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

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> VoxuEntry {
        VoxuEntry(date: Date(), today: sampleToday())
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
        if case .ok(let snap) = loadSnapshot(), let items = snap.pulse?.items {
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
}

/// The quote widget: always the day's quote, fetched a few times a day.
struct QuoteProvider: TimelineProvider {
    func placeholder(in context: Context) -> VoxuEntry {
        var t = Today()
        t.quote = "Discipline creates freedom."
        return VoxuEntry(date: Date(), today: t)
    }

    func getSnapshot(in context: Context, completion: @escaping (VoxuEntry) -> Void) {
        completion(placeholder(in: context))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<VoxuEntry>) -> Void) {
        fetchQuote { quote, author in
            var t = Today()
            if let q = quote, !q.isEmpty { t.quote = q; t.author = author ?? "Voxu" }
            let now = Date()
            let next = Calendar.current.date(byAdding: .hour, value: 6, to: now) ?? now.addingTimeInterval(21600)
            completion(Timeline(entries: [VoxuEntry(date: now, today: t)], policy: .after(next)))
        }
    }
}

// MARK: - Pieces (the app's look: black, serif titles, one accent)

private let dim = Color.white.opacity(0.55)
private let faint = Color.white.opacity(0.14)

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
                Capsule().fill(faint)
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
    var line: CGFloat = 4
    var body: some View {
        ZStack {
            Circle().stroke(faint, lineWidth: line)
            Circle()
                .trim(from: 0, to: max(0.02, progress))
                .stroke(fill, style: StrokeStyle(lineWidth: line, lineCap: .round))
                .rotationEffect(.degrees(-90))
        }
        .frame(width: size, height: size)
    }
}

/// A row in today's list. Done is a filled tick; due is an OUTLINED circle
/// with a "Due" label — a filled dot used to read as done.
struct ItemRow: View {
    let item: DayItem
    var accent: Color = .white
    private var urgent: Bool { item.status == "due" || item.status == "slipping" }
    private var symbol: String {
        if item.ticked { return "checkmark.circle.fill" }
        if item.status == "slipping" { return "exclamationmark.circle" }
        return "circle"
    }
    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: symbol)
                .font(.system(size: 13))
                .foregroundColor(item.ticked ? Color.white : (urgent ? accent : dim))
            Text(item.title)
                .font(.system(size: 12, weight: item.ticked ? .regular : .medium))
                .foregroundColor(item.ticked ? Color.white.opacity(0.55) : Color.white)
                .strikethrough(item.ticked, color: Color.white.opacity(0.4))
                .lineLimit(1)
            Spacer(minLength: 4)
            if urgent {
                Text(item.status == "slipping" ? "Slipping" : "Due")
                    .font(.system(size: 9, weight: .semibold))
                    .foregroundColor(.black)
                    .padding(.horizontal, 6).padding(.vertical, 2)
                    .background(Capsule().fill(accent))
            } else if let time = item.time {
                Text(clockLabel(time)).font(.system(size: 10)).foregroundColor(dim)
            }
        }
    }
}

/// A photo from the widget's asset catalog, darkened toward the text.
struct Photo: View {
    let name: String
    var fade: Double = 0.85
    var body: some View {
        ZStack {
            Color.black
            Image(name).resizable().scaledToFill()
            LinearGradient(
                colors: [Color.black.opacity(fade), Color.black.opacity(fade * 0.55), Color.black.opacity(fade)],
                startPoint: .leading, endPoint: .trailing
            )
        }
    }
}

struct PlayButton: View {
    var size: CGFloat = 40
    var accent: Color = .white
    var body: some View {
        ZStack {
            Circle().fill(Color.black.opacity(0.35))
            Circle().stroke(accent.opacity(0.8), lineWidth: 1.5)
            Image(systemName: "play.fill")
                .font(.system(size: size * 0.36, weight: .semibold))
                .foregroundColor(.white)
                .offset(x: size * 0.04)
        }
        .frame(width: size, height: size)
    }
}

/// Background for every widget: containerBackground on iOS 17, padding and a
/// plain background before it.
extension View {
    @ViewBuilder
    func voxuBackground<B: View>(@ViewBuilder _ background: () -> B) -> some View {
        if #available(iOS 17.0, *) {
            self.containerBackground(for: .widget) { background() }
        } else {
            self.padding(14).background(background())
        }
    }
}

/// When there's nothing to show yet: the quote, and why, in small type.
struct QuoteBody: View {
    let t: Today
    var small = true
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Eyebrow(text: "Voxu")
            Spacer(minLength: 2)
            Text("“\(t.quote)”")
                .font(.system(size: small ? 15 : 18, weight: .medium, design: .serif))
                .foregroundColor(.white)
                .lineLimit(small ? 5 : 4)
                .minimumScaleFactor(0.8)
            Text("— \(t.author)").font(.system(size: 10)).foregroundColor(dim).lineLimit(1)
            if let r = t.reason {
                Text(r).font(.system(size: 9)).foregroundColor(Color.white.opacity(0.4)).lineLimit(2)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }
}

/// Shown in Guided and Noticed to a free account. Opens the upgrade screen.
struct UnlockCard: View {
    let title: String
    let line: String
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Eyebrow(text: "Voxu Premium")
            Spacer(minLength: 0)
            Image(systemName: "lock.fill").font(.system(size: 14)).foregroundColor(dim)
            Text(title).font(.system(size: 16, weight: .semibold, design: .serif)).foregroundColor(.white).lineLimit(2)
            Text(line).font(.system(size: 11)).foregroundColor(Color.white.opacity(0.75)).lineLimit(2)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .widgetURL(appLink("/?upgrade=1"))
    }
}

// MARK: - Voxu (the original widget): Progress · Today's Promise · Overview

struct TodayWidgetView: View {
    @Environment(\.widgetFamily) var family
    let entry: VoxuEntry
    private var t: Today { entry.today }

    private var eraLine: String {
        guard let title = t.eraTitle else { return "Voxu" }
        return t.eraFinished ? "\(title) · complete" : "\(title) · Day \(t.day)"
    }

    private var leftLine: String {
        if !t.hasEra && !t.hasPulse { return "Start an era" }
        if t.total > 0 { return t.left == 0 ? "All done today" : "\(t.left) left today" }
        return t.promise == nil ? "Make today’s promise" : "Check in tonight"
    }

    /// Small — Progress: the day of the era, a ring, what's left.
    var small: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 2) {
                    Eyebrow(text: "Voxu")
                    Text(t.hasEra ? "Day \(min(t.day, t.length))" : "Voxu")
                        .font(.system(size: 26, weight: .semibold, design: .serif))
                        .foregroundColor(.white)
                        .lineLimit(1)
                        .minimumScaleFactor(0.7)
                    Text(t.eraTitle ?? "Your era")
                        .font(.system(size: 11)).foregroundColor(dim).lineLimit(1)
                }
                Spacer(minLength: 0)
                Ring(progress: t.progress, size: 30, fill: t.accent)
            }
            Spacer(minLength: 0)
            HStack(spacing: 4) {
                Text(leftLine).font(.system(size: 11, weight: .semibold)).foregroundColor(.white).lineLimit(1)
                Spacer(minLength: 0)
                Image(systemName: "chevron.right").font(.system(size: 10, weight: .semibold)).foregroundColor(dim)
            }
            .padding(.horizontal, 10).padding(.vertical, 8)
            .background(Capsule().fill(Color.white.opacity(0.09)))
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .widgetURL(appLink("/"))
    }

    private var promiseSymbol: String {
        if t.kept == true { return "checkmark.circle.fill" }
        if t.kept == false { return "xmark.circle" }
        return "circle"
    }

    private var promiseStatus: String {
        guard t.promise != nil else { return "No promise yet today" }
        if t.kept == true { return "Kept today" }
        if t.kept == false { return "Not kept today" }
        return t.closing ? "Did you keep it? Check in." : "Check in tonight"
    }

    /// Medium — Today's Promise.
    var medium: some View {
        HStack(spacing: 0) {
            VStack(alignment: .leading, spacing: 6) {
                Eyebrow(text: eraLine)
                Text("Today’s Promise")
                    .font(.system(size: 18, weight: .semibold, design: .serif))
                    .foregroundColor(.white)
                HStack(alignment: .top, spacing: 8) {
                    Image(systemName: promiseSymbol)
                        .font(.system(size: 18))
                        .foregroundColor(t.kept == true ? t.accent : dim)
                    Text(t.promise ?? "Make one small promise for today.")
                        .font(.system(size: 13, weight: .medium))
                        .foregroundColor(.white)
                        .lineLimit(3)
                        .minimumScaleFactor(0.85)
                }
                Spacer(minLength: 0)
                if t.promise != nil && t.kept == nil {
                    markDoneButton(t).frame(maxWidth: 200)
                } else {
                    Text(promiseStatus).font(.system(size: 11)).foregroundColor(dim).lineLimit(1)
                }
            }
            Spacer(minLength: 0)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .widgetURL(appLink("/era"))
    }

    /// Large — the whole day: the era, right now, today's session, the count
    /// and the list, filling the space.
    var large: some View {
        VStack(alignment: .leading, spacing: 10) {
            VStack(alignment: .leading, spacing: 4) {
                Eyebrow(text: eraLine)
                Text(t.nowTitle ?? (t.promise ?? "One promise a day."))
                    .font(.system(size: 22, weight: .semibold, design: .serif))
                    .foregroundColor(.white)
                    .lineLimit(2)
                    .minimumScaleFactor(0.85)
                if t.closing {
                    Text(t.tomorrowReady ? "Tomorrow’s promise is set. You’re done for tonight." : "Write tomorrow’s promise, then you’re done.")
                        .font(.system(size: 12)).foregroundColor(Color.white.opacity(0.75)).lineLimit(2)
                } else if let q = t.nowQuote {
                    Text("“\(q)”").font(.system(size: 12, design: .serif)).italic().foregroundColor(Color.white.opacity(0.75)).lineLimit(2)
                }
            }

            if let id = t.guideId {
                Link(destination: appLink("/?play=guide:\(id)")) {
                    HStack(spacing: 10) {
                        Image(systemName: "headphones").font(.system(size: 14)).foregroundColor(dim)
                        VStack(alignment: .leading, spacing: 1) {
                            Text("Today’s guided session").font(.system(size: 10)).foregroundColor(dim)
                            Text(t.guideName ?? "Guided").font(.system(size: 13, weight: .semibold)).foregroundColor(.white).lineLimit(1)
                        }
                        Spacer(minLength: 0)
                        PlayButton(size: 32, accent: t.accent)
                    }
                    .padding(10)
                    .background(RoundedRectangle(cornerRadius: 14).fill(Color.white.opacity(0.08)))
                }
            }

            HStack(spacing: 14) {
                if t.total > 0 {
                    HStack(spacing: 6) {
                        Ring(progress: Double(t.done) / Double(max(1, t.total)), size: 22, fill: t.accent, line: 3)
                        VStack(alignment: .leading, spacing: 0) {
                            Text("\(t.done) / \(t.total)").font(.system(size: 12, weight: .semibold)).foregroundColor(.white)
                            Text("Completed").font(.system(size: 9)).foregroundColor(dim)
                        }
                    }
                }
                if t.streak > 1 {
                    HStack(spacing: 5) {
                        Image(systemName: "flame.fill").font(.system(size: 13)).foregroundColor(t.accent)
                        VStack(alignment: .leading, spacing: 0) {
                            Text("\(t.streak)").font(.system(size: 12, weight: .semibold)).foregroundColor(.white)
                            Text("Day streak").font(.system(size: 9)).foregroundColor(dim)
                        }
                    }
                }
                if t.hasEra && !t.eraFinished {
                    VStack(alignment: .leading, spacing: 0) {
                        Text("Day \(t.day) of \(t.length)").font(.system(size: 12, weight: .semibold)).foregroundColor(.white)
                        Bar(progress: t.progress, fill: t.accent).frame(width: 70)
                    }
                }
                Spacer(minLength: 0)
            }

            if !t.items.isEmpty {
                VStack(alignment: .leading, spacing: 7) {
                    Eyebrow(text: "Today")
                    ForEach(Array(t.items.prefix(4).enumerated()), id: \.offset) { _, it in
                        ItemRow(item: it, accent: t.accent)
                    }
                }
            }
            Spacer(minLength: 0)
            HStack(spacing: 8) {
                if t.promise != nil && t.kept == nil {
                    markDoneButton(t, title: "Mark Today Done")
                }
                Link(destination: appLink("/")) {
                    HStack {
                        Text("Open Voxu").font(.system(size: 12, weight: .semibold)).foregroundColor(.white)
                        Spacer()
                        Image(systemName: "chevron.right").font(.system(size: 11, weight: .semibold)).foregroundColor(dim)
                    }
                    .padding(.horizontal, 12).padding(.vertical, 8)
                    .background(Capsule().fill(Color.white.opacity(0.09)))
                }
            }
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
        let empty = !t.hasEra && !t.hasPulse
        switch family {
        case .accessoryRectangular: rectangular
        case .accessoryCircular: circular
        case .systemLarge: empty ? AnyView(QuoteBody(t: t, small: false)) : AnyView(large)
        case .systemMedium: empty ? AnyView(QuoteBody(t: t, small: false)) : AnyView(medium)
        default: empty ? AnyView(QuoteBody(t: t)) : AnyView(small)
        }
    }
}

struct VoxuWidget: Widget {
    let kind = "VoxuWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            TodayWidgetBackground(entry: entry)
        }
        .configurationDisplayName("Voxu · Today")
        .description("Your era day, today’s promise, and how today is going.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge, .accessoryRectangular, .accessoryCircular])
    }
}

/// The original widget's backgrounds: a photo behind the promise and the
/// overview, the era's light behind the rest.
struct TodayWidgetBackground: View {
    @Environment(\.widgetFamily) var family
    let entry: VoxuEntry
    var body: some View {
        TodayWidgetView(entry: entry)
            .voxuBackground {
                switch family {
                case .systemMedium: Photo(name: "WidgetPromise", fade: 0.8)
                case .systemLarge: Photo(name: "WidgetOverview", fade: 0.82)
                default:
                    LinearGradient(colors: [entry.today.accent.opacity(0.18), Color.black], startPoint: .top, endPoint: .center)
                }
            }
    }
}

// MARK: - Guided: today's session, ▶ opens and plays it

struct GuidedWidgetView: View {
    @Environment(\.widgetFamily) var family
    let entry: VoxuEntry
    private var t: Today { entry.today }
    private var target: URL { t.guideId.map { appLink("/?play=guide:\($0)") } ?? appLink("/") }
    private var name: String { t.guideName ?? "Guided session" }

    var body: some View {
        if t.premium == false {
            UnlockCard(title: "Guided audio", line: "Unlock to play today’s session from here.")
        } else {
            content
        }
    }

    private var content: some View {
        Group {
            if family == .systemMedium {
                HStack(spacing: 12) {
                    VStack(alignment: .leading, spacing: 4) {
                        Eyebrow(text: "Voxu · Guided audio")
                        Text(name)
                            .font(.system(size: 22, weight: .semibold, design: .serif))
                            .foregroundColor(.white).lineLimit(1).minimumScaleFactor(0.8)
                        Text(t.guideId == nil ? "Your guided sessions are in Voxu." : "Today’s session. Tap to play.")
                            .font(.system(size: 12)).foregroundColor(Color.white.opacity(0.75)).lineLimit(2)
                        Spacer(minLength: 0)
                        Label("Guided audio", systemImage: "headphones").font(.system(size: 10)).foregroundColor(dim)
                    }
                    Spacer(minLength: 0)
                    PlayButton(size: 50, accent: t.accent)
                }
            } else {
                VStack(alignment: .leading, spacing: 4) {
                    Eyebrow(text: "Voxu")
                    Spacer(minLength: 0)
                    PlayButton(size: 42, accent: t.accent)
                    Spacer(minLength: 0)
                    Text(name).font(.system(size: 15, weight: .semibold, design: .serif)).foregroundColor(.white).lineLimit(1)
                    Text(t.guideId == nil ? "Open Voxu" : "Tap to play").font(.system(size: 10)).foregroundColor(dim)
                }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .widgetURL(target)
    }
}

struct VoxuGuidedWidget: Widget {
    let kind = "VoxuGuidedWidget"
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            GuidedWidgetView(entry: entry)
                .voxuBackground { Photo(name: "WidgetGuided", fade: 0.7) }
        }
        .configurationDisplayName("Voxu · Guided")
        .description("Today’s guided session, one tap to play.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

// MARK: - Voxu noticed: their newest law — counts from their own record

struct NoticedWidgetView: View {
    let entry: VoxuEntry
    private var t: Today { entry.today }
    var body: some View {
        if t.premium == false {
            UnlockCard(title: "Voxu noticed", line: "Unlock to see what your record shows, here.")
        } else {
            content
        }
    }

    private var content: some View {
        HStack(alignment: .top, spacing: 12) {
            words
            if t.week.count == 7 && t.week.contains(where: { $0.2 > 0 }) {
                WeekBars(week: t.week).frame(width: 118)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .widgetURL(appLink("/patterns"))
    }

    private var words: some View {
        VStack(alignment: .leading, spacing: 6) {
            Eyebrow(text: "Voxu noticed")
            if let law = t.law {
                Text(law)
                    .font(.system(size: 16, weight: .medium, design: .serif))
                    .foregroundColor(.white)
                    .lineLimit(4)
                    .minimumScaleFactor(0.8)
            } else {
                Text("No law yet.")
                    .font(.system(size: 18, weight: .semibold, design: .serif)).foregroundColor(.white)
                Text("Voxu waits until your own record shows something clearly. Keep promising.")
                    .font(.system(size: 12)).foregroundColor(Color.white.opacity(0.75)).lineLimit(3)
            }
            Spacer(minLength: 0)
            HStack(spacing: 4) {
                Text("Your laws").font(.system(size: 11, weight: .semibold)).foregroundColor(.white)
                Image(systemName: "chevron.right").font(.system(size: 10, weight: .semibold)).foregroundColor(dim)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }
}

/// Seven bars: the share of answered promises kept on each weekday. A day with
/// nothing answered is a faint stub, never a zero that reads like a failure.
struct WeekBars: View {
    let week: [(String, Int, Int)]
    var body: some View {
        VStack(spacing: 4) {
            HStack(alignment: .bottom, spacing: 6) {
                ForEach(0..<week.count, id: \.self) { i in
                    let b = week[i]
                    let share = b.2 > 0 ? CGFloat(b.1) / CGFloat(b.2) : 0
                    Capsule()
                        .fill(b.2 > 0 ? Color.white.opacity(0.35 + 0.55 * Double(share)) : Color.white.opacity(0.12))
                        .frame(width: 10, height: b.2 > 0 ? max(6, 58 * share) : 4)
                        .frame(height: 58, alignment: .bottom)
                }
            }
            HStack(spacing: 6) {
                ForEach(0..<week.count, id: \.self) { i in
                    Text(week[i].0).font(.system(size: 9)).foregroundColor(dim).frame(width: 10)
                }
            }
        }
        .padding(.top, 14)
    }
}

struct VoxuNoticedWidget: Widget {
    let kind = "VoxuNoticedWidget"
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            NoticedWidgetView(entry: entry)
                .voxuBackground { Photo(name: "WidgetNoticed", fade: 0.82) }
        }
        .configurationDisplayName("Voxu · Noticed")
        .description("What your own record shows — with the counts.")
        .supportedFamilies([.systemMedium])
    }
}

// MARK: - Check-in

/// Small — "How are you right now?" Low / Okay / Good, answered in place.
/// Only when wellness check-ins are on (their consent, in the app); off, it
/// says where to turn them on and never records anything.
struct CheckInWidgetView: View {
    let entry: VoxuEntry
    private var t: Today { entry.today }
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Eyebrow(text: "Voxu")
            if t.checkin == "done" {
                Text("Checked in today.")
                    .font(.system(size: 16, weight: .semibold, design: .serif)).foregroundColor(.white)
                Spacer(minLength: 0)
                Text("See how your days compare in Voxu.").font(.system(size: 10)).foregroundColor(dim).lineLimit(2)
            } else {
                Text("How are you right now?")
                    .font(.system(size: 16, weight: .semibold, design: .serif)).foregroundColor(.white)
                    .lineLimit(2).minimumScaleFactor(0.85)
                Spacer(minLength: 0)
                if t.checkin == "ask" {
                    HStack(spacing: 0) {
                        mood("low", "🙁", "Low", .red)
                        Spacer(minLength: 0)
                        mood("okay", "😐", "Okay", .gray)
                        Spacer(minLength: 0)
                        mood("good", "🙂", "Good", .green)
                    }
                } else {
                    Text("Turn on check-ins in Voxu to answer here.").font(.system(size: 10)).foregroundColor(dim).lineLimit(3)
                }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .widgetURL(appLink("/progress"))
    }

    @ViewBuilder
    private func mood(_ level: String, _ face: String, _ label: String, _ tint: Color) -> some View {
        let content = VStack(spacing: 3) {
            Text(face).font(.system(size: 18))
                .frame(width: 34, height: 34)
                .background(Circle().fill(tint.opacity(0.28)))
            Text(label).font(.system(size: 9)).foregroundColor(dim)
        }
        if #available(iOS 17.0, *), t.canAct {
            Button(intent: CheckInIntent(level: level)) { content }.buttonStyle(.plain)
        } else {
            content
        }
    }
}

struct VoxuCheckInWidget: Widget {
    let kind = "VoxuCheckInWidget"
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            CheckInWidgetView(entry: entry)
                .voxuBackground {
                    LinearGradient(colors: [Color.white.opacity(0.08), Color.black], startPoint: .top, endPoint: .center)
                }
        }
        .configurationDisplayName("Voxu · Check-in")
        .description("How are you right now? One tap.")
        .supportedFamilies([.systemSmall])
    }
}

// MARK: - Tomorrow

/// Medium — tomorrow's promise, offered in the evening from today's own:
/// the same again if kept, a smaller one if not, and it says which. Keep
/// writes it in place; Change opens the era to write your own.
struct TomorrowWidgetView: View {
    let entry: VoxuEntry
    private var t: Today { entry.today }
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Eyebrow(text: "Voxu")
            if t.tomorrowReady {
                Text("Tomorrow’s promise is set.")
                    .font(.system(size: 18, weight: .semibold, design: .serif)).foregroundColor(.white)
                Spacer(minLength: 0)
                Text("You’re done for tonight.").font(.system(size: 11)).foregroundColor(dim)
            } else if let s = t.suggestion, t.closing {
                Text("Tomorrow’s Suggestion")
                    .font(.system(size: 17, weight: .semibold, design: .serif)).foregroundColor(.white)
                HStack(alignment: .top, spacing: 8) {
                    Image(systemName: "clock").font(.system(size: 13)).foregroundColor(dim)
                    Text(s).font(.system(size: 13, weight: .medium)).foregroundColor(.white).lineLimit(2).minimumScaleFactor(0.85)
                }
                if let why = t.suggestionWhy {
                    Text(why).font(.system(size: 10)).foregroundColor(dim).lineLimit(1)
                }
                Spacer(minLength: 0)
                HStack(spacing: 8) {
                    if #available(iOS 17.0, *), t.canAct {
                        Button(intent: KeepTomorrowIntent(text: s)) { PillLabel(title: "Keep", symbol: nil, filled: true) }.buttonStyle(.plain)
                    } else {
                        Link(destination: appLink("/era")) { PillLabel(title: "Keep", symbol: nil, filled: true) }
                    }
                    Link(destination: appLink("/era")) { PillLabel(title: "Change", symbol: nil) }
                }
            } else {
                Text("Tomorrow’s promise")
                    .font(.system(size: 17, weight: .semibold, design: .serif)).foregroundColor(.white)
                Spacer(minLength: 0)
                Text(t.promise == nil ? "Make today’s promise first." : "Tonight, plan tomorrow’s here.")
                    .font(.system(size: 11)).foregroundColor(dim).lineLimit(2)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .widgetURL(appLink("/era"))
    }
}

struct VoxuTomorrowWidget: Widget {
    let kind = "VoxuTomorrowWidget"
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            TomorrowWidgetView(entry: entry)
                .voxuBackground { Photo(name: "WidgetPromise", fade: 0.85) }
        }
        .configurationDisplayName("Voxu · Tomorrow")
        .description("Plan tomorrow’s promise tonight, in one tap.")
        .supportedFamilies([.systemMedium])
    }
}

// MARK: - Quote

struct VoxuQuoteWidget: Widget {
    let kind = "VoxuQuoteWidget"
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: QuoteProvider()) { entry in
            QuoteBody(t: entry.today)
                .widgetURL(appLink("/"))
                .voxuBackground {
                    LinearGradient(colors: [Color.white.opacity(0.08), Color.black], startPoint: .top, endPoint: .center)
                }
        }
        .configurationDisplayName("Voxu · Quote")
        .description("A line to carry today.")
        .supportedFamilies([.systemSmall])
    }
}

// MARK: - Bundle

@main
struct VoxuWidgets: WidgetBundle {
    var body: some Widget {
        VoxuWidget()
        VoxuGuidedWidget()
        VoxuNoticedWidget()
        VoxuCheckInWidget()
        VoxuTomorrowWidget()
        VoxuQuoteWidget()
    }
}
