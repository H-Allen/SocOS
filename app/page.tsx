import Link from "next/link";
import { ArrowRight, BookOpenCheck, CheckSquare, Clock3, FolderOpen, LayoutDashboard, Megaphone, Users } from "lucide-react";

const painPoints = [
  {
    icon: "🗂️",
    title: "Leadership changes every year. Everything gets lost.",
    description: "New committees inherit scattered docs, half-explained traditions, and nobody knows what still matters."
  },
  {
    icon: "📁",
    title: "Nobody knows where the files are.",
    description: "Drive folders multiply, naming breaks down, and the one person who knows the structure just graduated."
  },
  {
    icon: "📝",
    title: "Handover documents? What handover documents?",
    description: "Institutional knowledge lives in personal laptops, inboxes, and memory until it disappears."
  }
];

const features = [
  { icon: BookOpenCheck, title: "Handover Vault", description: "Preserve institutional knowledge so new committee members start with context, not chaos." },
  { icon: CheckSquare, title: "Task management", description: "Assign committee work clearly, track deadlines, and keep ownership visible." },
  { icon: Clock3, title: "Meeting notes", description: "Run meetings with agendas, live notes, and action items that don’t disappear afterwards." },
  { icon: FolderOpen, title: "Resource hub", description: "Keep files, links, and operational notes organized in one searchable place." },
  { icon: Users, title: "Member directory", description: "See your people, roles, permissions, and who owns what across the organization." },
  { icon: LayoutDashboard, title: "Activity feed", description: "Stay on top of what changed recently without asking around or checking five tools." }
];

