import React, { useState, useEffect, useCallback } from 'react';
import OverlayProcessingDays from '../OverlayModal/OverlayProcessingDays';
import Swal from 'sweetalert2'; 
import '../index.css'
import { io } from 'socket.io-client';
import moment from 'moment';

function calculateNetworkDays(startDate, endDate) {
  // Handle invalid or missing dates
  if (!startDate || !endDate || endDate === '-') return 0;
  
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Validate dates
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
    
    // Swap dates if end is before start
    if (start > end) return 0;

    let count = 0;
    const current = new Date(start);
    
    while (current <= end) {
      const day = current.getDay();
      if (day !== 0 && day !== 6) { // Skip weekends (0=Sunday, 6=Saturday)
        count++;
      }
      current.setDate(current.getDate() + 1);
    }
    
    return count;
  } catch (error) {
    console.error('Error calculating network days:', error);
    return 0;
  }
}

// Helper to parse Date Released (dateReceive) from string like 'June 12, 2025 at 9:00 AM'
function parseDateReleased(dateStr) {
  if (!dateStr || dateStr === '-') return null;
  // Remove ' at ...' if present
  const [datePart, timePart] = dateStr.split(' at ');
  if (!timePart) return new Date(dateStr); // fallback
  const date = new Date(`${datePart} ${timePart}`);
  if (!isNaN(date.getTime())) return date;
  // Try parsing just the date part
  const dateOnly = new Date(datePart);
  return isNaN(dateOnly.getTime()) ? null : dateOnly;
}

