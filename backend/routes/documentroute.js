const { prisma } = require('../db/prisma');

module.exports = (app) => {
  // Get all route types
  app.get('/api/routes', async (req, res) => {
    try {
      const types = await prisma.tblroute.findMany({
        orderBy: { routetype: 'asc' }
      });
      res.json(types);
    } catch (error) {
      console.error('Error fetching route types:', error);
      res.status(500).json({ error: 'Failed to fetch route types', message: error.message });
    }
  });

  // Create route type
  app.post('/api/routes', async (req, res) => {
    const { routetype } = req.body;
    if (!routetype || !routetype.trim()) {
      return res.status(400).json({ error: 'Route type is required' });
    }
    try {
      const existingType = await prisma.tblroute.findFirst({
        where: { routetype: routetype.trim() }
      });
      if (existingType) {
        return res.status(400).json({ error: 'Route type already exists' });
      }
      const newType = await prisma.tblroute.create({
        data: { routetype: routetype.trim() }
      });
      res.status(201).json(newType);
    } catch (error) {
      console.error('Failed to add route type:', error);
      res.status(500).json({ error: 'Failed to add route type', details: error.message });
    }
  });

  // Delete route type
  app.delete('/api/routes/:id', async (req, res) => {
    const { id } = req.params;
    try {
      await prisma.tblroute.delete({
        where: { routeid: parseInt(id) }
      });
      res.json({ message: 'Route type deleted successfully' });
    } catch (error) {
      console.error('Failed to delete route type:', error);
      res.status(500).json({ error: 'Failed to delete route type', details: error.message });
    }
  });
}; 