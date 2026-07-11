import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type UserRole = 'Admin' | 'Staff';
export type ReminderOffset = '24h' | '12h' | '6h' | 'custom';
export type ReminderChannel = 'Email' | 'WhatsApp';
export type ReminderStatus = 'Pending' | 'Sent' | 'Failed';
export type FlightStatus = 'Scheduled' | 'Delayed' | 'Departed' | 'Missed' | 'Archived';

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  timezone: string;
}

export interface Ticket {
  id: string;
  passenger_name: string;
  email: string;
  phone: string;
  nationality: string;
  passport_number: string;
  airline: string;
  flight_number: string;
  pnr: string;
  ticket_number: string;
  departure_airport: string;
  arrival_airport: string;
  departure_time_utc: string; // ISO string
  arrival_time_utc: string;   // ISO string
  original_timezone: string;
  return_ticket: boolean;
  transit_details: string;
  special_notes: string;
  reminder_required: boolean;
  reminder_offset: ReminderOffset;
  reminder_custom_time?: string; // ISO string if custom
  reminder_channels: ReminderChannel[];
  status: FlightStatus;
  created_by: string; // User ID
  created_at: string;
  updated_at: string;
}

export interface Reminder {
  id: string;
  ticket_id: string;
  passenger_name: string;
  flight_number: string;
  reminder_time: string;
  status: ReminderStatus;
  channel: ReminderChannel;
  offset: ReminderOffset;
}

export interface AuditLog {
  id: string;
  action: string;
  user_id: string;
  user_name: string;
  user_role: string;
  created_at: string;
  ip_address: string;
  details: string;
}

// Autocomplete Databases
export const AIRPORTS = [
  { code: 'CMB', name: 'Bandaranaike International Airport', city: 'Colombo', country: 'Sri Lanka', timezone: 'Asia/Colombo' },
  { code: 'ARN', name: 'Stockholm Arlanda Airport', city: 'Stockholm', country: 'Sweden', timezone: 'Europe/Stockholm' },
  { code: 'GOT', name: 'Göteborg Landvetter Airport', city: 'Gothenburg', country: 'Sweden', timezone: 'Europe/Stockholm' },
  { code: 'LHR', name: 'London Heathrow Airport', city: 'London', country: 'United Kingdom', timezone: 'Europe/London' },
  { code: 'CDG', name: 'Charles de Gaulle Airport', city: 'Paris', country: 'France', timezone: 'Europe/Paris' },
  { code: 'DXB', name: 'Dubai International Airport', city: 'Dubai', country: 'UAE', timezone: 'Asia/Dubai' },
  { code: 'SIN', name: 'Singapore Changi Airport', city: 'Singapore', country: 'Singapore', timezone: 'Asia/Singapore' },
  { code: 'FRA', name: 'Frankfurt Airport', city: 'Frankfurt', country: 'Germany', timezone: 'Europe/Berlin' }
];

export const AIRLINES = [
  { code: 'UL', name: 'SriLankan Airlines' },
  { code: 'SK', name: 'Scandinavian Airlines (SAS)' },
  { code: 'EK', name: 'Emirates' },
  { code: 'QR', name: 'Qatar Airways' },
  { code: 'SQ', name: 'Singapore Airlines' },
  { code: 'LH', name: 'Lufthansa' },
  { code: 'BA', name: 'British Airways' },
  { code: 'DY', name: 'Norwegian Air Shuttle' }
];

interface FlightState {
  users: User[];
  currentUser: User | null;
  isAuthenticated: boolean;
  tickets: Ticket[];
  reminders: Reminder[];
  auditLogs: AuditLog[];
  wizardDraft: Partial<Ticket> | null;
  
  // User Actions
  setCurrentUser: (user: User | null) => void;
  login: (email: string, password: string) => boolean;
  logout: () => void;
  createUser: (user: Omit<User, 'id'>) => void;
  updateUser: (id: string, updates: Partial<User>) => void;
  deleteUser: (id: string) => void;
  changePassword: (userId: string, newPassword: string) => void;
  
  // Ticket Actions
  addTicket: (ticket: Omit<Ticket, 'id' | 'created_by' | 'created_at' | 'updated_at'>) => void;
  updateTicket: (id: string, updates: Partial<Ticket>) => void;
  deleteTicket: (id: string) => void;
  archiveTicket: (id: string) => void;
  duplicateTicket: (id: string) => void;
  
  // Draft Actions
  saveWizardDraft: (draft: Partial<Ticket>) => void;
  clearWizardDraft: () => void;
  
  // Reminder Actions
  triggerReminder: (reminderId: string, status: ReminderStatus) => void;
  addReminder: (reminder: Omit<Reminder, 'id'>) => void;
  
  // Log Actions
  addAuditLog: (action: string, details: string) => void;
  clearAuditLogs: () => void;
}

