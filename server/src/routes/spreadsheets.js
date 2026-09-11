import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import * as SpreadsheetModel from '../models/Spreadsheet.js';

const router = Router();

// GET all spreadsheets (auto-creates default BOOKING spreadsheet if database is empty)
router.get('/', requireAuth, async (req, res) => {
  try {
    let spreadsheets = await SpreadsheetModel.findAllSpreadsheets();
    if (spreadsheets.length === 0) {
      const defaultSheets = [
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
      const initial = await SpreadsheetModel.createSpreadsheet({
        title: 'BOOKING',
        sheets: defaultSheets,
        createdBy: req.user?.userId || null,
      });
      spreadsheets = [initial];
    }
    return res.json({ spreadsheets });
  } catch (err) {
    console.error('Get spreadsheets error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET specific spreadsheet by ID (or fallback to first if id is 'default' or not found)
router.get('/:id', requireAuth, async (req, res) => {
  try {
    let spreadsheet = await SpreadsheetModel.findSpreadsheetById(req.params.id);
    if (!spreadsheet) {
      const all = await SpreadsheetModel.findAllSpreadsheets();
      if (all.length > 0) {
        spreadsheet = all[0];
      } else {
        return res.status(404).json({ error: 'Spreadsheet not found' });
      }
    }
    return res.json({ spreadsheet });
  } catch (err) {
    console.error('Get spreadsheet error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const { title, sheets } = req.body;
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const spreadsheet = await SpreadsheetModel.createSpreadsheet({
      title,
      sheets,
      createdBy: req.user.userId,
    });

    return res.json({ spreadsheet, success: true });
  } catch (err) {
    console.error('Create spreadsheet error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { title, sheets } = req.body;
    let spreadsheet = await SpreadsheetModel.findSpreadsheetById(req.params.id);
    let targetId = req.params.id;
    
    if (!spreadsheet) {
      // Check if any existing spreadsheet exists to prevent creating disconnected duplicates
      const all = await SpreadsheetModel.findAllSpreadsheets();
      if (all.length > 0) {
        targetId = all[0].id || all[0]._id;
        spreadsheet = all[0];
      } else {
        // Auto-create spreadsheet if completely empty
        const created = await SpreadsheetModel.createSpreadsheet({
          title: title || 'BOOKING',
          sheets: sheets || [{ name: 'Sheet 1', rows: [] }],
          createdBy: req.user?.userId || null,
        });
        return res.json({ spreadsheet: created, success: true });
      }
    }

    const updated = await SpreadsheetModel.updateSpreadsheet(targetId, {
      title,
      sheets,
    });

    return res.json({ spreadsheet: updated, success: true });
  } catch (err) {
    console.error('Update spreadsheet error:', err);
    return res.status(500).json({ error: 'Internal server error: ' + (err.message || '') });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const spreadsheet = await SpreadsheetModel.findSpreadsheetById(req.params.id);
    if (!spreadsheet) {
      return res.status(404).json({ error: 'Spreadsheet not found' });
    }

    await SpreadsheetModel.deleteSpreadsheet(req.params.id);
    return res.json({ success: true });
  } catch (err) {
    console.error('Delete spreadsheet error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;