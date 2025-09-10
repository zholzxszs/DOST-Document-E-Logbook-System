import { useEffect, useRef, useState } from 'react';
import Swal from 'sweetalert2'; 
import '../index.css';

function OverlayOutgoing({ isOpen, onClose, editingDoc, viewMode, editMode, onSuccess }) {
  const popupRef = useRef(null);
  const [documentTypes, setDocumentTypes] = useState([]);
  const [routeTypes, setRouteTypes] = useState([]);
  const [showCustomRouteType, setShowCustomRouteType] = useState(false);
  const [customRouteType, setCustomRouteType] = useState('');
  const [selectedRouteType, setSelectedRouteType] = useState('');
  const [showCustomDocType, setShowCustomDocType] = useState(false);
  const [customDocType, setCustomDocType] = useState('');
  const [selectedDocType, setSelectedDocType] = useState('');
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    route: '',
    dtsNo: '',
    remarks: '',
    date: new Date().toISOString().split('T')[0],
    datereleasedinput: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [initialDate, setInitialDate] = useState(null);
  const API_URL = import.meta.env.VITE_API_URL;

  // Format date for input field
  const formatDateForInput = (dateString) => {
    if (!dateString || dateString === '-') return '';
    // If already in display format, return as-is
    if (dateString.match(/^[A-Za-z]+ \d{1,2}, \d{4} at \d{1,2}:\d{2} [AP]M$/)) {
      return dateString;
    }
    // Handle database format (YYYY-MM-DD HH:mm:ss)
    const dbFormat = dateString.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/);
    if (dbFormat) {
      const [, year, month, day, hour, minute] = dbFormat;
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                        'July', 'August', 'September', 'October', 'November', 'December'];
      const monthName = monthNames[parseInt(month, 10) - 1];
      let hours = parseInt(hour, 10);
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      return `${monthName} ${parseInt(day, 10)}, ${year} at ${hours}:${minute} ${ampm}`;
    }
    // Handle ISO format
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      const month = date.toLocaleString('default', { month: 'long' });
      const day = date.getDate();
      const year = date.getFullYear();
      let hours = date.getHours();
      const minutes = date.getMinutes().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      return `${month} ${day}, ${year} at ${hours}:${minutes} ${ampm}`;
    } catch (e) {
      console.error('Error formatting date:', e);
      return '';
    }
  };

  const validateReceivedDate = (input) => {
    if (!input || typeof input !== 'string') return { isValid: false, error: 'No input provided' };
  
    // Normalize input 
    const normalizedInput = input.trim().replace(/\s+/g, ' ').toLowerCase();
  
    // Regex with flexible month names, 1-2 digit days/hours, strict 2-digit minutes
    const regex = /^(jan(uary)?|feb(ruary)?|mar(ch)?|apr(il)?|may|jun(e)?|jul(y)?|aug(ust)?|sep(tember)?|oct(ober)?|nov(ember)?|dec(ember)?)\s+(\d{1,2}),\s+(\d{4})\s+at\s+(\d{1,2}):(\d{2})\s+(am|pm)$/i;
  
    if (!regex.test(normalizedInput)) {
      return {
        isValid: false,
        error: 'Incorrect format. Example: "June 12, 2025 at 10:30 AM"'
      };
    }
  
    const match = normalizedInput.match(regex);
    const month = match[1];
    const day = parseInt(match[13]);
    const year = parseInt(match[14]);
    const hour = parseInt(match[15]);
    const minute = parseInt(match[16]);
    const period = match[17].toUpperCase();
  
    // Month-to-max-days mapping
    const monthMaxDays = {
      jan: 31, january: 31,
      mar: 31, march: 31,
      apr: 30, april: 30,
      may: 31,
      jun: 30, june: 30,
      jul: 31, july: 31,
      aug: 31, august: 31,
      sep: 30, september: 30,
      oct: 31, october: 31,
      nov: 30, november: 30,
      dec: 31, december: 31
    };
  
    // Full month names for error messages
    const monthNames = {
      jan: 'January', january: 'January',
      feb: 'February', february: 'February',
      mar: 'March', march: 'March',
      apr: 'April', april: 'April',
      may: 'May',
      jun: 'June', june: 'June',
      jul: 'July', july: 'July',
      aug: 'August', august: 'August',
      sep: 'September', september: 'September',
      oct: 'October', october: 'October',
      nov: 'November', november: 'November',
      dec: 'December', december: 'December'
    };
  
    // Leap year check
    const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    const febDays = isLeapYear ? 29 : 28;
  
    // Validate day
    let maxDays;
    if (month.startsWith('feb')) {
      maxDays = febDays;
      if (day > maxDays) {
        return {
          isValid: false,
          error: `February only has ${maxDays} days in ${year}.`
        };
      }
    } else {
      maxDays = monthMaxDays[month] || 31;
      if (day < 1 || day > maxDays) {
        return {
          isValid: false,
          error: `${monthNames[month]} only has ${maxDays} days.`
        };
      }
    }
  
    // Validate time
    if (hour < 1 || hour > 12) {
      return {
        isValid: false,
        error: 'Hour must be between 1 and 12.'
      };
    }
  
    if (minute < 0 || minute > 59) {
      return {
        isValid: false,
        error: 'Minute must be between 00 and 59.'
      };
    }
  
    return {
      isValid: true,
      normalized: `${monthNames[month]} ${day}, ${year} at ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')} ${period}`
    };
  };

  useEffect(() => {
    if (editingDoc) {
      let formattedDate = '';
      let formattedDateSent = '';
      
      // Handle Date Released (datereleased)
      if (editingDoc.datereleased && editingDoc.datereleased !== '-') {
        try {
          // Parse the formatted date string (e.g. "June 7, 2025 at 10:30 AM")
          const dateParts = editingDoc.datereleased.match(
            /^\s*(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s+(\d{4})\s+at\s+(\d{1,2}):(\d{2})\s+(AM|PM)\s*$/i
          );
          if (dateParts) {
            const monthMap = {
              'january': 0, 'february': 1, 'march': 2, 'april': 3,
              'may': 4, 'june': 5, 'july': 6, 'august': 7,
              'september': 8, 'october': 9, 'november': 10, 'december': 11
            };
            const month = monthMap[dateParts[1].toLowerCase()];
            const day = parseInt(dateParts[2]);
            const year = parseInt(dateParts[3]);
            let hours = parseInt(dateParts[4]);
            const minutes = parseInt(dateParts[5]);
            const period = dateParts[6].toUpperCase();
            if (period === 'PM' && hours !== 12) hours += 12;
            if (period === 'AM' && hours === 12) hours = 0;
            const dateObj = new Date(year, month, day, hours, minutes);
            formattedDate = dateObj.toISOString().split('T')[0];
            setInitialDate(formattedDate);
          }
        } catch (e) {
          console.error('Error parsing date:', e);
        }
      } else {
        // If datereleased is empty, pre-fill with the current date
        formattedDate = new Date().toISOString().split('T')[0];
        setInitialDate(null); // No initial date to compare against since we are pre-filling
      }

      // Handle Date Sent (datesent)
      if (editingDoc.datesent && editingDoc.datesent !== '-') {
        try {
          formattedDateSent = formatDateForInput(editingDoc.datesent);
        } catch (e) {
          console.error('Error formatting datesent:', e);
        }
      }
      setFormData({
        dtsNo: editingDoc.dtsno || '',
        remarks: editingDoc.remarks || '',
        date: formattedDate,
        datereleasedinput: formattedDateSent || ''
      });
      setSelectedDocType(editingDoc.documenttype || '');
      setSelectedRouteType(editingDoc.route || '');
    } else {
      const now = new Date();
      const formattedTime = now.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }).replace(/^(\d+:\d{2})/, '$1');
      
      setFormData({ 
        dtsNo: '', 
        remarks: '', 
        date: now.toISOString().split('T')[0],
        datereleasedinput: `${now.toLocaleString('default', { month: 'long' })} ${now.getDate()}, ${now.getFullYear()} at ${formattedTime}`
      });
      setSelectedDocType('');
      setSelectedRouteType('');
    }
  }, [editingDoc]);

  useEffect(() => {
    const fetchDocumentTypes = async () => {
      try {
        const response = await fetch(`${API_URL}/api/document-types`);
        const data = await response.json();
        setDocumentTypes(data);
      } catch (error) {
        console.error('Error fetching document types:', error);
      }
    };

    const fetchRouteTypes = async () => {
      try {
        const response = await fetch(`${API_URL}/api/routes`);
        const data = await response.json();
        setRouteTypes(data);
      } catch (error) {
        console.error('Error fetching route types:', error);
      }
    };

    if (isOpen) {
      fetchDocumentTypes();
      fetchRouteTypes();
    }
  }, [isOpen]);

  const handleInputChange = (e) => {
    if (viewMode) return;
    const { name, value } = e.target;
    let newValue = value;
    if (name === 'dtsNo') {
        newValue = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    }
    // If the user changes the date, append the current time in local format (YYYY-MM-DD HH:mm:ss)
    if (name === 'date') {
        const now = new Date();
        const [year, month, day] = value.split('-');
        const pad = n => n.toString().padStart(2, '0');
        newValue = `${year}-${pad(month)}-${pad(day)} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    }
    setFormData((prev) => ({ ...prev, [name]: newValue }));
};

  const handleDocTypeChange = (e) => {
    const value = e.target.value;
    setSelectedDocType(value);
    setShowCustomDocType(value === 'Others');
  };

  const handleRouteTypeChange = (e) => {
    const value = e.target.value;
    setSelectedRouteType(value);
    setShowCustomRouteType(value === 'Others');
  };

  const handleAddOrRemoveDocType = async (action) => {
    let newErrors = { ...errors };

    if (!customDocType.trim()) {
      newErrors.customDocType = 'Please enter a document type.';
      setErrors(newErrors);
      return;
    }

    const typeName = customDocType.trim();

    if (action === 'add') {
      const exists = documentTypes.some(
        dt => dt.documenttype.toLowerCase() === typeName.toLowerCase()
      );
      if (exists) {
        newErrors.customDocType = 'Document type already exists.';
        setErrors(newErrors);
        return;
      }
    }

    if (action === 'remove') {
      const match = documentTypes.find(dt => dt.documenttype.toLowerCase() === typeName.toLowerCase());
      if (!match) {
        newErrors.customDocType = 'Document type not found.';
        setErrors(newErrors);
        return;
      }
    }

    newErrors.customDocType = '';
    setErrors(newErrors);

    try {
      if (action === 'add') {
        const response = await fetch(`${API_URL}/api/document-types`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ documenttype: typeName }),
        });

        if (response.ok) {
          const newDocType = await response.json();
          setDocumentTypes([...documentTypes, newDocType]);
          setSelectedDocType(newDocType.documenttype);
          setCustomDocType('');
        } else {
          throw new Error('Failed to add document type');
        }
      } else if (action === 'remove') {
        const match = documentTypes.find(dt => dt.documenttype.toLowerCase() === typeName.toLowerCase());
        const response = await fetch(`${API_URL}/api/document-types/${match.documentid}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          setDocumentTypes(documentTypes.filter(dt => dt.documentid !== match.documentid));
          if (selectedDocType === match.documenttype) setSelectedDocType('');
          setCustomDocType('');
        } else {
          throw new Error('Failed to delete document type');
        }
      }
    } catch (error) {
      newErrors.customDocType = error.message || 'An error occurred.';
      setErrors(newErrors);
    }
  };

  const handleAddOrRemoveRouteType = async (action) => {
    let newErrors = { ...errors };

    if (!customRouteType.trim()) {
      newErrors.customRouteType = 'Please enter a route type.';
      setErrors(newErrors);
      return;
    }

    const typeName = customRouteType.trim();

    if (action === 'add') {
      const exists = routeTypes.some(
        dt => dt.routetype.toLowerCase() === typeName.toLowerCase()
      );
      if (exists) {
        newErrors.customRouteType = 'Route type already exists.';
        setErrors(newErrors);
        return;
      }
    }

    if (action === 'remove') {
      const match = routeTypes.find(dt => dt.routetype.toLowerCase() === typeName.toLowerCase());
      if (!match) {
        newErrors.customRouteType = 'Route type not found.';
        setErrors(newErrors);
        return;
      }
    }

    newErrors.customRouteType = '';
    setErrors(newErrors);

    try {
      if (action === 'add') {
        const response = await fetch(`${API_URL}/api/routes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ routetype: typeName }),
        });

        if (response.ok) {
          const newRouteType = await response.json();
          setRouteTypes([...routeTypes, newRouteType]);
          setSelectedRouteType(newRouteType.routetype);
          setCustomRouteType('');
        } else {
          throw new Error('Failed to add route type');
        }
      } else if (action === 'remove') {
        const match = routeTypes.find(dt => dt.routetype.toLowerCase() === typeName.toLowerCase());
        const response = await fetch(`${API_URL}/api/routes/${match.routeid}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          setRouteTypes(routeTypes.filter(dt => dt.routeid !== match.routeid));
          if (selectedRouteType === match.routetype) setSelectedRouteType('');
          setCustomRouteType('');
        } else {
          throw new Error('Failed to delete route type');
        }
      }
    } catch (error) {
      newErrors.customRouteType = error.message || 'An error occurred.';
      setErrors(newErrors);
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    const newErrors = {};

    // Validate required fields
    if (!selectedRouteType  || selectedRouteType  === '' || selectedRouteType  === '-') {
        newErrors.routeType = 'This field is required.';
    }
    if (!formData.dtsNo || formData.dtsNo === '') {
        newErrors.dtsNo = 'This field is required.';
    }
    if (!selectedDocType || selectedDocType === '') {
        newErrors.documentType = 'This field is required.';
    }
    
    // Validate date received only when required
    if (!viewMode && (!editingDoc || editingDoc?.datereleased === null || 
        editingDoc?.datereleased === 'null' || editingDoc?.datereleased === '-')) {
        if (!formData.date) {
            newErrors.date = 'This field is required.';
        }
    }

    // Check for duplicate DTS No if new or changed
    if (!newErrors.dtsNo && (!editingDoc || formData.dtsNo !== editingDoc.dtsno)) {
        try {
            const dtsNoToCheck = formData.dtsNo.trim().toUpperCase();
            const response = await fetch(`${API_URL}/api/documents?dtsno=${dtsNoToCheck}`);
            if (response.ok) {
                const docs = await response.json();
                // const exists = docs.some(doc =>
                //     doc.dtsno?.toUpperCase() === dtsNoToCheck &&
                //     ((doc.route === 'Accounting_Unit' || doc.route === 'ORD') && doc.isarchive === false)
                // );
                const existTwo = docs.some(doc => 
                    doc.dtsno?.toUpperCase() === dtsNoToCheck &&
                    doc.documentdirection === 'incoming' &&
                    doc.isarchive === false
                );

                // if (exists) {
                //     newErrors.dtsNo = 'Cannot add record because this document/DTS No is already processed.';
                // }
                if (existTwo) {
                    newErrors.dtsNo = 'This Document/DTS No is already recorded as an incoming document.';
                }
            }
        } catch (err) {
            console.error('Error checking DTS No:', err);
        }
    }

    if (!editMode && !viewMode && formData.datereleasedinput) {
      const validationResult = validateReceivedDate(formData.datereleasedinput);
      
      if (!validationResult.isValid) {
        newErrors.datereleasedinput = validationResult.error;
      } else {
        // Update with normalized format if needed
        setFormData(prev => ({
          ...prev,
          datereleasedinput: validationResult.normalized
        }));
      }
    }

    // Show errors if any
    if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        const firstError = Object.keys(newErrors)[0];
        const element = document.querySelector(`[name="${firstError}"]`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
    }
    setErrors({});

    try {
        setIsSubmitting(true);
        
        // Prepare the document data with basic fields
        const documentData = {
            dtsno: formData.dtsNo.trim().toUpperCase(),
            documenttype: selectedDocType.trim(),
            route: selectedRouteType.trim(),
            remarks: formData.remarks?.trim() || null,
            documentdirection: 'outgoing'
        };

        if (editMode) {
            const dateChanged = initialDate !== (formData.date ? formData.date.split(' ')[0] : null);
            if (dateChanged) {
                // If date changed, or was prefilled, we need to format from formData.date
                let dateObj;
                if (formData.date && formData.date.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)) {
                    // Date was changed by user via date picker, includes time
                    const [datePart, timePart] = formData.date.split(' ');
                    const [year, month, day] = datePart.split('-');
                    const [hours, minutes] = timePart.split(':');
                    dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hours), parseInt(minutes));
                } else if (formData.date && formData.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
                    // Date was pre-filled (no time part yet) and user didn't change it.
                    const now = new Date();
                    const [year, month, day] = formData.date.split('-');
                    dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), now.getHours(), now.getMinutes(), now.getSeconds());
                }

                if (dateObj) {
                    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                                      'July', 'August', 'September', 'October', 'November', 'December'];
                    const monthName = monthNames[dateObj.getMonth()];
                    let displayHours = dateObj.getHours();
                    const ampm = displayHours >= 12 ? 'PM' : 'AM';
                    displayHours = displayHours % 12 || 12;
                    const displayMinutes = dateObj.getMinutes().toString().padStart(2, '0');
                    documentData.datereleased = `${monthName} ${dateObj.getDate()}, ${dateObj.getFullYear()} at ${displayHours}:${displayMinutes} ${ampm}`;
                } else {
                     documentData.datereleased = null;
                }

            } else {
                // If date didn't change, preserve the original datereleased from the document
                documentData.datereleased = editingDoc.datereleased;
            }
        } else {
             // Handle Date Released (datereleased) for new documents
            if (formData.date) {
                // Check if date is already in display format (from editingDoc)
                if (formData.date.match(/^[A-Za-z]+ \d{1,2}, \d{4} at \d{1,2}:\d{2} [AP]M$/)) {
                    documentData.datereleased = formData.date;
                } 
                // Handle YYYY-MM-DD format (from date input)
                else if (formData.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
                    const dateObj = new Date(formData.date);
                    const now = new Date();
                    dateObj.setHours(now.getHours());
                    dateObj.setMinutes(now.getMinutes());
                    dateObj.setSeconds(now.getSeconds());
                    
                    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                                      'July', 'August', 'September', 'October', 'November', 'December'];
                    const monthName = monthNames[dateObj.getMonth()];
                    let displayHours = dateObj.getHours();
                    const ampm = displayHours >= 12 ? 'PM' : 'AM';
                    displayHours = displayHours % 12 || 12;
                    const displayMinutes = dateObj.getMinutes().toString().padStart(2, '0');
                    
                    documentData.datereleased = `${monthName} ${dateObj.getDate()}, ${dateObj.getFullYear()} at ${displayHours}:${displayMinutes} ${ampm}`;
                }
                // Handle YYYY-MM-DD HH:mm:ss format (from handleInputChange)
                else if (formData.date.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)) {
                    const [datePart, timePart] = formData.date.split(' ');
                    const [year, month, day] = datePart.split('-');
                    const [hours, minutes] = timePart.split(':');
                    
                    const dateObj = new Date(
                        parseInt(year),
                        parseInt(month) - 1,
                        parseInt(day),
                        parseInt(hours),
                        parseInt(minutes)
                    );
                    
                    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                                      'July', 'August', 'September', 'October', 'November', 'December'];
                    const monthName = monthNames[dateObj.getMonth()];
                    let displayHours = dateObj.getHours();
                    const ampm = displayHours >= 12 ? 'PM' : 'AM';
                    displayHours = displayHours % 12 || 12;
                    const displayMinutes = dateObj.getMinutes().toString().padStart(2, '0');
                    
                    documentData.datereleased = `${monthName} ${dateObj.getDate()}, ${dateObj.getFullYear()} at ${displayHours}:${displayMinutes} ${ampm}`;
                }
            } else {
                documentData.datereleased = null;
            }
        }

        // Handle Date Sent (datesent) only for new documents
        if (!editMode && !viewMode && formData.datereleasedinput) {
          // Parse the received date input (accepts full or abbreviated month names)
          const dateParts = formData.datereleasedinput.match(
              /^\s*(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2}),\s+(\d{4})\s+at\s+(\d{1,2}):(\d{2})\s*(AM|PM)\s*$/i
          );
      
          if (dateParts) {
              const fullMonthNames = {
                  'jan': 'January', 'january': 'January',
                  'feb': 'February', 'february': 'February',
                  'mar': 'March', 'march': 'March',
                  'apr': 'April', 'april': 'April',
                  'may': 'May',
                  'jun': 'June', 'june': 'June',
                  'jul': 'July', 'july': 'July',
                  'aug': 'August', 'august': 'August',
                  'sep': 'September', 'september': 'September',
                  'oct': 'October', 'october': 'October',
                  'nov': 'November', 'november': 'November',
                  'dec': 'December', 'december': 'December'
              };
      
              // Get the first 3 letters to handle both full and abbreviated names
              const monthKey = dateParts[1].toLowerCase().substring(0, 3);
              const fullMonthName = fullMonthNames[monthKey];
              
              const monthMap = {
                  'January': 0, 'February': 1, 'March': 2, 'April': 3,
                  'May': 4, 'June': 5, 'July': 6, 'August': 7,
                  'September': 8, 'October': 9, 'November': 10, 'December': 11
              };
      
              const month = monthMap[fullMonthName];
              const day = parseInt(dateParts[2]);
              const year = parseInt(dateParts[3]);
              let hours = parseInt(dateParts[4]);
              const minutes = parseInt(dateParts[5]);
              const period = dateParts[6].toUpperCase();
      
              if (period === 'PM' && hours !== 12) hours += 12;
              if (period === 'AM' && hours === 12) hours = 0;
      
              // Format as 'YYYY-MM-DD HH:mm:ss'
              const pad = n => n.toString().padStart(2, '0');
              documentData.datesent = `${year}-${pad(month + 1)}-${pad(day)} ${pad(hours)}:${pad(minutes)}:00`;
          }
        }

        const url = editingDoc
            ? `${API_URL}/api/documents/${editingDoc.documentid}`
            : `${API_URL}/api/documents`;

        const response = await fetch(url, {
            method: editingDoc ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(documentData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to save document');
        }

        const result = await response.json();
        onClose(true);
        if (onSuccess) onSuccess();
        Swal.fire({
          icon: 'success',
          title: editingDoc ? 'Updated!' : 'Added!',
          text: editingDoc ? 'Document updated successfully.' : 'Document added successfully.',
          timer: 1500,
          showConfirmButton: false,
          customClass: {
            popup: 'swal2-minimalist'
          }
        });
    } catch (error) {
        console.error('Submission failed:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.message || 'Failed to save document. Please check your inputs.',
            timer: 2500,
            showConfirmButton: false,
            customClass: {
              popup: 'swal2-minimalist'
            }
        });
    } finally {
        setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!isOpen) return;
      
      if (event.key === 'Enter' && !viewMode && !isSubmitting) {
        event.preventDefault();
        handleSubmit();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        onClose(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, viewMode, isSubmitting, onClose, handleSubmit]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/30">
      <div
        ref={popupRef}
        className="w-[450px] max-w-full bg-white rounded-[30px] shadow-lg p-8 flex flex-col space-y-6 relative max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute top-4 right-4 text-2xl text-black/50 hover:text-black/70 transition-colors cursor-pointer"
          onClick={() => onClose(false)}
        >
          ×
        </button>

        <h2 className="text-xl font-bold text-sky-700 text-center">
          {viewMode ? 'View Document' : editMode ? 'Edit Document' : 'Outgoing Record'}
        </h2>

        {/* Route */}
        <div className="relative">
          <label className="absolute -top-2 left-5 bg-white px-1 text-sky-700 text-xs font-bold">Routed To <span className="text-[#F54B4B]">*</span></label>
          <select
            className={`text-xs w-full h-12 pl-5 pr-4 rounded-full border-2 ${
              errors.routeType ? 'border-red-600 text-red-600 ring-red-600' : 'border-sky-700 text-sky-950'
            } placeholder:text-sky-700/70 focus:outline-none focus:ring-1 ${
              errors.routeType ? 'focus:ring-red-600' : 'focus:ring-[#004077]'
            }`}
            value={selectedRouteType}
            onChange={handleRouteTypeChange}
            disabled={viewMode}
          >
            <option value="">Select Route</option>
            {routeTypes.map((type) => (
              <option key={type.routeid} value={type.routetype}>
                {type.routetype}
              </option>
            ))}
            <option value="Others">Others...</option>
          </select>
          {errors.routeType && <p className="text-xs text-red-600 mt-1 px-2">{errors.routeType}</p>}
        </div>

        {/* Custom Type */}
        {showCustomRouteType && (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Enter document type"
                className={`text-xs flex-1 h-12 pl-5 pr-4 rounded-full border-2
                  ${errors.customRouteType ? 'border-red-600 text-red-600 ring-red-600' : 'border-sky-700 text-sky-950'}
                  focus:outline-none focus:ring-1
                  ${errors.customRouteType ? 'focus:ring-red-600' : 'focus:ring-[#004077]'}
                `}
                value={customRouteType}
                onChange={(e) => {
                  setCustomRouteType(e.target.value);
                  setErrors((prev) => ({ ...prev, customRouteType: '' }));
                }}
              />
              <button
                className="bg-green-600 hover:bg-green-700 text-white text-sm rounded-2xl px-4 py-2"
                onClick={() => handleAddOrRemoveRouteType('add')}
              >
                Add
              </button>
              <button
                className="bg-red-600 hover:bg-red-700 text-white text-sm rounded-2xl px-4 py-2"
                onClick={() => handleAddOrRemoveRouteType('remove')}
              >
                Remove
              </button>
            </div>
            {errors.customRouteType && (
              <p className="text-xs text-red-600 mt-1 px-2">{errors.customRouteType}</p>
            )}
          </div>
        )}

        {/* DTS No */}
        <div className="relative">
          <label className="absolute -top-2 left-5 bg-white px-1 text-sky-700 text-xs font-bold">DTS No. <span className="text-[#F54B4B]">*</span></label>
          <input
            type="text"
            name="dtsNo"
            value={formData.dtsNo}
            onChange={handleInputChange}
            placeholder="e.g. ORD1070"
            className={`text-xs w-full h-12 pl-5 pr-4 rounded-full border-2 ${
              errors.dtsNo ? 'border-red-600 text-red-600 ring-red-600' : 'border-sky-700 text-sky-950'
            } placeholder:text-sky-700/70 focus:outline-none focus:ring-1 ${
              errors.dtsNo ? 'focus:ring-red-600' : 'focus:ring-[#004077]'
            } uppercase`}
            onKeyPress={(e) => {
              if (!/[a-zA-Z0-9]/.test(e.key)) e.preventDefault();
            }}
            disabled={viewMode}
          />
          {errors.dtsNo && <p className="text-xs text-red-600 mt-1 px-2">{errors.dtsNo}</p>}
        </div>

        {/* Document Type */}
        <div className="relative">
          <label className="absolute -top-2 left-5 bg-white px-1 text-sky-700 text-xs font-bold">Document Type <span className="text-[#F54B4B]">*</span></label>
          <select
            className={`text-xs w-full h-12 pl-5 pr-4 rounded-full border-2 ${
              errors.documentType ? 'border-red-600 text-red-600 ring-red-600' : 'border-sky-700 text-sky-950'
            } placeholder:text-sky-700/70 focus:outline-none focus:ring-1 ${
              errors.documentType ? 'focus:ring-red-600' : 'focus:ring-[#004077]'
            }`}
            value={selectedDocType}
            onChange={handleDocTypeChange}
            disabled={viewMode}
          >
            <option value="">Select Document Type</option>
            {documentTypes.map((type) => (
              <option key={type.documentid} value={type.documenttype}>
                {type.documenttype}
              </option>
            ))}
            <option value="Others">Others...</option>
          </select>
          {errors.documentType && <p className="text-xs text-red-600 mt-1 px-2">{errors.documentType}</p>}
        </div>

        {/* Custom Type */}
        {showCustomDocType && (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Enter document type"
                className={`text-xs flex-1 h-12 pl-5 pr-4 rounded-full border-2
                  ${errors.customDocType ? 'border-red-600 text-red-600 ring-red-600' : 'border-sky-700 text-sky-950'}
                  focus:outline-none focus:ring-1
                  ${errors.customDocType ? 'focus:ring-red-600' : 'focus:ring-[#004077]'}
                `}
                value={customDocType}
                onChange={(e) => {
                  setCustomDocType(e.target.value);
                  setErrors((prev) => ({ ...prev, customDocType: '' }));
                }}
              />
              <button
                className="bg-green-600 hover:bg-green-700 text-white text-sm rounded-2xl px-4 py-2"
                onClick={() => handleAddOrRemoveDocType('add')}
              >
                Add
              </button>
              <button
                className="bg-red-600 hover:bg-red-700 text-white text-sm rounded-2xl px-4 py-2"
                onClick={() => handleAddOrRemoveDocType('remove')}
              >
                Remove
              </button>
            </div>
            {errors.customDocType && (
              <p className="text-xs text-red-600 mt-1 px-2">{errors.customDocType}</p>
            )}
          </div>
        )}

        {/* Date & Time Section */}
        {(!editMode && !viewMode) && (
          <div className="flex flex-col gap-4">
            {/* Date Received (only when adding) */}
            <div className="relative">
              <label className="absolute -top-2 left-5 bg-white px-1 text-sky-700 text-xs font-bold">Date Received <span className="text-[#F54B4B]">*</span></label>
              <input
                type="text"
                name="datereleasedinput"
                value={formData.datereleasedinput || ''}
                onChange={handleInputChange}
                placeholder="e.g. June 12, 2025 at 9:00 AM"
                className={`text-xs w-full h-12 pl-5 pr-4 rounded-full border-2 ${
                  errors.datereleasedinput ? 'border-red-600 text-red-600 ring-red-600' : 'border-sky-700 text-sky-950'
                } focus:outline-none focus:ring-1 ${
                  errors.datereleasedinput ? 'focus:ring-red-600' : 'focus:ring-[#004077]'
                }`}
                required
              />
              {errors.datereleasedinput && <p className="text-xs text-red-600 mt-1 px-2">{errors.datereleasedinput}</p>}
            </div>
            {/* Date Released */}
            <div className="relative">
              <label className="absolute -top-2 left-5 bg-white px-1 text-sky-700 text-xs font-bold">Date Released <span className="text-[#F54B4B]">*</span></label>
              <input
                type="date"
                name="date"
                value={formData.date ? formData.date.slice(0, 10) : ''}
                onChange={handleInputChange}
                className={`text-xs w-full h-12 pl-5 pr-4 rounded-full border-2 ${
                  errors.date ? 'border-red-600 text-red-600 ring-red-600' : 'border-sky-700 text-sky-950'
                } focus:outline-none focus:ring-1 ${
                  errors.date ? 'focus:ring-red-600' : 'focus:ring-[#004077]'
                }`}
                disabled={viewMode}
                required
              />
              {errors.date && <p className="text-xs text-red-600 mt-1 px-2">{errors.date}</p>}
            </div>
          </div>
        )}
        {(editMode || viewMode) && (
          <div className="relative mb-4">
            <label className="absolute -top-2 left-5 bg-white px-1 text-sky-700 text-xs font-bold">Date Released <span className="text-[#F54B4B]">*</span></label>
            <input
              type="date"
              name="date"
              value={formData.date ? formData.date.slice(0, 10) : ''}
              onChange={handleInputChange}
              className={`text-xs w-full h-12 pl-5 pr-4 rounded-full border-2 ${
                errors.date ? 'border-red-600 text-red-600 ring-red-600' : 'border-sky-700 text-sky-950'
              } focus:outline-none focus:ring-1 ${
                errors.date ? 'focus:ring-red-600' : 'focus:ring-[#004077]'
              }`}
              disabled={viewMode}
              required
            />
            {errors.date && <p className="text-xs text-red-600 mt-1 px-2">{errors.date}</p>}
          </div>
        )}

        {/* Remarks */}
        <div className="relative">
          <label className="absolute -top-2 left-5 bg-white px-1 text-sky-700 text-xs font-bold">Remarks</label>
          <textarea
            name="remarks"
            value={formData.remarks}
            onChange={handleInputChange}
            placeholder="Enter Remarks"
            className="text-xs w-full h-24 rounded-[20px] border-2 px-5 py-3 border-sky-700 text-sky-950 placeholder:text-sky-700/70 focus:border-[#004077] focus:outline-none focus:ring-1 focus:ring-[#004077]"
          />
        </div>

        {!viewMode && (
          <div className="flex justify-end pt-2">
            <button
              className="bg-sky-700 hover:bg-sky-800 text-white text-sm font-medium rounded-2xl px-6 py-2 cursor-pointer"
              onClick={handleSubmit}
              disabled={isSubmitting}
              type="button"
            >
              {isSubmitting ? 'Saving...' : editMode ? 'Save Changes' : 'Submit'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default OverlayOutgoing;