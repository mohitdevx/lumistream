import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, Mail, Globe, Github, Twitter, Facebook, Instagram, 
  Lock, ArrowLeft, Save 
} from 'lucide-react';
import { useUI } from '../context/UIContext';

type ProfileTab = 'details' | 'security';

export const Profile: React.FC = () => {
  const navigate = useNavigate();
  const { showLoader, hideLoader, showToast } = useUI();
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ProfileTab>('details');

  // Profile fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [bio, setBio] = useState('');
  const [facebook, setFacebook] = useState('');
  const [twitter, setTwitter] = useState('');
  const [github, setGithub] = useState('');
  const [instagram, setInstagram] = useState('');
  const [website, setWebsite] = useState('');

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const userJson = localStorage.getItem('user');
  const loggedInUser = userJson ? JSON.parse(userJson) : null;
  const userId = loggedInUser?.id;

  useEffect(() => {
    if (!userId) {
      navigate('/auth');
      return;
    }

    const fetchUserProfile = async () => {
      try {
        showLoader('Loading profile data...');
        const res = await fetch(`${API_URL}/api/users/${userId}`);
        const data = await res.json();
        
        if (!res.ok) {
          throw new Error(data.error || 'Failed to load profile');
        }

        const u = data.user;
        setFirstName(u.firstName || '');
        setLastName(u.lastName || '');
        setUsername(u.username || '');
        setEmail(u.email || '');
        setBio(u.bio || '');
        setFacebook(u.facebook || '');
        setTwitter(u.twitter || '');
        setGithub(u.github || '');
        setInstagram(u.instagram || '');
        setWebsite(u.website || '');
      } catch (err: any) {
        showToast(err.message || 'Error loading profile data', 'error');
      } finally {
        hideLoader();
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [userId, navigate, API_URL, showLoader, hideLoader, showToast]);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim()) {
      showToast('First name is required.', 'error');
      return;
    }

    showLoader('Saving profile settings...');

    try {
      const res = await fetch(`${API_URL}/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName,
          lastName,
          bio,
          facebook,
          twitter,
          github,
          instagram,
          website
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update profile');
      }

      showToast('Profile settings updated successfully!', 'success');
      
      // Update local storage user details
      const currentStored = localStorage.getItem('user');
      if (currentStored) {
        const parsed = JSON.parse(currentStored);
        const updatedUser = { ...parsed, ...data.user };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        
        // Dispatch custom storage event to update layout header initials
        window.dispatchEvent(new Event('storage'));
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to save changes.', 'error');
    } finally {
      hideLoader();
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      showToast('All password fields are required.', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast('New passwords do not match.', 'error');
      return;
    }

    if (newPassword.length < 6) {
      showToast('New password must be at least 6 characters long.', 'error');
      return;
    }

    showLoader('Updating security password...');

    try {
      const res = await fetch(`${API_URL}/api/users/${userId}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update password');
      }

      showToast('Password changed successfully!', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      showToast(err.message || 'Failed to update password.', 'error');
    } finally {
      hideLoader();
    }
  };

  const renderSocialBadge = (platform: string, url: string, IconComponent: any, colorClass: string) => {
    if (!url.trim()) return null;
    return (
      <a
        href={url.startsWith('http') ? url : `https://${url}`}
        target="_blank"
        rel="noopener noreferrer"
        className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-[10px] font-bold border ${colorClass} hover:scale-105 hover:opacity-90 transition-all`}
      >
        <IconComponent className="w-3 h-3" />
        <span className="capitalize">{platform}</span>
      </a>
    );
  };

  if (loading) {
    return null; // The global loader is active, so we render a clean empty background
  }

  const nameInitials = `${firstName ? firstName[0] : 'W'}${lastName ? lastName[0] : ''}`.toUpperCase();

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-16 relative">
      {/* Background ambient glows */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-accent/5 blur-[120px] pointer-events-none" />

      {/* Header back link */}
      <div className="flex items-center space-x-3 text-left z-10 relative">
        <button
          onClick={() => navigate('/')}
          className="p-2 rounded-lg border border-border-main hover:bg-bg-surface hover:text-primary transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-lg font-black text-text-main tracking-tight">Account Settings</h1>
          <p className="text-xs text-text-muted">Configure profile cards and passwords.</p>
        </div>
      </div>

      {/* Equal Heights columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch z-10 relative">
        
        {/* Left Side: Avatar Preview Card */}
        <div className="md:col-span-1">
          <div className="bg-bg-surface/50 border border-border-main/60 backdrop-blur-md rounded-2xl p-6 text-center shadow-xl flex flex-col justify-between h-full space-y-6">
            
            {/* Top avatar section */}
            <div className="space-y-4">
              <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-tr from-primary to-accent flex items-center justify-center font-bold text-bg-main text-2xl shadow-lg border-2 border-border-main/50">
                {nameInitials}
              </div>
              
              <div className="space-y-1">
                <h2 className="text-sm font-bold text-text-main">
                  {firstName} {lastName}
                </h2>
                <p className="text-xs text-primary font-semibold">@{username}</p>
                <div className="flex items-center justify-center space-x-1.5 text-[10px] text-text-muted mt-1">
                  <Mail className="w-3 h-3" />
                  <span>{email}</span>
                </div>
              </div>
            </div>

            {/* Middle bio section */}
            <div className="flex-1 flex flex-col justify-center">
              {bio.trim() ? (
                <div className="p-3.5 rounded-xl bg-bg-main/30 border border-border-main/50 text-left">
                  <p className="text-[11px] text-text-muted leading-relaxed italic">
                    "{bio}"
                  </p>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-bg-main/10 border border-dashed border-border-main/40 text-center">
                  <p className="text-[10px] text-text-muted/60">No bio set. Introduce yourself in settings.</p>
                </div>
              )}
            </div>

            {/* Bottom social badge section */}
            <div className="border-t border-border-main/40 pt-4 text-left">
              <h3 className="text-[9px] font-bold uppercase tracking-wider text-text-muted mb-2.5">Connections</h3>
              
              {github.trim() || twitter.trim() || facebook.trim() || instagram.trim() || website.trim() ? (
                <div className="flex flex-wrap gap-1.5">
                  {renderSocialBadge('github', github, Github, 'bg-zinc-900 border-zinc-700/60 text-zinc-300')}
                  {renderSocialBadge('twitter', twitter, Twitter, 'bg-sky-950/20 border-sky-500/20 text-sky-400')}
                  {renderSocialBadge('facebook', facebook, Facebook, 'bg-blue-950/20 border-blue-500/20 text-blue-400')}
                  {renderSocialBadge('instagram', instagram, Instagram, 'bg-pink-950/20 border-pink-500/20 text-pink-400')}
                  {renderSocialBadge('website', website, Globe, 'bg-emerald-950/20 border-emerald-500/20 text-emerald-400')}
                </div>
              ) : (
                <p className="text-[10px] text-text-muted/50 italic">No social profiles linked.</p>
              )}
            </div>

          </div>
        </div>

        {/* Right Side: Tabbed Forms Card */}
        <div className="md:col-span-2">
          {/* Constrain minimum height strictly to 580px to block left avatar vertical bounces */}
          <div className="bg-bg-surface/50 border border-border-main/60 backdrop-blur-md rounded-2xl p-6 md:p-8 shadow-xl flex flex-col justify-between h-full min-h-[580px] space-y-6">
            
            {/* Header Tabs */}
            <div className="flex bg-bg-main p-1 rounded-xl border border-border-main/40">
              <button
                onClick={() => setActiveTab('details')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                  activeTab === 'details'
                    ? 'bg-bg-surface text-primary shadow-sm border border-border-main/30'
                    : 'text-text-muted hover:text-text-main'
                }`}
              >
                <User className="w-4 h-4" />
                <span>Profile Settings</span>
              </button>
              <button
                onClick={() => setActiveTab('security')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                  activeTab === 'security'
                    ? 'bg-bg-surface text-primary shadow-sm border border-border-main/30'
                    : 'text-text-muted hover:text-text-main'
                }`}
              >
                <Lock className="w-4 h-4" />
                <span>Password & Security</span>
              </button>
            </div>

            {/* Form Panels */}
            <div className="flex-1 flex flex-col justify-start">
              {activeTab === 'details' ? (
                /* Tab 1: Profile Details Form */
                <form onSubmit={handleProfileSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-left">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-text-muted">First Name</label>
                      <input
                        type="text"
                        required
                        placeholder="First Name"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="w-full bg-bg-main border border-border-main/80 focus:border-primary rounded-xl px-4 py-2.5 text-xs text-text-main outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-text-muted">Last Name</label>
                      <input
                        type="text"
                        placeholder="Last Name"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="w-full bg-bg-main border border-border-main/80 focus:border-primary rounded-xl px-4 py-2.5 text-xs text-text-main outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 text-left">
                    <label className="text-xs font-bold text-text-muted">Public Bio</label>
                    <textarea
                      placeholder="Share a short bio with other watchers..."
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      rows={2}
                      maxLength={100}
                      className="w-full bg-bg-main border border-border-main/80 focus:border-primary rounded-xl px-4 py-2.5 text-xs text-text-main placeholder-text-muted outline-none transition-all resize-none"
                    />
                  </div>

                  <div className="border-t border-border-main/40 pt-4 space-y-4 text-left">
                    <h3 className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Social Channels</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-text-muted flex items-center space-x-1.5">
                          <Github className="w-3 h-3" />
                          <span>GitHub Profile</span>
                        </label>
                        <input
                          type="text"
                          placeholder="github.com/username"
                          value={github}
                          onChange={(e) => setGithub(e.target.value)}
                          className="w-full bg-bg-main border border-border-main/80 focus:border-primary rounded-xl px-3.5 py-2 text-xs text-text-main outline-none transition-all"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-text-muted flex items-center space-x-1.5">
                          <Twitter className="w-3 h-3" />
                          <span>Twitter (X)</span>
                        </label>
                        <input
                          type="text"
                          placeholder="twitter.com/username"
                          value={twitter}
                          onChange={(e) => setTwitter(e.target.value)}
                          className="w-full bg-bg-main border border-border-main/80 focus:border-primary rounded-xl px-3.5 py-2 text-xs text-text-main outline-none transition-all"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-text-muted flex items-center space-x-1.5">
                          <Facebook className="w-3 h-3" />
                          <span>Facebook Profile</span>
                        </label>
                        <input
                          type="text"
                          placeholder="facebook.com/username"
                          value={facebook}
                          onChange={(e) => setFacebook(e.target.value)}
                          className="w-full bg-bg-main border border-border-main/80 focus:border-primary rounded-xl px-3.5 py-2 text-xs text-text-main outline-none transition-all"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-text-muted flex items-center space-x-1.5">
                          <Instagram className="w-3 h-3" />
                          <span>Instagram URL</span>
                        </label>
                        <input
                          type="text"
                          placeholder="instagram.com/username"
                          value={instagram}
                          onChange={(e) => setInstagram(e.target.value)}
                          className="w-full bg-bg-main border border-border-main/80 focus:border-primary rounded-xl px-3.5 py-2 text-xs text-text-main outline-none transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-text-muted flex items-center space-x-1.5">
                        <Globe className="w-3 h-3" />
                        <span>Website Address</span>
                      </label>
                      <input
                        type="text"
                        placeholder="https://mywebsite.com"
                        value={website}
                        onChange={(e) => setWebsite(e.target.value)}
                        className="w-full bg-bg-main border border-border-main/80 focus:border-primary rounded-xl px-3.5 py-2 text-xs text-text-main outline-none transition-all"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-bg-main text-xs font-bold transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-lg shadow-primary/10"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save Profile Settings</span>
                  </button>
                </form>
              ) : (
                /* Tab 2: Security Password Form */
                <form onSubmit={handlePasswordSubmit} className="space-y-4 text-left">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-text-muted">Current Password</label>
                    <input
                      type="password"
                      required
                      placeholder="Enter current password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full bg-bg-main border border-border-main/80 focus:border-primary rounded-xl px-4 py-2.5 text-xs text-text-main outline-none transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-text-muted">New Password</label>
                      <input
                        type="password"
                        required
                        placeholder="Min 6 characters"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full bg-bg-main border border-border-main/80 focus:border-primary rounded-xl px-4 py-2.5 text-xs text-text-main outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-text-muted">Confirm New Password</label>
                      <input
                        type="password"
                        required
                        placeholder="Repeat new password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full bg-bg-main border border-border-main/80 focus:border-primary rounded-xl px-4 py-2.5 text-xs text-text-main outline-none transition-all"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full mt-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-bg-main text-xs font-bold transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-lg shadow-primary/10"
                  >
                    <Lock className="w-4 h-4" />
                    <span>Update Security Password</span>
                  </button>
                </form>
              )}
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
