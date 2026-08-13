import React, { useState, useEffect, useRef } from 'react';
import { useSpreadsheetStore, SpreadsheetData, SheetData, CellData, RowData } from '../store/spreadsheetStore';
import { 
  ArrowLeft, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, 
  Plus, Trash2, Download, RefreshCw, Type, Save, Grid, Undo, Redo, FileText, Sigma, Calculator, ChevronDown, Table
} from 'lucide-react';

interface SpreadsheetEditorProps {
  onBack?: () => void;
}

export function SpreadsheetEditor({ onBack }: SpreadsheetEditorProps) {
  const { activeSpreadsheet, updateSpreadsheet, setActiveSpreadsheet, saveStatus } = useSpreadsheetStore();
  
  const [activeSheetIdx, setActiveSheetIdx] = useState(0);
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  
  // Drag selection range state & cursor position tracking
  const [selectedRange, setSelectedRange] = useState<{ startRow: number; startCol: number; endRow: number; endCol: number } | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Undo / Redo history state stacks
  const [history, setHistory] = useState<SheetData[][]>([]);
  const [redoStack, setRedoStack] = useState<SheetData[][]>([]);

  // Font Color & Highlight pickers
  const [showColorPicker, setShowColorPicker] = useState<'font' | 'bg' | null>(null);

  // Resize State variables
  const [resizingColIdx, setResizingColIdx] = useState<number | null>(null);
  const [startX, setStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(0);

  const [resizingRowIdx, setResizingRowIdx] = useState<number | null>(null);
  const [startY, setStartY] = useState(0);
  const [startHeight, setStartHeight] = useState(0);

  // Tab Rename State
  const [editingTabIdx, setEditingTabIdx] = useState<number | null>(null);
  const [editTabName, setEditTabName] = useState('');

  const gridContainerRef = useRef<HTMLDivElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const formulaInputRef = useRef<HTMLInputElement>(null);
  
  // Debounce saving
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const triggerAutosave = (updatedSpreadsheet = activeSpreadsheet) => {
    if (!updatedSpreadsheet) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      updateSpreadsheet(updatedSpreadsheet.id, {
        title: updatedSpreadsheet.title,
        sheets: updatedSpreadsheet.sheets,
      });
    }, 300);
  };

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  // Global mouseup to terminate cell drag selecting & mousemove for cursor tracking
  useEffect(() => {
    const handleMouseUp = () => {
      setIsSelecting(false);
    };
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  // Register Ctrl+Z (Undo) and Ctrl+Y (Redo) keyboard shortcuts
  // Register Ctrl+Z (Undo), Ctrl+Y (Redo), and Backspace/Delete cell clearing
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Avoid keyboard shortcut conflicts when editing inside cell inputs
      if (isEditing) return;

      const activeTag = document.activeElement?.tagName?.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        clearSelectedCells();
      } else if (e.key === 'Escape') {
        if (selectedCell) {
          setSelectedRangeExpanded({ startRow: selectedCell.row, startCol: selectedCell.col, endRow: selectedCell.row, endCol: selectedCell.col });
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [history, redoStack, activeSpreadsheet, isEditing, selectedCell, selectedRange, activeSheetIdx]);

  if (!activeSpreadsheet) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-8">
        <p className="text-red-500 font-semibold">No spreadsheet selected.</p>
        <button onClick={onBack} className="btn btn-ghost flex items-center gap-2">
          <ArrowLeft size={16} /> Back
        </button>
      </div>
    );
  }

  const currentSheet = activeSpreadsheet.sheets[activeSheetIdx] || activeSpreadsheet.sheets[0];
  if (!currentSheet) return null;

  // ════════════════════ UNDO / REDO CONTROLS ════════════════════

  // Push current sheet layouts to history stack before changes are made
  const saveHistoryState = () => {
    setHistory(prev => [...prev, JSON.parse(JSON.stringify(activeSpreadsheet.sheets))]);
    setRedoStack([]); // Clear redo stack on new action
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    
    const prevSheets = history[history.length - 1];
    const currentSheets = JSON.parse(JSON.stringify(activeSpreadsheet.sheets));
    
    setRedoStack(prev => [...prev, currentSheets]);
    setHistory(prev => prev.slice(0, -1));
    
    const updated: SpreadsheetData = {
      ...activeSpreadsheet,
      sheets: prevSheets
    };
    setActiveSpreadsheet(updated);
    triggerAutosave(updated);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    
    const nextSheets = redoStack[redoStack.length - 1];
    const currentSheets = JSON.parse(JSON.stringify(activeSpreadsheet.sheets));
    
    setHistory(prev => [...prev, currentSheets]);
    setRedoStack(prev => prev.slice(0, -1));
    
    const updated: SpreadsheetData = {
      ...activeSpreadsheet,
      sheets: nextSheets
    };
    setActiveSpreadsheet(updated);
    triggerAutosave(updated);
  };

  // ════════════════════ MERGED CELLS ENGINE ════════════════════

  // Check if a cell is part of any merge range (returns smallest merge containing cell)
  const getMergeCell = (row: number, col: number) => {
    const merges = (currentSheet as any).merges || [];
    const matches = merges.filter((m: any) => 
      row >= m.startRow && row <= m.endRow && 
      col >= m.startCol && col <= m.endCol
    );
    if (matches.length === 0) return null;
    matches.sort((a: any, b: any) => {
      const areaA = (a.endRow - a.startRow + 1) * (a.endCol - a.startCol + 1);
      const areaB = (b.endRow - b.startRow + 1) * (b.endCol - b.startCol + 1);
      return areaA - areaB;
    });
    return matches[0];
  };

  // Get all merges starting at (row, col) as root
  const getRootMerges = (row: number, col: number) => {
    const merges = (currentSheet as any).merges || [];
    return merges.filter((m: any) => m.startRow === row && m.startCol === col);
  };

  // Skip rendering non-top-left cells in a merged block
  const shouldSkipCell = (row: number, col: number) => {
    return false;
  };

  const setSelectedRangeExpanded = (range: { startRow: number; startCol: number; endRow: number; endCol: number } | null) => {
    if (!range) {
      setSelectedRange(null);
      return;
    }
    setSelectedRange(range);
  };

  // Check if cell falls inside the highlighted selection range
  const isCellInSelection = (row: number, col: number) => {
    if (!selectedRange) return false;
    const minRow = Math.min(selectedRange.startRow, selectedRange.endRow);
    const maxRow = Math.max(selectedRange.startRow, selectedRange.endRow);
    const minCol = Math.min(selectedRange.startCol, selectedRange.endCol);
    const maxCol = Math.max(selectedRange.startCol, selectedRange.endCol);
    return row >= minRow && row <= maxRow && col >= minCol && col <= maxCol;
  };

  // ════════════════════ FORMULA ENGINE ════════════════════

  // Converts 'A' -> 0, 'B' -> 1, 'AA' -> 26
  function colLabelToIndex(label: string): number {
    let idx = 0;
    for (let i = 0; i < label.length; i++) {
      idx = idx * 26 + (label.charCodeAt(i) - 64);
    }
    return idx - 1;
  }

  // Converts 0 -> 'A', 1 -> 'B', 26 -> 'AA'
  function indexToColLabel(index: number): string {
    let label = '';
    let temp = index;
    while (temp >= 0) {
      label = String.fromCharCode((temp % 26) + 65) + label;
      temp = Math.floor(temp / 26) - 1;
    }
    return label;
  }

  function getCellValueByRef(ref: string, sheet: SheetData): string {
    const colLabel = ref.match(/[A-Z]+/)?.[0] || 'A';
    const rowIdx = parseInt(ref.match(/\d+/)?.[0] || '1', 10) - 1;
    const colIdx = colLabelToIndex(colLabel);
    return sheet.rows[rowIdx]?.cells[colIdx]?.value || '';
  }

  function evaluateCell(value: string, sheet: SheetData, visited: Set<string> = new Set()): string {
    if (!value.startsWith('=')) return value;
    
    let formulaStr = value.substring(1).toUpperCase().trim();
    if (visited.has(formulaStr)) return '#CIRCULAR!';
    visited.add(formulaStr);
    
    try {
      // 1. Math functions with ranges: SUM, AVERAGE, COUNT, MIN, MAX (e.g. SUM(A1:B3) or SUM (A1:B3))
      // Supports optional spacing between function name and parameters
      const funcMatch = formulaStr.match(/^([A-Z]+)\s*\(([^)]+)\)$/);
      if (funcMatch) {
        const funcName = funcMatch[1];
        const argsStr = funcMatch[2];
        let cells: CellData[] = [];
        
        if (argsStr.includes(':')) {
          const parts = argsStr.split(':');
          const start = parts[0].trim();
          const end = parts[1].trim();
          
          const startCol = start.match(/[A-Z]+/)?.[0] || 'A';
          const startRow = parseInt(start.match(/\d+/)?.[0] || '1', 10) - 1;
          const endCol = end.match(/[A-Z]+/)?.[0] || 'A';
          const endRow = parseInt(end.match(/\d+/)?.[0] || '1', 10) - 1;
          
          const startColIdx = colLabelToIndex(startCol);
          const endColIdx = colLabelToIndex(endCol);
          
          const minCol = Math.min(startColIdx, endColIdx);
          const maxCol = Math.max(startColIdx, endColIdx);
          const minRow = Math.min(startRow, endRow);
          const maxRow = Math.max(startRow, endRow);
          
          for (let r = minRow; r <= maxRow; r++) {
            const row = sheet.rows[r];
            if (!row) continue;
            for (let c = minCol; c <= maxCol; c++) {
              const cell = row.cells[c];
              if (cell) cells.push(cell);
            }
          }
        } else {
          const refs = argsStr.split(',');
          for (const ref of refs) {
            const trimmedRef = ref.trim();
            const colLabel = trimmedRef.match(/[A-Z]+/)?.[0] || 'A';
            const rowIdx = parseInt(trimmedRef.match(/\d+/)?.[0] || '1', 10) - 1;
            const colIdx = colLabelToIndex(colLabel);
            const cell = sheet.rows[rowIdx]?.cells[colIdx];
            if (cell) cells.push(cell);
          }
        }
        
        const values = cells.map(c => {
          const val = c.value.startsWith('=') ? evaluateCell(c.value, sheet, new Set(visited)) : c.value;
          return parseFloat(val);
        }).filter(v => !isNaN(v));
        
        if (funcName === 'SUM') {
          return values.reduce((sum, v) => sum + v, 0).toString();
        } else if (funcName === 'AVERAGE') {
          return values.length > 0 ? (values.reduce((sum, v) => sum + v, 0) / values.length).toFixed(2) : '0';
        } else if (funcName === 'COUNT') {
          return values.length.toString();
        } else if (funcName === 'MIN') {
          return values.length > 0 ? Math.min(...values).toString() : '0';
        } else if (funcName === 'MAX') {
          return values.length > 0 ? Math.max(...values).toString() : '0';
        }
      }
      
      // 2. Upgraded general math evaluator (supports A1+B1+C1, A1*10, etc.)
      const cellRefRegex = /\b([A-Z]+)(\d+)\b/g;
      
      let expr = formulaStr;
      expr = expr.replace(cellRefRegex, (ref, colLabel, rowStr) => {
        const rowIdx = parseInt(rowStr, 10) - 1;
        const colIdx = colLabelToIndex(colLabel);
        const cell = sheet.rows[rowIdx]?.cells[colIdx];
        if (!cell) return '0';
        
        const valStr = cell.value.startsWith('=') ? evaluateCell(cell.value, sheet, new Set(visited)) : cell.value;
        const num = parseFloat(valStr);
        return isNaN(num) ? '0' : num.toString();
      });
      
      // Safely evaluate math expression containing numbers and basic operators (+, -, *, /, (, ))
      if (/^[0-9.+\-*/()\s]+$/.test(expr)) {
        const result = new Function(`return (${expr})`)();
        if (result === Infinity || result === -Infinity) return '#DIV/0!';
        return typeof result === 'number' && !isNaN(result) ? result.toString() : '#ERROR!';
      }
      
      return '#ERROR!';
    } catch (e) {
      return '#ERROR!';
    }
  }

  const getDisplayValue = (cell: CellData) => {
    if (!cell) return '';
    if (cell.value.startsWith('=')) {
      return evaluateCell(cell.value, currentSheet);
    }
    return cell.value;
  };

  const getSelectionStats = () => {
    if (!selectedRange) return null;
    
    const minRow = Math.min(selectedRange.startRow, selectedRange.endRow);
    const maxRow = Math.max(selectedRange.startRow, selectedRange.endRow);
    const minCol = Math.min(selectedRange.startCol, selectedRange.endCol);
    const maxCol = Math.max(selectedRange.startCol, selectedRange.endCol);
    
    let numbers: number[] = [];
    let count = 0;
    
    for (let r = minRow; r <= maxRow; r++) {
      const row = currentSheet.rows[r];
      if (!row) continue;
      for (let c = minCol; c <= maxCol; c++) {
        const cell = row.cells[c];
        if (cell && cell.value.trim() !== '') {
          count++;
          const valStr = cell.value.startsWith('=') ? evaluateCell(cell.value, currentSheet) : cell.value;
          const num = parseFloat(valStr);
          if (!isNaN(num)) {
            numbers.push(num);
          }
        }
      }
    }
    
    if (numbers.length === 0) {
      if (count > 0) {
        return { count };
      }
      return null;
    }
    
    const sum = numbers.reduce((a, b) => a + b, 0);
    const avg = parseFloat((sum / numbers.length).toFixed(2));
    const min = Math.min(...numbers);
    const max = Math.max(...numbers);
    
    return {
      sum,
      avg,
      count,
      min,
      max
    };
  };

  // ════════════════════ ACTIONS & EDITING ════════════════════

  // Cell Drag Selection mouse down
  const handleCellMouseDown = (rowIdx: number, colIdx: number, e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left clicks
    if (isEditing) {
      saveCellEdit();
    }

    const merge = getMergeCell(rowIdx, colIdx);
    const targetRow = merge ? merge.startRow : rowIdx;
    const targetCol = merge ? merge.startCol : colIdx;

    setIsSelecting(true);
    setSelectedCell({ row: targetRow, col: targetCol });
    
    const range = merge
      ? { startRow: merge.startRow, startCol: merge.startCol, endRow: merge.endRow, endCol: merge.endCol }
      : { startRow: rowIdx, startCol: colIdx, endRow: rowIdx, endCol: colIdx };
    setSelectedRangeExpanded(range);

    const cell = currentSheet.rows[targetRow]?.cells[targetCol];
    setEditValue(cell ? cell.value : '');
    setIsEditing(false);
  };

  // Cell Drag Selection mouse enter hover
  const handleCellMouseEnter = (rowIdx: number, colIdx: number, e?: React.MouseEvent) => {
    if (!isSelecting || !selectedRange) return;
    if (e && e.buttons !== 1) {
      setIsSelecting(false);
      return;
    }
    const merge = getMergeCell(rowIdx, colIdx);
    const range = {
      ...selectedRange,
      endRow: merge ? merge.endRow : rowIdx,
      endCol: merge ? merge.endCol : colIdx
    };
    setSelectedRangeExpanded(range);
  };

  const handleCellDoubleClick = (rowIdx: number, colIdx: number) => {
    const merge = getMergeCell(rowIdx, colIdx);
    const targetRow = merge ? merge.startRow : rowIdx;
    const targetCol = merge ? merge.startCol : colIdx;

    setSelectedCell({ row: targetRow, col: targetCol });
    const range = merge 
      ? { startRow: merge.startRow, startCol: merge.startCol, endRow: merge.endRow, endCol: merge.endCol }
      : { startRow: targetRow, startCol: targetCol, endRow: targetRow, endCol: targetCol };
    setSelectedRangeExpanded(range);

    const cell = currentSheet.rows[targetRow]?.cells[targetCol];
    setEditValue(cell ? cell.value : '');
    setIsEditing(true);
    setTimeout(() => editInputRef.current?.focus(), 50);
  };

  const saveCellEdit = () => {
    if (!selectedCell) return;
    saveHistoryState(); // Save undo checkpoint

    const targetRow = selectedCell.row;
    const targetCol = selectedCell.col;

    const updated: SpreadsheetData = JSON.parse(JSON.stringify(activeSpreadsheet));
    const sheet = updated.sheets[activeSheetIdx];

    if (!sheet.rows[targetRow]) {
      sheet.rows[targetRow] = { cells: [], height: 30 };
    }
    if (!sheet.rows[targetRow].cells[targetCol]) {
      sheet.rows[targetRow].cells[targetCol] = {
        value: '', bold: false, italic: false, underline: false,
        fontSize: 14, fontFamily: 'sans-serif', backgroundColor: '', fontColor: '', align: 'left'
      };
    }

    sheet.rows[targetRow].cells[targetCol].value = editValue;

    setActiveSpreadsheet(updated);
    setIsEditing(false);
    triggerAutosave(updated);
  };

  // Format all selected cells in current selectedRange
  const updateCellFormatting = (formatter: (cell: CellData) => CellData) => {
    if (!selectedRange) return;
    saveHistoryState(); // Save undo checkpoint

    const updated: SpreadsheetData = JSON.parse(JSON.stringify(activeSpreadsheet));
    const sheet = updated.sheets[activeSheetIdx];

    const minRow = Math.min(selectedRange.startRow, selectedRange.endRow);
    const maxRow = Math.max(selectedRange.startRow, selectedRange.endRow);
    const minCol = Math.min(selectedRange.startCol, selectedRange.endCol);
    const maxCol = Math.max(selectedRange.startCol, selectedRange.endCol);

    for (let r = minRow; r <= maxRow; r++) {
      const row = sheet.rows[r];
      if (row) {
        for (let c = minCol; c <= maxCol; c++) {
          const cell = row.cells[c] || {
            value: '', bold: false, italic: false, underline: false,
            fontSize: 14, fontFamily: 'sans-serif', backgroundColor: '', fontColor: '', align: 'left'
          };
          row.cells[c] = formatter(cell);
        }
      }
    }

    setActiveSpreadsheet(updated);
    triggerAutosave(updated);
  };

  // ════════════════════ AUTOSUM & FORMULA CALCULATION HELPERS ════════════════════

  const insertAutoSum = (calcType: 'SUM' | 'AVERAGE' | 'COUNT' | 'MIN' | 'MAX' = 'SUM') => {
    if (!selectedRange || !activeSpreadsheet) return;

    const minRow = Math.min(selectedRange.startRow, selectedRange.endRow);
    const maxRow = Math.max(selectedRange.startRow, selectedRange.endRow);
    const minCol = Math.min(selectedRange.startCol, selectedRange.endCol);
    const maxCol = Math.max(selectedRange.startCol, selectedRange.endCol);

    let targetRow = maxRow + 1;
    let targetCol = minCol;

    const startRef = `${indexToColLabel(minCol)}${minRow + 1}`;
    const endRef = `${indexToColLabel(maxCol)}${maxRow + 1}`;
    const formula = (minRow === maxRow && minCol === maxCol)
      ? `=${calcType}(${startRef})`
      : `=${calcType}(${startRef}:${endRef})`;

    saveHistoryState();

    const updated: SpreadsheetData = JSON.parse(JSON.stringify(activeSpreadsheet));
    const sheet = updated.sheets[activeSheetIdx];

    while (sheet.rows.length <= targetRow) {
      const numCols = sheet.rows[0]?.cells.length || 15;
      const newCells: CellData[] = Array.from({ length: numCols }, () => ({
        value: '', bold: false, italic: false, underline: false,
        fontSize: 14, fontFamily: 'sans-serif', backgroundColor: '', fontColor: '', align: 'left'
      }));
      sheet.rows.push({ height: 30, cells: newCells });
    }

    const targetCell = sheet.rows[targetRow].cells[targetCol] || {
      value: '', bold: true, italic: false, underline: false,
      fontSize: 14, fontFamily: 'sans-serif', backgroundColor: '', fontColor: '', align: 'left'
    };

    targetCell.value = formula;
    targetCell.bold = true;
    sheet.rows[targetRow].cells[targetCol] = targetCell;

    setActiveSpreadsheet(updated);
    triggerAutosave(updated);

    setSelectedCell({ row: targetRow, col: targetCol });
    setSelectedRangeExpanded({ startRow: targetRow, startCol: targetCol, endRow: targetRow, endCol: targetCol });
    setEditValue(formula);
  };

  // ════════════════════ CREATE TABLE & MERGE ACTIONS ════════════════════

  const createTableFromSelection = () => {
    if (!activeSpreadsheet) return;
    saveHistoryState(); // Save undo checkpoint

    const updated: SpreadsheetData = JSON.parse(JSON.stringify(activeSpreadsheet));
    const sheet = updated.sheets[activeSheetIdx] as any;
    if (!sheet.merges) sheet.merges = [];

    let minRow = 0;
    let maxRow = 4;
    let minCol = 0;
    let maxCol = 4;

    if (selectedRange) {
      minRow = Math.min(selectedRange.startRow, selectedRange.endRow);
      maxRow = Math.max(selectedRange.startRow, selectedRange.endRow);
      minCol = Math.min(selectedRange.startCol, selectedRange.endCol);
      maxCol = Math.max(selectedRange.startCol, selectedRange.endCol);

      // If single cell selected, default to a 5x4 table starting at selected cell
      if (minRow === maxRow && minCol === maxCol) {
        maxRow = Math.min(minRow + 4, sheet.rows.length - 1);
        maxCol = Math.min(minCol + 4, (sheet.rows[0]?.cells.length || 15) - 1);
      }
    } else if (selectedCell) {
      minRow = selectedCell.row;
      minCol = selectedCell.col;
      maxRow = Math.min(minRow + 4, sheet.rows.length - 1);
      maxCol = Math.min(minCol + 4, (sheet.rows[0]?.cells.length || 15) - 1);
    } else {
      // Default A1..E5 table
      minRow = 0;
      minCol = 0;
      maxRow = 4;
      maxCol = 4;
    }

    // 1. Format Top Row (Header Row)
    for (let c = minCol; c <= maxCol; c++) {
      const cell = sheet.rows[minRow]?.cells[c];
      if (cell) {
        cell.bold = true;
        cell.align = 'center';
        if (!cell.backgroundColor) cell.backgroundColor = '#f1f5f9';
        if (!cell.value || cell.value.trim() === '') {
          cell.value = `Header ${c - minCol + 1}`;
        }
      }
    }

    // 2. Create Table Body Columns: Merge rows minRow+1 to maxRow for each column in table
    if (maxRow > minRow) {
      const bodyStartRow = minRow + 1;
      
      for (let c = minCol; c <= maxCol; c++) {
        // Remove any overlapping merges in this column range
        sheet.merges = sheet.merges.filter((m: any) => {
          const isOverlapping = !(maxRow < m.startRow || bodyStartRow > m.endRow || c < m.startCol || c > m.endCol);
          return !isOverlapping;
        });

        // Push column body merge
        sheet.merges.push({
          startRow: bodyStartRow,
          startCol: c,
          endRow: maxRow,
          endCol: c
        });
      }
    }

    setActiveSpreadsheet(updated);
    setSelectedCell({ row: minRow, col: minCol });
    setSelectedRangeExpanded({ startRow: minRow, startCol: minCol, endRow: maxRow, endCol: maxCol });
    triggerAutosave(updated);
  };

  const mergeSelectedCells = () => {
    if (!selectedRange) return;
    saveHistoryState(); // Save undo checkpoint

    const minRow = Math.min(selectedRange.startRow, selectedRange.endRow);
    const maxRow = Math.max(selectedRange.startRow, selectedRange.endRow);
    const minCol = Math.min(selectedRange.startCol, selectedRange.endCol);
    const maxCol = Math.max(selectedRange.startCol, selectedRange.endCol);

    if (minRow === maxRow && minCol === maxCol) return; // Need at least 2 cells

    const updated: SpreadsheetData = JSON.parse(JSON.stringify(activeSpreadsheet));
    const sheet = updated.sheets[activeSheetIdx] as any;
    if (!sheet.merges) sheet.merges = [];

    // Filter existing merges when adding newMerge:
    sheet.merges = sheet.merges.filter((m: any) => {
      const isIdentical = m.startRow === minRow && m.endRow === maxRow && m.startCol === minCol && m.endCol === maxCol;
      const isChild = m.startRow >= minRow && m.endRow <= maxRow && m.startCol >= minCol && m.endCol <= maxCol;
      return !isIdentical && !isChild;
    });

    // Clear values of non-top-left cells inside the merge range
    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        if (r === minRow && c === minCol) continue;
        if (sheet.rows[r]?.cells[c]) {
          sheet.rows[r].cells[c].value = '';
        }
      }
    }

    sheet.merges.push({
      startRow: minRow,
      startCol: minCol,
      endRow: maxRow,
      endCol: maxCol
    });

    setActiveSpreadsheet(updated);
    setSelectedCell({ row: minRow, col: minCol });
    setSelectedRangeExpanded({ startRow: minRow, startCol: minCol, endRow: maxRow, endCol: maxCol });
    triggerAutosave(updated);
  };

  const unmergeSelectedCells = () => {
    if (!selectedRange) return;
    saveHistoryState(); // Save undo checkpoint

    const minRow = Math.min(selectedRange.startRow, selectedRange.endRow);
    const maxRow = Math.max(selectedRange.startRow, selectedRange.endRow);
    const minCol = Math.min(selectedRange.startCol, selectedRange.endCol);
    const maxCol = Math.max(selectedRange.startCol, selectedRange.endCol);

    const updated: SpreadsheetData = JSON.parse(JSON.stringify(activeSpreadsheet));
    const sheet = updated.sheets[activeSheetIdx] as any;
    if (!sheet.merges || sheet.merges.length === 0) return;

    // Find all merges intersecting with selection
    const intersectingMerges = sheet.merges.filter((m: any) => {
      return !(
        maxRow < m.startRow || minRow > m.endRow ||
        maxCol < m.startCol || minCol > m.endCol
      );
    });

    if (intersectingMerges.length === 0) return;

    // Check if any intersecting merge matches the exact selection
    const exactMatch = intersectingMerges.find((m: any) => 
      m.startRow === minRow && m.endRow === maxRow && m.startCol === minCol && m.endCol === maxCol
    );

    if (exactMatch) {
      sheet.merges = sheet.merges.filter((m: any) => m !== exactMatch);
    } else {
      // Find smallest area intersecting merge (e.g. inner sub-merge)
      intersectingMerges.sort((a: any, b: any) => {
        const areaA = (a.endRow - a.startRow + 1) * (a.endCol - a.startCol + 1);
        const areaB = (b.endRow - b.startRow + 1) * (b.endCol - b.startCol + 1);
        return areaA - areaB;
      });
      const smallestMerge = intersectingMerges[0];
      sheet.merges = sheet.merges.filter((m: any) => m !== smallestMerge);
    }

    setActiveSpreadsheet(updated);
    triggerAutosave(updated);
  };

  const clearSelectedCells = () => {
    if (!selectedCell) return;
    saveHistoryState(); // Save undo checkpoint

    const minRow = selectedRange ? Math.min(selectedRange.startRow, selectedRange.endRow) : selectedCell.row;
    const maxRow = selectedRange ? Math.max(selectedRange.startRow, selectedRange.endRow) : selectedCell.row;
    const minCol = selectedRange ? Math.min(selectedRange.startCol, selectedRange.endCol) : selectedCell.col;
    const maxCol = selectedRange ? Math.max(selectedRange.startCol, selectedRange.endCol) : selectedCell.col;

    const updated: SpreadsheetData = JSON.parse(JSON.stringify(activeSpreadsheet));
    const sheet = updated.sheets[activeSheetIdx];

    let cleared = false;
    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        if (sheet.rows[r]?.cells[c] && sheet.rows[r].cells[c].value !== '') {
          sheet.rows[r].cells[c].value = '';
          cleared = true;
        }
      }
    }

    if (cleared) {
      setActiveSpreadsheet(updated);
      setEditValue('');
      triggerAutosave(updated);
    }

    // Collapse multi-cell range selection box back to single active cell
    setSelectedRangeExpanded({
      startRow: selectedCell.row,
      startCol: selectedCell.col,
      endRow: selectedCell.row,
      endCol: selectedCell.col
    });
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!selectedCell) return;
    
    if (isEditing) {
      if (e.key === 'Enter') {
        saveCellEdit();
        if (selectedCell.row < currentSheet.rows.length - 1) {
          const next = { row: selectedCell.row + 1, col: selectedCell.col };
          setSelectedCell(next);
          setSelectedRangeExpanded({ startRow: next.row, startCol: next.col, endRow: next.row, endCol: next.col });
        }
      } else if (e.key === 'Escape') {
        const cell = currentSheet.rows[selectedCell.row]?.cells[selectedCell.col];
        setEditValue(cell ? cell.value : '');
        setIsEditing(false);
        if (selectedCell) {
          setSelectedRangeExpanded({ startRow: selectedCell.row, startCol: selectedCell.col, endRow: selectedCell.row, endCol: selectedCell.col });
        }
      }
      return;
    }

    let nextRow = selectedCell.row;
    let nextCol = selectedCell.col;
    let handled = false;

    switch (e.key) {
      case 'Backspace':
      case 'Delete':
        e.preventDefault();
        clearSelectedCells();
        break;
      case 'ArrowUp':
        if (nextRow > 0) {
          nextRow--;
          const m = getMergeCell(nextRow, nextCol);
          if (m) { nextRow = m.startRow; nextCol = m.startCol; }
        }
        handled = true;
        break;
      case 'ArrowDown':
        if (nextRow < currentSheet.rows.length - 1) {
          const currentMerge = getMergeCell(selectedCell.row, selectedCell.col);
          if (currentMerge && selectedCell.row === currentMerge.startRow) {
            nextRow = currentMerge.endRow + 1;
          } else {
            nextRow++;
          }
          if (nextRow < currentSheet.rows.length) {
            const m = getMergeCell(nextRow, nextCol);
            if (m) { nextRow = m.startRow; nextCol = m.startCol; }
          }
        }
        handled = true;
        break;
      case 'ArrowLeft':
        if (nextCol > 0) {
          nextCol--;
          const m = getMergeCell(nextRow, nextCol);
          if (m) { nextRow = m.startRow; nextCol = m.startCol; }
        }
        handled = true;
        break;
      case 'ArrowRight':
        if (nextCol < (currentSheet.rows[0]?.cells.length || 0) - 1) {
          const currentMerge = getMergeCell(selectedCell.row, selectedCell.col);
          if (currentMerge && selectedCell.col === currentMerge.startCol) {
            nextCol = currentMerge.endCol + 1;
          } else {
            nextCol++;
          }
          if (nextCol < (currentSheet.rows[0]?.cells.length || 0)) {
            const m = getMergeCell(nextRow, nextCol);
            if (m) { nextRow = m.startRow; nextCol = m.startCol; }
          }
        }
        handled = true;
        break;
      case 'Tab':
        e.preventDefault();
        if (nextCol < (currentSheet.rows[0]?.cells.length || 0) - 1) {
          nextCol++;
        } else if (nextRow < currentSheet.rows.length - 1) {
          nextRow++;
          nextCol = 0;
        }
        handled = true;
        break;
      case 'Enter':
        e.preventDefault();
        setIsEditing(true);
        setTimeout(() => editInputRef.current?.focus(), 50);
        handled = true;
        break;
      default:
        // Key type trigger
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          setEditValue(e.key);
          setIsEditing(true);
          setTimeout(() => editInputRef.current?.focus(), 50);
          handled = true;
        }
        break;
    }

    if (handled) {
      setSelectedCell({ row: nextRow, col: nextCol });
      setSelectedRangeExpanded({ startRow: nextRow, startCol: nextCol, endRow: nextRow, endCol: nextCol });
      const cell = currentSheet.rows[nextRow]?.cells[nextCol];
      setEditValue(cell ? cell.value : '');
    }
  };

  const activeCell = selectedCell ? currentSheet.rows[selectedCell.row]?.cells[selectedCell.col] : null;

  // ════════════════════ HEADER CLICKS FOR ROW/COL SELECTION ════════════════════

  // Click column header label to select entire column
  const handleColHeaderMouseDown = (colIdx: number, e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsSelecting(true);
    const numRows = currentSheet.rows.length;
    setSelectedCell({ row: 0, col: colIdx });
    
    const range = { startRow: 0, startCol: colIdx, endRow: numRows - 1, endCol: colIdx };
    setSelectedRangeExpanded(range);
  };

  const handleColHeaderMouseEnter = (colIdx: number) => {
    if (!isSelecting || !selectedRange) return;
    const numRows = currentSheet.rows.length;
    const range = {
      ...selectedRange,
      endCol: colIdx,
      endRow: numRows - 1
    };
    setSelectedRangeExpanded(range);
  };

  // Click row header label to select entire row
  const handleRowHeaderMouseDown = (rowIdx: number, e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsSelecting(true);
    const numCols = currentSheet.rows[0]?.cells.length || 15;
    setSelectedCell({ row: rowIdx, col: 0 });

    const range = { startRow: rowIdx, startCol: 0, endRow: rowIdx, endCol: numCols - 1 };
    setSelectedRangeExpanded(range);
  };

  const handleRowHeaderMouseEnter = (rowIdx: number) => {
    if (!isSelecting || !selectedRange) return;
    const numCols = currentSheet.rows[0]?.cells.length || 15;
    const range = {
      ...selectedRange,
      endRow: rowIdx,
      endCol: numCols - 1
    };
    setSelectedRangeExpanded(range);
  };

  // ════════════════════ DRAG RESIZE LIFECYCLE ════════════════════

  const handleColResizeStart = (e: React.MouseEvent, colIdx: number) => {
    e.preventDefault();
    e.stopPropagation();
    setResizingColIdx(colIdx);
    setStartX(e.clientX);
    const w = currentSheet.colWidths?.[colIdx] || 120;
    setStartWidth(w);
  };

  useEffect(() => {
    if (resizingColIdx === null) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startX;
      const newWidth = Math.max(60, startWidth + deltaX);
      const updated: SpreadsheetData = JSON.parse(JSON.stringify(activeSpreadsheet));
      const sheet = updated.sheets[activeSheetIdx];
      const widths = [...(sheet.colWidths || [])];
      widths[resizingColIdx] = newWidth;
      sheet.colWidths = widths;
      setActiveSpreadsheet(updated);
    };

    const handleMouseUp = () => {
      setResizingColIdx(null);
      triggerAutosave();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingColIdx, startX, startWidth]);

  const handleRowResizeStart = (e: React.MouseEvent, rowIdx: number) => {
    e.preventDefault();
    e.stopPropagation();
    setResizingRowIdx(rowIdx);
    setStartY(e.clientY);
    const h = currentSheet.rows[rowIdx]?.height || 30;
    setStartHeight(h);
  };

  useEffect(() => {
    if (resizingRowIdx === null) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      const deltaY = e.clientY - startY;
      const newHeight = Math.max(20, startHeight + deltaY);
      const updated: SpreadsheetData = JSON.parse(JSON.stringify(activeSpreadsheet));
      const sheet = updated.sheets[activeSheetIdx];
      if (sheet.rows[resizingRowIdx]) {
        sheet.rows[resizingRowIdx].height = newHeight;
      }
      setActiveSpreadsheet(updated);
    };

    const handleMouseUp = () => {
      setResizingRowIdx(null);
      triggerAutosave();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingRowIdx, startY, startHeight]);

  // ════════════════════ MULTI-SHEET TABS ════════════════════

  const handleAddSheet = () => {
    saveHistoryState(); // Save undo checkpoint
    const updated: SpreadsheetData = JSON.parse(JSON.stringify(activeSpreadsheet));
    const num = updated.sheets.length + 1;
    
    const newSheet: SheetData = {
      name: `Sheet ${num}`,
      rows: Array.from({ length: 30 }, () => ({
        cells: Array.from({ length: 15 }, () => ({
          value: '', bold: false, italic: false, underline: false,
          fontSize: 14, fontFamily: 'sans-serif', backgroundColor: '', fontColor: '', align: 'left'
        })),
        height: 30,
      })),
      colWidths: Array.from({ length: 15 }, () => 120),
    };

    updated.sheets.push(newSheet);
    setActiveSpreadsheet(updated);
    setActiveSheetIdx(updated.sheets.length - 1);
    setSelectedCell(null);
    setSelectedRange(null);
    triggerAutosave(updated);
  };

  const handleDeleteSheet = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeSpreadsheet.sheets.length <= 1) return;
    saveHistoryState(); // Save undo checkpoint

    const updated: SpreadsheetData = JSON.parse(JSON.stringify(activeSpreadsheet));
    updated.sheets.splice(idx, 1);
    
    setActiveSpreadsheet(updated);
    setActiveSheetIdx(Math.max(0, idx - 1));
    setSelectedCell(null);
    setSelectedRange(null);
    triggerAutosave(updated);
  };

  const handleStartRenameSheet = (idx: number) => {
    setEditingTabIdx(idx);
    setEditTabName(activeSpreadsheet.sheets[idx].name);
  };

  const handleSaveRenameSheet = () => {
    if (editingTabIdx === null || !editTabName.trim()) return;
    saveHistoryState(); // Save undo checkpoint
    const updated: SpreadsheetData = JSON.parse(JSON.stringify(activeSpreadsheet));
    updated.sheets[editingTabIdx].name = editTabName.trim();
    setActiveSpreadsheet(updated);
    setEditingTabIdx(null);
    triggerAutosave(updated);
  };

  // ════════════════════ INSERT/DELETE ROWS & COLS ════════════════════

  const insertRow = (above = true) => {
    if (!selectedCell) return;
    saveHistoryState(); // Save undo checkpoint
    const updated: SpreadsheetData = JSON.parse(JSON.stringify(activeSpreadsheet));
    const sheet = updated.sheets[activeSheetIdx];
    const targetIdx = above ? selectedCell.row : selectedCell.row + 1;
    
    const numCols = sheet.rows[0]?.cells.length || 15;
    const newRow: RowData = {
      cells: Array.from({ length: numCols }, () => ({
        value: '', bold: false, italic: false, underline: false,
        fontSize: 14, fontFamily: 'sans-serif', backgroundColor: '', fontColor: '', align: 'left'
      })),
      height: 30
    };

    sheet.rows.splice(targetIdx, 0, newRow);
    setActiveSpreadsheet(updated);
    
    const next = { row: targetIdx, col: selectedCell.col };
    setSelectedCell(next);
    setSelectedRangeExpanded({ startRow: next.row, startCol: next.col, endRow: next.row, endCol: next.col });
    triggerAutosave(updated);
  };

  const deleteRow = () => {
    if (!selectedCell) return;
    saveHistoryState(); // Save undo checkpoint
    const updated: SpreadsheetData = JSON.parse(JSON.stringify(activeSpreadsheet));
    const sheet = updated.sheets[activeSheetIdx];
    if (sheet.rows.length <= 1) return;

    sheet.rows.splice(selectedCell.row, 1);
    setActiveSpreadsheet(updated);
    
    const nextRowIdx = Math.min(selectedCell.row, sheet.rows.length - 1);
    const next = { row: nextRowIdx, col: selectedCell.col };
    setSelectedCell(next);
    setSelectedRangeExpanded({ startRow: next.row, startCol: next.col, endRow: next.row, endCol: next.col });
    triggerAutosave(updated);
  };

  const insertColumn = (left = true) => {
    if (!selectedCell) return;
    saveHistoryState(); // Save undo checkpoint
    const updated: SpreadsheetData = JSON.parse(JSON.stringify(activeSpreadsheet));
    const sheet = updated.sheets[activeSheetIdx];
    const targetIdx = left ? selectedCell.col : selectedCell.col + 1;

    sheet.rows.forEach(row => {
      row.cells.splice(targetIdx, 0, {
        value: '', bold: false, italic: false, underline: false,
        fontSize: 14, fontFamily: 'sans-serif', backgroundColor: '', fontColor: '', align: 'left'
      });
    });

    if (sheet.colWidths) {
      sheet.colWidths.splice(targetIdx, 0, 120);
    }

    setActiveSpreadsheet(updated);
    
    const next = { row: selectedCell.row, col: targetIdx };
    setSelectedCell(next);
    setSelectedRangeExpanded({ startRow: next.row, startCol: next.col, endRow: next.row, endCol: next.col });
    triggerAutosave(updated);
  };

  const deleteColumn = () => {
    if (!selectedCell) return;
    saveHistoryState(); // Save undo checkpoint
    const updated: SpreadsheetData = JSON.parse(JSON.stringify(activeSpreadsheet));
    const sheet = updated.sheets[activeSheetIdx];
    const numCols = sheet.rows[0]?.cells.length || 0;
    if (numCols <= 1) return;

    sheet.rows.forEach(row => {
      row.cells.splice(selectedCell.col, 1);
    });

    if (sheet.colWidths) {
      sheet.colWidths.splice(selectedCell.col, 1);
    }

    setActiveSpreadsheet(updated);
    
    const nextColIdx = Math.min(selectedCell.col, numCols - 2);
    const next = { row: selectedCell.row, col: nextColIdx };
    setSelectedCell(next);
    setSelectedRangeExpanded({ startRow: next.row, startCol: next.col, endRow: next.row, endCol: next.col });
    triggerAutosave(updated);
  };

  // ════════════════════ CSV EXPORT ════════════════════

  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    
    currentSheet.rows.forEach((row) => {
      const rowData = row.cells.map((cell) => {
        const val = getDisplayValue(cell);
        return `"${val.replace(/"/g, '""')}"`;
      });
      csvContent += rowData.join(",") + "\r\n";
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${activeSpreadsheet.title}_${currentSheet.name}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ════════════════════ PDF EXPORT ════════════════════

  const handleExportPDF = async () => {
    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');
      const { applySeasonTravelsWatermark } = await import('../utils/pdfWatermark');

      const maxCols = currentSheet.rows[0]?.cells.length || 10;
      const colHeaders: string[] = [];
      for (let c = 0; c < maxCols; c++) {
        colHeaders.push(indexToColLabel(c));
      }

      const bodyRows = currentSheet.rows.map((row) => {
        return row.cells.map((cell) => getDisplayValue(cell));
      });

      let lastNonEmptyRowIdx = bodyRows.length - 1;
      while (lastNonEmptyRowIdx >= 0 && bodyRows[lastNonEmptyRowIdx].every(v => !v || v.trim() === '')) {
        lastNonEmptyRowIdx--;
      }
      const trimmedBody = bodyRows.slice(0, Math.max(lastNonEmptyRowIdx + 1, 5));

      let maxNonEmptyCol = colHeaders.length - 1;
      while (maxNonEmptyCol >= 3 && trimmedBody.every(row => !row[maxNonEmptyCol] || row[maxNonEmptyCol].trim() === '')) {
        maxNonEmptyCol--;
      }
      const finalHeaders = colHeaders.slice(0, maxNonEmptyCol + 1);
      const finalBody = trimmedBody.map(row => row.slice(0, maxNonEmptyCol + 1));

      const doc = new jsPDF({ orientation: finalHeaders.length > 7 ? 'landscape' : 'portrait' });

      autoTable(doc, {
        startY: 24,
        margin: { top: 24, bottom: 15, left: 14, right: 14 },
        head: [finalHeaders],
        body: finalBody,
        styles: {
          fontSize: 9,
          cellPadding: 4,
          textColor: [30, 41, 59],
        },
        headStyles: {
          fillColor: [15, 23, 42],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9.5,
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
      });

      applySeasonTravelsWatermark(doc, `${activeSpreadsheet.title} - ${currentSheet.name}`);

      const dateStr = new Date().toISOString().slice(0, 10);
      doc.save(`${activeSpreadsheet.title}_${currentSheet.name}_${dateStr}.pdf`);
    } catch (err) {
      console.error('PDF export failed:', err);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 128px)', background: 'var(--bg2)', borderRadius: 16, border: '1px solid var(--border)', overflow: 'hidden' }}>
      
      {/* ════════════════════ TOOLBAR ════════════════════ */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, padding: '10px 16px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        
        {onBack && (
          <>
            <button onClick={onBack} className="btn btn-ghost btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px' }}>
              <ArrowLeft size={14} /> Back
            </button>
            <div style={{ height: 20, width: 1, background: 'var(--border)' }} />
          </>
        )}

        {/* Undo / Redo Buttons */}
        <div style={{ display: 'flex', gap: 2 }}>
          <button 
            onClick={handleUndo} 
            disabled={history.length === 0}
            className="btn btn-ghost btn-sm" 
            style={{ padding: 4, minWidth: 24, height: 24 }}
            title="Undo (Ctrl+Z)"
          >
            <Undo size={14} />
          </button>
          <button 
            onClick={handleRedo} 
            disabled={redoStack.length === 0}
            className="btn btn-ghost btn-sm" 
            style={{ padding: 4, minWidth: 24, height: 24 }}
            title="Redo (Ctrl+Y)"
          >
            <Redo size={14} />
          </button>
        </div>

        <div style={{ height: 20, width: 1, background: 'var(--border)' }} />

        {/* Font Family Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Type size={14} style={{ color: 'var(--text)' }} />
          <select 
            value={activeCell?.fontFamily || 'sans-serif'} 
            onChange={(e) => updateCellFormatting(c => ({ ...c, fontFamily: e.target.value }))}
            disabled={!selectedCell}
            style={{ background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 6, padding: '3px 8px', fontSize: 12, outline: 'none' }}
          >
            <option value="sans-serif">System Sans</option>
            <option value="Inter">Inter</option>
            <option value="monospace">JetBrains Mono</option>
            <option value="serif">Georgia Serif</option>
            <option value="cursive">Cursive</option>
          </select>
        </div>

        {/* Font Size Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <button 
            disabled={!selectedCell || (activeCell?.fontSize || 14) <= 8}
            onClick={() => updateCellFormatting(c => ({ ...c, fontSize: Math.max(8, (c.fontSize || 14) - 1) }))}
            className="btn btn-ghost btn-sm"
            style={{ padding: 4, minWidth: 24, height: 24 }}
            title="Decrease Font Size"
          >
            A-
          </button>
          <span style={{ fontSize: 12, width: 20, textAlign: 'center', fontWeight: 600 }}>{activeCell?.fontSize || 14}</span>
          <button 
            disabled={!selectedCell || (activeCell?.fontSize || 14) >= 36}
            onClick={() => updateCellFormatting(c => ({ ...c, fontSize: Math.min(36, (c.fontSize || 14) + 1) }))}
            className="btn btn-ghost btn-sm"
            style={{ padding: 4, minWidth: 24, height: 24 }}
            title="Increase Font Size"
          >
            A+
          </button>
        </div>

        <div style={{ height: 20, width: 1, background: 'var(--border)' }} />

        {/* Styling Toggles */}
        <div style={{ display: 'flex', gap: 2 }}>
          <button 
            disabled={!selectedCell}
            onClick={() => updateCellFormatting(c => ({ ...c, bold: !c.bold }))}
            className="btn btn-sm"
            style={{ 
              padding: '4px 8px', minWidth: 28, height: 28,
              background: activeCell?.bold ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
              color: activeCell?.bold ? 'var(--indigo)' : 'var(--text)',
              border: activeCell?.bold ? '1px solid var(--indigo)' : '1px solid transparent'
            }}
            title="Bold"
          >
            <Bold size={13} />
          </button>
          <button 
            disabled={!selectedCell}
            onClick={() => updateCellFormatting(c => ({ ...c, italic: !c.italic }))}
            className="btn btn-sm"
            style={{ 
              padding: '4px 8px', minWidth: 28, height: 28,
              background: activeCell?.italic ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
              color: activeCell?.italic ? 'var(--indigo)' : 'var(--text)',
              border: activeCell?.italic ? '1px solid var(--indigo)' : '1px solid transparent'
            }}
            title="Italic"
          >
            <Italic size={13} />
          </button>
          <button 
            disabled={!selectedCell}
            onClick={() => updateCellFormatting(c => ({ ...c, underline: !c.underline }))}
            className="btn btn-sm"
            style={{ 
              padding: '4px 8px', minWidth: 28, height: 28,
              background: activeCell?.underline ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
              color: activeCell?.underline ? 'var(--indigo)' : 'var(--text)',
              border: activeCell?.underline ? '1px solid var(--indigo)' : '1px solid transparent'
            }}
            title="Underline"
          >
            <Underline size={13} />
          </button>
        </div>

        <div style={{ height: 20, width: 1, background: 'var(--border)' }} />

        {/* Alignment */}
        <div style={{ display: 'flex', gap: 2 }}>
          {(['left', 'center', 'right'] as const).map(alignMode => (
            <button 
              key={alignMode}
              disabled={!selectedCell}
              onClick={() => updateCellFormatting(c => ({ ...c, align: alignMode }))}
              className="btn btn-sm"
              style={{ 
                padding: '4px 8px', minWidth: 28, height: 28,
                background: (activeCell?.align || 'left') === alignMode ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                color: (activeCell?.align || 'left') === alignMode ? 'var(--indigo)' : 'var(--text)',
                border: (activeCell?.align || 'left') === alignMode ? '1px solid var(--indigo)' : '1px solid transparent'
              }}
              title={`Align ${alignMode}`}
            >
              {alignMode === 'left' && <AlignLeft size={13} />}
              {alignMode === 'center' && <AlignCenter size={13} />}
              {alignMode === 'right' && <AlignRight size={13} />}
            </button>
          ))}
        </div>

        <div style={{ height: 20, width: 1, background: 'var(--border)' }} />

        {/* Color Pickers */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, position: 'relative' }}>
          {/* Text Color */}
          <button 
            disabled={!selectedCell}
            onClick={() => setShowColorPicker(showColorPicker === 'font' ? null : 'font')}
            className="btn btn-ghost btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px' }}
            title="Font Color"
          >
            <span style={{ borderBottom: `3px solid ${activeCell?.fontColor || 'var(--text)'}`, fontSize: 11, fontWeight: 700 }}>A</span>
          </button>

          {/* Highlight Fill Color */}
          <button 
            disabled={!selectedCell}
            onClick={() => setShowColorPicker(showColorPicker === 'bg' ? null : 'bg')}
            className="btn btn-ghost btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px' }}
            title="Cell Highlight (Fill)"
          >
            <div style={{ width: 12, height: 12, borderRadius: 3, background: activeCell?.backgroundColor || 'transparent', border: '1px solid var(--text2)' }} />
          </button>

          {/* Popover */}
          {showColorPicker && (
            <div style={{ 
              position: 'absolute', top: 36, left: 0, zIndex: 100, 
              background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, padding: 10,
              boxShadow: '0 10px 30px rgba(0,0,0,0.4)', minWidth: 210
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text2)', marginBottom: 6, letterSpacing: '0.05em' }}>
                {showColorPicker === 'font' ? 'Text Color' : 'Cell Fill Color (Light Pastels)'}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 5 }}>
                {showColorPicker === 'bg' ? [
                  { color: '', label: 'Clear' },
                  { color: '#ffffff', label: 'White' },
                  { color: '#f8fafc', label: 'Slate Light' },
                  { color: '#fee2e2', label: 'Rose Light' },
                  { color: '#ffedd5', label: 'Peach Light' },
                  { color: '#fef9c3', label: 'Lemon Yellow' },
                  { color: '#dcfce7', label: 'Mint Green' },
                  { color: '#ccfbf1', label: 'Teal Light' },
                  { color: '#e0f2fe', label: 'Sky Blue' },
                  { color: '#e0e7ff', label: 'Indigo Light' },
                  { color: '#f3e8ff', label: 'Lavender Light' },
                  { color: '#fce7f3', label: 'Pink Light' },
                  { color: '#1e293b', label: 'Header Dark Accent' },
                  { color: '#0f172a', label: 'Midnight Dark Accent' },
                ].map(({ color, label }) => (
                  <button
                    key={color || 'clear'}
                    onClick={() => {
                      updateCellFormatting(c => ({ ...c, backgroundColor: color }));
                      setShowColorPicker(null);
                    }}
                    style={{
                      width: 22, height: 22, borderRadius: 5, 
                      background: color || 'transparent',
                      border: '1px solid var(--border)', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                    }}
                    title={label}
                  >
                    {!color && <span style={{ fontSize: 11, color: 'var(--text2)', lineHeight: 1 }}>✕</span>}
                  </button>
                )) : [
                  { color: '', label: 'Default' },
                  { color: '#0f172a', label: 'Black' },
                  { color: '#475569', label: 'Slate Grey' },
                  { color: '#ffffff', label: 'White' },
                  { color: '#991b1b', label: 'Deep Red' },
                  { color: '#92400e', label: 'Deep Amber' },
                  { color: '#166534', label: 'Deep Green' },
                  { color: '#115e59', label: 'Deep Teal' },
                  { color: '#1e40af', label: 'Deep Blue' },
                  { color: '#3730a3', label: 'Deep Indigo' },
                  { color: '#581c87', label: 'Deep Purple' },
                  { color: '#831843', label: 'Deep Pink' },
                  { color: '#d97706', label: 'Amber Accent' },
                  { color: '#059669', label: 'Emerald Accent' },
                ].map(({ color, label }) => (
                  <button
                    key={color || 'default'}
                    onClick={() => {
                      updateCellFormatting(c => ({ ...c, fontColor: color }));
                      setShowColorPicker(null);
                    }}
                    style={{
                      width: 22, height: 22, borderRadius: 5, 
                      background: color || 'var(--text)',
                      border: '1px solid var(--border)', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                    }}
                    title={label}
                  >
                    {!color && <span style={{ fontSize: 11, color: 'var(--bg)', fontWeight: 700 }}>A</span>}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Table Button in Toolbar */}
        <div style={{ height: 20, width: 1, background: 'var(--border)' }} />
        <button
          onClick={createTableFromSelection}
          className="btn btn-sm btn-accent"
          style={{ fontSize: 11, gap: 4, display: 'flex', alignItems: 'center', fontWeight: 600 }}
          title="Create Table from selection (Drag range and click)"
        >
          <Table size={13} />
          Table
        </button>
        {selectedRange && ((currentSheet as any).merges || []).some((m: any) => {
          const minRow = Math.min(selectedRange.startRow, selectedRange.endRow);
          const maxRow = Math.max(selectedRange.startRow, selectedRange.endRow);
          const minCol = Math.min(selectedRange.startCol, selectedRange.endCol);
          const maxCol = Math.max(selectedRange.startCol, selectedRange.endCol);
          return !(maxRow < m.startRow || minRow > m.endRow || maxCol < m.startCol || minCol > m.endCol);
        }) && (
          <button
            onClick={unmergeSelectedCells}
            className="btn btn-sm btn-ghost"
            style={{ fontSize: 11, gap: 4, color: 'var(--indigo)' }}
            title="Clear Table Format / Unmerge"
          >
            Clear Table
          </button>
        )}

        <div style={{ height: 20, width: 1, background: 'var(--border)' }} />

        {/* AutoSum Quick Action Button */}
        <button
          onClick={() => insertAutoSum('SUM')}
          disabled={!selectedRange}
          className="btn btn-sm btn-ghost"
          style={{ fontSize: 11, gap: 4, color: 'var(--indigo2)', fontWeight: 700 }}
          title="Insert SUM total formula into blank cell below selection"
        >
          <Sigma size={13} /> AutoSum
        </button>

        <div style={{ height: 20, width: 1, background: 'var(--border)' }} />

        {/* Row/Col Modifiers */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button 
            disabled={!selectedCell}
            onClick={() => insertRow(true)}
            className="btn btn-ghost btn-sm"
            style={{ fontSize: 11, gap: 3 }}
            title="Insert Row Above"
          >
            +Row
          </button>
          <button 
            disabled={!selectedCell}
            onClick={() => deleteRow()}
            className="btn btn-ghost btn-sm"
            style={{ fontSize: 11, gap: 3, color: 'var(--red)' }}
            title="Delete Row"
          >
            -Row
          </button>
          <button 
            disabled={!selectedCell}
            onClick={() => insertColumn(true)}
            className="btn btn-ghost btn-sm"
            style={{ fontSize: 11, gap: 3 }}
            title="Insert Column Left"
          >
            +Col
          </button>
          <button 
            disabled={!selectedCell}
            onClick={() => deleteColumn()}
            className="btn btn-ghost btn-sm"
            style={{ fontSize: 11, gap: 3, color: 'var(--red)' }}
            title="Delete Column"
          >
            -Col
          </button>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Export CSV & PDF */}
          <button onClick={handleExportCSV} className="btn btn-ghost btn-sm" style={{ gap: 4 }}>
            <Download size={13} /> Export CSV
          </button>
          <button onClick={handleExportPDF} className="btn btn-ghost btn-sm" style={{ gap: 4, color: 'var(--red)', borderColor: 'rgba(239,68,68,0.25)' }}>
            <FileText size={13} /> Export PDF
          </button>

          {/* Save Status indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text)', fontWeight: 600 }}>
            {saveStatus === 'Saving...' ? (
              <RefreshCw size={11} className="spin" style={{ color: 'var(--indigo)' }} />
            ) : (
              <Save size={11} style={{ color: 'var(--green)' }} />
            )}
            <span>{saveStatus}</span>
          </div>
        </div>

      </div>

      {/* ════════════════════ FORMULA BAR ════════════════════ */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '6px 16px', background: 'var(--surface2)', borderBottom: '1px solid var(--border)', gap: 8, flexShrink: 0 }}>
        <div style={{ 
          fontSize: 11, fontWeight: 700, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 4, 
          padding: '2px 8px', minWidth: 46, textAlign: 'center', color: 'var(--indigo)' 
        }}>
          {selectedCell ? `${indexToColLabel(selectedCell.col)}${selectedCell.row + 1}` : '—'}
        </div>
        <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text)', fontFamily: 'monospace' }}>fx</div>
        <input 
          ref={formulaInputRef}
          type="text" 
          disabled={!selectedCell}
          value={isEditing ? editValue : (activeCell?.value || '')}
          onChange={(e) => {
            setEditValue(e.target.value);
            setIsEditing(true);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              saveCellEdit();
              gridContainerRef.current?.focus(); // Focus back to grid
            } else if (e.key === 'Escape') {
              setIsEditing(false);
              gridContainerRef.current?.focus();
            }
          }}
          placeholder="Enter values, text or formulas (e.g. =SUM(A1:B3), =A1+B1)"
          style={{ 
            flex: 1, background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)', 
            borderRadius: 6, padding: '4px 10px', fontSize: 13, outline: 'none', transition: 'border-color 0.15s' 
          }}
          onFocus={() => setIsEditing(true)}
          onBlur={() => saveCellEdit()}
        />
      </div>

      {/* ════════════════════ EXCEL GRID ════════════════════ */}
      <div 
        ref={gridContainerRef}
        style={{ flex: 1, minHeight: 0, overflow: 'auto', background: 'var(--bg)', outline: 'none' }}
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
        <table style={{ borderCollapse: 'collapse', tableLayout: 'fixed', width: 'max-content' }}>
          
          {/* Header Row (Column Labels) */}
          <thead>
            <tr>
              {/* Top-Left Corner intersection */}
              <th style={{ 
                width: 45, height: 26, background: 'var(--surface)', borderRight: '1px solid var(--border)', 
                borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, left: 0, zIndex: 10,
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Grid size={12} style={{ color: 'var(--text3)' }} />
              </th>
              
              {currentSheet.rows[0]?.cells.map((_, colIdx) => {
                const colWidth = currentSheet.colWidths?.[colIdx] || 120;
                const isColActive = selectedCell?.col === colIdx;
                
                return (
                  <th 
                    key={colIdx} 
                    onMouseDown={(e) => handleColHeaderMouseDown(colIdx, e)}
                    onMouseEnter={() => handleColHeaderMouseEnter(colIdx)}
                    style={{ 
                      width: colWidth, height: 26, background: isColActive ? 'rgba(99, 102, 241, 0.08)' : 'var(--surface)', 
                      color: isColActive ? 'var(--indigo)' : 'var(--text)', fontWeight: isColActive ? 800 : 600, fontSize: 11,
                      borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)',
                      position: 'sticky', top: 0, zIndex: 5, userSelect: 'none', cursor: 'col-resize'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', position: 'relative' }}>
                      {indexToColLabel(colIdx)}
                      
                      {/* Resize Handle on Right border */}
                      <div 
                        onMouseDown={(e) => handleColResizeStart(e, colIdx)}
                        style={{ 
                          position: 'absolute', right: 0, top: 0, bottom: 0, width: 4, cursor: 'col-resize',
                          background: resizingColIdx === colIdx ? 'var(--indigo)' : 'transparent',
                          transition: 'background-color 0.15s',
                          zIndex: 6
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--indigo)'}
                        onMouseLeave={(e) => {
                          if (resizingColIdx !== colIdx) e.currentTarget.style.background = 'transparent';
                        }}
                      />
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* Grid Rows */}
          <tbody>
            {currentSheet.rows.map((row, rowIdx) => {
              const isRowActive = selectedCell?.row === rowIdx;
              const rowHeight = row.height || 30;

              return (
                <tr key={rowIdx}>
                  
                  {/* Row Index Header */}
                  <td 
                    onMouseDown={(e) => handleRowHeaderMouseDown(rowIdx, e)}
                    onMouseEnter={() => handleRowHeaderMouseEnter(rowIdx)}
                    style={{ 
                      width: 45, height: rowHeight, background: isRowActive ? 'rgba(99, 102, 241, 0.08)' : 'var(--surface)', 
                      color: isRowActive ? 'var(--indigo)' : 'var(--text)', fontWeight: isRowActive ? 800 : 600, fontSize: 11,
                      borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)',
                      position: 'sticky', left: 0, zIndex: 5, userSelect: 'none', display: 'table-cell', verticalAlign: 'middle', textAlign: 'center', cursor: 'row-resize'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', position: 'relative' }}>
                      {rowIdx + 1}
                      
                      {/* Resize Handle on Bottom border */}
                      <div 
                        onMouseDown={(e) => handleRowResizeStart(e, rowIdx)}
                        style={{ 
                          position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, cursor: 'row-resize',
                          background: resizingRowIdx === rowIdx ? 'var(--indigo)' : 'transparent',
                          transition: 'background-color 0.15s',
                          zIndex: 6
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--indigo)'}
                        onMouseLeave={(e) => {
                          if (resizingRowIdx !== rowIdx) e.currentTarget.style.background = 'transparent';
                        }}
                      />
                    </div>
                  </td>

                  {/* Grid Cells */}
                  {row.cells.map((cell, colIdx) => {
                    const isSelected = selectedCell?.row === rowIdx && selectedCell?.col === colIdx;
                    const inSel = isCellInSelection(rowIdx, colIdx);
                    
                    const merge = getMergeCell(rowIdx, colIdx);
                    const isMergeRoot = merge && rowIdx === merge.startRow && colIdx === merge.startCol;
                    const mRootCell = merge ? (currentSheet.rows[merge.startRow]?.cells[merge.startCol] || cell) : cell;

                    const colWidth = currentSheet.colWidths?.[colIdx] || 120;
                    const calculatedRowHeight = rowHeight;

                    // Calculate total width and height of merge block if this is root
                    let mTotalW = 0;
                    let mTotalH = 0;
                    if (isMergeRoot && merge) {
                      for (let c = merge.startCol; c <= merge.endCol; c++) {
                        mTotalW += currentSheet.colWidths?.[c] || 120;
                      }
                      for (let r = merge.startRow; r <= merge.endRow; r++) {
                        mTotalH += currentSheet.rows[r]?.height || 30;
                      }
                    }

                    // Calculate perimeter borders across all merges (outer containers & sub-merges)
                    const mergesList = (currentSheet as any).merges || [];

                    const isTopEdgeOfAny = mergesList.some((m: any) => 
                      m.startRow === rowIdx && colIdx >= m.startCol && colIdx <= m.endCol
                    );
                    const isBottomEdgeOfAny = mergesList.some((m: any) => 
                      m.endRow === rowIdx && colIdx >= m.startCol && colIdx <= m.endCol
                    );
                    const isLeftEdgeOfAny = mergesList.some((m: any) => 
                      m.startCol === colIdx && rowIdx >= m.startRow && rowIdx <= m.endRow
                    );
                    const isRightEdgeOfAny = mergesList.some((m: any) => 
                      m.endCol === colIdx && rowIdx >= m.startRow && rowIdx <= m.endRow
                    );

                    const isBorderAboveNextRow = mergesList.some((m: any) => 
                      m.startRow === rowIdx + 1 && colIdx >= m.startCol && colIdx <= m.endCol
                    );
                    const isBorderLeftOfNextCol = mergesList.some((m: any) => 
                      m.startCol === colIdx + 1 && rowIdx >= m.startRow && rowIdx <= m.endRow
                    );

                    let borderTop = isTopEdgeOfAny ? '2px solid var(--merge-outline)' : '1px solid var(--border)';
                    let borderBottom = (isBottomEdgeOfAny || isBorderAboveNextRow) ? '2px solid var(--merge-outline)' : '1px solid var(--border)';
                    let borderLeft = isLeftEdgeOfAny ? '2px solid var(--merge-outline)' : '1px solid var(--border)';
                    let borderRight = (isRightEdgeOfAny || isBorderLeftOfNextCol) ? '2px solid var(--merge-outline)' : '1px solid var(--border)';

                    if (inSel && selectedRange) {
                      const minRow = Math.min(selectedRange.startRow, selectedRange.endRow);
                      const maxRow = Math.max(selectedRange.startRow, selectedRange.endRow);
                      const minCol = Math.min(selectedRange.startCol, selectedRange.endCol);
                      const maxCol = Math.max(selectedRange.startCol, selectedRange.endCol);

                      if (rowIdx === minRow) borderTop = '2px solid var(--indigo)';
                      if (rowIdx === maxRow) borderBottom = '2px solid var(--indigo)';
                      if (colIdx === minCol) borderLeft = '2px solid var(--indigo)';
                      if (colIdx === maxCol) borderRight = '2px solid var(--indigo)';
                    }

                    const rootMerges = getRootMerges(rowIdx, colIdx);
                    const hasRootMerges = rootMerges.length > 0;
                    const effectiveBgColor = (merge ? mRootCell.backgroundColor : cell.backgroundColor) || '';
                    const activeCellFormat = merge ? mRootCell : cell;

                    const cellStyle: React.CSSProperties = {
                      width: colWidth,
                      height: calculatedRowHeight,
                      borderTop,
                      borderBottom,
                      borderLeft,
                      borderRight,
                      boxShadow: 'none',
                      padding: '4px 8px',
                      fontSize: `${activeCellFormat.fontSize || 14}px`,
                      fontFamily: activeCellFormat.fontFamily || 'sans-serif',
                      fontWeight: activeCellFormat.bold ? 'bold' : 'normal',
                      fontStyle: activeCellFormat.italic ? 'italic' : 'normal',
                      textDecoration: activeCellFormat.underline ? 'underline' : 'none',
                      backgroundColor: isSelected ? 'rgba(99, 102, 241, 0.2)' : (inSel ? 'rgba(99, 102, 241, 0.12)' : (effectiveBgColor || 'transparent')),
                      color: activeCellFormat.fontColor || 'var(--text)',
                      textAlign: activeCellFormat.align || 'left',
                      verticalAlign: 'middle',
                      outline: isSelected ? '2px solid var(--indigo)' : 'none',
                      outlineOffset: -2,
                      cursor: 'cell',
                      overflow: hasRootMerges ? 'visible' : 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      position: 'relative',
                      zIndex: isSelected ? 18 : (isMergeRoot ? 15 : (merge ? 1 : 2))
                    };

                    const isEditingCell = isSelected && isEditing;

                    return (
                      <td 
                        key={colIdx} 
                        style={cellStyle}
                        onMouseDown={(e) => handleCellMouseDown(rowIdx, colIdx, e)}
                        onMouseEnter={(e) => handleCellMouseEnter(rowIdx, colIdx, e)}
                        onDoubleClick={() => handleCellDoubleClick(rowIdx, colIdx)}
                      >
                        {/* Full continuous outer border box and text overlay for all merges starting at this root cell */}
                        {rootMerges.map((m: any) => {
                          let rTotalW = 0;
                          let rTotalH = 0;
                          for (let c = m.startCol; c <= m.endCol; c++) {
                            rTotalW += currentSheet.colWidths?.[c] || 120;
                          }
                          for (let r = m.startRow; r <= m.endRow; r++) {
                            rTotalH += currentSheet.rows[r]?.height || 30;
                          }
                          const rootCellObj = currentSheet.rows[m.startRow]?.cells[m.startCol] || cell;

                          return (
                            <React.Fragment key={`merge-root-${m.startRow}-${m.startCol}-${m.endRow}-${m.endCol}`}>
                              {!isEditingCell && (
                                <div 
                                  style={{
                                    position: 'absolute', top: 0, left: 0,
                                    width: rTotalW, height: rTotalH,
                                    pointerEvents: 'none', zIndex: 16,
                                    display: 'flex', alignItems: 'center',
                                    justifyContent: rootCellObj.align === 'center' ? 'center' : (rootCellObj.align === 'right' ? 'flex-end' : 'flex-start'),
                                    padding: '4px 8px', fontSize: `${rootCellObj.fontSize || 14}px`,
                                    fontFamily: rootCellObj.fontFamily || 'sans-serif',
                                    fontWeight: rootCellObj.bold ? 'bold' : 'normal',
                                    fontStyle: rootCellObj.italic ? 'italic' : 'normal',
                                    textDecoration: rootCellObj.underline ? 'underline' : 'none',
                                    color: rootCellObj.fontColor || 'var(--text)',
                                    overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis'
                                  }}
                                >
                                  <span>{getDisplayValue(rootCellObj)}</span>
                                </div>
                              )}
                            </React.Fragment>
                          );
                        })}

                        {isEditingCell ? (
                          <input 
                            ref={editInputRef}
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={saveCellEdit}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveCellEdit();
                              else if (e.key === 'Escape') setIsEditing(false);
                            }}
                            style={{
                              position: 'absolute', top: 0, left: 0,
                              width: (isMergeRoot && merge) ? mTotalW : '100%',
                              height: (isMergeRoot && merge) ? mTotalH : '100%',
                              background: 'var(--bg)', color: activeCellFormat.fontColor || 'var(--text)',
                              border: 'none', outline: 'none', padding: '4px 8px',
                              fontSize: `${activeCellFormat.fontSize || 14}px`,
                              fontFamily: activeCellFormat.fontFamily || 'sans-serif',
                              fontWeight: activeCellFormat.bold ? 'bold' : 'normal',
                              fontStyle: activeCellFormat.italic ? 'italic' : 'normal',
                              textAlign: activeCellFormat.align || 'left',
                              boxSizing: 'border-box', zIndex: 20
                            }}
                          />
                        ) : (
                          !merge && <span>{getDisplayValue(cell)}</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>

        </table>
      </div>

      {/* ════════════════════ BOTTOM TABS / SHEETS ════════════════════ */}
      <div style={{ display: 'flex', alignItems: 'center', background: 'var(--surface)', borderTop: '1px solid var(--border)', padding: '4px 16px', gap: 6, overflowX: 'auto', flexShrink: 0 }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginRight: 8 }}>
          {activeSpreadsheet.sheets.map((sheet, idx) => {
            const isActive = activeSheetIdx === idx;
            const isEditingName = editingTabIdx === idx;

            return (
              <div 
                key={idx}
                onClick={() => {
                  setActiveSheetIdx(idx);
                  setSelectedCell(null);
                  setSelectedRange(null);
                  setIsEditing(false);
                }}
                onDoubleClick={() => handleStartRenameSheet(idx)}
                style={{ 
                  display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', 
                  background: isActive ? 'var(--bg2)' : 'rgba(255,255,255,0.02)',
                  color: isActive ? 'var(--indigo)' : 'var(--text)', 
                  fontWeight: isActive ? 700 : 500, fontSize: 12,
                  borderTopLeftRadius: 6, borderTopRightRadius: 6, 
                  border: isActive ? '1px solid var(--border)' : '1px solid transparent',
                  borderBottom: 'none', cursor: 'pointer', userSelect: 'none', height: 32
                }}
              >
                {isEditingName ? (
                  <input
                    type="text"
                    value={editTabName}
                    onChange={(e) => setEditTabName(e.target.value)}
                    onBlur={handleSaveRenameSheet}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveRenameSheet();
                      if (e.key === 'Escape') setEditingTabIdx(null);
                    }}
                    autoFocus
                    style={{ background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--indigo)', borderRadius: 3, padding: '0 4px', fontSize: 11, width: 70, outline: 'none' }}
                  />
                ) : (
                  <span>{sheet.name}</span>
                )}

                {/* Close sheet tab button (Only if > 1 sheet) */}
                {activeSpreadsheet.sheets.length > 1 && (
                  <button 
                    onClick={(e) => handleDeleteSheet(idx, e)}
                    style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 10, cursor: 'pointer', padding: 2, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    onMouseEnter={(e) => e.currentTarget.style.color = 'var(--red)'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text3)'}
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Add Sheet */}
        <button 
          onClick={handleAddSheet}
          className="btn btn-ghost btn-sm"
          style={{ padding: '4px 8px', borderRadius: 4, height: 26, width: 26, minWidth: 26 }}
          title="Add New Sheet"
        >
          <Plus size={14} />
        </button>

        {/* Selection Calculations Bar */}
        {(() => {
          const stats = getSelectionStats();
          if (!stats) return null;
          return (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginRight: 20,
              fontSize: 11,
              fontWeight: 700,
              color: 'var(--indigo)',
              background: 'rgba(99, 102, 241, 0.08)',
              padding: '4px 12px',
              borderRadius: 6,
              border: '1px solid rgba(99, 102, 241, 0.2)'
            }}>
              {stats.sum !== undefined && (
                <span
                  onClick={() => insertAutoSum('SUM')}
                  style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 3, color: 'var(--indigo2)', background: 'rgba(99,102,241,0.15)', padding: '2px 6px', borderRadius: 4 }}
                  title="Click to insert total formula (=SUM) into cell below selection"
                >
                  <Sigma size={11} /> SUM: {stats.sum} ↙
                </span>
              )}
              {stats.avg !== undefined && <span>AVG: {stats.avg}</span>}
              <span>COUNT: {stats.count}</span>
              {stats.min !== undefined && <span>MIN: {stats.min}</span>}
              {stats.max !== undefined && <span>MAX: {stats.max}</span>}
            </div>
          );
        })()}

        <div style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text2)', fontWeight: 600 }}>
          Click & Drag cells to select range • Double-click cell to edit • Click header label to select whole row/col
        </div>

      </div>

      {/* ════════════════════ CURSOR FLOATING STATS POPUP ════════════════════ */}
      {(() => {
        if (!selectedRange) return null;
        const stats = getSelectionStats();
        if (!stats) return null;

        // Position popup nicely near the cursor with viewport clamping
        const popX = Math.min(window.innerWidth - 420, Math.max(10, mousePos.x + 16));
        const popY = Math.min(window.innerHeight - 60, Math.max(10, mousePos.y + 16));

        return (
          <div style={{
            position: 'fixed',
            left: popX,
            top: popY,
            zIndex: 99999,
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '6px 14px',
            borderRadius: 10,
            background: 'var(--surface2)',
            border: '1px solid rgba(99, 102, 241, 0.4)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
            backdropFilter: 'blur(10px)',
            color: 'var(--indigo2)',
            fontSize: 11.5,
            fontWeight: 800,
            fontFamily: "'JetBrains Mono', monospace",
            whiteSpace: 'nowrap',
            letterSpacing: '0.02em',
            transition: 'opacity 0.15s ease'
          }} className="fade-in">
            {stats.sum !== undefined && <span>SUM: {stats.sum}</span>}
            {stats.avg !== undefined && <span>AVG: {stats.avg}</span>}
            <span>COUNT: {stats.count}</span>
            {stats.min !== undefined && <span>MIN: {stats.min}</span>}
            {stats.max !== undefined && <span>MAX: {stats.max}</span>}
          </div>
        );
      })()}

    </div>
  );
}
