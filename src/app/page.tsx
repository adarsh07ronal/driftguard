import Link from "next/link";

export default function HomePage() {
  const installUrl = process.env.NEXT_PUBLIC_GITHUB_APP_INSTALL_URL || "/install";

  return (
    <main className="min-h-screen">
      <nav className="border-b px-6 h-14 flex items-center justify-between">
        <span className="font-mono font-medium text-sm tracking-tight">
          driftguard<span className="text-muted-foreground">.app</span>
        </span>
        <div className="flex items-center gap-3">
          
          <Link href="/dashboard" className="text-sm border px-3 py-1.5 rounded-md hover:bg-muted">Dashboard</Link>
          <a
            href={installUrl}
            className="text-sm bg-foreground text-background px-4 py-1.5 rounded-md hover:opacity-90"
            target="_blank"
          >
            Install on GitHub
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-3xl mx-auto px-6 pt-24 pb-16 text-center">
        <div className="inline-flex items-center gap-2 text-xs font-mono bg-muted px-3 py-1.5 rounded-full mb-8 text-muted-foreground">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
          GitHub App · enforces your DESIGN.md on every PR
        </div>
        <h1 className="text-5xl font-semibold tracking-tight mb-6 leading-tight">
          Stop AI agents from
          <br />
          <span className="text-muted-foreground">breaking your design system.</span>
        </h1>
        <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto leading-relaxed">
          Install once. Every pull request gets a DESIGN.md lint check — contrast ratios, token refs, typography, spacing. Catches drift before it merges.
        </p>
        <div className="flex items-center justify-center gap-3">
          <a
            href={installUrl}
            className="bg-foreground text-background px-6 py-2.5 rounded-md text-sm font-medium hover:opacity-90 transition-opacity flex items-center gap-2"
            target="_blank"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
            </svg>
            Install on GitHub — free
          </a>
          <Link href="/dashboard" className="border px-6 py-2.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:border-foreground transition-colors">
            View dashboard →
          </Link>
        </div>
        <p className="text-xs text-muted-foreground mt-4">Free for 1 repo · No credit card required</p>
      </section>

      {/* How it works */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-3 gap-4 mb-16">
          {[
            {
              step: "01",
              title: "Install the GitHub App",
              sub: "60-second setup. Select which repos to monitor.",
            },
            {
              step: "02",
              title: "Add DESIGN.md to your repo",
              sub: "Use our free editor or the AI generator. Commit to root.",
            },
            {
              step: "03",
              title: "Every PR gets checked",
              sub: "Contrast, token refs, typography, section order — automatically.",
            },
          ].map((s) => (
            <div key={s.step} className="border rounded-lg p-5">
              <p className="text-xs font-mono text-muted-foreground mb-2">{s.step}</p>
              <p className="font-medium text-sm mb-2">{s.title}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Sample PR comment */}
        <h2 className="text-sm font-medium text-muted-foreground mb-4">What engineers see on every PR</h2>
        <div className="border rounded-xl overflow-hidden">
          <div className="bg-muted px-5 py-3 flex items-center gap-3 border-b">
            <div className="w-7 h-7 rounded-full bg-foreground flex items-center justify-center">
              <span className="text-background text-xs font-medium">D</span>
            </div>
            <div>
              <span className="text-sm font-medium">driftguard</span>
              <span className="text-xs text-muted-foreground ml-2">commented just now</span>
            </div>
          </div>
          <div className="px-5 py-4 text-sm space-y-3">
            <p className="font-medium">designmd · Design system check ⚠️</p>
            <p className="text-muted-foreground text-xs">
              <strong className="text-foreground">2 warnings</strong> · checked <code className="bg-muted px-1 rounded">DESIGN.md</code> at <code className="bg-muted px-1 rounded">a3f2c1b</code>
            </p>
            <div className="border rounded-lg overflow-hidden text-xs">
              <div className="grid grid-cols-[60px_140px_1fr] bg-muted px-3 py-2 text-muted-foreground gap-4 font-medium">
                <span>Severity</span><span>Token path</span><span>Message</span>
              </div>
              {[
                { sev: "🟡 warning", path: "components.button-primary", msg: "Contrast ratio 3.1:1 — below WCAG AA (4.5:1)" },
                { sev: "🟡 warning", path: "typography", msg: "No typography tokens defined — agents will use default system fonts" },
              ].map((row, i) => (
                <div key={i} className="grid grid-cols-[60px_140px_1fr] px-3 py-2 gap-4 border-t">
                  <span>{row.sev}</span>
                  <code className="text-muted-foreground">{row.path}</code>
                  <span className="text-muted-foreground">{row.msg}</span>
                </div>
              ))}
            </div>
            <div className="border rounded-lg p-3 bg-muted/30 text-xs space-y-2">
              <p className="font-medium text-foreground">Apply Fix Suggestions</p>
              <p className="text-muted-foreground">
                Existing lint messages stay. DriftGuard also adds a copy-ready fix and a GitHub suggestion block.
              </p>
              <div className="border rounded bg-background p-2">
                <p className="text-[11px] text-muted-foreground mb-1">Suggested fix: add typography tokens</p>
                <pre className="overflow-x-auto text-[11px]"><code>{`\`\`\`suggestion\ntypography:\n  h1:\n    fontFamily: "Inter"\n    fontSize: "40px"\n    fontWeight: 700\n    lineHeight: "1.2"\n  body-md:\n    fontFamily: "Inter"\n    fontSize: "16px"\n    fontWeight: 400\n    lineHeight: "1.5"\n\`\`\``}</code></pre>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Powered by <a href="/" className="underline">driftguard.vercel.app</a> · <a href="/dashboard" className="underline">Dashboard</a>
            </p>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="max-w-3xl mx-auto px-6 pb-20">
        <h2 className="text-sm font-medium text-muted-foreground mb-4">Pricing</h2>
        <div className="grid grid-cols-3 gap-4">
          {[
            { name: "Free", price: "$0", features: ["1 repo", "PR comments", "Basic lint rules", "AI editor"], cta: "Install free", href: installUrl, highlight: false },
            { name: "Pro", price: "$15/mo", features: ["Unlimited repos", "Dashboard + history", "All lint rules", "Merge blocking"], cta: "Get Pro", href: "/auth", highlight: true },
            { name: "Team", price: "$49/mo", features: ["5 seats", "Slack notifications", "Custom lint rules", "Priority support"], cta: "Get Team", href: "/auth", highlight: false },
          ].map((tier) => (
            <div key={tier.name} className={`border rounded-xl p-5 ${tier.highlight ? "border-foreground" : ""}`}>
              <p className="font-medium mb-1">{tier.name}</p>
              <p className="text-2xl font-semibold mb-4">{tier.price}</p>
              <ul className="space-y-1.5 mb-5">
                {tier.features.map(f => (
                  <li key={f} className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <span className="text-green-600">✓</span> {f}
                  </li>
                ))}
              </ul>
              <a
                href={tier.href}
                className={`block text-center text-xs py-2 rounded-md transition-colors ${
                  tier.highlight
                    ? "bg-foreground text-background hover:opacity-90"
                    : "border hover:bg-muted"
                }`}
              >
                {tier.cta}
              </a>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t px-6 py-8 text-center">
        <p className="text-xs text-muted-foreground">
          driftguard.vercel.app — Built on the{" "}
          <a href="https://github.com/google-labs-code/design.md" className="underline" target="_blank">
            google-labs-code/design.md
          </a>{" "}
          open spec
        </p>
      </footer>
    </main>
  );
}
