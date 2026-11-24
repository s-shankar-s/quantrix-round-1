import Link from 'next/link';
import { Award, ShieldCheck, Users, Scale, ArrowRight, BarChart3, Clock, CheckCircle2, Sparkles } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      {/* Navbar */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center font-bold text-white shadow">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <span className="font-black text-sm tracking-wide text-white block">QUANTRIX</span>
              <span className="text-[10px] text-sky-400 font-semibold block">THE PRICE IS RIGHT?</span>
            </div>
          </div>

          <Link
            href="/login"
            className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-lg shadow transition"
          >
            Authenticate Portal
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-5xl mx-auto px-4 py-16 text-center space-y-8 my-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-xs text-sky-400 font-semibold">
          <span>Thiagarajar School of Management, Madurai</span>
        </div>

        <div className="space-y-4">
          <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight">
            ROUND 1: <span className="bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent">KNOW YOUR CUSTOMER</span>
          </h1>
          <p className="text-lg sm:text-xl font-medium text-slate-300 max-w-2xl mx-auto italic">
            &ldquo;Every Price Tells a Story. Make Yours Count.&rdquo;
          </p>
          <p className="text-sm text-slate-400 max-w-xl mx-auto">
            15 Teams • 15 Unique Customer Personas • 100-Customer Market Survey • 12-Minute Real-Time Synchronised Simulation.
          </p>
        </div>

        {/* 4 Unified Interface Gateway Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-6 text-left">
          {/* Team Portal */}
          <Link
            href="/login?role=team"
            className="group p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-sky-500/50 hover:bg-slate-850 transition-all shadow-xl block"
          >
            <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-1 group-hover:text-sky-300 transition-colors">
              Team Participation Portal
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              Access your assigned customer profile, market charts, debounced response form and synchronised countdown timer.
            </p>
            <div className="flex items-center gap-1 text-xs font-bold text-sky-400">
              <span>Enter Case Arena</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Judges Portal */}
          <Link
            href="/login?role=judge"
            className="group p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-teal-500/50 hover:bg-slate-850 transition-all shadow-xl block"
          >
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Scale className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-1 group-hover:text-teal-300 transition-colors">
              Judges Evaluation Suite
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              Post-event 100-mark rubric grading across customer identification, survey interpretation, pricing and justification.
            </p>
            <div className="flex items-center gap-1 text-xs font-bold text-teal-400">
              <span>Access Rubric Portal</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Event Hall Display Mode (V2) */}
          <Link
            href="/display"
            className="group p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-purple-500/50 hover:bg-slate-850 transition-all shadow-xl block"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-1 group-hover:text-purple-300 transition-colors">
              Event Hall Projector Display
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              Public display mode showing shared live countdown clock, team logins, submission count, and aggregate progress.
            </p>
            <div className="flex items-center gap-1 text-xs font-bold text-purple-400">
              <span>Launch Projector Screen</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Admin Control Centre */}
          <Link
            href="/login?role=admin"
            className="group p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-850 transition-all shadow-xl block"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-1 group-hover:text-indigo-300 transition-colors">
              Admin Control Centre
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              Realtime monitoring, team credentials, profile assignments, timer master, revision approvals, scoring mode, CSV exports, and Google Sheets sync.
            </p>
            <div className="flex items-center gap-1 text-xs font-bold text-indigo-400">
              <span>Administer Event</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500">
        QUANTRIX – The Data Analytics Club of Thiagarajar School of Management, Madurai • Production Realtime Architecture
      </footer>
    </div>
  );
}
