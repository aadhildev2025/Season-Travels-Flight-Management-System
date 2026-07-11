'use client';

import React, { useState } from 'react';
import { useFlightStore } from '@/store/flightStore';
import { PlaneTakeoff, Mail, Lock, ShieldAlert, Sparkles } from 'lucide-react';

export default function Login() {
  const { login, users } = useFlightStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email address and password');
      return;
    }
    
    const success = login(email, password);
    if (!success) {
      setError('Invalid email address or password.');
    }
  };

  const selectDemoUser = (demoEmail: string) => {
    setEmail(demoEmail);
    setError('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)] px-4 py-8">
      
      {/* Background visual accents */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-primary/10 dark:bg-primary/5 rounded-full blur-3xl -z-10 animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-accent/10 dark:bg-accent/5 rounded-full blur-3xl -z-10 animate-pulse delay-500"></div>

      <div className="w-full max-w-md flex flex-col gap-6">
        
        {/* Branding header */}
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-premium flex items-center justify-center text-white shadow-xl shadow-primary/20">
            <PlaneTakeoff className="w-6 h-6 animate-pulse" />
          </div>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white mt-2">
            Season Travels Flight Console
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Please log in with your staff account credentials to continue
          </p>
        </div>

        {/* Login Card */}
        <div className="glass rounded-3xl p-6 md:p-8 shadow-xl border border-[var(--card-border)]">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            
            {/* Input field */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Staff Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="email"
                  placeholder="name@seasontravels.se"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError('');
                  }}
                  className={`w-full bg-slate-100/50 dark:bg-slate-900/50 border rounded-xl pl-10 pr-4 py-2.5 text-xs outline-none text-slate-800 dark:text-slate-100 focus:border-accent ${
                    error ? 'border-error' : 'border-slate-200 dark:border-slate-800'
                  }`}
                />
              </div>
              {error && (
                <span className="text-[10px] text-error font-medium flex items-center gap-1 mt-0.5">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  {error}
                </span>
              )}
            </div>

            {/* Password input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Access Token / Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError('');
                  }}
                  className={`w-full bg-slate-100/50 dark:bg-slate-900/50 border rounded-xl pl-10 pr-4 py-2.5 text-xs outline-none text-slate-800 dark:text-slate-100 focus:border-accent ${
                    error ? 'border-error' : 'border-slate-200 dark:border-slate-800'
                  }`}
                />
              </div>
            </div>

            {/* Login button */}
            <button
              type="submit"
              className="mt-2 w-full bg-gradient-premium hover:opacity-95 text-white py-2.5 rounded-xl text-xs font-bold shadow-md shadow-primary/10 transition-all hover:scale-[1.01] active:scale-95"
            >
              Sign In to Console
            </button>

          </form>
        </div>

        {/* DEMO ACCOUNTS HINT BOX */}
        <div className="glass rounded-2xl p-4 border border-[var(--card-border)] bg-slate-500/5 flex flex-col gap-3">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-accent animate-pulse" />
            Quick Review Sign-In Accounts
          </span>
          <div className="flex flex-col gap-1.5">
            {users.map(u => (
              <button
                key={u.id}
                onClick={() => selectDemoUser(u.email)}
                className="w-full flex items-center justify-between p-2 rounded-lg bg-white/40 dark:bg-slate-900/40 hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-300 transition-colors border border-slate-200/50 dark:border-slate-800/40"
              >
                <span>{u.name}</span>
                <span className="text-[9.5px] text-primary dark:text-accent font-bold font-mono">
                  {u.role}
                </span>
              </button>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
