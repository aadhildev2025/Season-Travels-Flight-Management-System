'use client';

import React, { useState, useEffect } from 'react';
import { useFlightStore } from '@/store/flightStore';
import ConfirmDialog from './ConfirmDialog';
import { 
  Bell, 
  LogOut,
  KeyRound,
  UserCog
} from 'lucide-react';

interface HeaderProps {
  viewTimezone: string;
  setViewTimezone: (tz: string) => void;
}

export default function Header({ viewTimezone, setViewTimezone }: HeaderProps) {
  const { currentUser, logout, auditLogs, changePassword, updateUser } = useFlightStore();

  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Settings modal state
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [settingsTab, setSettingsTab] = useState<'profile' | 'password'>('profile');
  const [settingsMsg, setSettingsMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Open settings modal
  const openSettings = () => {
    setNewName(currentUser?.name || '');
    setNewPassword('');
    setConfirmPassword('');
    setSettingsMsg(null);
    setSettingsTab('profile');
    setShowSettingsModal(true);
    setShowUserMenu(false);
  };

  const handleSaveProfile = () => {
    if (!newName.trim()) {
      setSettingsMsg({ type: 'error', text: 'Name cannot be empty.' });
      return;
    }
    if (currentUser) {
      updateUser(currentUser.id, { name: newName.trim() });
      setSettingsMsg({ type: 'success', text: 'Username updated successfully!' });
    }
  };

  const handleSavePassword = () => {
    if (!newPassword.trim() || newPassword.length < 4) {
      setSettingsMsg({ type: 'error', text: 'Password must be at least 4 characters.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setSettingsMsg({ type: 'error', text: 'Passwords do not match.' });
      return;
    }
    if (currentUser) {
      changePassword(currentUser.id, newPassword);
      setNewPassword('');
      setConfirmPassword('');
      setSettingsMsg({ type: 'success', text: 'Password changed successfully!' });
    }
  };

  // Notification feed
  const recentNotifications = auditLogs
    .filter(log => log.action === 'Reminder Sent' || log.action === 'Ticket Created')
    .slice(0, 5);

  // Close dropdowns on outside clicks
  useEffect(() => {
    const handle = () => { setShowUserMenu(false); setShowNotifications(false); };
    document.addEventListener('click', handle);
    return () => document.removeEventListener('click', handle);
  }, []);

  return (
    <header
      className="sticky top-0 z-40 w-full glass border-b border-[var(--card-border)] px-3 py-2.5 md:px-4 md:py-3 flex items-center justify-between shadow-sm"
      onClick={(e) => e.stopPropagation()}
    >
      {/* ── Left: brand / role label ── */}
      <div className="flex items-center gap-3">
        <div className="md:hidden flex items-center gap-1">
          <span className="font-bold text-lg bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">ST</span>
        </div>
        <div className="hidden md:flex flex-col">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Flight Console</span>
          <span className="text-sm font-semibold flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
            {currentUser?.name || 'Staff'}
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary dark:bg-accent/15 dark:text-accent border border-primary/20">
              {currentUser?.role || 'Staff'}
            </span>
          </span>
        </div>
      </div>

      {/* ── Right: actions ── */}
      <div className="flex items-center gap-2 md:gap-3">

        {/* Timezone selector */}
        <div className="flex items-center bg-[var(--surface)] border border-[var(--card-border)] rounded-lg px-2 py-1.5 md:px-2.5">
          <select
            value={viewTimezone}
            onChange={(e) => setViewTimezone(e.target.value)}
            className="bg-transparent text-[11px] md:text-xs font-medium outline-none text-[var(--foreground)] cursor-pointer"
            title="Switch display timezone"
          >
            <option value="Asia/Colombo">Colombo</option>
            <option value="Europe/Stockholm">Stockholm</option>
            <option value="UTC">UTC</option>
          </select>
        </div>

        {/* Sign out */}
        <button
          onClick={() => setShowLogoutConfirm(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 md:px-3 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 dark:border-rose-500/30 text-xs font-bold transition-all active:scale-95"
          title="Sign Out"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Sign Out</span>
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowNotifications(v => !v);
              setShowUserMenu(false);
            }}
            className="p-2 rounded-lg bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--card-border)] text-[var(--muted)] relative"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
          </button>

          {showNotifications && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute right-0 mt-2 w-72 md:w-80 bg-[var(--surface)] border border-[var(--card-border)] rounded-xl shadow-xl p-4 z-50"
            >
              <div className="flex items-center justify-between pb-2 border-b border-[var(--card-border)] mb-2">
                <span className="text-xs font-semibold text-[var(--foreground)] uppercase tracking-wider">Notifications</span>
                <span className="text-[10px] text-accent font-semibold">Live</span>
              </div>
              <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
                {recentNotifications.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">No recent events</p>
                ) : recentNotifications.map(n => (
                  <div key={n.id} className="text-xs flex gap-2 items-start p-1.5 rounded-md hover:bg-[var(--surface-hover)]">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 mt-1 ${n.action === 'Reminder Sent' ? 'bg-success' : 'bg-accent'}`} />
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[var(--foreground)] font-medium leading-tight">{n.details}</span>
                      <span className="text-[10px] text-[var(--muted)]">{new Date(n.created_at).toLocaleTimeString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Profile dropdown */}
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowUserMenu(v => !v);
              setShowNotifications(false);
            }}
            className="w-8 h-8 rounded-full bg-gradient-premium text-white flex items-center justify-center font-bold text-sm shadow-md border border-white/20 hover:scale-105"
            title="User menu"
          >
            {currentUser?.name?.charAt(0)?.toUpperCase() || 'U'}
          </button>

          {showUserMenu && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute right-0 mt-2 w-52 bg-[var(--surface)] border border-[var(--card-border)] rounded-xl shadow-xl p-3 z-50"
            >
              <div className="pb-2 border-b border-[var(--card-border)] mb-2">
                <p className="text-xs font-semibold text-[var(--foreground)] truncate">{currentUser?.name}</p>
                <p className="text-[10px] text-[var(--muted)] truncate">{currentUser?.email}</p>
              </div>
              <div className="flex flex-col gap-0.5 text-xs">
                <div className="px-2 py-1.5 rounded-md flex justify-between items-center text-[var(--muted)]">
                  <span>Role</span>
                  <span className="font-semibold text-primary dark:text-accent">{currentUser?.role}</span>
                </div>
                <div className="px-2 py-1.5 rounded-md flex justify-between items-center text-[var(--muted)]">
                  <span>Zone</span>
                  <span className="font-semibold text-[var(--foreground)]">{currentUser?.timezone?.split('/')[1]}</span>
                </div>
                <button
                  onClick={openSettings}
                  className="w-full text-left px-2 py-1.5 rounded-md hover:bg-[var(--surface-hover)] text-accent font-semibold mt-1 border-t border-[var(--card-border)] pt-2"
                >
                  Account Settings
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          ACCOUNT SETTINGS MODAL
          ══════════════════════════════════════════════ */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
          <div className="bg-[var(--surface)] border border-[var(--card-border)] rounded-2xl w-full max-w-md shadow-2xl flex flex-col overflow-hidden">

            {/* Header */}
            <div className="px-6 py-4 border-b border-[var(--card-border)] flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-sm text-[var(--foreground)]">Account Settings</h3>
                <p className="text-[10px] text-[var(--muted)]">{currentUser?.name}</p>
              </div>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="w-7 h-7 rounded-full bg-[var(--surface-hover)] flex items-center justify-center text-[var(--muted)] text-xs font-bold"
              >✕</button>
            </div>

            {/* Tab bar */}
            <div className="flex border-b border-slate-100 dark:border-slate-800">
              {(['profile', 'password'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => { setSettingsTab(tab); setSettingsMsg(null); }}
                  className={`flex-1 px-4 py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 ${
                    settingsTab === tab
                      ? 'border-primary text-primary dark:border-accent dark:text-accent bg-primary/5 dark:bg-accent/5'
                      : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                >
                  {tab === 'profile' ? <><UserCog className="w-3.5 h-3.5" /> Change Username</> : <><KeyRound className="w-3.5 h-3.5" /> Change Password</>}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="px-6 py-5 flex flex-col gap-4">
              {settingsMsg && (
                <div className={`px-3 py-2 rounded-lg text-xs font-medium border ${
                  settingsMsg.type === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                    : 'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800'
                }`}>
                  {settingsMsg.text}
                </div>
              )}

              {settingsTab === 'profile' ? (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Current Name</label>
                    <div className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-400 font-mono">
                      {currentUser?.name}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">New Display Name</label>
                    <input
                      type="text"
                      placeholder="Enter new name..."
                      value={newName}
                      onChange={(e) => { setNewName(e.target.value); setSettingsMsg(null); }}
                      className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs outline-none text-slate-800 dark:text-slate-100 focus:border-accent"
                    />
                  </div>
                  <button
                    onClick={handleSaveProfile}
                    className="w-full py-2.5 rounded-xl bg-gradient-premium text-white text-xs font-bold hover:opacity-90 active:scale-95"
                  >
                    Save Username
                  </button>
                </>
              ) : (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">New Password</label>
                    <input
                      type="password"
                      placeholder="Min 4 characters..."
                      value={newPassword}
                      onChange={(e) => { setNewPassword(e.target.value); setSettingsMsg(null); }}
                      className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs outline-none text-slate-800 dark:text-slate-100 focus:border-accent"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Confirm Password</label>
                    <input
                      type="password"
                      placeholder="Re-enter new password..."
                      value={confirmPassword}
                      onChange={(e) => { setConfirmPassword(e.target.value); setSettingsMsg(null); }}
                      className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs outline-none text-slate-800 dark:text-slate-100 focus:border-accent"
                    />
                  </div>
                  {newPassword && confirmPassword && (
                    <p className={`text-[10px] font-medium ${newPassword === confirmPassword ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                      {newPassword === confirmPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
                    </p>
                  )}
                  <button
                    onClick={handleSavePassword}
                    className="w-full py-2.5 rounded-xl bg-gradient-premium text-white text-xs font-bold hover:opacity-90 active:scale-95"
                  >
                    Save Password
                  </button>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 pb-5">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="w-full py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={showLogoutConfirm}
        title="Sign Out"
        message="Are you sure you want to sign out of the Flight Console?"
        confirmLabel="Sign Out"
        variant="danger"
        onConfirm={() => { logout(); setShowLogoutConfirm(false); }}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </header>
  );
}
