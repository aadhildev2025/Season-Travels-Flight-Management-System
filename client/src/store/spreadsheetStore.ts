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

const getInitialActiveSpreadsheet = (): SpreadsheetData | null => {
  try {
    const cached = localStorage.getItem('st_cached_spreadsheet_v1');
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (e) {
    // Ignore cache parse error
  }
  return null;
};

const cacheActiveSpreadsheet = (spreadsheet: SpreadsheetData | null) => {
  try {
    if (spreadsheet) {
      localStorage.setItem('st_cached_spreadsheet_v1', JSON.stringify(spreadsheet));
    } else {
      localStorage.removeItem('st_cached_spreadsheet_v1');
    }
  } catch (e) {
    // Ignore storage quota error
  }
};

export const useSpreadsheetStore = create<SpreadsheetState>((set, get) => ({
  spreadsheets: [],
  activeSpreadsheet: getInitialActiveSpreadsheet(),
  loading: false,
  isSaving: false,
  saveStatus: 'All changes saved',

  fetchSpreadsheets: async () => {
    try {
      const data = await apiFetch('/api/spreadsheets');
      const list = data.spreadsheets || [];
      set({ spreadsheets: list });
    } catch (err) {
      console.error('Failed to fetch spreadsheets:', err);
    }
  },

  fetchSpreadsheetById: async (id: string) => {
    try {
      const data = await apiFetch(`/api/spreadsheets/${id}`);
      const spreadsheet = data.spreadsheet || null;
      set({ activeSpreadsheet: spreadsheet });
      cacheActiveSpreadsheet(spreadsheet);
      return spreadsheet;
    } catch (err) {
      console.error(`Failed to fetch spreadsheet ${id}:`, err);
      return null;
    }
  },

  createSpreadsheet: async (title: string) => {
    set({ loading: true });
    try {
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
        cacheActiveSpreadsheet(spreadsheet);
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
    // Cache local active spreadsheet state immediately for 0ms latency
    cacheActiveSpreadsheet(get().activeSpreadsheet);
    try {
      const result = await apiFetch(`/api/spreadsheets/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      if (result.success) {
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
      const newActive = get().activeSpreadsheet?.id === id ? null : get().activeSpreadsheet;
      set((state) => ({
        spreadsheets: state.spreadsheets.filter((s) => s.id !== id),
        activeSpreadsheet: newActive,
      }));
      cacheActiveSpreadsheet(newActive);
    } catch (err) {
      console.error(`Failed to delete spreadsheet ${id}:`, err);
    }
  },

  setActiveSpreadsheet: (spreadsheet: SpreadsheetData | null) => {
    set({ activeSpreadsheet: spreadsheet });
    cacheActiveSpreadsheet(spreadsheet);
  },

  setSaveStatus: (status: string) => {
    set({ saveStatus: status });
  },
}));
