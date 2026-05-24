import React, { useState, useEffect, useContext, useRef, useMemo } from 'react';
import { ArrowLeft, CheckCircle2, AlertTriangle, Save, RotateCcw, Camera, Edit2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { SettingsContext } from '../../context/SettingsContext';
import { fetchUserProfile, updateUserProfile } from '../../api/userApi';
import api from '../../api/api';
import './SettingsPage.css';

const resizeProfileImage = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onerror = () => reject(new Error('Unable to read profile picture'));
  reader.onload = () => {
    const image = new Image();
    image.onerror = () => reject(new Error('Unable to process profile picture'));
    image.onload = () => {
      const maxSize = 360;
      const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
      const width = Math.max(1, Math.round(image.width * scale));
      const height = Math.max(1, Math.round(image.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(image, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.78));
    };
    image.src = String(reader.result || '');
  };
  reader.readAsDataURL(file);
});


const SettingsPage = ({ embedded = false } = {}) => {
  const navigate = useNavigate();
  const { settings: ctxSettings, saveSettings: saveToServer } = useContext(SettingsContext);
  const toastTimerRef = useRef(null);

  // Profile Settings State
  const fileRef = useRef(null);
  const [profile, setProfile] = useState(null);
  const [profileDraft, setProfileDraft] = useState({ username: '', email: '', address: '', profilePicture: '' });
  const [profileEditing, setProfileEditing] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState('');

  const initial = useMemo(() => {
    const source = profile?.username || profile?.email || 'R';
    return source.trim().charAt(0).toUpperCase() || 'R';
  }, [profile]);

  const loadProfile = async () => {
    try {
      const res = await fetchUserProfile();
      const profileData = res?.data?.data ?? res?.data ?? res ?? {};
      setProfile(profileData);
      setProfileDraft({
        username: profileData.username || '',
        email: profileData.email || '',
        address: profileData.address || '',
        profilePicture: profileData.profilePicture || '',
      });
    } catch (err) {
      console.error('Failed to load profile in settings:', err);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleProfileDraftChange = (event) => {
    const { name, value } = event.target;
    setProfileDraft((prev) => ({ ...prev, [name]: value }));
  };

  const handleProfilePhotoPick = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setProfileError('');
    try {
      const resized = await resizeProfileImage(file);
      setProfileDraft((prev) => ({ ...prev, profilePicture: resized }));
      setProfileEditing(true);
    } catch (err) {
      setProfileError(err.message || 'Unable to use this profile picture');
    } finally {
      event.target.value = '';
    }
  };

  const handleProfileSave = async () => {
    setProfileSaving(true);
    setProfileError('');
    try {
      const updated = await updateUserProfile(profileDraft);
      const nextProfile = { ...profile, ...updated };
      setProfile(nextProfile);
      setProfileDraft({
        username: nextProfile.username || '',
        email: nextProfile.email || '',
        address: nextProfile.address || '',
        profilePicture: nextProfile.profilePicture || '',
      });
      window.dispatchEvent(new CustomEvent('radar:profile-updated', { detail: nextProfile }));
      setProfileEditing(false);
      showToast('success', 'Profile updated successfully.');
    } catch (err) {
      setProfileError(err?.response?.data?.error || err?.response?.data?.message || err.message || 'Failed to save profile');
      showToast('error', 'Failed to update profile.');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleProfileCancel = () => {
    setProfileDraft({
      username: profile?.username || '',
      email: profile?.email || '',
      address: profile?.address || '',
      profilePicture: profile?.profilePicture || '',
    });
    setProfileEditing(false);
    setProfileError('');
  };

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [savingPassword, setSavingPassword] = useState(false);
  const [loggingOutAll, setLoggingOutAll] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (type, message) => {
    setToast({ type, message });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => () => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
  }, []);

  const handleBack = () => {
    navigate('/trader/dashboard');
  };

  const handlePasswordChange = async (e) => {
    if (e) e.preventDefault();
    setSavingPassword(true);
    try {
      const { currentPassword, newPassword, confirmPassword } = passwordForm;
      if (!currentPassword) {
        showToast('error', 'Please enter your current password.');
        setSavingPassword(false);
        return;
      }
      if (!newPassword || newPassword.length < 8) {
        showToast('error', 'New password must be at least 8 characters.');
        setSavingPassword(false);
        return;
      }
      if (newPassword !== confirmPassword) {
        showToast('error', 'New passwords do not match.');
        setSavingPassword(false);
        return;
      }
      await api.patch('/user/password', { currentPassword, newPassword });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      showToast('success', 'Password updated successfully.');
    } catch (err) {
      showToast('error', err?.response?.data?.error || err?.response?.data?.message || 'Failed to update password.');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleLogoutAll = async () => {
    setLoggingOutAll(true);
    try {
      await api.post('/user/logout-all');
      localStorage.removeItem('token');
      showToast('success', 'Logged out from all devices.');
      setTimeout(() => navigate('/login'), 1200);
    } catch (err) {
      showToast('error', err?.response?.data?.error || 'Logout failed.');
      setLoggingOutAll(false);
    }
  };

  return (
    <div className="settings-page">
      {/* Background Glow */}
      <div className="settings-gradient-bg" />

      {/* Header (Matching Help & Support exactly) */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="settings-header"
      >
        <div className="settings-header-content">
          <div className="settings-header-left">
            {!embedded && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleBack}
                className="settings-back-btn"
              >
                <ArrowLeft size={18} />
                Back to Dashboard
              </motion.button>
            )}
            <h1 className="settings-title">Settings</h1>
            <p className="settings-subtitle">Customize your RADAR trading experience</p>
          </div>
        </div>
      </motion.div>

      {/* Container (Matching Help & Support Container) */}
      <div className="settings-container">
        {/* Profile Settings Card */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.05 }}
          className="profile-hero-card"
          style={{ marginBottom: '2rem' }}
        >
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="profile-file-input"
            onChange={handleProfilePhotoPick}
          />
          <button type="button" className="profile-photo" onClick={() => fileRef.current?.click()} aria-label="Change profile picture">
            {profileDraft.profilePicture || profile?.profilePicture ? (
              <img src={profileDraft.profilePicture || profile.profilePicture} alt="" />
            ) : (
              <span>{initial}</span>
            )}
            <span className="profile-camera"><Camera size={14} /></span>
          </button>

          <div className="profile-main-copy">
            {profileEditing ? (
              <div className="profile-edit-grid">
                <input name="username" value={profileDraft.username} onChange={handleProfileDraftChange} placeholder="Name" />
                <input name="email" value={profileDraft.email} onChange={handleProfileDraftChange} placeholder="Email" />
                <input name="address" value={profileDraft.address} onChange={handleProfileDraftChange} placeholder="Address" />
              </div>
            ) : (
              <>
                <h1>{profile?.username || 'Radar User'}</h1>
                <p>{profile?.email || 'account@radar.com'}</p>
                <p className="profile-address">{profile?.address || 'Address not added yet'}</p>
                <p className="profile-photo-help">Click the photo to add or change your profile picture.</p>
              </>
            )}
            {profileError && <p style={{ color: '#f87171', fontSize: '13px', marginTop: '8px' }}>{profileError}</p>}
          </div>

          <div className="profile-actions">
            <span className="profile-status-badge">Active</span>
            {profileEditing ? (
              <div className="profile-action-row">
                <button type="button" className="profile-secondary-btn" onClick={handleProfileCancel} disabled={profileSaving}>
                  <X size={16} /> Cancel
                </button>
                <button type="button" className="profile-primary-btn" onClick={handleProfileSave} disabled={profileSaving}>
                  <Save size={16} /> {profileSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
            ) : (
              <button type="button" className="profile-primary-btn" onClick={() => setProfileEditing(true)}>
                <Edit2 size={16} /> Edit Profile
              </button>
            )}
          </div>
        </motion.section>

        <form onSubmit={handlePasswordChange}>
          {/* Security & Account Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="settings-card"
          >
            <h3 className="settings-card-title">Security & Account</h3>

            {/* Change Password Section */}
            <div className="settings-sub-section">
              <h4 className="settings-sub-title">Change Password</h4>
              
              <div className="form-group">
                <label className="form-label">Current Password</label>
                <input
                  type="password"
                  placeholder="Enter current password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                  autoComplete="current-password"
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">New Password</label>
                <input
                  type="password"
                  placeholder="Enter new password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                  autoComplete="new-password"
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Confirm Password</label>
                <input
                  type="password"
                  placeholder="Confirm new password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  autoComplete="new-password"
                  className="form-input"
                  required
                />
              </div>
            </div>

            <button type="submit" className="settings-submit-btn" style={{ marginTop: '1.5rem', width: 'fit-content' }} disabled={savingPassword}>
              <Save size={18} />
              {savingPassword ? 'Updating Password...' : 'Update Password'}
            </button>

            <div className="settings-divider" style={{ margin: '2rem 0' }} />

            {/* Session Management */}
            <div className="form-group">
              <label className="form-label" style={{ marginBottom: '0.5rem' }}>Session Management</label>
              <button
                type="button"
                onClick={handleLogoutAll}
                disabled={loggingOutAll}
                className="settings-logout-btn"
                style={{ maxWidth: '320px' }}
              >
                {loggingOutAll ? 'Logging out...' : 'Logout All Devices'}
              </button>
            </div>
          </motion.div>
        </form>
      </div>

      {/* Toast (Matches Help Page Success notification styles) */}
      {toast && (
        <div className={`settings-toast toast-${toast.type}`}>
          {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