function NetworkDays() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toLocaleString('en-US', { month: 'long' })
  );
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [isViewMode, setIsViewMode] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showNetworkModal, setShowNetworkModal] = useState(false);
  const adminData = localStorage.getItem('admin');
  const admin = adminData ? JSON.parse(adminData) : null;
  const isIncomingAdmin = admin?.documentdirection === 'incoming';

  const API_URL = import.meta.env.VITE_API_URL;
  const months = ['All', 'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 6 }, (_, i) => currentYear - i);

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/documents`);
      
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      const data = await response.json();
      const filteredDocuments = data
        .filter(doc => 
          doc.documentdirection === 'outgoing'
        )
        .map(doc => {
          // Calculate business days (excluding weekends)
          const businessDays = doc.datereleased && doc.datereleased !== '-' 
            ? calculateNetworkDays(doc.datesent, doc.datereleased)
            : 0;

          // Use database values if they exist, otherwise calculate
          const processingDays = doc.calcnetworkdays !== null 
            ? Number(doc.calcnetworkdays)
            : businessDays - (doc.deducteddays || 0);

          return {
            documentid: doc.documentid,
            dtsNo: doc.dtsno,
            dateSent: doc.datesent,
            dateReceive: doc.datereleased || '-',
            deducteddays: doc.deducteddays !== null ? Number(doc.deducteddays) : null,
            calcnetworkdays: Math.max(0, processingDays), // Ensure non-negative
            networkdaysremarks: doc.networkdaysremarks || '-',
            documentType: doc.documenttype,
            route: doc.route,
            isarchive: doc.isarchive
          };
        })
        .filter(doc => !doc.isarchive)
        .sort((a, b) => new Date(b.dateSent) - new Date(a.dateSent));

      setDocuments(filteredDocuments);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
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

  const handleEdit = (doc) => {
    if (isIncomingAdmin) return;
    setSelectedDocument({
      documentid: doc.documentid,
      dtsno: doc.dtsNo,
      documenttype: doc.documentType,
      documentdirection: 'outgoing',
      route: doc.route,
      networkdaysremarks: doc.networkdaysremarks === '-' ? '' : doc.networkdaysremarks,
      deducteddays: doc.deducteddays !== null ? doc.deducteddays : 0,
      dateSent: doc.dateSent,
      dateReceive: doc.dateReceive,
      calcnetworkdays: doc.calcnetworkdays
    });
    
    setIsViewMode(false);
    setIsEditMode(true);
    setShowNetworkModal(true);
  };

  const handleClear = async (docId) => {
    if (isIncomingAdmin) return;
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: 'Are you sure you want to clear the deducted days and remarks for this document?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, clear it!',
      customClass: {
        popup: 'swal2-minimalist'
      }
    });
    if (!result.isConfirmed) return;

    try {
      const response = await fetch(`${API_URL}/api/documents/${docId}/networkdays`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deducteddays: 0,
          calcnetworkdays: null, // Let backend recalculate if needed
          remarks: ''
        })
      });

      if (response.ok) {
        fetchDocuments();
        Swal.fire({
          icon: 'success',
          title: 'Cleared!',
          text: 'Deducted days and remarks have been cleared.',
          timer: 1800,
          showConfirmButton: false,
          customClass: {
            popup: 'swal2-minimalist'
          }
        });
      } else {
        const error = await response.json();
        console.error('Failed to clear document:', error);
        Swal.fire({
          icon: 'error',
          title: 'Failed to clear',
          text: error.message || 'Failed to clear document. Please try again.',
          timer: 2500,
          showConfirmButton: false,
          customClass: {
            popup: 'swal2-minimalist'
          }
        });
      }
    } catch (error) {
      console.error('Error clearing document:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'An error occurred while clearing. Please try again.',
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
    const matchesDtsNo = doc.dtsNo?.toLowerCase().includes(search);
    const matchesDocType = doc.documentType?.toLowerCase().includes(search);
    const matchesStatus = 'outgoing'.includes(search); // Only outgoing

    // Filter by Date Released (dateReceive)
    let matchesMonth = true;
    let matchesYear = true;
    if (selectedMonth !== 'All' || selectedYear !== 'All') {
      const dateReleased = parseDateReleased(doc.dateReceive);
      if (dateReleased) {
        matchesMonth = selectedMonth === 'All' || dateReleased.toLocaleString('en-US', { month: 'long' }) === selectedMonth;
        matchesYear = selectedYear === 'All' || dateReleased.getFullYear() === selectedYear;
      } else {
        matchesMonth = false;
        matchesYear = false;
      }
    }

    return (
      (!search || matchesDtsNo || matchesDocType || matchesStatus)
      && matchesMonth && matchesYear
    );
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

    const ExcelJS = await import('exceljs');
    const { saveAs } = await import('file-saver');

    const workbook = new ExcelJS.Workbook();
    
    // Create a descriptive worksheet name based on filters
    let sheetName = '';
    if (selectedMonth !== 'All' || selectedYear !== 'All') {
      const monthYear = [];
      if (selectedMonth !== 'All') monthYear.push(selectedMonth);
      if (selectedYear !== 'All') monthYear.push(selectedYear.toString());
      sheetName = `${monthYear.join(' ')}`;
    }
    
    // Limit sheet name length to Excel's maximum (31 characters)
    if (sheetName.length > 31) {
      sheetName = sheetName.substring(0, 28) + '...';
    }
    
    const worksheet = workbook.addWorksheet(sheetName || 'Network Days');

    // Table headers as shown in the UI
    const headers = [
      'DATE SENT',
      'DATE RELEASED',
      'DTS NO.',
      'DOCUMENT STATUS',
      'DOCUMENT TYPE',
      'PROCESSING DAYS',
      'REMARKS'
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

    // Add and style data rows (only what is shown in the table)
    exportDocuments.slice().reverse().forEach((doc) => {
      const rowValues = [
        formatDate(doc.dateSent),
        doc.dateReceive,
        doc.dtsNo,
        'Outgoing',
        doc.documentType?.trim() || '-',
        doc.calcnetworkdays !== null && !isNaN(doc.calcnetworkdays)
          ? `${doc.calcnetworkdays} days`
          : '-',
        doc.networkdaysremarks && doc.networkdaysremarks !== '-'
          ? doc.networkdaysremarks
          : '-'
      ];
      const row = worksheet.addRow(rowValues);

      row.eachCell((cell, colNumber) => {
        cell.font = { name: 'Arial', size: 11 };
        cell.alignment = {
          vertical: 'middle',
          horizontal: colNumber === 7 ? 'left' : 'center',
          wrapText: true
        };
        cell.border = {
          top: { style: 'thin', color: { argb: 'D3D3D3' } },
          left: { style: 'thin', color: { argb: 'D3D3D3' } },
          bottom: { style: 'thin', color: { argb: 'D3D3D3' } },
          right: { style: 'thin', color: { argb: 'D3D3D3' } }
        };

        const textWhite = { argb: 'FFFFFFFF' };

        // DTS No. cell (col 3) - Bold
        if (colNumber === 3) {
          cell.font = {
            name: 'Arial',
            bold: true,
            size: 11
          };
        }

        // Document Status cell (col 4) - Bold
        if (colNumber === 4) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '123052' } };
          cell.font = { name: 'Arial', color: textWhite, bold: true, size: 11 };
        }

        // Processing Days cell (col 6) - Bold
        if (colNumber === 6) {
          if (doc.calcnetworkdays > 5 || doc.calcnetworkdays <= 0) {
            cell.font = { name: 'Arial', color: { argb: 'FF0000' }, size: 11 };
          } else {
            cell.font = { name: 'Arial', color: { argb: '28A745' }, size: 11 };
          }
        }
      });

      row.height = 25;
    });

    // Calculate and add average processing days
    const validProcessingDays = exportDocuments
      .map(doc => doc.calcnetworkdays)
      .filter(days => days !== null && !isNaN(days) && days > 0);
    
    if (validProcessingDays.length > 0) {
      const averageDays = (validProcessingDays.reduce((sum, days) => sum + days, 0) / validProcessingDays.length).toFixed(2);
      
      // Add empty row for spacing
      const emptyRow = worksheet.addRow(['', '', '', '', '', '', '']);
      emptyRow.height = 20;
      
      // Add average row
      const averageRow = worksheet.addRow(['', '', '', '', '', `Average: ${averageDays} days`, '']);
      averageRow.height = 25;
      
      // Style the average row
      averageRow.eachCell((cell, colNumber) => {
        cell.font = { name: 'Arial', size: 11, bold: true };
        cell.alignment = {
          vertical: 'middle',
          horizontal: colNumber === 6 ? 'center' : 'left',
          wrapText: true
        };
        cell.border = {
          top: { style: 'thin', color: { argb: 'D3D3D3' } },
          left: { style: 'thin', color: { argb: 'D3D3D3' } },
          bottom: { style: 'thin', color: { argb: 'D3D3D3' } },
          right: { style: 'thin', color: { argb: 'D3D3D3' } }
        };
        
        // Style the average cell (col 6)
        if (colNumber === 6) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F0F0F0' } };
          cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: '000000' } };
        }
      });
    }

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
      const spacingRow = worksheet.addRow(['', '', '', '', '', '', '']);
      spacingRow.height = 15;
    }
    
    // Add note row
    const noteRow = worksheet.addRow(['', '', '', '', '', '', '']);
    noteRow.height = 20;
    
    // Merge cells for the note (span all 7 columns)
    worksheet.mergeCells(`A${noteRow.number}:G${noteRow.number}`);
    
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
      { width: 33 }, // DATE SENT
      { width: 33 }, // DATE RELEASED
      { width: 28 }, // DTS NO.
      { width: 30 }, // DOCUMENT STATUS
      { width: 35 }, // DOCUMENT TYPE
      { width: 30 }, // PROCESSING DAYS
      { width: 40 }  // REMARKS
    ];

    worksheet.views = [{ state: 'frozen', ySplit: 1 }];

    const buffer = await workbook.xlsx.writeBuffer();
    const fileName = `Processing_Days_${selectedMonth !== 'All' ? selectedMonth : ''}_${selectedYear !== 'All' ? selectedYear : ''}.xlsx`;
    saveAs(new Blob([buffer]), fileName);
  };

  return (
    <div className="p-1 relative"> {/* Make main container fill the screen */}
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
      </div>

      <div className="overflow-x-auto">
        {/* Table Container with minimum width */}
        <div className="min-w-[1200px]">
          {/* Table Header - Responsive */}
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
            <div className="w-[12%] min-w-[120px] px-2 text-center">PROCESSING DAYS</div>
            <div className="w-[12%] min-w-[120px] px-2 text-center">REMARKS</div>
            <div className="w-[10%] min-w-[100px] px-2 text-center">ACTIONS</div>
          </div>

          {/* Table Body */}
          <div
            className="w-full flex-1 overflow-y-auto scrollbar-hide"
            style={{ minHeight: 0, maxHeight: 'calc(100vh - 260px)' }} // Adjust as needed for your header/filters
          >
            {loading ? (
              <div className="flex justify-center items-center h-32 min-w-[1000px] border-b border-gray-200">
                <p className="text-gray-500">Loading documents...</p>
              </div>
            ) : filteredDocuments.length > 0 ? (
              filteredDocuments.map((doc) => (
                <div key={doc.documentid} className="min-w-[1000px] px-4 h-16 flex items-center hover:bg-sky-50 border-b border-[#1460A2]/50">
                  {/* Date Sent/Received */}
                  <div className="w-[15%] min-w-[120px] px-2 text-gray-500 text-center text-sm py-3">
                    {formatDate(doc.dateSent)}
                  </div>
                  
                  {/* Date Accomplished */}
                  <div className="w-[15%] min-w-[150px] px-2 text-gray-500 text-center text-sm py-3">
                    {doc.dateReceive}
                  </div>
                  
                  {/* DTS Number */}
                  <div className="w-[12%] min-w-[120px] px-2 text-black text-center font-bold text-sm py-3">
                    {doc.dtsNo}
                  </div>
                  
                  {/* Document Status */}
                  <div className="w-[12%] min-w-[120px] px-2 text-center py-3">
                    <span className="px-4 py-2 rounded-full text-sm text-black whitespace-nowrap">
                      Outgoing
                    </span>
                  </div>
                  
                  {/* Document Type */}
                  <div className="w-[15%] min-w-[150px] px-2 text-black text-center text-sm py-3 truncate">
                    {doc.documentType?.trim() || '-'}
                  </div>
                  
                  {/* Processing Days */}
                  <div className="w-[12%] min-w-[120px] px-2 text-center py-3">
                    <span className={`text-sm font-semibold ${
                      doc.calcnetworkdays > 5 || doc.calcnetworkdays <= 0
                        ? 'text-[#DC3545]'
                        : 'text-[#28A745]'
                    }`}>
                      {doc.calcnetworkdays !== null && !isNaN(doc.calcnetworkdays)
                        ? `${doc.calcnetworkdays} days`
                        : '-'}
                    </span>
                  </div>
                  
                  {/* Remarks */}
                  <div className="w-[12%] min-w-[120px] px-2 text-black text-center text-sm py-3 truncate">
                    {doc.networkdaysremarks && doc.networkdaysremarks !== '-' 
                      ? doc.networkdaysremarks 
                      : '-'}
                  </div>
                  
                  {/* Actions */}
                  <div className="w-[10%] min-w-[100px] px-2 flex justify-center space-x-1 py-3">
                    <button 
                      onClick={!isIncomingAdmin ? () => handleEdit(doc) : undefined}
                      className={`p-2 rounded transition-colors ${
                        isIncomingAdmin 
                          ? 'opacity-50 pointer-events-none' 
                          : 'hover:bg-[#218838] cursor-pointer'
                      } bg-[#28A745] text-white`}
                      title={isIncomingAdmin ? "View only - actions disabled" : "Edit"}
                    >
                      <img 
                        src="/editIcon.svg" 
                        alt="Edit" 
                        className="w-3 h-3" 
                      />
                    </button>

                    <button
                      onClick={!isIncomingAdmin ? () => handleClear(doc.documentid) : undefined}
                      className={`p-2 rounded transition-colors ${
                        isIncomingAdmin
                          ? 'opacity-50 pointer-events-none'
                          : 'hover:bg-[#C82333] cursor-pointer'
                      } bg-[#F54B4B] text-white`}
                      title={isIncomingAdmin ? "View only - actions disabled" : "Clear"}
                    >
                      <img
                        src="/clearIcon.svg"
                        alt="Clear"
                        className="w-3 h-3"
                      />
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

      {showNetworkModal && (
        <OverlayProcessingDays 
          isOpen={showNetworkModal}
          onClose={(shouldRefresh) => {
            setShowNetworkModal(false);
            setSelectedDocument(null);
            setIsViewMode(false);
            setIsEditMode(false);
            if (shouldRefresh) {
              fetchDocuments();
            }
          }}
          editingDoc={selectedDocument}
          viewMode={isViewMode}
          editMode={isEditMode}
          calculateNetworkDays={calculateNetworkDays}
        />
      )}
    </div>
  );
}

export default NetworkDays;