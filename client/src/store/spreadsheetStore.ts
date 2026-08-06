import { create } from 'zustand';
import { apiFetch } from './flightStore';

export interface CellData {
  value: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  fontSize?: number;
  fontFamily?: string;
  backgroundColor?: string;
  fontColor?: string;
  align?: 'left' | 'center' | 'right';
}

export interface RowData {
  cells: CellData[];
  height?: number;
}

export interface SheetData {
  name: string;
  rows: RowData[];
  colWidths?: number[];
}

export interface SpreadsheetData {
  id: string;
  _id: string;
  title: string;
  sheets: SheetData[];
  createdBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

interface SpreadsheetState {
  spreadsheets: SpreadsheetData[];
  activeSpreadsheet: SpreadsheetData | null;
  loading: boolean;
  isSaving: boolean;
  saveStatus: string;
  
  fetchSpreadsheets: () => Promise<void>;
  fetchSpreadsheetById: (id: string) => Promise<SpreadsheetData | null>;
  createSpreadsheet: (title: string) => Promise<SpreadsheetData | null>;
  updateSpreadsheet: (id: string, data: { title?: string; sheets?: SheetData[] }) => Promise<void>;
  deleteSpreadsheet: (id: string) => Promise<void>;
  setActiveSpreadsheet: (spreadsheet: SpreadsheetData | null) => void;
  setSaveStatus: (status: string) => void;
}

export const useSpreadsheetStore = create<SpreadsheetState>((set, get) => ({
  spreadsheets: [],
  activeSpreadsheet: null,
  loading: false,
  isSaving: false,
  saveStatus: 'All changes saved',

  fetchSpreadsheets: async () => {
    set({ loading: true });
    try {
      const data = await apiFetch('/api/spreadsheets');
      set({ spreadsheets: data.spreadsheets || [] });
    } catch (err) {
      console.error('Failed to fetch spreadsheets:', err);
    } finally {
      set({ loading: false });
    }
  },

  fetchSpreadsheetById: async (id: string) => {
    set({ loading: true });
    try {
      const data = await apiFetch(`/api/spreadsheets/${id}`);
      const spreadsheet = data.spreadsheet || null;
      set({ activeSpreadsheet: spreadsheet });
      return spreadsheet;
    } catch (err) {
      console.error(`Failed to fetch spreadsheet ${id}:`, err);
      return null;
    } finally {
      set({ loading: false });
    }
  },

  createSpreadsheet: async (title: string) => {
    set({ loading: true });
    try {
      // Default with a clean empty sheet
      const defaultSheets: SheetData[] = [
        {
          name: 'Sheet 1',
          rows: Array.from({ length: 30 }, () => ({
            cells: Array.from({ length: 15 }, () => ({
              value: '',
              bold: false,
              italic: false,
              underline: false,
              fontSize: 14,
              fontFamily: 'sans-serif',
              backgroundColor: '',
              fontColor: '',
              align: 'left',
            })),
            height: 30,
          })),
          colWidths: Array.from({ length: 15 }, () => 120),
        },
      ];

      const data = await apiFetch('/api/spreadsheets', {
        method: 'POST',
        body: JSON.stringify({ title, sheets: defaultSheets }),
      });
      const spreadsheet = data.spreadsheet || null;
      if (spreadsheet) {
        set((state) => ({
          spreadsheets: [spreadsheet, ...state.spreadsheets],
          activeSpreadsheet: spreadsheet,
        }));
      }
      return spreadsheet;
    } catch (err) {
      console.error('Failed to create spreadsheet:', err);
      return null;
    } finally {
      set({ loading: false });
    }
  },

  updateSpreadsheet: async (id: string, data: { title?: string; sheets?: SheetData[] }) => {
    set({ isSaving: true, saveStatus: 'Saving...' });
    try {
      const result = await apiFetch(`/api/spreadsheets/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      if (result.success) {
        // Only update the list entry — do NOT replace activeSpreadsheet from the
        // server response.  We already hold the correct latest data locally.
        // Replacing it would trigger a full re-render and interrupt ongoing edits.
        set((state) => ({
          spreadsheets: state.spreadsheets.map((s) =>
            s.id === id ? { ...s, updatedAt: result.spreadsheet?.updatedAt ?? s.updatedAt } : s
          ),
          saveStatus: 'All changes saved',
          isSaving: false,
        }));
      } else {
        set({ saveStatus: 'Error saving', isSaving: false });
      }
    } catch (err) {
      console.error(`Failed to update spreadsheet ${id}:`, err);
      set({ saveStatus: 'Failed to save', isSaving: false });
    }
  },

  deleteSpreadsheet: async (id: string) => {
    try {
      await apiFetch(`/api/spreadsheets/${id}`, {
        method: 'DELETE',
      });
      set((state) => ({
        spreadsheets: state.spreadsheets.filter((s) => s.id !== id),
        activeSpreadsheet:
          state.activeSpreadsheet?.id === id ? null : state.activeSpreadsheet,
      }));
    } catch (err) {
      console.error(`Failed to delete spreadsheet ${id}:`, err);
    }
  },

  setActiveSpreadsheet: (spreadsheet: SpreadsheetData | null) => {
    set({ activeSpreadsheet: spreadsheet });
  },

  setSaveStatus: (status: string) => {
    set({ saveStatus: status });
  },
}));
