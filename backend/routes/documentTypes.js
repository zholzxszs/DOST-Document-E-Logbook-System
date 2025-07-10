const { prisma } = require('../db/prisma');

module.exports = (app) => {
  // Get all document types
  app.get('/api/document-types', async (req, res) => {
    try {
      const types = await prisma.tbldocumenttype.findMany({
        orderBy: { documenttype: 'asc' }
      });
      res.json(types);
    } catch (error) {
      console.error('Error fetching document types:', error);
      res.status(500).json({ error: 'Failed to fetch document types', message: error.message });
    }
  });

  // Create document type
  app.post('/api/document-types', async (req, res) => {
    const { documenttype } = req.body;
    if (!documenttype || !documenttype.trim()) {
      return res.status(400).json({ error: 'Document type is required' });
    }
    try {
      const existingType = await prisma.tbldocumenttype.findFirst({
        where: { documenttype: documenttype.trim() }
      });
      if (existingType) {
        return res.status(400).json({ error: 'Document type already exists' });
      }
      const newType = await prisma.tbldocumenttype.create({
        data: { documenttype: documenttype.trim() }
      });
      res.status(201).json(newType);
    } catch (error) {
      console.error('Failed to add document type:', error);
      res.status(500).json({ error: 'Failed to add document type', details: error.message });
    }
  });

  // Delete document type
  app.delete('/api/document-types/:id', async (req, res) => {
    const { id } = req.params;
    try {
      await prisma.tbldocumenttype.delete({
        where: { documentid: parseInt(id) }
      });
      res.json({ message: 'Document type deleted successfully' });
    } catch (error) {
      console.error('Failed to delete document type:', error);
      res.status(500).json({ error: 'Failed to delete document type', details: error.message });
    }
  });
}; 