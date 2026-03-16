const express = require('express');
const path = require('path');
const fs = require('fs');
const archiver = require('archiver');
const Lead = require('../models/Lead');
const authMiddleware = require('../middleware/auth');
const upload = require('../middleware/upload');
const router = express.Router();

// Helper: determine category from service name
function getCategory(service = '') {
  const s = service.toLowerCase();
  if (s.includes('motor') || s.includes('wheeler') || s.includes('commercial vehicle'))
    return 'Motor';
  if (s.includes('loan') || s.includes('credit') || s.includes('solar') || s.includes('msme') || s.includes('mudra') || s.includes('education loan'))
    return 'Loan';
  if (s.includes('invest') || s.includes('mutual') || s.includes('demat') || s.includes('gold bond') || s.includes('bond'))
    return 'Investment';
  if (s.includes('career') || s.includes('placement') || s.includes('aviation'))
    return 'Career';
  if (s.includes('insurance') || s.includes('term') || s.includes('health') || s.includes('travel') || s.includes('life') || s.includes('accident') || s.includes('corporate') || s.includes('home'))
    return 'Insurance';
  return 'General';
}

// ─── PUBLIC ROUTES (no auth needed) ─────────────────────────────────────────

// GET /api/leads/public-count — get total count of all leads
router.get('/public-count', async (req, res) => {
  try {
    const total = await Lead.countDocuments();
    res.json({ success: true, total });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/leads — standard lead (name + mobile + service)
// router.post('/', async (req, res) => {
//   try {
//     const { name, mobile, service } = req.body;
//     if (!name || !mobile || !service)
//       return res.status(400).json({ error: 'Missing required fields' });

//     const lead = await Lead.create({
//       name: name.trim(),
//       mobile: mobile.trim(),
//       service: service.trim(),
//       category: getCategory(service)
//     });

//     // Emit real-time event
//     req.io.emit('new_lead', lead);

//     res.json({ success: true, leadId: lead._id });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: 'Server error' });
//   }
// });

// POST /api/leads — standard lead with all form fields
router.post('/', async (req, res) => {
  try {
    const { 
      name, mobile, service, city,
      insuranceType, loanType, loanAmount,
      investmentType, monthlyInvestment, investmentGoals,
      jobCategory, qualification, message
    } = req.body;
    
    if (!name || !mobile || !service)
      return res.status(400).json({ error: 'Missing required fields' });

    const leadData = {
      name: name.trim(),
      mobile: mobile.trim(),
      service: service.trim(),
      category: getCategory(service),
      city: city?.trim(),
      message: message?.trim() || '',
      notes: message?.trim() || '',
    };

    // Add category-specific fields
    const category = getCategory(service);
    
    if (category === 'Insurance') {
      leadData.insuranceType = insuranceType?.trim() || service;
    } else if (category === 'Loan') {
      leadData.loanType = loanType?.trim() || service;
      leadData.loanAmount = loanAmount?.trim();
    } else if (category === 'Investment') {
      leadData.investmentType = investmentType?.trim() || service;
      leadData.monthlyInvestment = monthlyInvestment?.trim();
      leadData.investmentGoals = investmentGoals?.trim();
    } else if (category === 'Career') {
      leadData.jobCategory = jobCategory?.trim() || service;
      leadData.qualification = qualification?.trim();
    }

    const lead = await Lead.create(leadData);

    // Emit real-time event
    req.io.emit('new_lead', lead);

    res.json({ success: true, leadId: lead._id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/leads/motor — motor lead with file uploads
router.post('/motor', upload.fields([
  { name: 'rcFront', maxCount: 1 },
  { name: 'rcBack', maxCount: 1 },
  { name: 'prevPolicy', maxCount: 1 }
]), async (req, res) => {
  try {
    const { vehicleNumber, mobile, vehicleType } = req.body;
    if (!vehicleNumber || !mobile || !vehicleType)
      return res.status(400).json({ error: 'Missing required fields' });

    const files = req.files || {};

    const lead = await Lead.create({
      name: vehicleNumber.toUpperCase(),
      mobile: mobile.trim(),
      service: `${vehicleType} Insurance`,
      category: 'Motor',
      vehicleNumber: vehicleNumber.toUpperCase(),
      vehicleType,
      rcFrontFile:    files.rcFront?.[0]?.filename || null,
      rcBackFile:     files.rcBack?.[0]?.filename || null,
      prevPolicyFile: files.prevPolicy?.[0]?.filename || null,
    });

    req.io.emit('new_lead', lead);

    res.json({ success: true, leadId: lead._id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── PROTECTED ROUTES (admin auth) ───────────────────────────────────────────

// GET /api/leads — paginated list with filters
router.get('/', authMiddleware, async (req, res) => {
  try {
    const {
      page = 1, limit = 50,
      category, status, search,
      startDate, endDate
    } = req.query;

    const filter = {};
    if (category && category !== 'All') filter.category = category;
    if (status && status !== 'All')     filter.status   = status;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { mobile: { $regex: search, $options: 'i' } },
        { service: { $regex: search, $options: 'i' } },
        { vehicleNumber: { $regex: search, $options: 'i' } }
      ];
    }
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate)   filter.createdAt.$lte = new Date(new Date(endDate).setHours(23,59,59));
    }

    const total = await Lead.countDocuments(filter);
    const leads = await Lead.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();

    res.json({ success: true, leads, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/leads/stats — dashboard stats
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const total = await Lead.countDocuments();
    const today = new Date(); today.setHours(0,0,0,0);
    const todayCount = await Lead.countDocuments({ createdAt: { $gte: today } });

    const byCategoryRaw = await Lead.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);
    const byCategory = {};
    byCategoryRaw.forEach(r => byCategory[r._id] = r.count);

    const byStatusRaw = await Lead.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    const byStatus = {};
    byStatusRaw.forEach(r => byStatus[r._id] = r.count);

    // Last 7 days trend
    const last7 = await Lead.aggregate([
      { $match: { createdAt: { $gte: new Date(Date.now() - 6 * 86400000) } } },
      { $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
      }},
      { $sort: { _id: 1 } }
    ]);

    // Last 30 days trend
    const last30 = await Lead.aggregate([
      { $match: { createdAt: { $gte: new Date(Date.now() - 29 * 86400000) } } },
      { $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
      }},
      { $sort: { _id: 1 } }
    ]);

    res.json({ success: true, total, todayCount, byCategory, byStatus, last7, last30 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/leads/:id — update status or notes
router.patch('/:id', authMiddleware, async (req, res) => {
  try {
    const { status, notes } = req.body;
    const update = { updatedAt: new Date() };
    if (status) update.status = status;
    if (notes !== undefined) update.notes = notes;

    const lead = await Lead.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    req.io.emit('lead_updated', lead);
    res.json({ success: true, lead });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/leads/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const lead = await Lead.findByIdAndDelete(req.params.id);
    if (!lead) return res.status(404).json({ error: 'Not found' });
    req.io.emit('lead_deleted', { id: req.params.id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/leads/export/csv — export all (or filtered) leads as CSV
router.get('/export/csv', authMiddleware, async (req, res) => {
  try {
    const { category, status, startDate, endDate } = req.query;
    const filter = {};
    if (category && category !== 'All') filter.category = category;
    if (status && status !== 'All')     filter.status   = status;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate)   filter.createdAt.$lte = new Date(new Date(endDate).setHours(23,59,59));
    }

    const leads = await Lead.find(filter).sort({ createdAt: -1 }).lean();

    const headers = ['ID', 'Name/Vehicle No', 'Mobile', 'Service', 'Category', 'Status', 'Vehicle Type', 'Notes', 'Created At'];
    const rows = leads.map(l => [
      l._id.toString(),
      `"${(l.name || '').replace(/"/g, '""')}"`,
      l.mobile,
      `"${(l.service || '').replace(/"/g, '""')}"`,
      l.category,
      l.status,
      l.vehicleType || '',
      `"${(l.notes || '').replace(/"/g, '""')}"`,
      new Date(l.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="rachanaa_leads_${Date.now()}.csv"`);
    res.send(csv);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/leads/files/download/:folder/:filename — download single file
router.get('/files/download/:folder/:filename', authMiddleware, (req, res) => {
  const { folder, filename } = req.params;
  const allowed = ['rc-front', 'rc-back', 'prev-policy'];
  if (!allowed.includes(folder)) return res.status(400).json({ error: 'Invalid folder' });

  const filePath = path.join(__dirname, '../../uploads', folder, filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });

  res.download(filePath, filename);
});

// POST /api/leads/files/bulk-download — zip multiple files
router.post('/files/bulk-download', authMiddleware, async (req, res) => {
  try {
    const { leadIds } = req.body; // array of lead IDs
    if (!leadIds || !leadIds.length)
      return res.status(400).json({ error: 'No lead IDs provided' });

    const leads = await Lead.find({ _id: { $in: leadIds } }).lean();

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="rachanaa_docs_${Date.now()}.zip"`);

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.pipe(res);

    const uploadDir = path.join(__dirname, '../../uploads');

    leads.forEach(lead => {
      const prefix = lead.vehicleNumber || lead._id.toString();
      if (lead.rcFrontFile) {
        const fp = path.join(uploadDir, 'rc-front', lead.rcFrontFile);
        if (fs.existsSync(fp)) archive.file(fp, { name: `${prefix}/RC_Front_${lead.rcFrontFile}` });
      }
      if (lead.rcBackFile) {
        const fp = path.join(uploadDir, 'rc-back', lead.rcBackFile);
        if (fs.existsSync(fp)) archive.file(fp, { name: `${prefix}/RC_Back_${lead.rcBackFile}` });
      }
      if (lead.prevPolicyFile) {
        const fp = path.join(uploadDir, 'prev-policy', lead.prevPolicyFile);
        if (fs.existsSync(fp)) archive.file(fp, { name: `${prefix}/Prev_Policy_${lead.prevPolicyFile}` });
      }
    });

    archive.finalize();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
