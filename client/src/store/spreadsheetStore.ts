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
  isSyncing: boolean;
  saveStatus: string;
  
  fetchSpreadsheets: () => Promise<void>;
  fetchSpreadsheetById: (id: string) => Promise<SpreadsheetData | null>;
  syncSpreadsheet: (id?: string) => Promise<boolean>;
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
    if (!sheet) return { name: 'Sheet 1', rows: [] };

    const merges = (sheet.merges || []).filter(m =>
      typeof m?.startRow === 'number' && !isNaN(m.startRow) &&
      typeof m?.startCol === 'number' && !isNaN(m.startCol) &&
      typeof m?.endRow === 'number' && !isNaN(m.endRow) &&
      typeof m?.endCol === 'number' && !isNaN(m.endCol)
    ).map(m => ({
      startRow: Math.round(m.startRow),
      startCol: Math.round(m.startCol),
      endRow: Math.round(m.endRow),
      endCol: Math.round(m.endCol),
    }));

    const tables = (sheet.tables || []).filter(t =>
      typeof t?.startRow === 'number' && !isNaN(t.startRow) &&
      typeof t?.startCol === 'number' && !isNaN(t.startCol) &&
      typeof t?.endRow === 'number' && !isNaN(t.endRow) &&
      typeof t?.endCol === 'number' && !isNaN(t.endCol)
    ).map(t => ({
      startRow: Math.round(t.startRow),
      startCol: Math.round(t.startCol),
      endRow: Math.round(t.endRow),
      endCol: Math.round(t.endCol),
    }));
    
    let lastActiveRowIdx = -1;

    for (const m of merges) {
      lastActiveRowIdx = Math.max(lastActiveRowIdx, m.endRow);
    }
    for (const t of tables) {
      lastActiveRowIdx = Math.max(lastActiveRowIdx, t.endRow);
    }

    (sheet.rows || []).forEach((row, rIdx) => {
      if (!row) return;
      const hasCustomHeight = !!row.height && row.height !== 30;
      const hasAnyCellContent = (row.cells || []).some(c => 
        c && ((c.value && c.value.trim() !== '') ||
        c.bold || c.italic || c.underline ||
        (c.backgroundColor && c.backgroundColor !== '') ||
        (c.fontColor && c.fontColor !== '') ||
        (c.align && c.align !== 'left') ||
        (c.fontSize && c.fontSize !== 14) ||
        (c.fontFamily && c.fontFamily !== 'sans-serif'))
      );
      if (hasCustomHeight || hasAnyCellContent) {
        lastActiveRowIdx = Math.max(lastActiveRowIdx, rIdx);
      }
    });

    const activeRows = (sheet.rows || []).slice(0, lastActiveRowIdx + 1).map(row => {
      if (!row) return { height: 30, cells: [] };

      let lastActiveCol = -1;
      (row.cells || []).forEach((c, cIdx) => {
        if (c && (
          (c.value && c.value.trim() !== '') ||
          c.bold || c.italic || c.underline ||
          (c.backgroundColor && c.backgroundColor !== '') ||
          (c.fontColor && c.fontColor !== '') ||
          (c.align && c.align !== 'left') ||
          (c.fontSize && c.fontSize !== 14) ||
          (c.fontFamily && c.fontFamily !== 'sans-serif')
        )) {
          lastActiveCol = Math.max(lastActiveCol, cIdx);
        }
      });

      const cells = (row.cells || []).slice(0, Math.max(0, lastActiveCol + 1)).map(c => {
        if (!c) return { value: '' };
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
      merges,
      tables,
    };
  });
}

export const useSpreadsheetStore = create<SpreadsheetState>((set, get) => ({
  spreadsheets: [],
  activeSpreadsheet: getInitialActiveSpreadsheet(),
  loading: false,
  isSaving: false,
  isSyncing: false,
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
      if (spreadsheet) {
        set({ activeSpreadsheet: spreadsheet });
        cacheActiveSpreadsheet(spreadsheet);
      }
      return spreadsheet;
    } catch (err) {
      console.error(`Failed to fetch spreadsheet ${id}:`, err);
      return null;
    }
  },

  syncSpreadsheet: async (id?: string) => {
    const state = get();
    if (state.isSaving) return false;

    const targetId = id || state.activeSpreadsheet?.id || state.activeSpreadsheet?._id;
    if (!targetId) return false;

    try {
      set({ isSyncing: true });
      const data = await apiFetch(`/api/spreadsheets/${targetId}`);
      const remote = data.spreadsheet;
      if (!remote) return false;

      const current = get().activeSpreadsheet;
      const remoteUpdatedAt = remote.updatedAt ? new Date(remote.updatedAt).getTime() : 0;
      const currentUpdatedAt = current?.updatedAt ? new Date(current.updatedAt).getTime() : 0;

      // Update if remote is newer or content changed
      if (!current || remoteUpdatedAt > currentUpdatedAt || JSON.stringify(remote.sheets) !== JSON.stringify(current.sheets)) {
        set({ activeSpreadsheet: remote, saveStatus: 'All changes saved' });
        cacheActiveSpreadsheet(remote);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Spreadsheet sync error:', err);
      return false;
    } finally {
      set({ isSyncing: false });
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

      if (result.success && result.spreadsheet) {
        const updatedDoc = result.spreadsheet;
        const newId = updatedDoc.id || updatedDoc._id;
        set((state) => {
          const currentActive = state.activeSpreadsheet;
          const updatedActive = currentActive ? { ...currentActive, id: newId, _id: newId, updatedAt: updatedDoc.updatedAt } : currentActive;
          return {
            spreadsheets: state.spreadsheets.some(s => s.id === newId || s._id === newId)
              ? state.spreadsheets.map((s) => (s.id === newId || s._id === newId ? { ...s, updatedAt: updatedDoc.updatedAt } : s))
              : [updatedDoc, ...state.spreadsheets],
            activeSpreadsheet: updatedActive,
            saveStatus: 'All changes saved',
            isSaving: false,
          };
        });
        cacheActiveSpreadsheet(get().activeSpreadsheet);
      } else if (result.success) {
        set({ saveStatus: 'All changes saved', isSaving: false });
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
