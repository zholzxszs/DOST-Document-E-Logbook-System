import React, { useState, useEffect, useCallback } from 'react';
import Swal from 'sweetalert2'; 
import '../index.css'
import { io } from 'socket.io-client';
import moment from 'moment';

function ArchiveDocuments() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(new Date().toLocaleString('en-US', { month: 'long' }));
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  const API_URL = import.meta.env.VITE_API_URL;
  const months = ['All', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 6 }, (_, i) => currentYear - i);
  const adminData = localStorage.getItem('admin');
  const adminDirection = adminData ? JSON.parse(adminData).documentdirection : null;

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/documents/archived`);
      
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      const data = await response.json();
      const filteredDocuments = data.map(doc => ({
        documentid: doc.documentid,
        dtsNo: doc.dtsno,
        dateReceived: doc.datesent || '-',
        dateReleased: doc.datereleased || '-', 
        documentType: doc.documenttype || '-',
        documentDirection: doc.documentdirection ? doc.documentdirection.charAt(0).toUpperCase() + doc.documentdirection.slice(1) : '-',
        archiveDate: doc.archivedate || '-',
        archiveBy: doc.archivedby || '-'
      }));

      setDocuments(filteredDocuments);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching documents:', error);
      setLoading(false);
      Swal.fire({
        icon: 'error',
        title: 'Failed to load documents',
        text: 'Please try again.',
        timer: 2500,
        showConfirmButton: false,
        customClass: {
          popup: 'swal2-minimalist'
        }
      });
    }
  }, [API_URL]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  useEffect(() => {
    const socket = io(API_URL);
    socket.on('documents_updated', fetchDocuments);

    return () => {
      socket.off('documents_updated', fetchDocuments);
      socket.disconnect();
    };
  }, [API_URL, fetchDocuments]);

  // Handle restore
  const handleRestore = async (docId) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: 'Do you want to restore this document?',
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
      const response = await fetch(`${API_URL}/api/documents/${docId}/restore`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isarchive: false
        })
      });

      if (response.ok) {
        setDocuments(documents.filter(doc => doc.documentid !== docId));
        Swal.fire({
          icon: 'success',
          title: 'Restored!',
          text: 'Document has been restored.',
          timer: 1800,
          showConfirmButton: false,
          customClass: {
            popup: 'swal2-minimalist'
          }
        });
      } else {
        const error = await response.json();
        console.error('Failed to restore document:', error);
        Swal.fire({
          icon: 'error',
          title: 'Failed to restore',
          text: error.message || 'Failed to restore document. Please try again.',
          timer: 2500,
          showConfirmButton: false,
          customClass: {
            popup: 'swal2-minimalist'
          }
        });
      }
    } catch (error) {
      console.error('Error restoring document:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'An error occurred while restoring. Please try again.',
        timer: 2500,
        showConfirmButton: false,
        customClass: {
          popup: 'swal2-minimalist'
        }
      });
    }
  };

  // Handle delete action
  const handleDelete = async (docId) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: 'This will permanently delete the document from the database. This action cannot be undone!',
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
      const response = await fetch(`${API_URL}/api/documents/${docId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      });
  
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        throw new Error(text || 'Failed to delete document');
      }
  
      const data = await response.json();
  
      if (!response.ok) {
        throw new Error(data.message || 'Failed to delete document');
      }
  
      setDocuments(documents.filter(doc => doc.documentid !== docId));
      Swal.fire({
        icon: 'success',
        title: 'Deleted!',
        text: 'Document has been permanently deleted.',
        timer: 1800,
        showConfirmButton: false,
        customClass: {
          popup: 'swal2-minimalist'
        }
      });
    } catch (error) {
      console.error('Error deleting document:', error);
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

  const filteredDocuments = documents.filter(doc => {
    const search = searchTerm.toLowerCase();
    const matchesSearch =
      doc.dtsNo?.toLowerCase().includes(search) ||
      doc.documentType?.toLowerCase().includes(search) ||
      doc.documentDirection?.toLowerCase().includes(search);

    // Archive date filter (Month/Year)
    const archiveDateStr = doc.archiveDate;
    let matchesMonth = true;
    let matchesYear = true;
    if (archiveDateStr && archiveDateStr !== '-') {
      const [month] = archiveDateStr.split(' ');
      const year = archiveDateStr.match(/\d{4}/)?.[0];
      matchesMonth = selectedMonth === 'All' || month === selectedMonth;
      matchesYear = selectedYear === 'All' || Number(year) === Number(selectedYear);
    }
    return matchesSearch && matchesMonth && matchesYear;
  });

  
  const formatDate = (dateString) => {
    if (!dateString || dateString === '-') return '-';
    
    try {
      const date = moment(dateString);
      return date.isValid() ? date.format('MMMM D, YYYY [at] h:mm A') : '-';
    } catch (e) {
      console.error('Error formatting date:', e);
      return '-';
    }
  };

  // Components
  const DropdownButton = ({ label, value, onClick, isOpen }) => (
    <div className="relative w-32">
      <button
        onClick={onClick}
        className={`h-11 bg-sky-700/95 ${
          isOpen ? 'rounded-t-lg border-b-0' : 'rounded-2xl'
        } shadow-sm flex items-center justify-between px-4 text-white font-semibold text-xl cursor-pointer hover:bg-sky-700 transition-colors w-full border`}
      >
        {value}
        <svg 
          className={`w-4 h-4 ml-2 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
    </div>
  );

  const DropdownMenu = ({ items, onSelect, isOpen, className }) => (
    isOpen && (
      <div
        className={`absolute top-full left-0 z-30 w-full bg-white rounded-b-lg shadow-md border border-t-0 ${className}`}
      >
        {items.map((item) => (
          <div
            key={item}
            className="px-4 py-2 text-sm text-gray-700 hover:bg-sky-100 cursor-pointer"
            onClick={() => onSelect(item)}
          >
            {item}
          </div>
        ))}
      </div>
    )
  );

  return (
    <div className="p-1 relative">
      <div className="flex flex-wrap justify-end gap-x-2 mb-4">
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

        <div className="flex flex-col items-start relative">
          <DropdownButton 
            label="Month" 
            value={selectedMonth} 
            onClick={() => setShowMonthDropdown(!showMonthDropdown)}
            isOpen={showMonthDropdown}
          />
          <DropdownMenu
            items={months}
            onSelect={(month) => {
              setSelectedMonth(month);
              setShowMonthDropdown(false);
            }}
            isOpen={showMonthDropdown}
          />
        </div>

        <div className="flex flex-col items-start relative">
          <DropdownButton 
            label="Year" 
            value={selectedYear} 
            onClick={() => setShowYearDropdown(!showYearDropdown)}
            isOpen={showYearDropdown}
          />
          <DropdownMenu
            items={years}
            onSelect={(year) => {
              setSelectedYear(year);
              setShowYearDropdown(false);
            }}
            isOpen={showYearDropdown}
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[1200px]">
          {/* Table Header */}
          <div className="bg-sky-700 h-15 flex items-center rounded-lg px-4 text-white font-bold text-sm">
            <div className="w-[15%] min-w-[100px] px-2 text-center">
              {(() => {
                const adminData = localStorage.getItem('admin');
                if (adminData) {
                  const admin = JSON.parse(adminData);
                  return admin.documentdirection === 'incoming' ? 'DATE SENT' : 'DATE RECEIVED';
                }
                return 'DATE SENT';
              })()}
            </div>
            <div className="w-[15%] min-w-[150px] px-2 text-center">DATE RELEASED</div>
            <div className="w-[12%] min-w-[120px] px-2 text-center">DTS NO.</div>
            <div className="w-[12%] min-w-[120px] px-2 text-center">DOCUMENT STATUS</div>
            <div className="w-[15%] min-w-[150px] px-2 text-center">DOCUMENT TYPE</div>
            <div className="w-[15%] min-w-[150px] px-2 text-center">ARCHIVE DATE</div>
            <div className="w-[12%] min-w-[120px] px-2 text-center">ARCHIVED BY</div>
            <div className="w-[10%] min-w-[100px] px-2 text-center">ACTIONS</div>
          </div>

          {/* Table Body */}
          <div
            className="w-full flex-1 overflow-y-auto scrollbar-hide"
            style={{ minHeight: 0, maxHeight: 'calc(100vh - 260px)' }} 
          >
            {loading ? (
              <div className="flex justify-center items-center h-32 min-w-[1000px] border-b border-gray-200">
                <p className="text-gray-500">Loading documents...</p>
              </div>
            ) : filteredDocuments.length > 0 ? (
              filteredDocuments.map((doc) => (
                <div key={doc.documentid} className="min-w-[1000px] px-4 h-16 flex items-center hover:bg-sky-50 border-b border-[#1460A2]/50">
                  {/* Date Sent/Received */}
                  <div className="w-[15%] min-w-[150px] px-2 text-gray-500 text-center text-sm py-3">
                    {formatDate(doc.dateReceived)}
                  </div>
                  
                  {/* Date Released */}
                  <div className="w-[15%] min-w-[150px] px-2 text-gray-500 text-center text-sm py-3">
                    {doc.dateReleased}
                  </div>
                  
                  {/* DTS Number */}
                  <div className="w-[12%] min-w-[120px] px-2 text-black text-center font-bold text-sm py-3">
                    {doc.dtsNo}
                  </div>
                  
                  {/* Document Status */}
                  <div className="w-[12%] min-w-[120px] px-2 text-center">
                    <span className={`inline-block px-4 py-2 rounded-full text-sm text-black`}>
                      {doc.documentDirection.charAt(0).toUpperCase() + doc.documentDirection.slice(1)}
                    </span>
                  </div>
                  
                  {/* Document Type */}
                  <div className="w-[15%] min-w-[150px] px-2 text-black text-center text-sm py-3 truncate">
                    {doc.documentType}
                  </div>
                  
                  {/* Archive Date */}
                  <div className="w-[15%] min-w-[150px] px-2 text-gray-500 text-center text-sm py-3">
                    {doc.archiveDate}
                  </div>
                  
                  {/* Archive By */}
                  <div className="w-[12%] min-w-[120px] px-2 text-black text-center text-sm py-3 truncate">
                    {doc.archiveBy}
                  </div>
                  
                  {/* Actions */}
                  <div className="w-[10%] min-w-[100px] px-2 flex justify-center space-x-1 py-3">
                    <button 
                      onClick={() => handleRestore(doc.documentid)}
                      className={
                        `p-2 rounded transition-colors bg-slate-500  text-white 
                        ${(
                          (adminDirection === 'incoming' && doc.documentDirection.toLowerCase() !== 'incoming') ||
                          (adminDirection === 'outgoing' && doc.documentDirection.toLowerCase() !== 'outgoing')
                        ) ? 'opacity-50 pointer-events-none' : 'hover:bg-slate-600 cursor-pointer'}`
                      }
                      title="Restore"
                      disabled={
                        (adminDirection === 'incoming' && doc.documentDirection.toLowerCase() !== 'incoming') ||
                        (adminDirection === 'outgoing' && doc.documentDirection.toLowerCase() !== 'outgoing')
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
                      onClick={() => handleDelete(doc.documentid)}
                      className={
                        `p-2 rounded transition-colors bg-red-500 text-white 
                        ${(
                          (adminDirection === 'incoming' && doc.documentDirection.toLowerCase() !== 'incoming') ||
                          (adminDirection === 'outgoing' && doc.documentDirection.toLowerCase() !== 'outgoing')
                        ) ? 'opacity-50 pointer-events-none' : 'hover:bg-red-600 cursor-pointer'}`
                      }
                      title="Delete Permanently"
                      disabled={
                        (adminDirection === 'incoming' && doc.documentDirection.toLowerCase() !== 'incoming') ||
                        (adminDirection === 'outgoing' && doc.documentDirection.toLowerCase() !== 'outgoing')
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
                  <p className="text-lg font-medium text-gray-600">No Archive Documents Found</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ArchiveDocuments;