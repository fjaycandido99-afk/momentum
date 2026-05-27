// App-wide ambient atmosphere. A fixed, behind-everything layer of slow-drifting
// monochrome glows that give the flat-black UI a sense of depth and "living" calm
// — the feeling of stepping into your own mental space. Pure CSS (see .ambient-*
// in globals.css): no JS loop, no particles, no animated blur, so it stays cheap on
// a phone WebView and freezes to a still glow under prefers-reduced-motion.
export function AmbientBackground() {
  return (
    <div className="ambient-bg" aria-hidden="true">
      <div className="ambient-orb ambient-orb--a" />
      <div className="ambient-orb ambient-orb--b" />
      <div className="ambient-orb ambient-orb--c" />
    </div>
  )
}
