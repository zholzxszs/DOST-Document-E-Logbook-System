import { useEffect, useRef, useState } from 'react';
import Swal from 'sweetalert2';
import '../index.css'

function OverlayProcessingDays({ isOpen, onClose, editingDoc, viewMode, editMode, calculateNetworkDays }) {
  const popupRef = useRef(null);
  const [formData, setFormData] = useState({
    deducteddays: '0', 
    remarks: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({
    deducteddays: '',
    remarks: '',
    calculation: ''
  });
  const API_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    if (editingDoc) {
      setFormData({
        deducteddays: editingDoc.deducteddays !== null 
          ? String(editingDoc.deducteddays) 
          : '0',
        remarks: editingDoc.networkdaysremarks && editingDoc.networkdaysremarks !== '-'
          ? editingDoc.networkdaysremarks
          : ''
      });
    } else {
      setFormData({
        deducteddays: '0',
        remarks: ''
      });
    }
    setErrors({
      deducteddays: '',
      remarks: '',
      calculation: ''
    });
  }, [editingDoc]);

  const validateForm = () => {
    const newErrors = {
      deducteddays: '',
      remarks: '',
      calculation: ''
    };
    let isValid = true;

    // Validate deducted days
    const deductedDays = parseInt(formData.deducteddays, 10);
    if (formData.deducteddays.trim() === '') {
      newErrors.deducteddays = 'Deducted days is required';
      isValid = false;
    } else if (isNaN(deductedDays)) {
      newErrors.deducteddays = 'Must be a valid number';
      isValid = false;
    } else if (deductedDays < 0) {
      newErrors.deducteddays = 'Cannot be negative';
      isValid = false;
    } else if (editingDoc && typeof editingDoc.calcnetworkdays === 'number') {
      const processingDays = editingDoc.calcnetworkdays - deductedDays;
      if (processingDays < 0) {
        newErrors.deducteddays = 'Processing days cannot be negative. Reduce the deducted days.';
        isValid = false;
      } else if (processingDays === 0) {
        newErrors.deducteddays = 'Processing days cannot be zero. Reduce the deducted days.';
        isValid = false;
      }
    }

    // Validate remarks
    if (!formData.remarks.trim()) {
      newErrors.remarks = 'Remarks are required';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async () => {
    if (!editingDoc) return;

    // First validate form fields
    if (!validateForm()) return;

    try {
      setIsSubmitting(true);

      const deductedDays = parseInt(formData.deducteddays, 10);
      const businessDays = typeof editingDoc.calcnetworkdays === 'number'
        ? editingDoc.calcnetworkdays
        : 0;

      const response = await fetch(
        `${API_URL}/api/documents/${editingDoc.documentid}/networkdays`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            deducteddays: deductedDays,
            calcnetworkdays: businessDays - deductedDays,
            remarks: formData.remarks.trim()
          })
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save network days');
      }

      onClose(true);
      Swal.fire({
        icon: 'success',
        title: 'Saved!',
        text: 'Network days updated successfully.',
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
        text: error.message,
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
        onClose(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, viewMode, isSubmitting, onClose, handleSubmit]);

  const handleInputChange = (e) => {
    if (viewMode) return;
    
    const { name, value } = e.target;
    
    if (name === 'deducteddays') {
      // Allow empty string or numbers only
      if (value === '' || /^[0-9]*$/.test(value)) {
        setFormData(prev => ({
          ...prev,
          [name]: value
        }));
        // Clear error when user types
        if (errors.deducteddays) {
          setErrors(prev => ({ ...prev, deducteddays: '' }));
        }
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
      // Clear error when user types in remarks
      if (name === 'remarks' && errors.remarks) {
        setErrors(prev => ({ ...prev, remarks: '' }));
      }
    }
    
    // Clear calculation error when user makes changes
    if (errors.calculation) {
      setErrors(prev => ({ ...prev, calculation: '' }));
    }
  };

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
          {viewMode ? 'View Network Days' : editMode ? 'Edit Network Days' : 'Network Days'}
        </h2>

        {errors.calculation && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{errors.calculation}</p>
              </div>
            </div>
          </div>
        )}

        <div className="mt-1 mb-4 relative">
          <label className="absolute -top-2 left-5 bg-white px-1 text-sky-700 text-xs font-bold">Deduct (days) <span className="text-[#F54B4B]">*</span></label>
          <input
            type="text" 
            name="deducteddays"
            value={formData.deducteddays}
            placeholder="Enter days to deduct"
            className={`text-xs w-full h-12 pl-5 pr-4 rounded-full border-2 ${
              errors.deducteddays ? 'border-red-500' : 'border-sky-700'
            } text-sky-950 placeholder:text-sky-700/70 focus:border-[#004077] focus:outline-none focus:ring-1 focus:ring-[#004077]`}
            onChange={handleInputChange}
            disabled={viewMode}
            required
          />
          {errors.deducteddays && (
            <p className="text-red-500 text-xs mt-1 ml-2">{errors.deducteddays}</p>
          )}
        </div>

        <div className="mt-1 mb-4 relative">
          <label className="absolute -top-2 left-5 bg-white px-1 text-sky-700 text-xs font-bold">Remarks <span className="text-[#F54B4B]">*</span></label>
          <textarea
            name="remarks"
            value={formData.remarks}
            onChange={handleInputChange}
            placeholder="Enter Remarks"
            className={`text-xs w-full h-24 rounded-[20px] border-2 px-5 py-3 pl-5 pr-4 ${
              errors.remarks ? 'border-red-500' : 'border-sky-700'
            } text-sky-950 placeholder:text-sky-700/70 focus:border-[#004077] focus:outline-none focus:ring-1 focus:ring-[#004077]`}
            disabled={viewMode}
            required
          />
          {errors.remarks && (
            <p className="text-red-500 text-xs mt-1 ml-2">{errors.remarks}</p>
          )}
        </div>

        <div className="flex justify-end pt-2">
          {!viewMode && (
            <button
              className="bg-sky-700 hover:bg-sky-800 text-white text-sm font-medium rounded-2xl px-6 py-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : editMode ? 'Save Changes' : 'Submit'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default OverlayProcessingDays;