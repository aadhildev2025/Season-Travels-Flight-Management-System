import { create } from 'zustand';
import type { User, Ticket } from '../types';

// In production (Vercel), VITE_API_URL points to the backend.
// In development, it is empty so Vite's proxy forwards /api → localhost:5000.
// Automatically strips trailing slash and /api if accidentally included in Vercel settings.
const API_BASE = (import.meta.env.VITE_API_URL || '')
  .replace(/\/$/, '')
  .replace(/\/api$/, '');

export async function apiFetch(url: string, options?: RequestInit) {
  const res  = await fetch(`${API_BASE}${url}`, { ...options, headers: { 'Content-Type': 'application/json', ...options?.headers }, credentials: 'include' });
  if (res.status === 401 && !url.includes('/api/auth/login')) {
    useFlightStore.setState({ currentUser: null, isAuthenticated: false });
  }
  let data: any;
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await res.json();
  } else {
    const text = await res.text();
    data = { error: text || `Request failed with status ${res.status}` };
  }
  if (!res.ok) throw new Error(data.error || 'API request failed');
  return data;
}

export async function checkBackendHealth(maxAttempts = 30, intervalMs = 1000): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await fetch(`${API_BASE}/api/health`, { method: 'GET' });
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'ok' || data.status === 'degraded') {
          return true;
        }
      }
    } catch {
      // Backend not ready yet
    }
    await new Promise(r => setTimeout(r, intervalMs));
  }
  return false;
}

export interface AnalyticsData {
  total: number;
  todayCount: number;
  upcomingCount: number;
  checkinCount: number;
  remindCount: number;
  statusGroups: { _id: string; count: number }[];
  routeGroups:  { _id: { from: string; to: string }; count: number }[];
  recentTickets: Partial<Ticket>[];
}

export interface AuditLog {
  _id: string;
  userId: string;
  userName: string;
  userEmail: string;
  action: string;
  target: string;
  details: string;
  ip: string;
  createdAt: string;
}

interface FlightState {
  currentUser:     User | null;
  isAuthenticated: boolean;
  tickets:         Ticket[];
  loading:         boolean;
  hasFetched:      boolean;
  backendReady:    boolean;
  expiringIds:     Set<string>;
  toast:           { message: string; type: 'success' | 'error' } | null;

  fetchSession:  () => Promise<void>;
  login:         (email: string, password: string) => Promise<boolean>;
  logout:        () => Promise<void>;
  updateProfile: (data: { name?: string; email?: string; currentPassword?: string; newPassword?: string }) => Promise<void>;
  checkBackendReady: () => Promise<boolean>;
  expireOldTickets: () => Promise<void>;

  sendUpcomingReminders: () => Promise<void>;

  showToast: (message: string, type?: 'success' | 'error') => void;
  fetchStaff:  () => Promise<{ id: string; name: string; email: string; role: string }[]>;
  createStaff: (data: { name: string; email: string; password: string; role: string }) => Promise<void>;
  updateStaff: (id: string, data: { name?: string; email?: string; password?: string; role?: string }) => Promise<void>;
  deleteStaff: (id: string) => Promise<void>;

  fetchTickets:  () => Promise<void>;
  addTicket:     (data: Partial<Ticket>) => Promise<void>;
  updateTicket:  (id: string, updates: Partial<Ticket>) => Promise<void>;
  deleteTicket:  (id: string) => Promise<void>;

  fetchAnalytics: () => Promise<AnalyticsData>;
  fetchAuditLogs: (page?: number) => Promise<{ logs: AuditLog[]; total: number; pages: number }>;
}

