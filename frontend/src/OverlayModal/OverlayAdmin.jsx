import { useEffect, useRef, useState } from 'react';
import Swal from 'sweetalert2';
import '../index.css'

function OverlayAdmin({ isOpen, onClose, editingDoc, viewMode, editMode }) {
  const popupRef = useRef(null);
  const [formData, setFormData] = useState({
    adminname: '',
    adminemail: '',
    documentdirection: '',
    usertype: 'admin',
    adminpass: '',
    confirmPass: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const API_URL = import.meta.env.VITE_API_URL;
  const adminData = localStorage.getItem('admin');
  const currentUser = adminData ? JSON.parse(adminData) : null;
  const isSuperAdmin = currentUser?.usertype === 'superadmin';

  // Prefill form when editing/viewing
  useEffect(() => {
    if (editingDoc) {
      setFormData({
        adminname: editingDoc.adminname || '',
        adminemail: editingDoc.adminemail || '', 
        documentdirection: editingDoc.documentdirection || '',
        usertype: editingDoc.usertype || 'admin',
        adminpass: '',
        confirmPass: ''
      });
    } else {
      setFormData({
        adminname: '',
        adminemail: '',
        documentdirection: '',
        usertype: 'admin',
        adminpass: '',
        confirmPass: ''
      });
    }
  }, [editingDoc]);

  // Automatically adjust documentdirection based on usertype
  useEffect(() => {
    if (isSuperAdmin) {
      if (formData.usertype === 'superadmin') {
        setFormData(prev => ({ ...prev, documentdirection: 'all' }));
      } else if (formData.usertype === 'admin' && formData.documentdirection === 'all') {
        setFormData(prev => ({ ...prev, documentdirection: '' }));
      }
    }
  }, [formData.usertype, isSuperAdmin]);

  const handleChange = (e) => {
    if (viewMode) return;
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleDirectionChange = (e) => {
    setFormData(prev => ({
      ...prev,
      documentdirection: e.target.value
    }));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.adminname.trim()) newErrors.adminname = 'Name is required.';
    if (!formData.adminemail.trim()) newErrors.adminemail = 'Email is required.';
    // Accept only @region1.dost.gov.ph domain
    if (!/^([a-zA-Z0-9._-]+)@region1\.dost\.gov\.ph$/i.test(formData.adminemail.trim().toLowerCase())) {
      newErrors.adminemail = 'Incorrect domain. Use @region1.dost.gov.ph';
    }
    if (!formData.documentdirection) newErrors.documentdirection = 'Direction is required.';
    if (isSuperAdmin && !formData.usertype) newErrors.usertype = 'User type is required.';

    // Password validation
    if (!editingDoc) {
      // Adding: password and confirm password are required and must match
      if (!formData.adminpass) newErrors.adminpass = 'Password is required.';
      if (!formData.confirmPass) newErrors.confirmPass = 'Confirm password is required.';
      if (
        formData.adminpass &&
        formData.confirmPass &&
        formData.adminpass !== formData.confirmPass
      ) {
        newErrors.confirmPass = 'Passwords do not match.';
      }
    } else {
      // Editing: password fields are optional, but if either is filled, both must match
      if ((formData.adminpass || formData.confirmPass) && formData.adminpass !== formData.confirmPass) {
        newErrors.confirmPass = 'Passwords do not match.';
      }
    }

    return newErrors;
  };

  const handleSubmit = async () => {
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    setIsSubmitting(true);

    try {
      const payload = {
        adminname: formData.adminname.trim(),
        adminemail: formData.adminemail.trim(),
        documentdirection: formData.documentdirection,
        ...(!viewMode && { adminpass: formData.adminpass }),
        ...(isSuperAdmin && { usertype: formData.usertype })
      };

      // Check for duplicate email (except when editing the same admin)
      const checkRes = await fetch(`${API_URL}/api/admins`);
      const admins = await checkRes.json();
      const isDuplicate = admins.some(
        (a) => a.adminemail.toLowerCase() === payload.adminemail.toLowerCase() &&
              (!editingDoc || a.adminid !== editingDoc.adminid)
      );
      
      if (isDuplicate) {
        setErrors({ adminemail: 'Email already exists.' });
        setIsSubmitting(false);
        return;
      }

      let response;
      if (editingDoc) {
        // Update existing admin
        response = await fetch(`${API_URL}/api/admins/${editingDoc.adminid}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        // Add new admin
        response = await fetch(`${API_URL}/api/admins`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      if (!response.ok) {
        const err = await response.json();
        setErrors({ submit: err.error?.replace('username', 'email') || 'Failed to save admin.' });
        setIsSubmitting(false);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: err.error?.replace('username', 'email') || 'Failed to save admin.',
          timer: 2500,
          showConfirmButton: false,
          customClass: {
            popup: 'swal2-minimalist'
          }
        });
        return;
      }

      onClose(true); 
      Swal.fire({
        icon: 'success',
        title: editingDoc ? 'Updated!' : 'Added!',
        text: editingDoc ? 'Admin updated successfully.' : 'Admin added successfully.',
        timer: 1500,
        showConfirmButton: false,
        customClass: {
          popup: 'swal2-minimalist'
        }
      });
    } catch (err) {
      setErrors({ submit: 'Failed to save admin.' });
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to save admin.',
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
          {viewMode ? 'View Admin' : editMode ? 'Edit Admin' : 'Add Admin'}
        </h2>

        <div className="space-y-6">
          {/* Name */}
          <div className="relative">
            <label className="absolute -top-2 left-5 bg-white px-1 text-sky-700 text-xs font-bold z-10">
              Name <span className='text-[#F54B4B]'>*</span>
            </label>
            <input
              type="text"
              name="adminname"
              placeholder="e.g. Juan Dela Cruz"
              className={`text-xs w-full h-12 pl-5 pr-4 rounded-full border-2 ${
                errors.adminname ? 'border-red-600 text-red-600 ring-red-600' : 'border-sky-700 text-sky-950'
              } placeholder:text-sky-700/70 focus:outline-none focus:ring-1 ${
                errors.adminname ? 'focus:ring-red-600' : 'focus:ring-[#004077]'
              }`}
              value={formData.adminname}
              onChange={handleChange}
              readOnly={viewMode}
            />
            {errors.adminname && <p className="text-xs text-red-600 mt-1 px-2">{errors.adminname}</p>}
          </div>

          {/* Email */}
          <div className="relative">
            <label className="absolute -top-2 left-5 bg-white px-1 text-sky-700 text-xs font-bold z-10">
              Email <span className='text-[#F54B4B]'>*</span>
            </label>
            <input
              type="text"
              name="adminemail"
              placeholder="e.g. jdelacruz@region1.dost.gov.ph"
              className={`text-xs w-full h-12 pl-5 pr-4 rounded-full border-2 ${
                errors.adminemail ? 'border-red-600 text-red-600 ring-red-600' : 'border-sky-700 text-sky-950'
              } placeholder:text-sky-700/70 focus:outline-none focus:ring-1 ${
                errors.adminemail ? 'focus:ring-red-600' : 'focus:ring-[#004077]'
              }`}
              value={formData.adminemail}
              onChange={handleChange}
              readOnly={viewMode}
              autoComplete="off"
            />
            {errors.adminemail && <p className="text-xs text-red-600 mt-1 px-2">{errors.adminemail}</p>}
          </div>

          {/* User Type (only for superadmin) */}
          {isSuperAdmin && (
            <div className="relative">
              <label className="absolute -top-2 left-5 bg-white px-1 text-sky-700 text-xs font-bold z-10">
                User Type <span className='text-[#F54B4B]'>*</span>
              </label>
              <select
                name="usertype"
                className={`text-xs w-full h-12 pl-5 pr-10 rounded-full border-2 ${
                  errors.usertype ? 'border-red-600 text-red-600 ring-red-600' : 'border-sky-700 text-sky-950'
                } bg-white focus:outline-none focus:ring-1 ${
                  errors.usertype ? 'focus:ring-red-600' : 'focus:ring-[#004077]'
                }`}
                value={formData.usertype}
                onChange={handleChange}
                disabled={viewMode}
              >
                <option value="admin">Admin</option>
                <option value="superadmin">Superadmin</option>
              </select>
              {errors.usertype && (
                <p className="text-xs text-red-600 mt-1 px-2">{errors.usertype}</p>
              )}
            </div>
          )}

          {/* Document Direction */}
          {formData.usertype === 'admin' && (
            <div className="relative">
              <label className="absolute -top-2 left-5 bg-white px-1 text-sky-700 text-xs font-bold z-10">
                Document Direction <span className='text-[#F54B4B]'>*</span>
              </label>
              <select
                name="documentdirection"
                className={`text-xs w-full h-12 pl-5 pr-10 rounded-full border-2 ${
                  errors.documentdirection ? 'border-red-600 text-red-600 ring-red-600' : 'border-sky-700 text-sky-950'
                } bg-white focus:outline-none focus:ring-1 ${
                  errors.documentdirection ? 'focus:ring-red-600' : 'focus:ring-[#004077]'
                }`}
                value={formData.documentdirection}
                onChange={handleDirectionChange}
                disabled={viewMode}
              >
                <option value="">Select Direction</option>
                <option value="incoming">Incoming</option>
                <option value="outgoing">Outgoing</option>
              </select>
              {errors.documentdirection && (
                <p className="text-xs text-red-600 mt-1 px-2">{errors.documentdirection}</p>
              )}
            </div>
          )}

          {/* Password (only for add or edit) */}
          {!viewMode && (
            <>
              <div className="relative">
                <label className="absolute -top-2 left-5 bg-white px-1 text-sky-700 text-xs font-bold z-10">
                  {editMode ? 'New Password' : 'Password'}
                  {!editMode && <span className='text-[#F54B4B]'> *</span>}
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  name="adminpass"
                  placeholder={editMode ? 'Enter new password' : 'Password'}
                  className={`text-xs w-full h-12 pl-5 pr-4 rounded-full border-2 ${
                    errors.adminpass ? 'border-red-600 text-red-600 ring-red-600' : 'border-sky-700 text-sky-950'
                  } placeholder:text-sky-700/70 focus:outline-none focus:ring-1 ${
                    errors.adminpass ? 'focus:ring-red-600' : 'focus:ring-[#004077]'
                  }`}
                  value={formData.adminpass}
                  onChange={handleChange}
                  autoComplete="new-password"
                />
                {errors.adminpass && <p className="text-xs text-red-600 mt-1 px-2">{errors.adminpass}</p>}
              </div>

              {/* Confirm Password */}
              <div className="relative mb-2">
                <label className="absolute -top-2 left-5 bg-white px-1 text-sky-700 text-xs font-bold z-10">
                  Confirm {editMode ? 'New ' : ''}Password 
                  {!editMode && <span className='text-[#F54B4B]'> *</span>}
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  name="confirmPass"
                  placeholder={`Confirm ${editMode ? 'new ' : ''}password`}
                  className={`text-xs w-full h-12 pl-5 pr-4 rounded-full border-2 ${
                    errors.confirmPass ? 'border-red-600 text-red-600 ring-red-600' : 'border-sky-700 text-sky-950'
                  } placeholder:text-sky-700/70 focus:outline-none focus:ring-1 ${
                    errors.confirmPass ? 'focus:ring-red-600' : 'focus:ring-[#004077]'
                  }`}
                  value={formData.confirmPass}
                  onChange={handleChange}
                  autoComplete="new-password"
                />
                {errors.confirmPass && <p className="text-xs text-red-600 mt-1 px-2">{errors.confirmPass}</p>}
              </div>

              {/* Show Password */}
              <div className="flex items-center ml-3 mb-2">
                <input
                  type="checkbox"
                  checked={showPassword}
                  onChange={(e) => setShowPassword(e.target.checked)}
                  className="mr-1 text-sky-700 w-3 h-3"
                />
                <label className="text-xs text-sky-700">Show Password</label>
              </div>
            </>
          )}

          {/* Submit Button */}
          {!viewMode && (
            <div className="flex justify-end pt-0.5">
              <button
                className="bg-sky-700 hover:bg-sky-800 text-white text-sm font-medium rounded-2xl px-6 py-2 cursor-pointer"
                onClick={handleSubmit}
                disabled={isSubmitting}
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

export default OverlayAdmin;