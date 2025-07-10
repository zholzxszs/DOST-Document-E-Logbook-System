import React, { useState, useEffect, useCallback } from 'react';
import OverlayIncoming from '../OverlayModal/OverlayIncoming';
import OverlayOutgoing from '../OverlayModal/OverlayOutgoing';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import Swal from 'sweetalert2';
import '../index.css'
import { io } from 'socket.io-client';

function AllDocs() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(new Date().toLocaleString('en-US', { month: 'long' }));
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  const [showIncomingModal, setShowIncomingModal] = useState(false);
  const [showOutgoingModal, setShowOutgoingModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [isViewMode, setIsViewMode] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const API_URL = import.meta.env.VITE_API_URL;
  const months = ['All', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 6 }, (_, i) => currentYear - i);
  const adminData = localStorage.getItem('admin');
  const admin = adminData ? JSON.parse(adminData) : null;
  const adminDirection = admin?.documentdirection;
  const adminUserType = admin?.usertype;
  const [updatingTimeId, setUpdatingTimeId] = useState(null);
  const [archivingId, setArchivingId] = useState(null);

  // Fetch documents
  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/documents`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      const transformedDocuments = data.map(doc => ({
        id: doc.documentid,
        dtsNo: doc.dtsno,
        dateSent: doc.datesent,
        documentDirection: doc.documentdirection,
        documentType: doc.documenttype,
        dateReceive: doc.datereleased || '-',
        time: doc.time || '-',
        route: doc.route || '-',
        remarks: doc.remarks || '-',
        archiveStatus: doc.isarchive
      }));
      const filtered = transformedDocuments
        .filter(doc => !doc.archiveStatus)
        .sort((a, b) => new Date(b.dateSent) - new Date(a.dateSent));
      setDocuments(filtered);
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

  // Handle View action
  const handleView = (doc) => {
    const adminData = localStorage.getItem('admin');
    let adminDirection = null;
    
    if (adminData) {
      const admin = JSON.parse(adminData);
      adminDirection = admin.documentdirection; // 'incoming' or 'outgoing'
    }

    setSelectedDocument({
      ...doc,
      documentid: doc.id,
      dtsno: doc.dtsNo,
      documenttype: doc.documentType,
      documentdirection: adminDirection || doc.documentDirection, // Use admin's direction or document's direction
      route: doc.route,
      remarks: doc.remarks,
      datereleased: doc.dateReceive,
      time: doc.time
    });
    
    setIsViewMode(true);
    setIsEditMode(false);
    
    // Always use admin's direction to determine which modal to show
    if (adminDirection === 'incoming') {
      setShowIncomingModal(true);
      setShowOutgoingModal(false);
    } else {
      // Default to outgoing if no admin direction or if outgoing
      setShowOutgoingModal(true);
      setShowIncomingModal(false);
    }
  };

  // Handle Edit action
  const handleEdit = (doc) => {
    const adminData = localStorage.getItem('admin');
    let adminDirection = null;
    
    if (adminData) {
      const admin = JSON.parse(adminData);
      adminDirection = admin.documentdirection;
    }

    setSelectedDocument({
      ...doc,
      documentid: doc.id,
      dtsno: doc.dtsNo,
      documenttype: doc.documentType,
      documentdirection: adminDirection || 'outgoing', // Force to admin's direction (default to outgoing)
      route: doc.route,
      remarks: doc.remarks,
      datereleased: doc.dateReceive,
      time: doc.time
    });
    
    setIsViewMode(false);
    setIsEditMode(true);
    
    // Force modal based on admin's direction
    if (adminDirection === 'incoming') {
      setShowIncomingModal(true);
      setShowOutgoingModal(false);
    } else {
      setShowOutgoingModal(true);
      setShowIncomingModal(false);
    }
  };

  const handleArchive = async (docId) => {
    const doc = documents.find(d => d.id === docId);
    if (!doc) return;

    let archiveBy;
    const adminData = localStorage.getItem('admin');
    if (adminData) {
      const admin = JSON.parse(adminData);
      const userType = (admin.usertype || '').toLowerCase();

      // If ITSM user is logged in, always tag as ITSM
      if (userType.includes('itsm')) {
        archiveBy = 'ITSM';
      }
      // If an Admin / SuperAdmin user is logged in, determine based on the document's direction
      else if (userType.includes('admin')) {
        const adminDir = (admin.documentdirection || '').toLowerCase();
        if (adminDir === 'incoming') {
          archiveBy = 'ORD';
        } else if (adminDir === 'outgoing') {
          archiveBy = 'Budget and Finance Unit';
        }
      }
    }

    const result = await Swal.fire({
      title: 'Are you sure?',
      text: 'Do you want to archive this document?',
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

    setArchivingId(docId);
    try {
      const archiveDateStr = formatArchiveDate();
      const response = await fetch(`${API_URL}/api/documents/${docId}/archive`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isarchive: true,
          archivedate: archiveDateStr,
          archivedby: archiveBy
        })
      });

      if (response.ok) {
        setDocuments(prev => prev.filter(doc => doc.id !== docId));
        Swal.fire({
          icon: 'success',
          title: 'Archived!',
          text: 'Document has been archived.',
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
          text: error.message || 'Failed to archive document. Please try again.',
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

  // Handler to update time in backend and UI
  const handleTimeChange = async (docId, newTime) => {
    setUpdatingTimeId(docId);
    try {
      const response = await fetch(`${API_URL}/api/documents/${docId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ time: newTime })
      });
      
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update time');
      }
      
      const result = await response.json();
      
      setDocuments(prevDocs =>
        prevDocs.map(doc =>
          doc.id === docId ? { ...doc, time: newTime || '-' } : doc
        )
      );
      
      Swal.fire({
        icon: 'success',
        title: 'Time updated',
        text: 'Time Received has been updated.',
        timer: 1200,
        showConfirmButton: false,
        customClass: { popup: 'swal2-minimalist' }
      });
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Failed to update',
        text: error.message || 'Failed to update time.',
        timer: 2000,
        showConfirmButton: false,
        customClass: { popup: 'swal2-minimalist' }
      });
    } finally {
      setUpdatingTimeId(null);
    }
  };

  // Filter documents based on selected filters
  const filteredDocuments = documents.filter(doc => {
    const docDate = new Date(doc.dateSent);
    // Search should match DTS No, Document Type, Route, Time, or Document Direction
    const search = searchTerm.toLowerCase();
    const docType = doc.documentType?.toLowerCase().replace(/_/g, ' ');
    const route = doc.route?.toLowerCase().replace(/_/g, ' ');
    const time = doc.time?.toLowerCase().replace(/_/g, ' ');
    const direction = doc.documentDirection?.toLowerCase();
    const matchesSearch =
      doc.dtsNo?.toLowerCase().includes(search) ||
      docType?.includes(search) ||
      route?.includes(search) ||
      time?.includes(search) ||
      direction?.includes(search);
    const matchesMonth =
      selectedMonth === 'All' ||
      docDate.toLocaleString('en-US', { month: 'long' }) === selectedMonth;
    const matchesYear = selectedYear === 'All' || docDate.getFullYear() === selectedYear;

    return matchesSearch && matchesMonth && matchesYear;
  });

  // Helper functions
  const formatDate = (dateString) => {
    if (!dateString || dateString === '-') return '-';
  
    // If already in the correct format, return as-is
    if (typeof dateString === 'string' && 
        dateString.match(/^[A-Za-z]+ \d{1,2}, \d{4} at \d{1,2}:\d{2} [AP]M$/)) {
      return dateString;
    }
  
    // Handle UTC ISO format (2025-07-07T10:30:00.000Z)
    if (typeof dateString === 'string' && dateString.includes('T') && dateString.endsWith('Z')) {
      try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '-';
        
        const months = [
          'January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'
        ];
        
        const month = months[date.getUTCMonth()];
        const day = date.getUTCDate();
        const year = date.getUTCFullYear();
        
        let hours = date.getUTCHours();
        const minutes = date.getUTCMinutes().toString().padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12;
        
        return `${month} ${day}, ${year} at ${hours}:${minutes} ${ampm}`;
      } catch (e) {
        console.error('Error formatting UTC ISO date:', e);
        return '-';
      }
    }
  
    // Handle database timestamp format (YYYY-MM-DD HH:mm:ss)
    const timestampRegex = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}):(\d{2}))?$/;
    const timestampMatch = dateString.match(timestampRegex);
    
    if (timestampMatch) {
      try {
        const [, year, month, day, hour = '00', minute = '00'] = timestampMatch;
        const hourNum = parseInt(hour, 10);
        const ampm = hourNum >= 12 ? 'PM' : 'AM';
        const displayHour = hourNum % 12 || 12;
        const displayMinute = minute.padStart(2, '0');
        
        const monthName = [
          'January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'
        ][parseInt(month, 10) - 1];
        
        return `${monthName} ${parseInt(day, 10)}, ${year} at ${displayHour}:${displayMinute} ${ampm}`;
      } catch (e) {
        console.error('Error formatting timestamp date:', e);
        return '-';
      }
    }
  
    // Fallback for Date objects or other formats
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '-';
      
      const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      
      const month = months[date.getMonth()];
      const day = date.getDate();
      const year = date.getFullYear();
      let hours = date.getHours();
      const minutes = date.getMinutes().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      
      return `${month} ${day}, ${year} at ${hours}:${minutes} ${ampm}`;
    } catch (e) {
      console.error('Error formatting fallback date:', e);
      return '-';
    }
  };

  function formatArchiveDate(dateObj = new Date()) {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const month = months[dateObj.getMonth()];
    const day = dateObj.getDate();
    const year = dateObj.getFullYear();
    let hours = dateObj.getHours();
    const minutes = dateObj.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${month} ${day}, ${year} at ${hours}:${minutes} ${ampm}`;
  }

  const getDirectionStyle = (direction) => {
    switch (direction) {
      case 'Incoming': return 'bg-[#4B698B] text-white';
      case 'Outgoing': return 'bg-[#123052] text-white';
      default: return 'bg-gray-200 text-gray-800';
    }
  };

  const getRouteStyle = (route) => {
    switch (route) {
      case 'ORD': return 'text-black';
      case 'Accounting Unit': return 'text-black';
      case 'For Compliance': return 'text-[#DC3545]';
      default: return 'text-gray-800';
    }
  };

  // Excel Export Function
  const handleExportToExcel = async () => {
    // Only filter by selectedMonth and selectedYear for export
    const exportDocuments = documents.filter(doc => {
      const docDate = new Date(doc.dateSent);
      const matchesMonth =
        selectedMonth === 'All' ||
        docDate.toLocaleString('en-US', { month: 'long' }) === selectedMonth;
      const matchesYear = selectedYear === 'All' || docDate.getFullYear() === selectedYear;
      return matchesMonth && matchesYear;
    });

    if (exportDocuments.length === 0) {
      Swal.fire({
        icon: 'info',
        title: 'No data to export',
        text: 'There are no documents to export.',
        timer: 1800,
        showConfirmButton: false,
        customClass: {
          popup: 'swal2-minimalist'
        }
      });
      return;
    }

    const workbook = new ExcelJS.Workbook();
    // Create a descriptive worksheet name based on filters
    let sheetName = '';
    if (selectedMonth !== 'All' || selectedYear !== 'All') {
      const monthYear = [];
      if (selectedMonth !== 'All') monthYear.push(selectedMonth);
      if (selectedYear !== 'All') monthYear.push(selectedYear.toString());
      sheetName = `${monthYear.join(' ')}`;
    }
    if (sheetName.length > 31) {
      sheetName = sheetName.substring(0, 28) + '...';
    }
    const worksheet = workbook.addWorksheet(sheetName);

    const headers = [
      'Date Sent', 'Date Released', 'Time Received', 'DTS No.', 'Document Status',
      'Document Type', 'Routed To', 'Remarks'
    ];
    worksheet.addRow(headers);

    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 13, name: 'Arial' };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '1460A2' }
      };
      cell.alignment = {
        vertical: 'middle',
        horizontal: 'center',
        wrapText: true
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
    headerRow.height = 30;

    // Add and style data rows
    exportDocuments.slice().reverse().forEach((doc) => {
      const rowValues = [
        formatDate(doc.dateSent),
        doc.dateReceive || '-',
        doc.time?.replace('_', ' ').toUpperCase() || '-',
        doc.dtsNo,
        doc.documentDirection.charAt(0).toUpperCase() + doc.documentDirection.slice(1),
        doc.documentType?.trim() || '-',
        doc.route?.replace('_', ' ') || '-',
        doc.remarks || '-'
      ];
      const row = worksheet.addRow(rowValues);

      row.eachCell((cell, colNumber) => {
        cell.font = { name: 'Arial', size: 11, color: { argb: '000000' } };
        cell.alignment = {
          vertical: 'middle',
          horizontal: colNumber === 8 ? 'left' : 'center',
          wrapText: true
        };
        cell.border = {
          top: { style: 'thin', color: { argb: 'D3D3D3' } },
          left: { style: 'thin', color: { argb: 'D3D3D3' } },
          bottom: { style: 'thin', color: { argb: 'D3D3D3' } },
          right: { style: 'thin', color: { argb: 'D3D3D3' } }
        };
        // DTS No. cell (col 4)
        if (colNumber === 4) {
          cell.font = {
            name: 'Arial',
            bold: true,
            size: 11,
            color: { argb: '000000' }
          };
        }

        if (colNumber === 3) {
          cell.font = {
            name: 'Arial',
            size: 11,
            color: { argb: '000000' }
          };
        }

        if (colNumber === 5) {
          cell.font = {
            name: 'Arial',
            bold: true,
            size: 11,
            color: { argb: 'FFFFFFFF' }
          };
          if (cell.value === 'Incoming') {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '4B698B' } };
          } else if (cell.value === 'Outgoing') {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '123052' } };
          }
        }

        if (colNumber === 7) {
          const route = cell.value.toString();
          if (route === 'For Compliance') {
            cell.font = { name: 'Arial', size: 11, color: { argb: 'DC3545' } };
          } else {
            cell.font = { name: 'Arial', size: 11, color: { argb: '000000' } };
          }
        }
      });

      row.height = 25;
    });

    // Add note at the bottom
    const currentDate = new Date();
    const dateStr = currentDate.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
    const timeStr = currentDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    
    // Add 3 empty rows for spacing above the note
    for (let i = 0; i < 3; i++) {
      const spacingRow = worksheet.addRow(['', '', '', '', '', '', '', '']);
      spacingRow.height = 15;
    }
    
    // Add note row
    const noteRow = worksheet.addRow(['', '', '', '', '', '', '', '']);
    noteRow.height = 20;
    
    // Merge cells for the note (span all 8 columns)
    worksheet.mergeCells(`A${noteRow.number}:H${noteRow.number}`);
    
    // Get the merged cell and set its value and style
    const noteCell = worksheet.getCell(`A${noteRow.number}`);
    noteCell.value = `Note: This is a system-generated file. Generated on: ${dateStr} ${timeStr}`;
    noteCell.font = { 
      name: 'Arial', 
      size: 11, 
      bold: true, 
      italic: true,
      color: { argb: '000000' }
    };
    noteCell.alignment = {
      vertical: 'middle',
      horizontal: 'center',
      wrapText: true
    };
    noteCell.border = {
      top: { style: 'thin', color: { argb: 'D3D3D3' } },
      left: { style: 'thin', color: { argb: 'D3D3D3' } },
      bottom: { style: 'thin', color: { argb: 'D3D3D3' } },
      right: { style: 'thin', color: { argb: 'D3D3D3' } }
    };

    worksheet.columns = [
      { width: 33 }, { width: 33 }, { width: 25 }, { width: 28 }, { width: 30 },
      { width: 35 }, { width: 30 }, { width: 40 }
    ];

    worksheet.views = [{ state: 'frozen', ySplit: 1 }];

    const buffer = await workbook.xlsx.writeBuffer();
    const fileName = `Document_E-Logbook_${selectedMonth !== 'All' ? selectedMonth : ''}_${selectedYear !== 'All' ? selectedYear : ''}.xlsx`;
    saveAs(new Blob([buffer]), fileName);
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
        {items.map((item, index) => (
          <div
            key={index}
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
      {/* Header with search and filters */}
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

        {/* Month Dropdown */}
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

        {/* Year Dropdown */}
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

        {/* Export to Excel Button */}
        <div className="flex flex-col items-start">
          <button
            onClick={handleExportToExcel}
            className="h-11 bg-sky-700 rounded-2xl shadow-sm flex items-center justify-center px-3.5 text-white text-sm cursor-pointer transition-colors w-11 hover:bg-[#1460A2]"
            title="Export to Excel"
          >
            <img src="/excelIcon.svg" alt="Excel Icon" className='w-15 h-15' />
          </button>
        </div>

        {/* Add Record Button(s) */}
        <div className="flex flex-col items-start">
          {adminDirection === 'incoming' ? (
            <button
              onClick={() => setShowIncomingModal(true)}
              className="h-11 bg-sky-700 rounded-2xl shadow-sm flex items-center justify-center px-4 text-white font-semibold text-[16px] cursor-pointer transition-colors w-45 hover:bg-[#1460A2]"
            >
              Add Incoming
              <svg 
                className="w-4 h-4 ml-2"
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          ) : adminDirection === 'outgoing' ? (
            <button
              onClick={() => setShowOutgoingModal(true)}
              className="h-11 bg-sky-700 rounded-2xl shadow-sm flex items-center justify-center px-4 text-white font-semibold text-[16px] cursor-pointer transition-colors w-45 hover:bg-[#1460A2]"
            >
              Add Outgoing
              <svg 
                className="w-4 h-4 ml-2"
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          ) : (
            <div className="flex gap-x-2">
              <button
                onClick={() => setShowIncomingModal(true)}
                className="h-11 bg-sky-700 rounded-2xl shadow-sm flex items-center justify-center px-4 text-white font-semibold text-[16px] cursor-pointer transition-colors w-45 hover:bg-[#1460A2]"
              >
                Add Incoming
                <svg 
                  className="w-4 h-4 ml-2"
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
              <button
                onClick={() => setShowOutgoingModal(true)}
                className="h-11 bg-sky-700 rounded-2xl shadow-sm flex items-center justify-center px-4 text-white font-semibold text-[16px] cursor-pointer transition-colors w-45 hover:bg-[#1460A2]"
              >
                Add Outgoing
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
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        {/* Table Container */}
        <div className="min-w-[1200px]">
          {/* Table Header */}
          <div className="bg-sky-700 h-15 flex items-center rounded-lg px-2 text-white font-bold text-sm sticky top-0 z-10">
            <div className="w-[10%] min-w-[100px] px-2 text-center">
              {(() => {
                const adminData = localStorage.getItem('admin');
                if (adminData) {
                  const admin = JSON.parse(adminData);
                  return admin.documentdirection === 'incoming' ? 'DATE SENT' : 'DATE RECEIVED';
                }
                return 'DATE SENT';
              })()}
            </div>
            <div className="w-[10%] min-w-[100px] px-2 text-center">DTS NO.</div>
            <div className="w-[12%] min-w-[120px] px-2 text-center">DOCUMENT STATUS</div>
            <div className="w-[18%] min-w-[150px] px-2 text-center">DOCUMENT TYPE</div>
            <div className="w-[12%] min-w-[120px] px-2 text-center">TIME RECEIVED</div>
            <div className="w-[10%] min-w-[100px] px-2 text-center">DATE RELEASED</div>
            <div className="w-[14%] min-w-[120px] px-2 text-center">ROUTED TO</div>
            <div className="w-[10%] min-w-[120px] px-2 text-center">REMARKS</div>
            <div className="w-[12%] min-w-[120px] flex justify-center px-2 text-center">ACTIONS</div>
          </div>

          {/* Table Body */}
          <div
            className="w-full flex-1 overflow-y-auto scrollbar-hide"
            style={{ minHeight: 0, maxHeight: 'calc(100vh - 260px)' }} 
          >
            {loading ? (
              <div className="flex justify-center items-center h-32 border-b border-gray-200 min-w-[1200px]">
                <p className="text-gray-500">Loading documents...</p>
              </div>
            ) : filteredDocuments.length > 0 ? (
              filteredDocuments.map((doc) => (
                <div key={doc.id} className="min-w-[1200px] px-2 h-16 flex items-center hover:bg-sky-50 border-b border-[#1460A2]/50">
                  {/* Date Sent/Received */}
                  <div className="w-[10%] min-w-[100px] px-2 text-gray-500 text-center text-sm">
                    {formatDate(doc.dateSent)}
                  </div>
                  {/* DTS Number */}
                  <div className="w-[10%] min-w-[100px] px-2 text-black text-center font-bold text-sm">
                    {doc.dtsNo}
                  </div>
                  {/* Document Status */}
                  <div className="w-[12%] min-w-[120px] px-2 text-center">
                    <span className={`inline-block px-6 py-1.5 rounded-full text-sm font-bold ${getDirectionStyle(doc.documentDirection.charAt(0).toUpperCase() + doc.documentDirection.slice(1))}`}>
                      {doc.documentDirection.charAt(0).toUpperCase() + doc.documentDirection.slice(1)}
                    </span>
                  </div>
                  {/* Document Type */}
                  <div className="w-[18%] min-w-[150px] px-2 text-black text-center text-sm truncate">
                    {doc.documentType?.trim() || '-'}
                  </div>
                  {/* Time Received */}
                  <div className="w-[12%] min-w-[120px] px-2 text-center">
                    <select
                      value={doc.time === '-' ? '' : doc.time}
                      onChange={e => handleTimeChange(doc.id, e.target.value)}
                      disabled={
                        archivingId === doc.id ||
                        updatingTimeId === doc.id ||
                        doc.archiveStatus ||
                        !(
                          (adminDirection === 'outgoing') ||
                          (adminUserType === 'superadmin')
                        )
                      }
                      className={`inline-block px-4 py-2 text-black text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-sky-700 ${updatingTimeId === doc.id ? 'opacity-60' : ''}`}
                      style={{ minWidth: '80px' }}
                    >
                      <option value="">-</option>
                      <option value="AM">AM</option>
                      <option value="PM">PM</option>
                      <option value="PM_Late">PM Late</option>
                    </select>
                    {updatingTimeId === doc.id && (
                      <span className="ml-2 animate-spin inline-block align-middle">⏳</span>
                    )}
                  </div>
                  {/* Date Released */}
                  <div className="w-[10%] min-w-[100px] px-2 text-gray-500 text-center text-sm">
                      {doc.dateReceive || '-'}
                  </div>
                  {/* Route */}
                  <div className="w-[14%] min-w-[120px] px-2 text-center">
                    <span className={`inline-block px-4 py-2 text-sm ${getRouteStyle(doc.route?.replace('_', ' ') || '-')}`}>
                      {doc.route?.replace('_', ' ') || '-'}
                    </span>
                  </div>
                  {/* Remarks */}
                  <div className="w-[10%] min-w-[120px] px-2 text-black text-center text-sm truncate">
                    {doc.remarks || '-'}
                  </div>
                  {/* Actions */}
                  <div className="w-[12%] min-w-[120px] px-2 flex justify-center space-x-1">
                    <button 
                      onClick={() => handleView(doc)}
                      className="p-2 bg-[#45A3F5] text-white rounded-lg hover:bg-[#1E87DC] transition-colors cursor-pointer"
                      title="View"
                    >
                      <img src="/viewIcon.svg" alt="View" className="w-3 h-3" />
                    </button>
                    <button 
                      onClick={() => handleEdit(doc)}
                      className="p-2 bg-[#28A745] text-white rounded-lg hover:bg-[#218838] transition-colors cursor-pointer"
                      title="Edit"
                    >
                      <img src="/editIcon.svg" alt="Edit" className="w-3 h-3" />
                    </button>
                    <button 
                      onClick={() => handleArchive(doc.id)}
                      className={
                        `p-2 bg-[#FF9500] text-white rounded-lg transition-colors cursor-pointer 
                        ${archivingId === doc.id ? 'pointer-events-none' : ''} 
                        ${
                          (adminDirection === 'incoming' && doc.documentDirection.toLowerCase() !== 'incoming') ||
                          (adminDirection === 'outgoing' && doc.documentDirection.toLowerCase() !== 'outgoing')
                            ? 'opacity-50 pointer-events-none'
                            : 'hover:bg-[#CC7A00]'
                        }`
                      }
                      title="Archive"
                      disabled={
                        archivingId === doc.id ||
                        (adminDirection === 'incoming' && doc.documentDirection.toLowerCase() !== 'incoming') ||
                        (adminDirection === 'outgoing' && doc.documentDirection.toLowerCase() !== 'outgoing')
                      }
                      tabIndex={-1}
                    >
                      {archivingId === doc.id ? (
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
                  <p className="text-lg font-medium text-gray-600">No Documents Found</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showIncomingModal && (
        <OverlayIncoming 
          isOpen={showIncomingModal}
          onClose={() => {
            setShowIncomingModal(false);
            setSelectedDocument(null);
            setIsViewMode(false);
            setIsEditMode(false);
          }}
          editingDoc={selectedDocument}
          viewMode={isViewMode}
          editMode={isEditMode}
          onSuccess={fetchDocuments} 
        />
      )}

      {showOutgoingModal && (
        <OverlayOutgoing 
          isOpen={showOutgoingModal}
          onClose={() => {
            setShowOutgoingModal(false);
            setSelectedDocument(null);
            setIsViewMode(false);
            setIsEditMode(false);
          }}
          editingDoc={selectedDocument}
          viewMode={isViewMode}
          editMode={isEditMode}
          onSuccess={fetchDocuments} 
        />
      )}
    </div>
  );
}

export default AllDocs;