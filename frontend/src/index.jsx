import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './Login.jsx';
import Layout from './Layout/Layout.jsx';

// Lazy-loaded components
const Dashboard = lazy(() => import('./Navigation/Dashboard.jsx'));
const AllDocuments = lazy(() => import('./Navigation/AllDocuments.jsx'));
const ArchiveDocuments = lazy(() => import('./Navigation/ArchiveDocuments.jsx'));
const NetworkDays = lazy(() => import('./Navigation/ProcessingDays.jsx'));
const ManageAdmin = lazy(() => import('./Navigation/ManageAdmin.jsx'));
const ArchiveAdmin = lazy(() => import('./Navigation/ArchiveAdmin.jsx'));
const Profile = lazy(() => import('./Navigation/Profile.jsx'));

function Index() {
  return (
    <Router>
      <Suspense fallback={<div>Loading...</div>}>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/" element={<Layout />}>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="alldocuments" element={<AllDocuments />} />
            <Route path="processingdays" element={<NetworkDays />} />
            <Route path="archivedocuments" element={<ArchiveDocuments />} />
            <Route path="manageadmin" element={<ManageAdmin />} />
            <Route path="archiveadmin" element={<ArchiveAdmin />} />
            <Route path="profile" element={<Profile />} />
          </Route>
        </Routes>
      </Suspense>
    </Router>
  );
}

export default Index;
