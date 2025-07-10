import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import '../index.css';

function Profile() {
  const [viewMode, setViewMode] = useState(true);
  const [formData, setFormData] = useState({
    adminname: '',
    adminemail: '',
    documentdirection: '',
    adminpass: '',
    confirmPass: ''
  });
  const [originalData, setOriginalData] = useState(null); // For cancel
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userType, setUserType] = useState(''); // Track usertype
  const [showPassword, setShowPassword] = useState(false);
  const API_URL = import.meta.env.VITE_API_URL;
  // Load current user from localStorage
  useEffect(() => {
    const admin = JSON.parse(localStorage.getItem('admin'));
    if (admin) {
      const initialData = {
        adminname: admin.adminname || '',
        adminemail: admin.adminemail || '',
        documentdirection: admin.documentdirection || '',
        adminpass: '',
        confirmPass: ''
      };

      setFormData(initialData);
      setOriginalData({
        adminname: admin.adminname || '',
        adminemail: admin.adminemail || '',
        documentdirection: admin.documentdirection || ''
      });
      setUserType(admin.usertype || '');
    }
  }, []);

  // Handle Edit action
  const handleEdit = () => {
    setOriginalData({
      adminname: formData.adminname,
      adminemail: formData.adminemail,
      documentdirection: formData.documentdirection
    });
    setViewMode(false);
  };

  // Handle Cancel action
  const handleCancel = () => {
    setFormData(prev => ({
      ...prev,
      adminname: originalData.adminname,
      adminemail: originalData.adminemail,
      documentdirection: originalData.documentdirection,
      adminpass: '',
      confirmPass: ''
    }));
    setErrors({});
    setViewMode(true);
  };

  // Handle input changes
  const handleChange = (e) => {
    if (viewMode) return;
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleDirectionChange = (e) => {
    // Prevent changes since Document Direction is now read-only
    return;
  };

  const validate = () => {
    const newErrors = {};
    // Only validate password if either field is filled
    if ((formData.adminpass || formData.confirmPass) && formData.adminpass !== formData.confirmPass) {
      newErrors.confirmPass = 'Passwords do not match.';
    }
    return newErrors;
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    setIsSubmitting(true);

    try {
      const admin = JSON.parse(localStorage.getItem('admin'));
      const payload = {
        adminname: formData.adminname.trim(),
        // Only send documentdirection if not superadmin
        ...(userType !== 'superadmin' && { documentdirection: formData.documentdirection }),
        ...(formData.adminpass && { adminpass: formData.adminpass })
      };

      const response = await fetch(`${API_URL}/api/admins/${admin.adminid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const err = await response.json();
        setErrors({ submit: err.error || 'Failed to update profile.' });
        setIsSubmitting(false);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: err.error || 'Failed to update profile.',
          timer: 2500,
          showConfirmButton: false,
          customClass: { popup: 'swal2-minimalist' }
        });
        return;
      }

      const updated = await response.json();
      // Update localStorage
      localStorage.setItem('admin', JSON.stringify({ ...admin, ...updated }));

      setViewMode(true);
      setFormData((prev) => ({
        ...prev,
        adminpass: '',
        confirmPass: ''
      }));
      Swal.fire({
        icon: 'success',
        title: 'Profile Updated!',
        timer: 1500,
        showConfirmButton: false,
        customClass: { popup: 'swal2-minimalist' }
      });
    } catch (err) {
      setErrors({ submit: 'Failed to update profile.' });
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to update profile.',
        timer: 2500,
        showConfirmButton: false,
        customClass: { popup: 'swal2-minimalist' }
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-full flex items-center justify-center">
      <div
        className="w-[450px] max-w-full bg-white rounded-[30px] shadow-lg p-8 flex flex-col gap-5 relative"
      >
        {/* Title */}
        <h2 className="text-2xl font-bold text-sky-700 text-center mb-4">Admin Profile</h2>
        <form className="flex flex-col gap-6" onSubmit={handleSubmit} id="profile-form">
          {/* Name */}
          <div className="relative flex flex-col gap-1">
            <label className="absolute -top-2 left-5 bg-white px-1 text-sky-700 text-xs font-bold z-10">
              Name
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
          {/* Email (always pre-filled, never editable) */}
          <div className="relative flex flex-col gap-1">
            <label className="absolute -top-2 left-5 bg-white px-1 text-sky-700 text-xs font-bold z-10">
              Email
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
              readOnly
              autoComplete="off"
            />
            {errors.adminemail && <p className="text-xs text-red-600 mt-1 px-2">{errors.adminemail}</p>}
          </div>
          {/* Document Direction (hide if superadmin) */}
          {userType !== 'superadmin' && (
            <div className="relative flex flex-col gap-1">
              <label className="absolute -top-2 left-5 bg-white px-1 text-sky-700 text-xs font-bold z-10">
                Document Direction
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
                disabled={true}
                readOnly
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
          {/* Password fields always visible, but only editable in edit mode */}
          <div className="relative flex flex-col gap-1">
            <label className="absolute -top-2 left-5 bg-white px-1 text-sky-700 text-xs font-bold z-10">
              New Password
            </label>
            <input
              type={showPassword ? "text" : "password"}
              name="adminpass"
              placeholder="Enter new password"
              className={`text-xs w-full h-12 pl-5 pr-4 rounded-full border-2 ${
                errors.adminpass ? 'border-red-600 text-red-600 ring-red-600' : 'border-sky-700 text-sky-950'
              } placeholder:text-sky-700/70 focus:outline-none focus:ring-1 ${
                errors.adminpass ? 'focus:ring-red-600' : 'focus:ring-[#004077]'
              }`}
              value={formData.adminpass}
              onChange={handleChange}
              autoComplete="new-password"
              readOnly={viewMode}
            />
            {errors.adminpass && <p className="text-xs text-red-600 mt-1 px-2">{errors.adminpass}</p>}
          </div>
          <div className="relative">
            <label className="absolute -top-2 left-5 bg-white px-1 text-sky-700 text-xs font-bold z-10">
              Confirm New Password
            </label>
            <input
              type={showPassword ? "text" : "password"}
              name="confirmPass"
              placeholder="Confirm new password"
              className={`text-xs w-full h-12 pl-5 pr-4 rounded-full border-2 ${
                errors.confirmPass ? 'border-red-600 text-red-600 ring-red-600' : 'border-sky-700 text-sky-950'
              } placeholder:text-sky-700/70 focus:outline-none focus:ring-1 ${
                errors.confirmPass ? 'focus:ring-red-600' : 'focus:ring-[#004077]'
              } mb-1`}
              value={formData.confirmPass}
              onChange={handleChange}
              autoComplete="new-password"
              readOnly={viewMode}
            />
            {errors.confirmPass && <p className="text-xs text-red-600 mt-1 px-2">{errors.confirmPass}</p>}
          </div>
        </form>
        {/* Show Password */}
        <div className="w-full -mt-4">
          <div className="flex items-center ml-3 mb-1">
            <input
              type="checkbox"
              checked={showPassword}
              onChange={(e) => setShowPassword(e.target.checked)}
              className="mr-1 text-sky-700 w-3 h-3 cursor-pointer"
              disabled={viewMode}
            />
            <label className="text-xs text-sky-700">Show Password</label>
          </div>
        </div>
        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-2">
          {!viewMode ? (
            <>
              <button
                type="button"
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-medium rounded-2xl px-6 py-2 transition-colors cursor-pointer"
                onClick={handleCancel}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                form="profile-form"
                className="bg-sky-700 hover:bg-sky-800 text-white text-sm font-medium rounded-2xl px-6 py-2 transition-colors cursor-pointer"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          ) : (
            <button
              type="button"
              className="bg-[#28A745] text-white rounded-2xl hover:bg-[#218838] transition-colors cursor-pointer px-6 py-2 text-sm font-semibold"
              onClick={handleEdit}
              title="Edit Profile"
            >
              Edit
            </button>
          )}
        </div>
      </div>
    </main>
  );
}

export default Profile;