import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, UserRole } from '../types';
import { ShieldCheck, Loader2 } from 'lucide-react';
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
      // Map backend user to frontend type
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
    <div className="min-h-screen bg-brand-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center text-yellow-400">
           <ShieldCheck size={48} />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-brand-900">
          Sign in to your account
        </h2>
        <p className="mt-2 text-center text-sm text-brand-500">
          For Admins and Support
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-brand-100">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-brand-700">
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-brand-200 rounded-md shadow-sm placeholder-brand-400 focus:outline-none focus:ring-yellow-400 focus:border-yellow-400 sm:text-sm"
                  placeholder="admin@autosign.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-brand-700">
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm"
                  placeholder="password"
                />
              </div>
            </div>

            {error && (
              <div className="text-red-600 text-sm bg-red-50 p-2 rounded border border-red-200">
                {error}
              </div>
            )}

            <div>
              <label className="flex items-center gap-2 text-xs text-brand-600 mb-3">
                <input type="checkbox" checked={rememberEmail} onChange={(e) => setRememberEmail(e.target.checked)} />
                Remember email on this device
              </label>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-brand-900 bg-yellow-400 hover:bg-yellow-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-400 disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Sign in'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}