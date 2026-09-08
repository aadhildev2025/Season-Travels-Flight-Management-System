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

export interface RangeData {
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
}

export interface SheetData {
  name: string;
  rows: RowData[];
  colWidths?: number[];
  merges?: RangeData[];
  tables?: RangeData[];
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

let cacheTimeout: ReturnType<typeof setTimeout> | null = null;
const cacheActiveSpreadsheet = (spreadsheet: SpreadsheetData | null) => {
  if (cacheTimeout) clearTimeout(cacheTimeout);
  cacheTimeout = setTimeout(() => {
    try {
      if (spreadsheet) {
        localStorage.setItem('st_cached_spreadsheet_v1', JSON.stringify(spreadsheet));
      } else {
        localStorage.removeItem('st_cached_spreadsheet_v1');
      }
    } catch (e) {
      // Ignore storage quota error
    }
  }, 300);
};

export function compactSheetsForSave(sheets: SheetData[]): SheetData[] {
  if (!sheets || !Array.isArray(sheets)) return [];
  return sheets.map(sheet => {
    const merges = sheet.merges || [];
    const tables = sheet.tables || [];
    
    let lastActiveRowIdx = -1;

    for (const m of merges) {
      lastActiveRowIdx = Math.max(lastActiveRowIdx, m.endRow);
    }
    for (const t of tables) {
      lastActiveRowIdx = Math.max(lastActiveRowIdx, t.endRow);
    }

    (sheet.rows || []).forEach((row, rIdx) => {
      const hasCustomHeight = !!row.height && row.height !== 30;
      const hasAnyCellContent = (row.cells || []).some(c => 
        (c.value && c.value.trim() !== '') ||
        c.bold || c.italic || c.underline ||
        (c.backgroundColor && c.backgroundColor !== '') ||
        (c.fontColor && c.fontColor !== '')
      );
      if (hasCustomHeight || hasAnyCellContent) {
        lastActiveRowIdx = Math.max(lastActiveRowIdx, rIdx);
      }
    });

    const activeRows = (sheet.rows || []).slice(0, lastActiveRowIdx + 1).map(row => {
      let lastActiveCol = -1;
      (row.cells || []).forEach((c, cIdx) => {
        if ((c.value && c.value.trim() !== '') || c.bold || c.italic || c.underline || c.backgroundColor || c.fontColor) {
          lastActiveCol = Math.max(lastActiveCol, cIdx);
        }
      });

      const cells = (row.cells || []).slice(0, Math.max(0, lastActiveCol + 1)).map(c => {
        const cleaned: CellData = { value: c.value || '' };
        if (c.bold) cleaned.bold = true;
        if (c.italic) cleaned.italic = true;
        if (c.underline) cleaned.underline = true;
        if (c.fontSize && c.fontSize !== 14) cleaned.fontSize = c.fontSize;
        if (c.fontFamily && c.fontFamily !== 'sans-serif') cleaned.fontFamily = c.fontFamily;
        if (c.backgroundColor) cleaned.backgroundColor = c.backgroundColor;
        if (c.fontColor) cleaned.fontColor = c.fontColor;
        if (c.align && c.align !== 'left') cleaned.align = c.align;
        return cleaned;
      });

      return {
        height: row.height || 30,
        cells,
      };
    });

    return {
      name: sheet.name || 'Sheet 1',
      rows: activeRows,
      colWidths: sheet.colWidths,
      merges: sheet.merges,
      tables: sheet.tables,
    };
  });
}

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
    if (!id) return;
    set({ isSaving: true, saveStatus: 'Saving...' });
    cacheActiveSpreadsheet(get().activeSpreadsheet);
    try {
      const payload: any = {};
      if (data.title !== undefined) payload.title = data.title;
      if (data.sheets !== undefined) payload.sheets = compactSheetsForSave(data.sheets);

      const result = await apiFetch(`/api/spreadsheets/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      if (result.success) {
        set((state) => ({
          spreadsheets: state.spreadsheets.map((s) =>
            s.id === id || s._id === id ? { ...s, updatedAt: result.spreadsheet?.updatedAt ?? s.updatedAt } : s
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
