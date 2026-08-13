import mongoose from 'mongoose';

const cellSchema = new mongoose.Schema({
  value: { type: String, default: '' },
  bold: { type: Boolean, default: false },
  italic: { type: Boolean, default: false },
  underline: { type: Boolean, default: false },
  fontSize: { type: Number, default: 14 },
  fontFamily: { type: String, default: 'sans-serif' },
  backgroundColor: { type: String, default: '' },
  fontColor: { type: String, default: '' },
  align: { type: String, default: 'left' },
}, { _id: false });

const rowSchema = new mongoose.Schema({
  cells: [cellSchema],
  height: { type: Number, default: 30 },
}, { _id: false });

const rangeSchema = new mongoose.Schema({
  startRow: { type: Number, required: true },
  startCol: { type: Number, required: true },
  endRow: { type: Number, required: true },
  endCol: { type: Number, required: true },
}, { _id: false });

const sheetSchema = new mongoose.Schema({
  name: { type: String, default: 'Sheet 1' },
  rows: [rowSchema],
  colWidths: [{ type: Number }],
  merges: [rangeSchema],
  tables: [rangeSchema],
}, { _id: false });

const spreadsheetSchema = new mongoose.Schema({
  title: { type: String, required: true },
  sheets: [sheetSchema],
  createdBy: { type: String, default: null },
}, { timestamps: true });

spreadsheetSchema.index({ title: 1 });
spreadsheetSchema.index({ createdAt: -1 });

export const Spreadsheet = mongoose.models.Spreadsheet || mongoose.model('Spreadsheet', spreadsheetSchema);

function formatCell(doc) {
  return {
    value: doc.value || '',
    bold: doc.bold || false,
    italic: doc.italic || false,
    underline: doc.underline || false,
    fontSize: doc.fontSize || 14,
    fontFamily: doc.fontFamily || 'sans-serif',
    backgroundColor: doc.backgroundColor || '',
    fontColor: doc.fontColor || '',
    align: doc.align || 'left',
  };
}

function formatRow(doc) {
  return {
    cells: (doc.cells || []).map(formatCell),
    height: doc.height || 30,
  };
}

function formatSheet(doc) {
  return {
    name: doc.name || 'Sheet 1',
    rows: (doc.rows || []).map(formatRow),
    colWidths: doc.colWidths || [],
    merges: (doc.merges || []).map(m => ({
      startRow: m.startRow,
      startCol: m.startCol,
      endRow: m.endRow,
      endCol: m.endCol,
    })),
    tables: (doc.tables || []).map(t => ({
      startRow: t.startRow,
      startCol: t.startCol,
      endRow: t.endRow,
      endCol: t.endCol,
    })),
  };
}

function formatSpreadsheet(doc) {
  const obj = doc.toObject ? doc.toObject() : doc;
  const idStr = obj._id ? obj._id.toString() : (obj.id ? String(obj.id) : '');
  return {
    id: idStr,
    _id: idStr,
    title: obj.title,
    sheets: (obj.sheets || []).map(formatSheet),
    createdBy: obj.createdBy || null,
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
  };
}

export async function findAllSpreadsheets() {
  const docs = await Spreadsheet.find().sort({ createdAt: -1 });
  return docs.map(formatSpreadsheet);
}

export async function findSpreadsheetById(id) {
  try {
    const doc = await Spreadsheet.findById(id);
    return doc ? formatSpreadsheet(doc) : null;
  } catch {
    return null;
  }
}

export async function createSpreadsheet(data) {
  const doc = await Spreadsheet.create({
    title: data.title,
    sheets: data.sheets || [{ name: 'Sheet 1', rows: [] }],
    createdBy: data.createdBy ? String(data.createdBy) : null,
  });
  return formatSpreadsheet(doc);
}

export async function updateSpreadsheet(id, data) {
  const updateData = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.sheets !== undefined) updateData.sheets = data.sheets;

  const doc = await Spreadsheet.findByIdAndUpdate(id, updateData, { returnDocument: 'after' });
  return doc ? formatSpreadsheet(doc) : null;
}

export async function deleteSpreadsheet(id) {
  return Spreadsheet.findByIdAndDelete(id);
}