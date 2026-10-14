import { listPrices, usd } from '@/lib/pricing'

// What follows the story on the landing page: the counted facts, the prices
// and the way in (the story itself shows the features). No ratings and no
// testimonials until real ones exist; prices come from lib/pricing.

const APP_STORE_URL = 'https://apps.apple.com/app/id6759702163'
const GOLD = '#C9AE82'
const serif = 'font-[family-name:var(--font-cormorant)]'

const STATS: [string, string][] = [
  ['8', 'Eras to choose from'],
  ['30', 'Written missions per era'],
  ['8', 'Coach voices'],
  ['70+', 'Audio sessions'],
]

export function AppStoreButton({ big = false }: { big?: boolean }) {
  return (
    <a
      href={APP_STORE_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-3 rounded-2xl bg-white font-semibold text-black transition hover:bg-white/90 ${big ? 'px-7 py-4 text-base' : 'px-5 py-3 text-sm'}`}
    >
      <svg viewBox="0 0 24 24" className={big ? 'h-6 w-6' : 'h-5 w-5'} fill="currentColor" aria-hidden>
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
      </svg>
      Download on the App Store
    </a>
  )
}

export function IntroSections() {
  const price = listPrices()
  return (
    <div className="relative bg-[#060609] text-white">
      {/* Counted facts. */}
      <section className="border-y border-white/[0.08]">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-y-8 px-5 py-12 text-center sm:grid-cols-4">
          {STATS.map(([n, label]) => (
            <div key={label}>
              <div className={`${serif} text-5xl font-medium`}>{n}</div>
              <div className="mt-1 text-sm text-white/70">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Free and Premium. */}
      <section className="px-5 py-24">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs uppercase tracking-[0.3em]" style={{ color: GOLD }}>
            Start free
          </p>
          <h2 className={`${serif} mt-3 text-4xl font-medium sm:text-5xl`}>The habit is free. Forever.</h2>
          <p className="mx-auto mt-5 max-w-xl leading-relaxed text-white/75">
            The era, your daily promise, the missions and the check-in are free: a paywall in front of a habit means the habit never forms. Premium is
            the depth: your coach remembering day one every time it matters, spoken replies, and the letter it writes you at day 30.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
              <div className="text-sm text-white/70">Free</div>
              <div className={`${serif} mt-1 text-4xl font-medium`}>$0</div>
              <div className="mt-1 text-xs text-white/60">The whole era loop</div>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
              <div className="text-sm text-white/70">Monthly</div>
              <div className={`${serif} mt-1 text-4xl font-medium`}>
                {usd(price.monthly)}
                <span className="text-base text-white/60">/mo</span>
              </div>
              <div className="mt-1 text-xs text-white/60">Cancel anytime</div>
            </div>
            <div className="relative rounded-3xl border p-6" style={{ borderColor: `${GOLD}80`, background: 'rgba(201,174,130,0.06)' }}>
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-0.5 text-[10px] font-bold tracking-wider text-black" style={{ background: GOLD }}>
                BEST VALUE
              </div>
              <div className="text-sm text-white/70">Yearly</div>
              <div className={`${serif} mt-1 text-4xl font-medium`}>
                {usd(price.yearly)}
                <span className="text-base text-white/60">/yr</span>
              </div>
              <div className="mt-1 text-xs text-white/60">
                ${price.yearlyPerMonth}/mo, save {price.yearlySave}%
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The last word. */}
      <section className="relative px-5 pb-28 pt-12 text-center">
        <h2 className={`${serif} text-5xl font-medium sm:text-6xl`}>Who are you becoming?</h2>
        <p className="mx-auto mt-4 max-w-md text-lg text-white/75">Pick an era and make your first promise in under a minute.</p>
        <div className="mt-8 flex flex-col items-center gap-3">
          <AppStoreButton big />
          <span className="text-sm text-white/60">Free to start. No credit card required.</span>
        </div>
      </section>
    </div>
  )
}