export const useFlightStore = create<FlightState>()((set, get) => ({
  currentUser:     null,
  isAuthenticated: false,
  tickets:         [],
  loading:         false,
  hasFetched:      false,
  backendReady:    false,
  expiringIds:     new Set<string>(),
  toast:           null,

  showToast: (message, type = 'success') => {
    set({ toast: { message, type } });
    setTimeout(() => set({ toast: null }), 3000);
  },

  checkBackendReady: async () => {
    const ready = await checkBackendHealth();
    set({ backendReady: ready });
    return ready;
  },

  fetchSession: async () => {
    try {
      const data = await apiFetch('/api/auth/me');
      if (data.user) {
        set({ currentUser: data.user, isAuthenticated: true });
        await get().fetchTickets();
      } else {
        set({ currentUser: null, isAuthenticated: false });
      }
    } catch {
      set({ currentUser: null, isAuthenticated: false });
    }
  },

  login: async (email, password) => {
    try {
      const data = await apiFetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
      set({ currentUser: data.user, isAuthenticated: true });
      await get().fetchTickets();
      return true;
    } catch { return false; }
  },

  logout: async () => {
    try { await apiFetch('/api/auth/logout', { method: 'POST' }); }
    finally { set({ currentUser: null, isAuthenticated: false, tickets: [] }); }
  },

  updateProfile: async (data) => {
    const res = await apiFetch('/api/auth/profile', { method: 'PUT', body: JSON.stringify(data) });
    if (res.user) set({ currentUser: res.user });
  },

  fetchStaff: async () => { const d = await apiFetch('/api/staff'); return d.users; },

  createStaff: async (staffData) => { await apiFetch('/api/staff', { method: 'POST', body: JSON.stringify(staffData) }); },

  updateStaff: async (id, staffData) => { await apiFetch(`/api/staff/${id}`, { method: 'PUT', body: JSON.stringify(staffData) }); },

  deleteStaff: async (id) => { await apiFetch(`/api/staff/${id}`, { method: 'DELETE' }); },

  fetchTickets: async () => {
    set({ loading: true });
    try {
      const d = await apiFetch('/api/tickets');
      set({ tickets: d.tickets, hasFetched: true });
      setTimeout(() => get().expireOldTickets(), 1000);
      setTimeout(() => get().sendUpcomingReminders(), 1200);
    } catch {
      console.error('Failed to fetch tickets');
    } finally {
      set({ loading: false });
    }
  },

  addTicket: async (ticketData) => {
    await apiFetch('/api/tickets', { method: 'POST', body: JSON.stringify(ticketData) });
    await get().fetchTickets();
  },

  updateTicket: async (id, updates) => {
    const prev = get().tickets;
    set({ tickets: prev.map(t => t._id === id ? { ...t, ...updates } : t) });
    try {
      await apiFetch(`/api/tickets/${id}`, { method: 'PUT', body: JSON.stringify(updates) });
    } catch (err) {
      set({ tickets: prev });
      console.error('Failed to update ticket:', err);
    }
  },

  deleteTicket: async (id) => {
    await apiFetch(`/api/tickets/${id}`, { method: 'DELETE' });
    await get().fetchTickets();
  },

  expireOldTickets: async () => {
    const now = new Date();
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    const expired = get().tickets.filter(t => {
      if (!t.departureTimeUTC) return false;
      return new Date(t.departureTimeUTC) <= fortyEightHoursAgo;
    });

    if (expired.length === 0) return;

    const ids = new Set(expired.map(t => t._id));
    set({ expiringIds: ids });

    await new Promise(r => setTimeout(r, 600));

    try {
      await apiFetch('/api/tickets/expire-departed', { method: 'POST' });
    } catch {
      console.error('Failed to expire tickets on server');
    }

    set({ tickets: get().tickets.filter(t => !ids.has(t._id)), expiringIds: new Set() });
  },

  sendUpcomingReminders: async () => {
    try {
      await apiFetch('/api/tickets/send-reminders', { method: 'POST' });
    } catch {
      console.error('Failed to send upcoming reminders');
    }
  },

  fetchAnalytics: async () => {
    return await apiFetch('/api/tickets/analytics');
  },

  fetchAuditLogs: async (page = 1) => {
    return await apiFetch(`/api/audit-logs?page=${page}&limit=50`);
  },
}));

if (typeof window !== 'undefined') {
  setInterval(() => {
    useFlightStore.getState().expireOldTickets();
    useFlightStore.getState().sendUpcomingReminders();
  }, 30000);
}