const testimonials = [
  {
    quote: "We used to lose everything when committee changed. SocietyOS fixed that.",
    author: "Finance Society President, UCL"
  },
  {
    quote: "Finally a tool that understands how student organisations actually work.",
    author: "Engineering Team Lead, Imperial"
  },
  {
    quote: "Onboarding our new secretary took 30 minutes instead of 3 weeks.",
    author: "Rugby Club Secretary, Bristol"
  }
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#fafafa] text-[#111118]">
      <section className="bg-[#0f0f11] text-white">
        <div className="mx-auto max-w-7xl px-6">
          <header className="flex items-center justify-between py-6">
            <Link href="/" className="text-xl font-semibold tracking-tight">
              SocietyOS
            </Link>
            <nav className="hidden items-center gap-8 text-sm text-white/75 md:flex">
              <a href="#features" className="transition-colors hover:text-white">
                Features
              </a>
              <a href="#pricing" className="transition-colors hover:text-white">
                Pricing
              </a>
              <a href="#about" className="transition-colors hover:text-white">
                About
              </a>
            </nav>
            <div className="flex items-center gap-3">
              <Link href="/login" className="text-sm text-white/75 transition-colors hover:text-white">
                Sign in
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-full bg-[#6366f1] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#4f46e5]"
              >
                Get started free
              </Link>
            </div>
          </header>

          <div className="grid gap-14 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-24">
            <div className="max-w-2xl">
              <p className="inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/75">
                Built for student societies, clubs, and committee teams
              </p>
              <h1 className="mt-8 text-5xl font-semibold tracking-tight text-white sm:text-6xl">
                Run your society properly.
              </h1>
              <p className="mt-6 text-xl leading-8 text-white/72">
                Stop losing knowledge every year. Manage handovers, tasks, meetings, and members — all in one place.
              </p>
              <div className="mt-10 flex flex-wrap gap-4">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-full bg-[#6366f1] px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-[#4f46e5]"
                >
                  Start for free
                </Link>
                <a
                  href="#pricing"
                  className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-white/10"
                >
                  See a demo
                </a>
              </div>
              <div className="mt-10 flex items-center gap-8 text-sm text-white/60">
                <span>Built for real committee turnover</span>
                <span>Fast onboarding</span>
                <span>Shared institutional memory</span>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -left-6 top-8 hidden h-40 w-40 rounded-full bg-[#6366f1]/25 blur-3xl lg:block" />
              <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-5 shadow-[0_30px_100px_rgba(0,0,0,0.35)] backdrop-blur-xl">
                <div className="rounded-[24px] border border-white/10 bg-[#17171b] p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-white/55">SocietyOS workspace</p>
                      <h2 className="mt-2 text-2xl font-semibold text-white">Committee command centre</h2>
                    </div>
                    <div className="rounded-2xl bg-white/5 px-4 py-3 text-right">
                      <p className="text-xs uppercase tracking-[0.16em] text-white/40">This week</p>
                      <p className="mt-1 text-sm font-medium text-white">3 handovers updated</p>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
                      <p className="text-xs uppercase tracking-[0.16em] text-white/45">Handover Vault</p>
                      <div className="mt-4 space-y-3">
                        <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-3">
                          <p className="text-sm font-medium text-white">Secretary</p>
                          <p className="mt-1 text-xs text-white/55">82% complete · Updated yesterday</p>
                        </div>
                        <div className="rounded-xl border border-amber-300/15 bg-amber-300/8 px-3 py-3">
                          <p className="text-sm font-medium text-white">Sponsorship Lead</p>
                          <p className="mt-1 text-xs text-white/55">Needs attention</p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
                      <p className="text-xs uppercase tracking-[0.16em] text-white/45">Upcoming priorities</p>
                      <div className="mt-4 space-y-3">
                        {["Submit sponsorship proposal", "Book annual showcase venue", "Approve term budget"].map((item) => (
                          <div key={item} className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/4 px-3 py-3">
                            <div className="h-2.5 w-2.5 rounded-full bg-[#6366f1]" />
                            <p className="text-sm text-white">{item}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl border border-white/8 bg-white/4 p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs uppercase tracking-[0.16em] text-white/45">Recent activity</p>
                      <Megaphone className="h-4 w-4 text-white/45" />
                    </div>
                    <div className="mt-4 grid gap-3">
                      {[
                        "Alice posted Welcome back for Term 2!",
                        "Bob updated the Secretary handover checklist",
                        "Chloe uploaded the new sponsorship deck"
                      ].map((item) => (
                        <div key={item} className="rounded-xl border border-white/8 bg-[#111118] px-3 py-3 text-sm text-white/72">
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-24" id="about">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#6366f1]">Sound familiar?</p>
          <h2 className="mt-4 text-4xl font-semibold tracking-tight">Committee chaos is predictable.</h2>
        </div>
        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {painPoints.map((item) => (
            <div key={item.title} className="rounded-[24px] border border-[#e5e7eb] bg-white p-6 shadow-[0_16px_50px_rgba(15,15,17,0.05)]">
              <div className="text-3xl">{item.icon}</div>
              <h3 className="mt-5 text-xl font-semibold text-[#111118]">{item.title}</h3>
              <p className="mt-3 text-sm leading-7 text-[#5f6470]">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="features" className="border-y border-[#ececf2] bg-white">
        <div className="mx-auto max-w-7xl px-6 py-24">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#6366f1]">Everything your society needs.</p>
            <h2 className="mt-4 text-4xl font-semibold tracking-tight text-[#111118]">One operating system for committee continuity.</h2>
          </div>
          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            {features.map((feature) => (
              <div key={feature.title} className="rounded-[24px] border border-[#ececf2] bg-[#fcfcfe] p-6 transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_50px_rgba(15,15,17,0.06)]">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eef0ff] text-[#6366f1]">
                  <feature.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-xl font-semibold text-[#111118]">{feature.title}</h3>
                <p className="mt-3 text-sm leading-7 text-[#5f6470]">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#6366f1]">Loved by real committees</p>
          <h2 className="mt-4 text-4xl font-semibold tracking-tight text-[#111118]">Built around real student organization problems.</h2>
        </div>
        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {testimonials.map((testimonial) => (
            <div key={testimonial.author} className="rounded-[24px] border border-[#ececf2] bg-white p-6 shadow-[0_16px_50px_rgba(15,15,17,0.05)]">
              <p className="text-lg leading-8 text-[#111118]">“{testimonial.quote}”</p>
              <p className="mt-5 text-sm font-medium text-[#5f6470]">{testimonial.author}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="pricing" className="border-t border-[#ececf2] bg-[#f5f6fb]">
        <div className="mx-auto max-w-7xl px-6 py-24">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#6366f1]">Simple pricing.</p>
            <h2 className="mt-4 text-4xl font-semibold tracking-tight text-[#111118]">Start with free. Upgrade when ready.</h2>
          </div>
          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            <div className="rounded-[28px] border border-[#e4e6f3] bg-white p-8 shadow-[0_18px_50px_rgba(15,15,17,0.05)]">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#6366f1]">Free</p>
              <h3 className="mt-4 text-4xl font-semibold text-[#111118]">£0</h3>
              <p className="mt-3 text-sm text-[#5f6470]">A strong starting point for small or newly organized committees.</p>
              <ul className="mt-8 space-y-3 text-sm text-[#111118]">
                <li>Unlimited members</li>
                <li>Core features included</li>
                <li>3 active handovers</li>
              </ul>
            </div>
            <div className="rounded-[28px] border border-[#cfd4ff] bg-[#111118] p-8 text-white shadow-[0_22px_60px_rgba(15,15,17,0.18)]">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#aab0ff]">Pro</p>
              <h3 className="mt-4 text-4xl font-semibold">£4/member/month</h3>
              <p className="mt-3 text-sm text-white/68">For societies that want continuity, storage, and integrations without duct tape.</p>
              <ul className="mt-8 space-y-3 text-sm">
                <li>Unlimited handovers</li>
                <li>File storage</li>
                <li>Integrations</li>
                <li>Priority support</li>
              </ul>
            </div>
          </div>
          <div className="mt-10">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-full bg-[#6366f1] px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-[#4f46e5]"
            >
              Get started free
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#ececf2] bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-10 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-lg font-semibold text-[#111118]">SocietyOS</p>
            <p className="mt-1 text-sm text-[#5f6470]">Operational clarity for student societies that want to last.</p>
          </div>
          <div className="flex flex-wrap items-center gap-6 text-sm text-[#5f6470]">
            <a href="#" className="transition-colors hover:text-[#111118]">
              Privacy
            </a>
            <a href="#" className="transition-colors hover:text-[#111118]">
              Terms
            </a>
            <a href="#" className="transition-colors hover:text-[#111118]">
              Contact
            </a>
          </div>
          <p className="text-sm text-[#5f6470]">© 2025 SocietyOS</p>
        </div>
      </footer>
    </main>
  );
}