// Initial Mock Users
const INITIAL_USERS: User[] = [
  { id: 'usr-1', name: 'Lars Svensson', email: 'lars.s@seasontravels.se', password: 'admin123', role: 'Admin', timezone: 'Europe/Stockholm' },
  { id: 'usr-2', name: 'Anura Perera', email: 'anura.p@seasontravels.lk', password: 'staff123', role: 'Staff', timezone: 'Asia/Colombo' },
  { id: 'usr-3', name: 'Sofia Andersson', email: 'sofia.a@seasontravels.se', password: 'staff123', role: 'Staff', timezone: 'Europe/Stockholm' }
];

// Initial Mock Tickets
const INITIAL_TICKETS: Ticket[] = [];

// Prepopulated Reminders
const INITIAL_REMINDERS: Reminder[] = [];

// Prepopulated Audit Logs
const INITIAL_AUDIT_LOGS: AuditLog[] = [];

export const useFlightStore = create<FlightState>()(
  persist(
    (set, get) => ({
      users: INITIAL_USERS,
      currentUser: null,
      isAuthenticated: false,
      tickets: INITIAL_TICKETS,
      reminders: INITIAL_REMINDERS,
      auditLogs: INITIAL_AUDIT_LOGS,
      wizardDraft: null,

      setCurrentUser: (user) => {
        set({ currentUser: user });
        if (user) {
          get().addAuditLog('User Session Switched', `Active user switched to ${user.name} (${user.role})`);
        }
      },

      login: (email, password) => {
        const user = get().users.find(
          (u) =>
            u.email.toLowerCase() === email.toLowerCase().trim() &&
            (u.password || 'staff123') === password
        );
        if (user) {
          set({ currentUser: user, isAuthenticated: true });
          get().addAuditLog('User Login', `Staff member ${user.name} (${user.role}) signed in`);
          return true;
        }
        return false;
      },

      changePassword: (userId, newPassword) => {
        set((state) => {
          const updatedUsers = state.users.map((u) => (u.id === userId ? { ...u, password: newPassword } : u));
          const updatedCurrentUser = (state.currentUser && state.currentUser.id === userId)
            ? { ...state.currentUser, password: newPassword } as User
            : state.currentUser;
          return {
            users: updatedUsers,
            currentUser: updatedCurrentUser
          };
        });
        const targetUser = get().users.find((u) => u.id === userId);
        get().addAuditLog('Password Changed', `User ${targetUser?.name} changed their password.`);
      },

      logout: () => {
        const user = get().currentUser;
        if (user) {
          get().addAuditLog('User Logout', `Staff member ${user.name} signed out`);
        }
        set({ currentUser: null, isAuthenticated: false });
      },

      createUser: (newUserData) => {
        const id = `usr-${Date.now()}`;
        const newUser: User = { id, ...newUserData };
        set((state) => ({
          users: [...state.users, newUser]
        }));
        get().addAuditLog('User Created', `Created user account for ${newUser.name} (${newUser.role})`);
      },

      updateUser: (id, updates) => {
        set((state) => {
          const updatedUsers = state.users.map((u) => (u.id === id ? { ...u, ...updates } : u));
          const updatedCurrentUser = (state.currentUser && state.currentUser.id === id)
            ? { ...state.currentUser, ...updates } as User
            : state.currentUser;
          return {
            users: updatedUsers,
            currentUser: updatedCurrentUser
          };
        });
        const updated = get().users.find((u) => u.id === id);
        get().addAuditLog('User Updated', `Updated user account for ${updated?.name}`);
      },

      deleteUser: (id) => {
        const deletedUser = get().users.find((u) => u.id === id);
        set((state) => ({
          users: state.users.filter((u) => u.id !== id)
        }));
        if (deletedUser) {
          get().addAuditLog('User Deleted', `Deleted user account for ${deletedUser.name}`);
        }
      },

      addTicket: (ticketData) => {
        const id = `tkt-${Date.now()}`;
        const newTicket: Ticket = {
          ...ticketData,
          id,
          created_by: get().currentUser?.id || 'system',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        set((state) => ({
          tickets: [newTicket, ...state.tickets]
        }));

        // Add auto-reminders if reminder required
        if (newTicket.reminder_required) {
          const departure = new Date(newTicket.departure_time_utc);
          let offsetHours = 24;
          if (newTicket.reminder_offset === '12h') offsetHours = 12;
          if (newTicket.reminder_offset === '6h') offsetHours = 6;
          
          let reminderTime = new Date(departure.getTime() - offsetHours * 60 * 60 * 1000);
          if (newTicket.reminder_offset === 'custom' && newTicket.reminder_custom_time) {
            reminderTime = new Date(newTicket.reminder_custom_time);
          }

          newTicket.reminder_channels.forEach((channel) => {
            get().addReminder({
              ticket_id: id,
              passenger_name: newTicket.passenger_name,
              flight_number: newTicket.flight_number,
              reminder_time: reminderTime.toISOString(),
              status: 'Pending',
              channel,
              offset: newTicket.reminder_offset
            });
          });
        }

        get().addAuditLog('Ticket Created', `Created ticket ${newTicket.pnr} for ${newTicket.passenger_name} (${newTicket.flight_number})`);
      },

      updateTicket: (id, updates) => {
        set((state) => ({
          tickets: state.tickets.map((t) =>
            t.id === id
              ? { ...t, ...updates, updated_at: new Date().toISOString() }
              : t
          )
        }));

        const updated = get().tickets.find((t) => t.id === id);
        if (updated) {
          get().addAuditLog('Ticket Updated', `Updated ticket details for PNR: ${updated.pnr} (${updated.passenger_name})`);
        }
      },

      deleteTicket: (id) => {
        const target = get().tickets.find((t) => t.id === id);
        if (!target) return;
        
        // RBAC validation checks: Only Admin users can delete entries.
        const user = get().currentUser;
        if (!user) return;
        if (user.role !== 'Admin') {
          alert("Permission denied! Only Admin users can delete entries.");
          return;
        }

        set((state) => ({
          tickets: state.tickets.filter((t) => t.id !== id),
          reminders: state.reminders.filter((r) => r.ticket_id !== id)
        }));

        get().addAuditLog('Ticket Deleted', `Deleted ticket PNR: ${target.pnr} for ${target.passenger_name}`);
      },

      archiveTicket: (id) => {
        get().updateTicket(id, { status: 'Archived' });
        const target = get().tickets.find((t) => t.id === id);
        get().addAuditLog('Ticket Archived', `Archived ticket PNR: ${target?.pnr}`);
      },

      duplicateTicket: (id) => {
        const original = get().tickets.find((t) => t.id === id);
        if (!original) return;
        
        const duplicated: Ticket = {
          ...original,
          id: `tkt-${Date.now()}`,
          pnr: `${original.pnr}-DUP`,
          ticket_number: `DUP-${original.ticket_number}`,
          passenger_name: `${original.passenger_name} (Copy)`,
          created_by: get().currentUser?.id || 'system',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          status: 'Scheduled'
        };
        
        set((state) => ({
          tickets: [duplicated, ...state.tickets]
        }));
        
        get().addAuditLog('Ticket Duplicated', `Duplicated ticket ${original.pnr} to create ${duplicated.pnr}`);
      },

      saveWizardDraft: (draft) => {
        set({ wizardDraft: draft });
      },

      clearWizardDraft: () => {
        set({ wizardDraft: null });
      },

      addReminder: (reminderData) => {
        const id = `rem-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        set((state) => ({
          reminders: [...state.reminders, { id, ...reminderData }]
        }));
      },

      triggerReminder: (reminderId, status) => {
        set((state) => ({
          reminders: state.reminders.map((r) => (r.id === reminderId ? { ...r, status } : r))
        }));
        
        const reminder = get().reminders.find((r) => r.id === reminderId);
        if (reminder) {
          get().addAuditLog(
            'Reminder Sent',
            `${status === 'Sent' ? 'Successfully sent' : 'Failed to send'} ${reminder.offset} ${reminder.channel} reminder to ${reminder.passenger_name}`
          );
        }
      },

      addAuditLog: (action, details) => {
        const user = get().currentUser;
        const id = `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const newLog: AuditLog = {
          id,
          action,
          user_id: user ? user.id : 'system',
          user_name: user ? user.name : 'System Scheduler',
          user_role: user ? user.role : 'Staff',
          created_at: new Date().toISOString(),
          ip_address: '192.168.' + Math.floor(Math.random() * 255) + '.' + Math.floor(Math.random() * 255), // Simulate IP
          details
        };
        set((state) => ({
          auditLogs: [newLog, ...state.auditLogs].slice(0, 150) // Limit log buffer
        }));
      },

      clearAuditLogs: () => {
        const user = get().currentUser;
        set({ auditLogs: [] });
        // Log the clear action itself after clearing
        const id = `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const clearLog: AuditLog = {
          id,
          action: 'Logs Cleared',
          user_id: user ? user.id : 'system',
          user_name: user ? user.name : 'System',
          user_role: user ? user.role : 'Admin',
          created_at: new Date().toISOString(),
          ip_address: '192.168.' + Math.floor(Math.random() * 255) + '.' + Math.floor(Math.random() * 255),
          details: `All audit logs cleared by ${user?.name || 'System'}`
        };
        set({ auditLogs: [clearLog] });
      }
    }),
    {
      name: 'season-travels-state-v3',
      partialize: (state) => ({
        users: state.users,
        currentUser: state.currentUser,
        isAuthenticated: state.isAuthenticated,
        tickets: state.tickets,
        reminders: state.reminders,
        auditLogs: state.auditLogs,
        wizardDraft: state.wizardDraft
      })
    }
  )
);
