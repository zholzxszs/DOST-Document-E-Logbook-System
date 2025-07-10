import React, { useState, useEffect } from 'react';
import OverlayAdmin from '../OverlayModal/OverlayAdmin';
import Swal from 'sweetalert2';
import '../index.css'

function ManageAdmin() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [isViewMode, setIsViewMode] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [archivingId, setArchivingId] = useState(null);
  const adminData = localStorage.getItem('admin');
  const currentAdminDirection = adminData ? JSON.parse(adminData).documentdirection : null;
  const API_URL = import.meta.env.VITE_API_URL;
  const getUnit = (direction) => direction?.toLowerCase() === 'incoming' ? 'ORD' : 'Budget and Finance Unit';
  
  // Fetch admins
  const fetchAdmins = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/admins`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      // Filter to only include usertype 'admin' and exclude 'superadmin'
      const filteredAdmins = data.filter(admin => admin.usertype === 'admin');
      setAdmins(filteredAdmins);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching admins:', error);
      setLoading(false);
      Swal.fire({
        icon: 'error',
        title: 'Failed to load admins',
        text: 'Please try again.',
        timer: 2500,
        showConfirmButton: false,
        customClass: {
          popup: 'swal2-minimalist'
        }
      });
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []); 

  const handleAddRecord = () => {
    setSelectedAdmin(null);
    setIsViewMode(false);
    setIsEditMode(false);
    setShowAdminModal(true);
  };

  const handleView = (admin) => {
    setSelectedAdmin(admin);
    setIsViewMode(true);
    setIsEditMode(false);
    setShowAdminModal(true);
  };

  const handleEdit = (admin) => {
    setSelectedAdmin(admin);
    setIsViewMode(false);
    setIsEditMode(true);
    setShowAdminModal(true);
  };

  const handleArchive = async (adminId) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: 'Do you want to archive this admin?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, archive it!',
      customClass: {
        popup: 'swal2-minimalist'
      }
    });
    if (!result.isConfirmed) return;

    setArchivingId(adminId);
    try {
      // Format date as "Month Day, Year" (e.g., June 12, 2025)
      const archivedate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      const response = await fetch(`${API_URL}/api/admins/${adminId}/archive`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isarchive: true,
          archivedate // formatted as "June 12, 2025"
        })
      });

      if (response.ok) {
        setAdmins(prev => prev.filter(admin => admin.adminid !== adminId));
        Swal.fire({
          icon: 'success',
          title: 'Archived!',
          text: 'Admin has been archived.',
          timer: 1800,
          showConfirmButton: false,
          customClass: {
            popup: 'swal2-minimalist'
          }
        });
      } else {
        const error = await response.json();
        Swal.fire({
          icon: 'error',
          title: 'Failed to archive',
          text: error.message || 'Failed to archive admin. Please try again.',
          timer: 2500,
          showConfirmButton: false,
          customClass: {
            popup: 'swal2-minimalist'
          }
        });
      }
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'An error occurred while archiving. Please try again.',
        timer: 2500,
        showConfirmButton: false,
        customClass: {
          popup: 'swal2-minimalist'
        }
      });
    } finally {
      setArchivingId(null);
    }
  };

  // Filter admins based on search term
  const filteredAdmins = admins.filter(admin => {
    const search = searchTerm.toLowerCase();
    const unit = getUnit(admin.documentdirection)?.toLowerCase();
    const direction = admin.documentdirection?.toLowerCase();
    const matchesSearch =
      admin.adminname?.toLowerCase().includes(search) ||
      admin.adminemail?.toLowerCase().includes(search) ||
      unit?.includes(search) ||
      direction?.includes(search);
    return matchesSearch;
  });

  return (
    <div className="p-1 relative">
      {/* Header with search */}
      <div className="flex flex-wrap justify-end gap-x-2 mb-4">
        {/* Search */}
        <div className="flex flex-col items-start">
          <div className="relative w-80 h-11 bg-neutral-100 rounded-2xl shadow-sm border border-sky-700 flex items-center px-4">
            <input
              type="text"
              placeholder="Search Records..."
              className="w-full bg-transparent outline-none text-sky-950 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <img src="./searchIcon.svg" alt="Search" className="w-5 h-5" />
          </div>
        </div>

        {/* Add Admin Button */}
        <div className="flex flex-col items-start">
          <button
            onClick={handleAddRecord}
            className="h-11 bg-sky-700 rounded-2xl shadow-sm flex items-center justify-center px-4 text-white font-semibold text-lg cursor-pointer transition-colors w-40 hover:bg-[#1460A2]"
          >
            Add Admin
            <svg 
              className="w-4 h-4 ml-2"
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Admin Table */}
      <div className="overflow-x-auto">
        <div className="min-w-[1200px]">
          {/* Table Header */}
          <div className="bg-sky-700 h-15 flex items-center rounded-lg px-2 text-white font-bold text-sm">
            <div className="w-[15%] min-w-[120px] px-2 text-center select-none flex items-center justify-center">
              DATE CREATED
            </div>
            <div className="w-[15%] min-w-[120px] px-2 text-center">ADMIN NAME</div>
            <div className="w-[20%] min-w-[180px] px-2 text-center">EMAIL</div>
            <div className="w-[20%] min-w-[180px] px-2 text-center">UNIT</div>
            <div className="w-[15%] min-w-[120px] px-2 text-center">DOCUMENT DIRECTION</div>
            <div className="w-[15%] min-w-[120px] px-2 text-center">ACTIONS</div>
          </div>
          
          {/* Table Body */}
          <div
            className="w-full flex-1 overflow-y-auto scrollbar-hide"
            style={{ minHeight: 0, maxHeight: 'calc(100vh - 260px)' }}
          >
            {loading ? (
              <div className="flex justify-center items-center h-32 border-b border-gray-200 min-w-[900px]">
                <p className="text-gray-500">Loading admins...</p>
              </div>
            ) : filteredAdmins.length > 0 ? (
              filteredAdmins.map((admin) => (
                <div key={admin.adminid} className="min-w-[900px] px-2 h-14 flex items-center hover:bg-sky-50 border-b border-[#1460A2]/50">
                  {/* Date Created */}
                  <div className="w-[15%] min-w-[120px] px-2 text-gray-600 text-center text-sm">
                    {admin.datecreated ? new Date(admin.datecreated).toLocaleDateString('en-US', {
                      month: 'long', day: 'numeric', year: 'numeric'
                    }) : '-'}
                  </div>
                  
                  {/* Admin Name */}
                  <div className="w-[15%] min-w-[120px] px-2 text-black text-center font-bold text-sm">
                    {admin.adminname}
                  </div>
                  
                  {/* Email */}
                  <div className="w-[20%] min-w-[180px] px-2 text-black text-center text-sm">
                    {admin.adminemail}
                  </div>
                  
                  {/* Unit */}
                  <div className="w-[20%] min-w-[180px] px-2 text-black text-center text-sm">
                    {getUnit(admin.documentdirection)}
                  </div>
                  
                  {/* Document Direction */}
                  <div className="w-[15%] min-w-[120px] px-2 text-center">
                    <span className={`inline-block px-4 py-2 rounded-full text-sm text-black`}>
                      {admin.documentdirection?.charAt(0).toUpperCase() + admin.documentdirection?.slice(1)}
                    </span>
                  </div>
                  
                  {/* Actions */}
                  <div className="w-[15%] min-w-[120px] px-2 flex justify-center space-x-1">
                    <button 
                      onClick={() => handleView(admin)}
                      className="p-2 bg-[#45A3F5] text-white rounded-lg hover:bg-[#1E87DC] transition-colors cursor-pointer"
                      title="View"
                    >
                      <img src="/viewIcon.svg" alt="View" className="w-3 h-3" />
                    </button>
                    <button 
                      onClick={() => handleEdit(admin)}
                      className="p-2 bg-[#28A745] text-white rounded-lg hover:bg-[#218838] transition-colors cursor-pointer"
                      title="Edit"
                    >
                      <img src="/editIcon.svg" alt="Edit" className="w-3 h-3" />
                    </button>
                    <button 
                      onClick={() => handleArchive(admin.adminid)}
                      className={
                        `p-2 bg-[#FF9500] text-white rounded-lg transition-colors cursor-pointer 
                        ${archivingId === admin.adminid ? 'pointer-events-none' : ''} 
                        ${
                          (currentAdminDirection === 'incoming' && admin.documentdirection?.toLowerCase() !== 'incoming') ||
                          (currentAdminDirection === 'outgoing' && admin.documentdirection?.toLowerCase() !== 'outgoing')
                            ? 'opacity-50 pointer-events-none'
                            : 'hover:bg-[#CC7A00]'
                        }`
                      }
                      title="Archive"
                      disabled={
                        archivingId === admin.adminid ||
                        (currentAdminDirection === 'incoming' && admin.documentdirection?.toLowerCase() !== 'incoming') ||
                        (currentAdminDirection === 'outgoing' && admin.documentdirection?.toLowerCase() !== 'outgoing')
                      }
                    >
                      {archivingId === admin.adminid ? (
                        <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4" fill="none"/>
                          <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8v8z"/>
                        </svg>
                      ) : (
                        <img src="/archiveIcon.svg" alt="Archive" className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-500 py-12">
                  <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-lg font-medium text-gray-600">No Admins Found</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Admin Modal */}
      {showAdminModal && (
        <OverlayAdmin
          isOpen={showAdminModal}
          onClose={(refresh) => {
            setShowAdminModal(false);
            if (refresh) {
              fetchAdmins();
            }
          }}
          editingDoc={selectedAdmin}
          viewMode={isViewMode}
          editMode={isEditMode}
        />
      )}
    </div>
  );
}

export default ManageAdmin;