const { prisma } = require('../db/prisma');

module.exports = (app, io) => {
  // Get all incoming documents
  app.get('/api/incoming', async (req, res) => {
    try {
      const records = await prisma.tbldocuments.findMany({
        where: { documentdirection: 'incoming' },
        orderBy: { datesent: 'desc' }
      });
      res.json(records);
    } catch (error) {
      console.error('Error fetching incoming records:', error);
      res.status(500).json({ error: 'Failed to fetch incoming records', details: error.message });
    }
  });

  const moment = require("moment-timezone");
  // Add new incoming document
  app.post('/api/incoming', async (req, res) => {
    const { dtsno, documenttype, datesent } = req.body;
    if (!dtsno || !documenttype) {
      return res.status(400).json({ error: 'Required fields missing', required: ['dtsno', 'documenttype'] });
    }
    try {
      const formattedDtsNo = dtsno.trim().toUpperCase();
      const newRecord = await prisma.tbldocuments.create({
        data: {
          dtsno: formattedDtsNo,
          documenttype: documenttype.trim(),
          documentdirection: 'incoming',
          datesent: moment.tz(datesent, "YYYY-MM-DD HH:mm:ss", "Asia/Manila").toDate(),
          datereleased: null,
          time: null,
          route: '',
          remarks: null,
          networkdaysremarks: null,
          calcnetworkdays: 0,
          deducteddays: 0,
          isarchive: false
        }
      });
      res.status(201).json(newRecord);
      io.emit('documents_updated');
    } catch (error) {
      console.error('Failed to create incoming record:', error);
      res.status(500).json({ error: 'Failed to create incoming record', details: error.message, code: error.code });
    }
  });

  // Update incoming document
  app.put('/api/incoming/:id', async (req, res) => {
    const { id } = req.params;
    const { dtsno, documenttype } = req.body;
    if (!dtsno || !documenttype) {
      return res.status(400).json({ error: 'Required fields missing', required: ['dtsno', 'documenttype'] });
    }
    try {
      const formattedDtsNo = dtsno.trim().toUpperCase();
      const existingRecord = await prisma.tbldocuments.findFirst({
        where: {
          dtsno: formattedDtsNo,
          NOT: { documentid: parseInt(id) }
        }
      });
      const updatedRecord = await prisma.tbldocuments.update({
        where: { documentid: parseInt(id) },
        data: {
          dtsno: formattedDtsNo,
          documenttype: documenttype.trim()
        }
      });
      res.json(updatedRecord);
      io.emit('documents_updated');
    } catch (error) {
      console.error('Failed to update incoming record:', error);
      res.status(500).json({ error: 'Failed to update incoming record', details: error.message, code: error.code });
    }
  });
}; 