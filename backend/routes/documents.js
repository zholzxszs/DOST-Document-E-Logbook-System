const { prisma } = require('../db/prisma');
const formatDateForDatabase = require('../utils/formatDate');

module.exports = (app, io) => {
  // Get all documents
  app.get('/api/documents', async (req, res) => {
    try {
      const { direction } = req.query;
      const where = {};
      if (direction) {
        where.documentdirection = direction.toLowerCase();
      }
      const documents = await prisma.tbldocuments.findMany({
        where,
        orderBy: { datesent: 'desc' },
        select: {
          documentid: true,
          dtsno: true,
          documenttype: true,
          datesent: true,
          datereleased: true,
          time: true,
          route: true,
          remarks: true,
          isarchive: true,
          documentdirection: true,
          calcnetworkdays: true,
          deducteddays: true,
          networkdaysremarks: true
        }
      });
      res.json(documents);
    } catch (error) {
      console.error('Error fetching documents:', error);
      res.status(500).json({ error: 'Failed to fetch documents', message: error.message });
    }
  });

  // Create document
  app.post('/api/documents', async (req, res) => {
    const { dtsno, documenttype, route, remarks, datesent, datereleased } = req.body;
    
    // Validate required fields
    if (!dtsno || !documenttype || !route) {
      return res.status(400).json({ 
        error: 'Missing required fields', 
        required: ['dtsno', 'documenttype', 'route'] 
      });
    }
  
    try {
      // For outgoing documents, datesent should be provided as timestamp string
      if (!datesent || !datesent.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)) {
        return res.status(400).json({ error: 'Invalid Date Sent format' });
      }
  
      // datereleased should be in the formatted string
      if (!datereleased || !datereleased.match(/^[A-Za-z]+ \d{1,2}, \d{4} at \d{1,2}:\d{2} [AP]M$/)) {
        return res.status(400).json({ error: 'Invalid Date Received format' });
      }
  
      const newDoc = await prisma.tbldocuments.create({
        data: {
          dtsno: dtsno.trim().toUpperCase(),
          documenttype: documenttype.trim(),
          route: route.trim(),
          remarks: remarks?.trim() || null,
          documentdirection: 'outgoing',
          datesent: new Date(datesent), // Convert to proper Date object
          datereleased: datereleased, // Store as string
          time: null,
          isarchive: false
        }
      });
      
      res.status(201).json(newDoc);
      io.emit('documents_updated');
    } catch (error) {
      console.error('Create document error:', error);
      res.status(500).json({ 
        error: 'Database operation failed', 
        message: error.message 
      });
    }
  });

  // Update document
  app.put('/api/documents/:id', async (req, res) => {
    const { id } = req.params;
    const { dtsno, documenttype, route, remarks, time, datereleased } = req.body;
    
    try {
        // Handle time-only updates for 'All Documents' page quick edit
        if (Object.keys(req.body).length === 1 && typeof time !== 'undefined') {
            const updatedDoc = await prisma.tbldocuments.update({
                where: { documentid: parseInt(id) },
                data: { 
                    time: time === '' || time === '-' ? null : time 
                }
            });
            io.emit('documents_updated');
            return res.json(updatedDoc);
        }

        // Validate required fields for full updates
        if (!dtsno || !documenttype || !route) {
            return res.status(400).json({ 
                error: 'Missing required fields', 
                required: ['dtsno', 'documenttype', 'route'] 
            });
        }

        const dataToUpdate = {
            dtsno: dtsno.trim().toUpperCase(),
            documenttype: documenttype.trim(),
            route: route.trim(),
            remarks: remarks?.trim() || null,
            time: time === '' || time === '-' ? null : time,
            documentdirection: 'outgoing'
        };

        // Only include datereleased in the update if it's provided
        if (datereleased) {
            dataToUpdate.datereleased = datereleased;
        } else if (datereleased === null) {
            dataToUpdate.datereleased = null;
        }

        const updatedDoc = await prisma.tbldocuments.update({
            where: { documentid: parseInt(id) },
            data: dataToUpdate
        });
        
        res.json(updatedDoc);
        io.emit('documents_updated');
    } catch (error) {
        console.error('Update document error:', error);
        res.status(500).json({ 
            error: 'Database operation failed', 
            message: error.message, 
            code: error.code 
        });
    }
  });

  // Delete document
  app.delete('/api/documents/:id', async (req, res) => {
    const { id } = req.params;
    try {
      const document = await prisma.tbldocuments.findUnique({
        where: { documentid: parseInt(id) },
      });
      if (!document) {
        return res.status(404).json({ message: 'Document not found' });
      }
      await prisma.tbldocuments.delete({
        where: { documentid: parseInt(id) },
      });
      io.emit('documents_updated');
      return res.status(200).json({ message: 'Document deleted successfully' });
    } catch (error) {
      console.error('Error deleting document:', error);
      return res.status(500).json({ message: 'Error deleting document', error: error.message });
    }
  });

  // Archive document
  app.put('/api/documents/:id/archive', async (req, res) => {
    const { id } = req.params;
    const { isarchive, archivedate, archivedby } = req.body;
    try {
      const document = await prisma.tbldocuments.findUnique({
        where: { documentid: parseInt(id) }
      });
      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }
      const updatedDoc = await prisma.tbldocuments.update({
        where: { documentid: parseInt(id) },
        data: {
          isarchive: true,
          archivedate: archivedate,
          archivedby: archivedby || 'ITSM'
        }
      });
      res.json(updatedDoc);
      io.emit('documents_updated');
    } catch (error) {
      console.error('Archive document error:', error);
      res.status(500).json({ error: 'Database operation failed', message: error.message, code: error.code });
    }
  });

  // Restore document
  app.put('/api/documents/:id/restore', async (req, res) => {
    const { id } = req.params;
    try {
      const updatedDoc = await prisma.tbldocuments.update({
        where: { documentid: parseInt(id) },
        data: {
          isarchive: false,
          archivedate: null,
          archivedby: null
        }
      });
      res.json(updatedDoc);
      io.emit('documents_updated');
    } catch (error) {
      console.error('Restore document error:', error);
      res.status(500).json({ error: 'Database operation failed', message: error.message, code: error.code });
    }
  });

  // Get archived documents
  app.get('/api/documents/archived', async (req, res) => {
    try {
      const documents = await prisma.tbldocuments.findMany({
        where: { isarchive: true },
        orderBy: { archivedate: 'desc' },
        select: {
          documentid: true,
          dtsno: true,
          documenttype: true,
          datesent: true,
          datereleased: true,
          time: true,
          route: true,
          remarks: true,
          archivedate: true,
          archivedby: true,
          documentdirection: true
        }
      });
      res.json(documents);
    } catch (error) {
      console.error('Error fetching archived documents:', error);
      res.status(500).json({ error: 'Failed to fetch archived documents', message: error.message });
    }
  });

  // Update processing days
  app.put('/api/documents/:id/networkdays', async (req, res) => {
    const { id } = req.params;
    const { deducteddays, calcnetworkdays, remarks } = req.body;
    try {
      const document = await prisma.tbldocuments.findUnique({
        where: { documentid: parseInt(id) }
      });
      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }
      const updatedDoc = await prisma.tbldocuments.update({
        where: { documentid: parseInt(id) },
        data: {
          deducteddays: deducteddays !== null && deducteddays !== undefined 
            ? parseInt(deducteddays, 10) 
            : null,
          calcnetworkdays: calcnetworkdays !== null && calcnetworkdays !== undefined 
            ? parseInt(calcnetworkdays, 10) 
            : null,
          networkdaysremarks: remarks || null
        }
      });
      res.json(updatedDoc);
      io.emit('documents_updated');
    } catch (error) {
      console.error('Update network days error:', error);
      res.status(500).json({ error: 'Failed to update network days', message: error.message });
    }
  });
}; 