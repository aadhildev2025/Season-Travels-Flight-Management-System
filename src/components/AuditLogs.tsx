'use client';

import React, { useState } from 'react';
import { useFlightStore } from '@/store/flightStore';
import { 
  History, 
  Search, 
  Filter, 
  ShieldAlert, 
  Terminal, 
  Calendar,
  AlertTriangle
} from 'lucide-react';

export default function AuditLogs() {
  const { auditLogs, currentUser } = useFlightStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  const isAdmin = currentUser?.role === 'Admin';

  if (!isAdmin) {
    return (
      <div className="glass rounded-3xl p-8 text-center flex flex-col items-center justify-center gap-4 max-w-md mx-auto my-12 animate-in fade-in duration-200">
        <div className="w-16 h-16 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center animate-bounce">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Access Restricted</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Only accounts with <span className="font-semibold text-rose-600 dark:text-rose-400">Admin</span> permissions can view the system audit logs.
        </p>
      </div>
    );
  }

  // Filter logs
  const filteredLogs = auditLogs.filter(log => {
    const matchesSearch = log.user_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          log.details.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAction = actionFilter ? log.action === actionFilter : true;
    return matchesSearch && matchesAction;
  });

  const getActionBadge = (action: string) => {
    if (action.includes('Created')) return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400 border-emerald-200';
    if (action.includes('Updated')) return 'bg-blue-100 text-blue-800 dark:bg-blue-950/20 dark:text-blue-400 border-blue-200';
    if (action.includes('Deleted')) return 'bg-rose-100 text-rose-800 dark:bg-rose-950/20 dark:text-rose-400 border-rose-200';
    return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-200';
  };

  return (
    <div className="flex flex-col gap-6 pb-24 md:pb-6 animate-in fade-in duration-200">
      
      {/* Top Details */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white font-semibold">Security Audit Logs</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Trace ticket departures database mutations, role promotions, and auto-reminder notifications.
        </p>
      </div>

      {/* FILTER PANEL */}
      <div className="glass rounded-2xl p-4 flex flex-col md:flex-row gap-3 shadow-sm">
        
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text"
            placeholder="Search logs by staff name or action details..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-100/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs outline-none text-slate-800 dark:text-slate-100 focus:border-accent dark:focus:border-accent"
          />
        </div>

        {/* Action filter */}
        <div className="relative w-full md:w-56">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="w-full bg-slate-100/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs outline-none text-slate-700 dark:text-slate-350 cursor-pointer appearance-none"
          >
            <option value="">All Security Events</option>
            <option value="Ticket Created">Ticket Created</option>
            <option value="Ticket Updated">Ticket Updated</option>
            <option value="Ticket Deleted">Ticket Deleted</option>
            <option value="Reminder Sent">Reminder Sent</option>
            <option value="User Session Switched">User Session Switched</option>
          </select>
        </div>

      </div>

      {/* AUDIT LOG LISTING */}
      {filteredLogs.length === 0 ? (
        <div className="glass rounded-2xl py-12 text-center flex flex-col items-center justify-center gap-2">
          <History className="w-8 h-8 text-slate-300 animate-spin" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No logs match your filter</p>
        </div>
      ) : (
        <div className="glass rounded-2xl overflow-hidden shadow-sm border border-[var(--card-border)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-900/30 border-b border-[var(--card-border)] text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="px-5 py-3">Timestamp</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Actor / Agent</th>
                  <th className="px-4 py-3">Event Details</th>
                  <th className="px-5 py-3 text-right">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-850 text-xs text-slate-700 dark:text-slate-350">
                {filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-900/10">
                    <td className="px-5 py-3.5 font-mono text-[10.5px] text-slate-500">
                      {new Date(log.created_at).toLocaleDateString()} {new Date(log.created_at).toLocaleTimeString()}
                    </td>
                    <td className="px-4 py-3.5 font-semibold">
                      <span className={`px-2 py-0.5 rounded text-[9px] border font-bold ${getActionBadge(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-semibold">
                      <div className="flex flex-col">
                        <span className="text-slate-900 dark:text-slate-200">{log.user_name}</span>
                        <span className="text-[9px] text-slate-400 font-bold uppercase">{log.user_role}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 font-medium text-slate-650 dark:text-slate-300">
                      {log.details}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-[10.5px] text-slate-400 text-right">
                      {log.ip_address}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
