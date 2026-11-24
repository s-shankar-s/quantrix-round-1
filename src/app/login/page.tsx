'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Award, Smartphone, QrCode, Lock, User, KeyRound, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlRole = searchParams.get('role');
  const isIsolatedRole = urlRole === 'team' || urlRole === 'judge' || urlRole === 'admin';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'team' | 'judge' | 'admin'>(
    urlRole === 'judge' ? 'judge' : urlRole === 'admin' ? 'admin' : 'team'
  );
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [originUrl, setOriginUrl] = useState('');
  const [showQRModal, setShowQRModal] = useState(false);

  useEffect(() => {
    if (urlRole === 'team' || urlRole === 'judge' || urlRole === 'admin') {
      setRole(urlRole);
    }
  }, [urlRole]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const host = window.location.host;
      const protocol = window.location.protocol;
      setOriginUrl(`${protocol}//${host}`);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.message || 'Invalid username or password');
        setLoading(false);
        return;
      }

      router.push(data.redirectTo || '/');
      router.refresh();
    } catch (err) {
      setError('Connection error. Please try again.');
      setLoading(false);
    }
  };

  const handleRoleSelect = (r: 'team' | 'judge' | 'admin') => {
    setRole(r);
    setError('');
    setUsername('');
    setPassword('');
  };

  const portalQrUrl = `${originUrl}/login?role=${role}`;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 selection:bg-teal-500 selection:text-white">
      <div className="w-full max-w-md">
        {/* Header Branding */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-teal-500 to-sky-600 text-white shadow-xl shadow-teal-500/20 mb-3 border border-teal-400/30">
            <Award className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-wider">
            QUANTRIX
          </h1>
          <p className="text-sm font-semibold text-teal-400 tracking-wide mt-0.5">
            THE PRICE IS RIGHT?
          </p>
          <p className="text-[11px] text-slate-400 italic">
            &ldquo;Every Price Tells a Story. Make Yours Count.&rdquo;
          </p>
          <div className="inline-block mt-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px] text-slate-300 font-medium">
            Thiagarajar School of Management, Madurai
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-slate-900/95 border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 backdrop-blur-md">
          {/* Role Tabs - Only show when NOT isolated by specific ?role= param */}
          {!isIsolatedRole ? (
            <div className="flex rounded-xl bg-slate-950 p-1 mb-6 border border-slate-800">
              <button
                type="button"
                onClick={() => handleRoleSelect('team')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                  role === 'team'
                    ? 'bg-teal-600 text-white shadow-lg'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Team Portal
              </button>
              <button
                type="button"
                onClick={() => handleRoleSelect('judge')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                  role === 'judge'
                    ? 'bg-sky-600 text-white shadow-lg'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Judges
              </button>
              <button
                type="button"
                onClick={() => handleRoleSelect('admin')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                  role === 'admin'
                    ? 'bg-indigo-600 text-white shadow-lg'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Admin Hub
              </button>
            </div>
          ) : (
            <div className="mb-6 pb-3 border-b border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Secure Access Gate
                </span>
                <h2 className="text-base font-bold text-white">
                  {role === 'team'
                    ? '🎯 Participant Team Portal'
                    : role === 'judge'
                    ? '⚖️ Judge Evaluation Portal'
                    : '🛡️ Admin Hub'}
                </h2>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/30 text-[10px] font-mono font-bold">
                ISOLATED CONTEXT
              </span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <Lock className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                {role === 'team'
                  ? 'Assigned Team ID'
                  : role === 'judge'
                  ? 'Assigned Judge ID'
                  : 'Admin Username'}
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  required
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={
                    role === 'team'
                      ? 'Enter Team ID (e.g. team_01)'
                      : role === 'judge'
                      ? 'Enter Judge ID (e.g. judge_01)'
                      : 'Enter admin username'
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-teal-500 transition-all font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                Security Password
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your confidential password"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-teal-500 transition-all font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider text-white transition-all shadow-lg flex items-center justify-center gap-2 mt-2 ${
                role === 'team'
                  ? 'bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500'
                  : role === 'judge'
                  ? 'bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500'
                  : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500'
              } disabled:opacity-50`}
            >
              {loading ? (
                <span>Verifying Credentials...</span>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Authenticate to {role.toUpperCase()}</span>
                </>
              )}
            </button>
          </form>

          {/* QR Code Quick Access Modal Trigger instead of plain link */}
          <div className="mt-6 pt-5 border-t border-slate-800 flex flex-col items-center">
            <button
              type="button"
              onClick={() => setShowQRModal(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-teal-400 hover:border-slate-700 transition shadow"
            >
              <QrCode className="w-4 h-4 text-teal-400" />
              <span>Scan QR Code to Open on Mobile Device</span>
            </button>
            <p className="text-[10px] text-slate-500 mt-2 text-center">
              Event participants and judges can scan directly to load their respective portal on mobile.
            </p>
          </div>
        </div>

        <div className="text-center mt-6 text-xs text-slate-500">
          ROUND 1: KNOW YOUR CUSTOMER • 12-Minute Digital Market Simulation
        </div>
      </div>

      {/* QR Code Modal */}
      {showQRModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center shadow-2xl space-y-4">
            <div className="w-12 h-12 bg-teal-500/10 border border-teal-500/30 rounded-2xl flex items-center justify-center mx-auto text-teal-400">
              <Smartphone className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-white">Mobile Device Portal QR</h3>
              <p className="text-xs text-slate-400 mt-1">
                Scan with any smartphone camera to open the {role.toUpperCase()} portal instantly on your device.
              </p>
            </div>

            <div className="p-4 bg-white rounded-2xl inline-block shadow-inner mx-auto my-2">
              <QRCodeSVG
                value={portalQrUrl || 'http://localhost:3000/login'}
                size={180}
                level="M"
                includeMargin={false}
              />
            </div>

            <div className="text-[11px] font-mono text-slate-400 bg-slate-950 p-2.5 rounded-xl border border-slate-800 break-all">
              {portalQrUrl || 'http://localhost:3000/login'}
            </div>

            <button
              onClick={() => setShowQRModal(false)}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold uppercase tracking-wider transition"
            >
              Close QR Code
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
          <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
