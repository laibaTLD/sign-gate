import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, UserRole } from '../types';
import { PenTool, Loader2, Shield, Mail, Lock } from 'lucide-react';
import { AuthAPI, setToken } from '../services/api';

interface LoginProps {
  onLogin: (user: User) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberEmail, setRememberEmail] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const saved = localStorage.getItem('saved_email');
    if (saved) setEmail(saved);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const resp = await AuthAPI.login({ email, password });
      const { token, user } = resp;
      if (!token || !user) throw new Error('Invalid response');
      setToken(token);
      if (rememberEmail) localStorage.setItem('saved_email', email);
      else localStorage.removeItem('saved_email');
      const mapped: User = {
        id: String(user.id || user._id),
        email: user.email,
        name: user.name,
        role: user.role as UserRole,
      };
      onLogin(mapped);
      if (mapped.role === UserRole.ADMIN) navigate('/admin');
      else if (mapped.role === UserRole.AGENT) navigate('/support');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Brand panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-brand-900 text-white flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-20 left-10 w-72 h-72 rounded-full bg-yellow-400 blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full bg-yellow-400 blur-3xl" />
        </div>
        <div className="relative">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 rounded-xl bg-yellow-400 flex items-center justify-center">
              <PenTool size={20} className="text-brand-900" />
            </div>
            <span className="text-xl font-bold tracking-tight">Sign Flow</span>
          </div>
          <h1 className="text-4xl font-bold leading-tight mb-4">
            Secure document<br />signing made simple
          </h1>
          <p className="text-brand-400 text-lg max-w-md leading-relaxed">
            Create agreements, send signing links, and track document status — all in one place.
          </p>
        </div>
        <div className="relative flex items-center gap-3 text-sm text-brand-400">
          <Shield size={16} className="text-yellow-400" />
          <span>End-to-end encrypted signing workflow</span>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-16 bg-brand-50">
        <div className="w-full max-w-md mx-auto animate-fadeIn">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-lg bg-yellow-400 flex items-center justify-center">
              <PenTool size={16} className="text-brand-900" />
            </div>
            <span className="text-lg font-bold text-brand-900">Sign Flow</span>
          </div>

          <h2 className="text-2xl font-bold text-brand-900 tracking-tight">Welcome back</h2>
          <p className="mt-1.5 text-sm text-brand-500">Sign in to your admin or support account</p>

          <div className="mt-8 card">
            <div className="card-body">
              <form className="space-y-5" onSubmit={handleSubmit}>
                <div>
                  <label htmlFor="email" className="label">Email address</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-400" />
                    <input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="input-field pl-9"
                      placeholder="you@company.com"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="label">Password</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-400" />
                    <input
                      id="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="input-field pl-9"
                      placeholder="Enter your password"
                    />
                  </div>
                </div>

                {error && (
                  <div className="text-red-700 text-sm bg-red-50 px-3 py-2.5 rounded-lg border border-red-200 animate-fadeIn">
                    {error}
                  </div>
                )}

                <label className="flex items-center gap-2.5 text-sm text-brand-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberEmail}
                    onChange={(e) => setRememberEmail(e.target.checked)}
                    className="h-4 w-4 rounded border-brand-300 text-yellow-400 focus:ring-yellow-400"
                  />
                  Remember email on this device
                </label>

                <button type="submit" disabled={loading} className="btn btn-primary btn-lg w-full">
                  {loading ? <Loader2 className="animate-spin" size={20} /> : 'Sign in'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
