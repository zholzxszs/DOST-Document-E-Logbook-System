import { useEffect, useRef, useState } from 'react';
import Swal from 'sweetalert2';
import '../index.css'

function OverlayIncoming({ isOpen, onClose, editingDoc, viewMode, editMode, onSuccess }) {
  const popupRef = useRef(null);
  const [documentTypes, setDocumentTypes] = useState([]);
  const [showCustomDocType, setShowCustomDocType] = useState(false);
  const [customDocType, setCustomDocType] = useState('');
  const [selectedDocType, setSelectedDocType] = useState('');
  const [formData, setFormData] = useState({dtsNo: ''});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const API_URL = import.meta.env.VITE_API_URL;

  // Initialize form data when editing/prefill
  useEffect(() => {
    if (editingDoc) {
      setFormData({
        dtsNo: editingDoc.dtsno || ''
      });
      setSelectedDocType(editingDoc.documenttype || '');
    } else {
      setFormData({ dtsNo: '' });
      setSelectedDocType('');
    }
  }, [editingDoc]);

  // Fetch document types when overlay opens
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

    if (isOpen) fetchDocumentTypes();
  }, [isOpen]);

  const handleDtsNoChange = (e) => {
    if (viewMode) return; // Prevent changes in view mode
    const value = e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    setFormData({ ...formData, dtsNo: value });
  };

  const handleDocTypeChange = (e) => {
    if (viewMode) return; // Prevent changes in view mode
    const value = e.target.value;
    setSelectedDocType(value);
    setShowCustomDocType(value === 'Others');
  };

  const handleAddOrRemoveDocType = async (action) => {
    if (!customDocType.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Input required',
        text: 'Please enter a document type.',
        timer: 1800,
        showConfirmButton: false,
        customClass: {
          popup: 'swal2-minimalist'
        }
      });
      return;
    }
    const typeName = customDocType.trim();

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
          setShowCustomDocType(false);
          setCustomDocType('');
          Swal.fire({
            icon: 'success',
            title: 'Added!',
            text: 'Document type added.',
            timer: 1500,
            showConfirmButton: false,
            customClass: {
              popup: 'swal2-minimalist'
            }
          });
        } else {
          throw new Error('Failed to add document type');
        }
      } else if (action === 'remove') {
        const match = documentTypes.find(dt => dt.documenttype === typeName);
        if (!match) {
          Swal.fire({
            icon: 'info',
            title: 'Not found',
            text: 'Document type not found.',
            timer: 1800,
            showConfirmButton: false,
            customClass: {
              popup: 'swal2-minimalist'
            }
          });
          return;
        }

        const response = await fetch(`${API_URL}/api/document-types/${match.documentid}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          setDocumentTypes(documentTypes.filter(dt => dt.documentid !== match.documentid));
          if (selectedDocType === match.documenttype) {
            setSelectedDocType('');
          }
          setShowCustomDocType(false);
          setCustomDocType('');
          Swal.fire({
            icon: 'success',
            title: 'Removed!',
            text: 'Document type removed.',
            timer: 1500,
            showConfirmButton: false,
            customClass: {
              popup: 'swal2-minimalist'
            }
          });
        } else {
          throw new Error('Failed to delete document type');
        }
      }
    } catch (error) {
      console.error('Document type operation failed:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message,
        timer: 2500,
        showConfirmButton: false,
        customClass: {
          popup: 'swal2-minimalist'
        }
      });
    }
  };

  const handleSubmit = async () => {
    const newErrors = {};
    if (!formData.dtsNo) newErrors.dtsNo = 'DTS No. is required.';
    if (!selectedDocType) newErrors.documentType = 'Document type is required.';

    if (!newErrors.dtsNo && (!editingDoc || formData.dtsNo !== editingDoc.dtsno)) {
      try {
        const dtsNoToCheck = formData.dtsNo.trim().toUpperCase();
        const response = await fetch(`${API_URL}/api/incoming`);
        if (response.ok) {
          const docs = await response.json();
          // Check for any existing document with the same DTS No and document type
          const exists = docs.some(
            doc =>
              (doc.dtsno?.toUpperCase() === dtsNoToCheck &&
              doc.documenttype === selectedDocType &&
              doc.documentid !== (editingDoc?.documentid || 0) && doc.isarchive === false) // Exclude current document if editing
          );
          // if (exists) {
          //   newErrors.dtsNo = 'A document with this DTS No. and document type already exists.';
          // }
        }
      } catch (err) {
        console.error('Error checking DTS No:', err);
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      const documentData = {
      
        dtsno: formData.dtsNo.trim().toUpperCase(),
        documenttype: selectedDocType.trim(),
        documentdirection: 'incoming',
      // For new records include Date Sent (wall clock, Asia/Manila)
      ...(editingDoc ? {} : (() => {
        const now = new Date();
        const pad = (n) => n.toString().padStart(2, '0');
        const year = now.getFullYear();
        const month = pad(now.getMonth() + 1);
        const day = pad(now.getDate());
        const hours = pad(now.getHours());
        const minutes = pad(now.getMinutes());
        return { datesent: `${year}-${month}-${day} ${hours}:${minutes}:00` };
      })())
      };

      const url = editingDoc 
        ? `${API_URL}/api/incoming/${editingDoc.documentid}`
        : `${API_URL}/api/incoming`;
      
      const method = editingDoc ? "PUT" : "POST";
      
      const response = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(documentData),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || "Failed to save record");
      }

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
    } catch (err) {
      console.error("Submission error:", err);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err.message,
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

  // Keyboard event handlers
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!isOpen) return;
      
      if (event.key === 'Enter' && !viewMode && !isSubmitting) {
        event.preventDefault();
        handleSubmit();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
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
        className="w-[450px] max-w-full bg-white rounded-[30px] shadow-lg p-8 flex flex-col space-y-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute top-4 right-4 text-2xl text-black/50 hover:text-black/70 transition-colors cursor-pointer"
          onClick={onClose}
        >
          ×
        </button>

        <h2 className="text-xl font-bold text-sky-700 text-center">
          {viewMode ? 'View Document' : editMode ? 'Edit Document' : 'Add Incoming Document'}
        </h2>

        <div className="space-y-6">
          {/* DTS No Input */}
          <div className="relative">
            <label className="absolute -top-2 left-5 bg-white px-1 text-sky-700 text-xs font-bold z-10">
              DTS No. <span className='text-[#F54B4B]'>*</span>
            </label>
            <input
              type="text"
              name="dtsNo"
              placeholder="e.g. ORD1070"
              className={`text-xs w-full h-12 pl-5 pr-4 rounded-full border-2 ${
                errors.dtsNo ? 'border-red-600 text-red-600 ring-red-600' : 'border-sky-700 text-sky-950'
              } placeholder:text-sky-700/70 focus:outline-none focus:ring-1 ${
                errors.dtsNo ? 'focus:ring-red-600' : 'focus:ring-[#004077]'
              } uppercase`}
              value={formData.dtsNo}
              onChange={handleDtsNoChange}
              onKeyPress={(e) => {
                if (!/[a-zA-Z0-9]/.test(e.key)) {
                  e.preventDefault();
                }
              }}
              readOnly={viewMode}
            />
            {errors.dtsNo && <p className="text-xs text-red-600 mt-1 px-2">{errors.dtsNo}</p>}
          </div>

          {/* Document Type Dropdown */}
          <div className="relative">
            <label className="absolute -top-2 left-5 bg-white px-1 text-sky-700 text-xs font-bold z-10">
              Document Type <span className='text-[#F54B4B]'>*</span>
            </label>
            <select
              className={`text-xs w-full h-12 pl-5 pr-10 rounded-full border-2 ${
                errors.documentType ? 'border-red-600 text-red-600 ring-red-600' : 'border-sky-700 text-sky-950'
              } bg-white focus:outline-none focus:ring-1 ${
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
            {errors.documentType && (
              <p className="text-xs text-red-600 mt-1 px-2">{errors.documentType}</p>
            )}
          </div>

          {/* Custom Document Type Input */}
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

          {/* Show remarks only in view mode */}
          {viewMode && (
            <div className="mt-1 mb-4 relative">
              <label className="absolute -top-2 left-5 bg-white px-1 text-sky-700 text-xs font-bold">Remarks</label>
              <div className="text-xs w-full min-h-24 max-h-32 rounded-[20px] border-2 px-5 py-3 border-sky-700 text-sky-950 overflow-y-auto overflow-x-hidden whitespace-pre-wrap break-words">
                {editingDoc?.remarks || '-'}
              </div>
            </div>
          )}

          {/* Submit Button - Only show if not in view mode */}
          {!viewMode && (
            <div className="flex justify-end pt-2">
              <button
                className="bg-sky-700 hover:bg-sky-800 text-white text-sm font-medium rounded-2xl px-6 py-2 cursor-pointer"
                onClick={handleSubmit}
                disabled={isSubmitting || viewMode}
              >
                {isSubmitting ? 'Saving...' : editMode ? 'Save Changes' : 'Submit'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default OverlayIncoming;