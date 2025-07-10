const { prisma } = require('../db/prisma');

module.exports = (app) => {
  // Get all admins
  app.get('/api/admins', async (req, res) => {
    try {
      const admins = await prisma.tbladmin.findMany({
        where: { isarchive: false },
        orderBy: { datecreated: 'desc' },
        select: {
          adminid: true,
          adminname: true,
          adminemail: true,
          documentdirection: true,
          datecreated: true,
          archivedate: true,
          isarchive: true,
          usertype: true
        }
      });
      res.json(admins);
    } catch (error) {
      console.error('Error fetching admins:', error);
      res.status(500).json({ error: 'Failed to fetch admins', message: error.message });
    }
  });

  // Get archived admins
  app.get('/api/admins/archived', async (req, res) => {
    try {
      const admins = await prisma.tbladmin.findMany({
        where: { isarchive: true },
        orderBy: { archivedate: 'desc' },
        select: {
          adminid: true,
          adminname: true,
          adminemail: true,
          documentdirection: true,
          datecreated: true,
          archivedate: true,
          isarchive: true
        }
      });
      res.json(admins);
    } catch (error) {
      console.error('Error fetching archived admins:', error);
      res.status(500).json({ error: 'Failed to fetch archived admins', message: error.message });
    }
  });

  // Create admin
  app.post('/api/admins', async (req, res) => {
    const { adminname, adminemail, adminpass, documentdirection, usertype } = req.body;
    
    // More specific validation
    if (!adminname) return res.status(400).json({ error: 'Name is required' });
    if (!adminemail) return res.status(400).json({ error: 'Email is required' });
    if (!adminpass) return res.status(400).json({ error: 'Password is required' });
    if (!documentdirection) return res.status(400).json({ error: 'Document direction is required' });
  
    try {
      const email = adminemail.trim().toLowerCase();
      
      // Validate email format
      if (!/^[^@]+@region1\.dost\.gov\.ph$/.test(email)) {
        return res.status(400).json({ error: 'Invalid email domain. Must be @region1.dost.gov.ph' });
      }
  
      const existingAdmin = await prisma.tbladmin.findUnique({
        where: { adminemail: email }
      });
      
      if (existingAdmin) {
        return res.status(400).json({ error: 'Email already exists' });
      }
  
      const newAdmin = await prisma.tbladmin.create({
        data: {
          adminname,
          adminemail: email,
          adminpass,
          documentdirection,
          usertype: usertype || 'admin',
          datecreated: new Date()
        }
      });
      
      const { adminpass: _, ...adminWithoutPassword } = newAdmin;
      res.status(201).json(adminWithoutPassword);
    } catch (error) {
      console.error('Failed to create admin:', error);
      res.status(500).json({ 
        error: 'Failed to create admin', 
        message: error.message,
        details: error.meta || null
      });
    }
  });

  // Update admin
  app.put('/api/admins/:id', async (req, res) => {
    const { id } = req.params;
    const { adminname, adminemail, adminpass, documentdirection, usertype } = req.body;
    if (!adminname && !adminemail && !adminpass && !documentdirection && !usertype) {
      return res.status(400).json({ error: 'No fields provided for update' });
    }
    try {
      const updateData = {};
      if (adminname) updateData.adminname = adminname;
      if (adminemail) updateData.adminemail = adminemail;
      if (documentdirection) updateData.documentdirection = documentdirection;
      if (usertype) updateData.usertype = usertype;
      if (adminpass) updateData.adminpass = adminpass;
      const updatedAdmin = await prisma.tbladmin.update({
        where: { adminid: parseInt(id) },
        data: updateData
      });
      const { adminpass: _, ...adminWithoutPassword } = updatedAdmin;
      res.json(adminWithoutPassword);
    } catch (error) {
      console.error('Failed to update admin:', error);
      res.status(500).json({ error: 'Failed to update admin', message: error.message, code: error.code });
    }
  });

  // Archive admin
  app.put('/api/admins/:id/archive', async (req, res) => {
    const { id } = req.params;
    const { isarchive, archivedate } = req.body;
    try {
      const admin = await prisma.tbladmin.findUnique({
        where: { adminid: parseInt(id) }
      });
      if (!admin) {
        return res.status(404).json({ error: 'Admin not found' });
      }
      const updatedAdmin = await prisma.tbladmin.update({
        where: { adminid: parseInt(id) },
        data: {
          isarchive: true,
          archivedate: archivedate
        }
      });
      const { adminpass: _, ...adminWithoutPassword } = updatedAdmin;
      res.json(adminWithoutPassword);
    } catch (error) {
      console.error('Archive admin error:', error);
      res.status(500).json({ error: 'Failed to archive admin', message: error.message, code: error.code });
    }
  });

  // Restore admin
  app.put('/api/admins/:id/restore', async (req, res) => {
    const { id } = req.params;
    try {
      const admin = await prisma.tbladmin.findUnique({
        where: { adminid: parseInt(id) }
      });
      if (!admin) {
        return res.status(404).json({ error: 'Admin not found' });
      }
      const updatedAdmin = await prisma.tbladmin.update({
        where: { adminid: parseInt(id) },
        data: {
          isarchive: false,
          archivedate: null
        }
      });
      const { adminpass: _, ...adminWithoutPassword } = updatedAdmin;
      res.json(adminWithoutPassword);
    } catch (error) {
      console.error('Restore admin error:', error);
      res.status(500).json({ error: 'Failed to restore admin', message: error.message, code: error.code });
    }
  });

  // Delete admin
  app.delete('/api/admins/:id', async (req, res) => {
    const { id } = req.params;
    try {
      const admin = await prisma.tbladmin.findUnique({
        where: { adminid: parseInt(id) },
      });
      if (!admin) {
        return res.status(404).json({ message: 'Admin not found' });
      }
      await prisma.tbladmin.delete({
        where: { adminid: parseInt(id) },
      });
      return res.status(200).json({ message: 'Admin deleted successfully' });
    } catch (error) {
      console.error('Error deleting admin:', error);
      return res.status(500).json({ message: 'Error deleting admin', error: error.message });
    }
  });
}; 