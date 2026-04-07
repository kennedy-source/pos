import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Scissors, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { apiPost } from '../lib/api';
import toast from 'react-hot-toast';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter email and password');
      return;
    }
    setLoading(true);
    try {
      const res = await apiPost<any>('/auth/login', { email, password });
      const { user, accessToken, refreshToken } = res as any;

      if (!user || !user.name || !accessToken || !refreshToken) {
        throw new Error('Invalid login response from the server');
      }

      setAuth(user, accessToken, refreshToken);
      toast.success(`Welcome back, ${user.name || 'User'}!`);
      navigate('/');
    } catch (err: any) {
      toast.error(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 relative overflow-hidden">
      <div className="absolute -left-10 top-10 w-72 h-72 rounded-full bg-sky-500/10 blur-3xl" />
      <div className="absolute right-8 top-24 w-56 h-56 rounded-full bg-indigo-500/10 blur-3xl" />
      <div className="absolute inset-x-0 bottom-0 h-60 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent" />

      <div className="w-full max-w-md glass-card border-slate-700/60 overflow-hidden">
        <div className="bg-slate-950/90 p-8 border-b border-slate-800">
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center shadow-xl shadow-sky-500/20">
              <Scissors size={32} className="text-white" />
            </div>
            <div className="text-left">
              <p className="text-slate-400 uppercase text-xs tracking-[0.3em]">School Uniform</p>
              <h1 className="text-3xl font-semibold text-white">UniForm POS</h1>
            </div>
          </div>
          <p className="text-slate-400 text-sm leading-6">
            Manage uniforms, sales, customers, and embroidery from one polished point-of-sale experience.
          </p>
        </div>

        <div className="p-8 space-y-6">
          <div>
            <h2 className="text-white text-2xl font-semibold mb-2">Sign in to your account</h2>
            <p className="text-slate-500 text-sm">
              Use demo credentials or your work account to get started.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="block text-slate-400 text-sm">Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-soft"
                placeholder="you@example.com"
                autoFocus
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-slate-400 text-sm">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-soft pr-12"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 py-3"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          <div className="pt-5 border-t border-slate-800">
            <p className="text-slate-500 text-xs uppercase tracking-[0.2em] mb-3 text-center">Demo accounts</p>
            <div className="grid gap-3">
              {[
                { label: 'Admin', email: 'admin@uniformpos.co.ke', pass: 'Admin@1234' },
                { label: 'Cashier', email: 'cashier@uniformpos.co.ke', pass: 'Cashier@1234' },
              ].map((cred) => (
                <button
                  key={cred.email}
                  onClick={() => { setEmail(cred.email); setPassword(cred.pass); }}
                  className="btn-secondary text-left py-3"
                >
                  <p className="text-sky-400 text-[11px] uppercase tracking-[0.24em] mb-1">{cred.label}</p>
                  <p className="text-slate-300 text-sm break-words">{cred.email}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="text-center text-slate-500 text-xs py-4 bg-slate-950/70">
          © {new Date().getFullYear()} UniForm POS Kenya
        </p>
      </div>
    </div>
  );
}
