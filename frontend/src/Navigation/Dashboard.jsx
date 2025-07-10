import { useEffect, useState, useCallback } from "react";
import Chart from "react-apexcharts";
import axios from "axios";
import { io } from 'socket.io-client';

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

function Dashboard() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toLocaleString('default', { month: 'long' }));
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  const [showTodayModal, setShowTodayModal] = useState(false);
  const [showMonthModal, setShowMonthModal] = useState(false);
  const [showIncomingModal, setShowIncomingModal] = useState(false);
  const [showAverageDaysModal, setShowAverageDaysModal] = useState(false);
  const [modalDocuments, setModalDocuments] = useState([]);
  const [modalTitle, setModalTitle] = useState('');
  const months = ['January', 'February', 'March', 'April', 'May', 'June','July', 'August', 'September', 'October', 'November', 'December'];
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
  const API_URL = import.meta.env.VITE_API_URL;
  const isNotArchived = doc => doc.isarchive === false;

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/documents`);
      const data = response.data;

      // Only include non-archived documents, but don't filter by month/year 
      const filtered = data.filter(doc => doc.isarchive === false);

      setDocuments(filtered);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching documents:', error);
      setLoading(false);
    }
  }, [API_URL]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments, selectedMonth, selectedYear]);

  useEffect(() => {
    const socket = io(API_URL);
    socket.on('documents_updated', fetchDocuments);

    return () => {
      socket.off('documents_updated', fetchDocuments);
      socket.disconnect();
    };
  }, [API_URL, fetchDocuments]);

  // Parse dateReleased from VARCHAR to Date object
  const parseDateReleased = (dateStr) => {
    if (!dateStr || typeof dateStr !== 'string') return null;
    
    try {
      // Parse the VARCHAR date string (format: "June 12, 2025 at 8:00 AM")
      const datePart = dateStr.split(' at ')[0]; // Remove the time portion
      const parsedDate = new Date(datePart);
      
      // Check if the date is valid
      return isNaN(parsedDate.getTime()) ? null : parsedDate;
    } catch (error) {
      console.error('Error parsing date:', dateStr, error);
      return null;
    }
  };

  // Get today's outgoing document count
  const getTodayOutgoingCount = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    return documents.filter(doc => {
      const docDate = parseDateReleased(doc.datereleased);
      if (!docDate) return false;
      
      // Exclude weekends (Saturday = 6, Sunday = 0)
      const dayOfWeek = docDate.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) return false;
      
      // Check if the document was received today (between today 00:00 and tomorrow 00:00)
      const receivedToday = docDate >= today && docDate < tomorrow;
      
      return (
        isNotArchived(doc) &&
        doc.documentdirection === 'outgoing' &&
        (doc.route === 'ORD' || doc.route === 'Accounting_Unit') &&
        receivedToday
      );
    }).length;
  };

  // Get monthly outgoing document counts
  const getMonthlyOutgoingCount = () => {
    return documents.filter(doc => {
      const docDate = parseDateReleased(doc.datereleased);
      if (!docDate) return false;
      
      // Exclude weekends (Saturday = 6, Sunday = 0)
      const dayOfWeek = docDate.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) return false;
      
      return (
        isNotArchived(doc) &&
        doc.documentdirection === 'outgoing' &&
        docDate.getMonth() === months.indexOf(selectedMonth) &&
        docDate.getFullYear() === selectedYear
      );
    }).length;
  };

  // Get monthly incoming document counts
  const getMonthlyIncomingCount = () => {
    return documents.filter(doc => {
      const docDate = new Date(doc.datesent);
      
      // Exclude weekends (Saturday = 6, Sunday = 0)
      const dayOfWeek = docDate.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) return false;
      
      return (
        isNotArchived(doc) && 
        doc.documentdirection === 'incoming' &&
        doc.route !== 'ORD' && doc.route !== 'Accounting_Unit' &&
        docDate.getMonth() === months.indexOf(selectedMonth) &&
        docDate.getFullYear() === selectedYear
      );
    }).length;
  };

  // Get document types data for the line graph
  const getDocumentTypesData = () => {
    const typeCounts = {};
    const daysInMonth = new Date(selectedYear, months.indexOf(selectedMonth) + 1, 0).getDate();
    
    documents.forEach(doc => {
      if (!isNotArchived(doc)) return;
      
      const docDate = parseDateReleased(doc.datereleased);
      if (!docDate) return;
      
      if (!typeCounts[doc.documenttype]) {
        typeCounts[doc.documenttype] = Array(daysInMonth).fill(0);
      }
      
      const day = docDate.getDate() - 1;
      if (day >= 0 && day < daysInMonth && 
          docDate.getMonth() === months.indexOf(selectedMonth) &&
          docDate.getFullYear() === selectedYear) {
        typeCounts[doc.documenttype][day]++;
      }
    });
    
    return typeCounts;
  };

  const prepareChartData = () => {
    const documentTypeData = getDocumentTypesData();
    const daysInMonth = new Date(selectedYear, months.indexOf(selectedMonth) + 1, 0).getDate();

    const labels = [];
    const dataPoints = {};
    
    Object.keys(documentTypeData).forEach(type => {
      dataPoints[type] = [];
    });

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(selectedYear, months.indexOf(selectedMonth), day);
      if (date.getDay() !== 0 && date.getDay() !== 6) {
        labels.push(`Day ${day}`);
        Object.keys(documentTypeData).forEach(type => {
          dataPoints[type].push(documentTypeData[type][day - 1] || 0);
        });
      }
    }

    const series = Object.keys(dataPoints).map(type => ({
      name: type,
      data: dataPoints[type]
    }));

    return {
      labels,
      series
    };
  };

  // Get average processing days for outgoing documents
  const getAverageProcessingDays = () => {
    const filteredDocs = documents.filter(doc => {
      const docDate = parseDateReleased(doc.datereleased);
      if (!docDate) return false;
      // Exclude weekends (Saturday = 6, Sunday = 0)
      const dayOfWeek = docDate.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) return false;
      // Ensure calcnetworkdays is a valid number (not null, not NaN)
      const days = Number(doc.calcnetworkdays);
      return (
        isNotArchived(doc) &&
        doc.documentdirection === 'outgoing' && 
        (doc.route === 'ORD' || doc.route === 'Accounting_Unit') &&
        doc.calcnetworkdays !== null &&
        !isNaN(days) &&
        docDate.getMonth() === months.indexOf(selectedMonth) &&
        docDate.getFullYear() === selectedYear
      );
    });

    if (filteredDocs.length === 0) return "0.00";
    const totalDays = filteredDocs.reduce((sum, doc) => (
      sum + Number(doc.calcnetworkdays)
    ), 0);
    return (totalDays / filteredDocs.length).toFixed(2);
  };

  const chartData = prepareChartData();

  // Handle Escape key to close modals
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        closeModal();
      }
    };

    // Add event listener when component mounts
    window.addEventListener('keydown', handleKeyDown);

    // Clean up event listener when component unmounts
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []); 

  // Modal handlers
  const openTodayModal = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const filteredDocs = documents.filter(doc => {
      const docDate = parseDateReleased(doc.datereleased);
      if (!docDate) return false;
      
      // Exclude weekends (Saturday = 6, Sunday = 0)
      const dayOfWeek = docDate.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) return false;
      
      // Check if the document was received today (between today 00:00 and tomorrow 00:00)
      const receivedToday = docDate >= today && docDate < tomorrow;
      
      return (
        isNotArchived(doc) &&
        doc.documentdirection === 'outgoing' &&
        (doc.route === 'ORD' || doc.route === 'Accounting_Unit') &&
        receivedToday
      );
    });
    
    setModalDocuments(filteredDocs);
    setModalTitle('Today\'s Outgoing Documents');
    setShowTodayModal(true);
  };

  const openMonthModal = () => {
    const filteredDocs = documents.filter(doc => {
      const docDate = parseDateReleased(doc.datereleased);
      if (!docDate) return false;
      
      // Exclude weekends (Saturday = 6, Sunday = 0)
      const dayOfWeek = docDate.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) return false;
      
      return (
        isNotArchived(doc) &&
        doc.documentdirection === 'outgoing' &&
        docDate.getMonth() === months.indexOf(selectedMonth) &&
        docDate.getFullYear() === selectedYear
      );
    });
    
    setModalDocuments(filteredDocs);
    setModalTitle(`Outgoing Documents - ${selectedMonth} ${selectedYear}`);
    setShowMonthModal(true);
  };

  const openIncomingModal = () => {
    const filteredDocs = documents.filter(doc => {
      const docDate = new Date(doc.datesent);
      
      // Exclude weekends (Saturday = 6, Sunday = 0)
      const dayOfWeek = docDate.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) return false;
      
      return (
        isNotArchived(doc) && 
        doc.documentdirection === 'incoming' &&
        doc.route !== 'ORD' && doc.route !== 'Accounting_Unit' &&
        docDate.getMonth() === months.indexOf(selectedMonth) &&
        docDate.getFullYear() === selectedYear
      );
    });
    
    setModalDocuments(filteredDocs);
    setModalTitle(`Incoming Documents - ${selectedMonth} ${selectedYear}`);
    setShowIncomingModal(true);
  };

  const openAverageDaysModal = () => {
    const filteredDocs = documents.filter(doc => {
      const docDate = parseDateReleased(doc.datereleased);
      if (!docDate) return false;
      
      // Exclude weekends (Saturday = 6, Sunday = 0)
      const dayOfWeek = docDate.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) return false;
      
      return (
        isNotArchived(doc) &&
        doc.documentdirection === 'outgoing' && 
        (doc.route === 'ORD' || doc.route === 'Accounting_Unit') &&
        doc.calcnetworkdays !== null &&
        docDate.getMonth() === months.indexOf(selectedMonth) &&
        docDate.getFullYear() === selectedYear
      );
    });
    
    setModalDocuments(filteredDocs);
    setModalTitle(`Average Processing Days - ${selectedMonth} ${selectedYear}`);
    setShowAverageDaysModal(true);
  };

  const closeModal = () => {
    setShowTodayModal(false);
    setShowMonthModal(false);
    setShowIncomingModal(false);
    setShowAverageDaysModal(false);
    setModalDocuments([]);
    setModalTitle('');
  };

  const chartOptions = {
    chart: {
      height: '100%',
      type: 'line',
      zoom: { enabled: true },
      toolbar: {
        show: true,
        tools: {
          download: true,
          selection: true,
          zoom: true,
          zoomin: true,
          zoomout: true,
          pan: true,
          reset: true
        }
      },
      dropShadow: {
        enabled: true,
        color: '#000',
        top: 18,
        left: 7,
        blur: 10,
        opacity: 0.2
      },
    },
    colors: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'],
    dataLabels: { enabled: false },
    stroke: {
      curve: 'smooth',
      width: 3
    },
    grid: {
      borderColor: '#e7e7e7',
      row: {
        colors: ['#f3f3f3', 'transparent'],
        opacity: 0.5
      },
    },
    markers: {
      size: 5,
      hover: { size: 7 }
    },
    xaxis: {
      categories: chartData.labels,
      title: { text: 'Days of Month (excluding weekends)' },
      labels: {
        style: {
          colors: '#6B7280',
          fontSize: '12px'
        }
      }
    },
    yaxis: {
      title: { text: 'NO. of Documents' },
      min: 0,
      labels: {
        style: {
          colors: '#6B7280',
          fontSize: '12px'
        }
      }
    },
    legend: {
      position: 'top',
      horizontalAlign: 'left',
      fontSize: '14px',
      markers: {
        width: 12,
        height: 12,
        radius: 12,
      },
      itemMargin: {
        horizontal: 10,
        vertical: 5
      }
    },
    tooltip: {
      theme: 'light',
      style: { fontSize: '12px' },
      y: {
        formatter: function (val) {
          return val + " documents";
        }
      }
    }
  };

  return (
    <div className="flex flex-col w-full p-1">
      <div className="flex justify-end mb-6">
        <div className="flex gap-x-2">
          <div className="flex flex-col items-start relative">
            <DropdownButton 
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
      </div>

      {/* Small Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-md p-4 text-white h-32 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className="mt-1">
              <p className="text-xl font-bold">TODAY</p>
              <p className="text-2xl font-bold mt-1">{getTodayOutgoingCount()}</p>
            </div>
            <div 
              className="bg-white/20 p-2 rounded-lg cursor-pointer hover:bg-white/30 transition-colors"
              onClick={openTodayModal}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
          <p className="text-xs opacity-90">Outgoing documents today</p>
        </div>

        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl shadow-md p-4 text-white h-32 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className="mt-1">
              <p className="text-xl font-bold">MONTH</p>
              <p className="text-2xl font-bold mt-1">{getMonthlyOutgoingCount()}</p>
            </div>
            <div 
              className="bg-white/20 p-2 rounded-lg cursor-pointer hover:bg-white/30 transition-colors"
              onClick={openMonthModal}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <p className="text-xs opacity-90">Outgoing documents this month</p>
        </div>

        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl shadow-md p-4 text-white h-32 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className="mt-1">
              <p className="text-xl font-bold">INCOMING</p>
              <p className="text-2xl font-bold mt-1">{getMonthlyIncomingCount()}</p>
            </div>
            <div 
              className="bg-white/20 p-2 rounded-lg cursor-pointer hover:bg-white/30 transition-colors"
              onClick={openIncomingModal}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-2m-4-1v8m0 0l3-3m-3 3L9 8m-5 5h2.586a1 1 0 01.707.293l2.414 2.414a1 1 0 00.707.293h3.172a1 1 0 00.707-.293l2.414-2.414a1 1 0 01.707-.293H20" />
              </svg>
            </div>
          </div>
          <p className="text-xs opacity-90">Incoming documents this month</p>
        </div>

        <div className="bg-gradient-to-br from-violet-500 to-violet-600 rounded-xl shadow-md p-4 text-white h-32 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className="mt-1">
              <p className="text-xl font-bold">AVERAGE DAYS</p>
              <p className="text-2xl font-bold mt-1">{getAverageProcessingDays()}</p>
            </div>
            <div 
              className="bg-white/20 p-2 rounded-lg cursor-pointer hover:bg-white/30 transition-colors"
              onClick={openAverageDaysModal}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
          <p className="text-xs opacity-90">Average processing days this month</p>
        </div>
      </div>

      {/* Line Graph */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-gray-800">Document Types Overview</h2>
          <span className="text-[18px] text-black font-bold">{selectedMonth.toUpperCase()} {selectedYear}</span>
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-pulse flex space-x-4">
              <div className="flex-1 space-y-4 py-1">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-96">
            <Chart
              options={chartOptions}
              series={chartData.series}
              type="line"
              height="100%"
            />
          </div>
        )}
      </div>

      {/* Documents Modal */}
      {(showTodayModal || showMonthModal || showIncomingModal || showAverageDaysModal) && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[80vh] flex flex-col relative">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-sky-700">{modalTitle}</h2>
                <span className="text-base text-gray-500 font-medium">
                  | Total: {modalDocuments.length} document{modalDocuments.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>

            <button
              className="absolute top-4 right-4 text-2xl text-black/50 hover:text-black/70 transition-colors cursor-pointer"
              onClick={closeModal}
            >
              ×
            </button>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {modalDocuments.length === 0 ? (
                <div className="text-center text-gray-500 py-12">
                  <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-lg font-medium text-gray-600">No documents found</p>
                </div>
              ) : (
                <div className="space-y-5">
                  {modalDocuments.map((doc, index) => (
                    <div key={index} className="border-2 border-sky-600 rounded-xl p-6 shadow-sm">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div className="relative">
                          <label className="absolute -top-2 left-4 bg-white text-sky-700 text-sm font-bold tracking-wide uppercase">DTS No.</label>
                          <div className="pt-3 pl-4">
                            <p className="text-sm font-bold text-gray-900">{doc.dtsno || 'N/A'}</p>
                          </div>
                        </div>
                        <div className="relative">
                          <label className="absolute -top-2 left-4 bg-white text-sky-700 text-sm font-bold tracking-wide uppercase">Document Type</label>
                          <div className="pt-3 pl-4">
                            <p className="text-sm font-medium text-gray-900">{doc.documenttype || 'N/A'}</p>
                          </div>
                        </div>
                        <div className="relative">
                          <label className="absolute -top-2 left-4 bg-white text-sky-700 text-sm font-bold tracking-wide uppercase">Direction</label>
                          <div className="pt-3 pl-4">
                            <p className="text-sm font-medium text-gray-900 capitalize">{doc.documentdirection || 'N/A'}</p>
                          </div>
                        </div>
                        <div className="relative">
                          <label className="absolute -top-2 left-4 bg-white text-sky-700 text-sm font-bold tracking-wide uppercase">Date Sent</label>
                          <div className="pt-3 pl-4">
                            <p className="text-sm font-medium text-gray-900">
                              {doc.datesent ? new Date(doc.datesent).toLocaleDateString('en-US', { 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric' 
                              }) : 'N/A'}
                            </p>
                          </div>
                        </div>
                        {/* Only show Date Released for outgoing documents */}
                        {doc.documentdirection === 'outgoing' && (
                          <div className="relative">
                            <label className="absolute -top-2 left-4 bg-white text-sky-700 text-sm font-bold tracking-wide uppercase">Date Released</label>
                            <div className="pt-3 pl-4">
                              <p className="text-sm font-medium text-gray-900">
                                {doc.datereleased ? parseDateReleased(doc.datereleased)?.toLocaleDateString('en-US', { 
                                  year: 'numeric', 
                                  month: 'long', 
                                  day: 'numeric' 
                                }) || 'N/A' : 'N/A'}
                              </p>
                            </div>
                          </div>
                        )}
                        {/* Only show Processing Days for outgoing documents in average days modal */}
                        {showAverageDaysModal && doc.calcnetworkdays !== null && (
                          <div className="relative">
                            <label className="absolute -top-2 left-4 bg-white text-sky-700 text-sm font-bold tracking-wide uppercase">Processing Days</label>
                            <div className="pt-3 pl-4">
                              <p className={`text-sm font-medium ${
                                doc.calcnetworkdays <= 0 || doc.calcnetworkdays > 5 ? 'text-red-600' : 'text-green-600'
                              }`}>
                                {doc.calcnetworkdays} days
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                      {doc.subject && (
                        <div className="mt-5 pt-5 border-t border-sky-200">
                          <div className="relative">
                            <label className="absolute -top-2 left-4 bg-white text-sky-700 text-sm font-semibold tracking-wide uppercase">Subject</label>
                            <div className="pt-3 pl-4">
                              <p className="text-sm text-gray-900 leading-relaxed">{doc.subject}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;