import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2'; 
import '../index.css'

function ArchiveAdmin() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMonth, setSelectedMonth] = useState('All');
  const [selectedYear, setSelectedYear] = useState('All');
  const API_URL = import.meta.env.VITE_API_URL;
  const adminData = localStorage.getItem('admin');
  const adminDirection = adminData ? JSON.parse(adminData).documentdirection : null;
  const getUnit = (direction) => direction?.toLowerCase() === 'incoming' ? 'ORD' : 'Budget and Finance Unit';

  // Fetch archived admins
  const fetchAdmins = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/admins/archived`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      setAdmins(data);
    } catch (error) {
      console.error('Error fetching admins:', error);
      Swal.fire({
        icon: 'error',
        title: 'Failed to load archived admins',
        text: 'Please try again.',
        timer: 2500,
        showConfirmButton: false,
        customClass: {
          popup: 'swal2-minimalist'
        }
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  // Restore admin
  const handleRestore = async (adminId) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: 'Do you want to restore this admin?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, restore it!',
      customClass: {
        popup: 'swal2-minimalist'
      }
    });
    if (!result.isConfirmed) return;
    try {
      const response = await fetch(`${API_URL}/api/admins/${adminId}/restore`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isarchive: false })
      });
      if (response.ok) {
        setAdmins(admins.filter(admin => admin.adminid !== adminId));
        Swal.fire({
          icon: 'success',
          title: 'Restored!',
          text: 'Admin has been restored.',
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
          title: 'Failed to restore',
          text: error.message || 'Failed to restore admin. Please try again.',
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
        text: error.message || 'An error occurred while restoring. Please try again.',
        timer: 2500,
        showConfirmButton: false,
        customClass: {
          popup: 'swal2-minimalist'
        }
      });
    }
  };

  const handleDelete = async (adminId) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: 'This will permanently delete the admin from the database. This action cannot be undone!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!',
      customClass: {
        popup: 'swal2-minimalist'
      }
    }); 
    
    if (!result.isConfirmed) return;
    
    try {
      const response = await fetch(`${API_URL}/api/admins/${adminId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      });
  
      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        throw new Error(text || 'Failed to delete admin');
      }
  
      const data = await response.json();
  
      if (!response.ok) {
        throw new Error(data.message || 'Failed to delete admin');
      }
  
      setAdmins(admins.filter(admin => admin.adminid !== adminId));
      Swal.fire({
        icon: 'success',
        title: 'Deleted!',
        text: 'Admin has been permanently deleted.',
        timer: 1800,
        showConfirmButton: false,
        customClass: {
          popup: 'swal2-minimalist'
        }
      });
    } catch (error) {
      console.error('Error deleting admin:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message.includes('<!DOCTYPE html>') 
          ? 'Server error occurred' 
          : error.message || 'An error occurred while deleting. Please try again.',
        timer: 2500,
        showConfirmButton: false,
        customClass: {
          popup: 'swal2-minimalist'
        }
      });
    }
  };

  // Filtering
  const filteredAdmins = admins.filter(admin => {
    const archiveDateStr = admin.archivedate;
    let matchesMonth = true;
    let matchesYear = true;
    if (archiveDateStr && archiveDateStr !== '-') {
      const [month] = archiveDateStr.split(' ');
      const year = archiveDateStr.match(/\d{4}/)?.[0];
      matchesMonth = selectedMonth === 'All' || month === selectedMonth;
      matchesYear = selectedYear === 'All' || Number(year) === Number(selectedYear);
    }
    const search = searchTerm.toLowerCase();
    const unit = getUnit(admin.documentdirection)?.toLowerCase();
    const direction = admin.documentdirection?.toLowerCase();
    const matchesSearch =
      admin.adminname?.toLowerCase().includes(search) ||
      admin.adminemail?.toLowerCase().includes(search) ||
      unit?.includes(search) ||
      direction?.includes(search);
    return matchesSearch && matchesMonth && matchesYear;
  });

  return (
    <div className="p-1 relative">
      {/* Filters */}
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
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[1200px]">
          {/* Table Header */}
          <div className="bg-sky-700 h-15 flex items-center rounded-lg px-2 text-white font-bold text-sm">
            <div className="w-[15%] min-w-[120px] px-2 text-center">DATE CREATED</div>
            <div className="w-[15%] min-w-[120px] px-2 text-center">ADMIN NAME</div>
            <div className="w-[20%] min-w-[180px] px-2 text-center">EMAIL</div>
            <div className="w-[20%] min-w-[180px] px-2 text-center">UNIT</div>
            <div className="w-[15%] min-w-[120px] px-2 text-center">DOCUMENT DIRECTION</div>
            <div className="w-[15%] min-w-[120px] px-2 text-center">ARCHIVE DATE</div>
            <div className="w-[10%] min-w-[100px] px-2 text-center">ACTIONS</div>
          </div>

          {/* Table Body - scrollable and hides scrollbar */}
          <div
            className="w-full flex-1 overflow-y-auto scrollbar-hide"
            style={{ minHeight: 0, maxHeight: 'calc(100vh - 260px)' }}
          >
            {loading ? (
              <div className="flex justify-center items-center h-32 min-w-[1000px] border-b border-gray-200">
                <p className="text-gray-500">Loading admins...</p>
              </div>
            ) : filteredAdmins.length > 0 ? (
              filteredAdmins.map((admin) => (
                <div key={admin.adminid} className="min-w-[1000px] px-2 h-16 flex items-center hover:bg-sky-50 border-b border-[#1460A2]/50">
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
                  {/* Archive Date */}
                  <div className="w-[15%] min-w-[120px] px-2 text-gray-600 text-center text-sm">
                    {admin.archivedate || '-'}
                  </div>

                  {/* Actions */}
                  <div className="w-[10%] min-w-[100px] px-2 flex justify-center space-x-1 py-3">
                    <button
                      onClick={() => handleRestore(admin.adminid)}
                      className={
                        `p-2 rounded transition-colors bg-slate-500 text-white 
                        ${(
                          (adminDirection === 'incoming' && admin.documentdirection?.toLowerCase() !== 'incoming') ||
                          (adminDirection === 'outgoing' && admin.documentdirection?.toLowerCase() !== 'outgoing')
                        ) ? 'opacity-50 pointer-events-none' : 'hover:bg-slate-600 cursor-pointer'}`
                      }
                      title="Restore"
                      disabled={
                        (adminDirection === 'incoming' && admin.documentdirection?.toLowerCase() !== 'incoming') ||
                        (adminDirection === 'outgoing' && admin.documentdirection?.toLowerCase() !== 'outgoing')
                      }
                      tabIndex={-1}
                    >
                      <img
                        src="/archiveIconBack.svg"
                        alt="Restore"
                        className="w-3 h-3"
                      />
                    </button>
                    <button
                      onClick={() => handleDelete(admin.adminid)}
                      className={
                        `p-2 rounded transition-colors bg-red-500 text-white 
                        ${(
                          (adminDirection === 'incoming' && admin.documentdirection?.toLowerCase() !== 'incoming') ||
                          (adminDirection === 'outgoing' && admin.documentdirection?.toLowerCase() !== 'outgoing')
                        ) ? 'opacity-50 pointer-events-none' : 'hover:bg-red-600 cursor-pointer'}`
                      }
                      title="Delete Permanently"
                      disabled={
                        (adminDirection === 'incoming' && admin.documentdirection?.toLowerCase() !== 'incoming') ||
                        (adminDirection === 'outgoing' && admin.documentdirection?.toLowerCase() !== 'outgoing')
                      }
                      tabIndex={-1}
                    >
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        className="h-3 w-3" 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-500 py-12">
                  <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-lg font-medium text-gray-600">No Archive Admins Found</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ArchiveAdmin;