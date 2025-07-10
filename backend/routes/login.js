const { prisma } = require('../db/prisma');

module.exports = (app) => {
  app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    try {
      const admin = await prisma.tbladmin.findUnique({
        where: { adminemail: email },
      });
      if (!admin || admin.adminpass !== password) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }
      if (admin.isarchive) {
        return res.status(403).json({ error: "Account doesn't exist." });
      }
      res.json({
        success: true,
        adminid: admin.adminid,
        adminname: admin.adminname,
        adminemail: admin.adminemail,
        usertype: admin.usertype,
        documentdirection: admin.documentdirection,
      });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ error: 'Server error during login' });
    }
  });
}; 