import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, Mail, Globe, Github, Twitter, Facebook, Instagram, 
  Lock, ArrowLeft, Save, ZoomIn
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
  
  // Avatar state
  const [avatar, setAvatar] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // Avatar editor modal state
  const [editorImage, setEditorImage] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showEditor, setShowEditor] = useState(false);

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const userJson = localStorage.getItem('user');
  let loggedInUser: any = null;
  try {
    loggedInUser = userJson ? JSON.parse(userJson) : null;
  } catch (e) {
    console.error('Failed to parse user storage:', e);
  }
  const userId = loggedInUser?.id;

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showToast('Image size cannot exceed 5MB.', 'error');
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setEditorImage(base64String);
        setZoom(1);
        setOffset({ x: 0, y: 0 });
        setShowEditor(true);
      };
      reader.readAsDataURL(file);
    }
  };

  // Drag and drop handlers inside the avatar circular viewport
  const handleDragStart = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleDragMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      const touch = e.touches[0];
      setDragStart({ x: touch.clientX - offset.x, y: touch.clientY - offset.y });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    const touch = e.touches[0];
    setOffset({ x: touch.clientX - dragStart.x, y: touch.clientY - dragStart.y });
  };

  // Draw, scale, and crop the image onto a canvas for base64 output
  const applyAvatarCrop = () => {
    if (!editorImage) return;

    const img = new Image();
    img.src = editorImage;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const size = 300; // Output canvas resolution
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        // Flat background color - no gradient
        ctx.fillStyle = '#09090b';
        ctx.fillRect(0, 0, size, size);

        const imgWidth = img.width;
        const imgHeight = img.height;
        
        const scaleCover = Math.max(size / imgWidth, size / imgHeight);
        const baseWidth = imgWidth * scaleCover;
        const baseHeight = imgHeight * scaleCover;

        const finalWidth = baseWidth * zoom;
        const finalHeight = baseHeight * zoom;

        // Viewport size matches CSS rounded viewport (w-48 = 192px)
        const viewportSize = 192;
        const offsetScale = size / viewportSize;
        const panX = offset.x * offsetScale;
        const panY = offset.y * offsetScale;

        const x = (size - finalWidth) / 2 + panX;
        const y = (size - finalHeight) / 2 + panY;

        ctx.drawImage(img, x, y, finalWidth, finalHeight);

        const croppedBase64 = canvas.toDataURL('image/jpeg', 0.9);
        setAvatar(croppedBase64);
        setAvatarPreview(croppedBase64);
        setShowEditor(false);
      }
    };
  };

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
        setAvatar(u.avatarUrl || null);
        setAvatarPreview(u.avatarUrl || null);
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
          website,
          avatar // Base64 payload or current Cloudinary URL
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

  const renderSocialBadge = (platform: string, url: string, IconComponent: any, borderClass: string) => {
    if (!url.trim()) return null;
    return (
      <a
        href={url.startsWith('http') ? url : `https://${url}`}
        target="_blank"
        rel="noopener noreferrer"
        className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-full text-[10px] font-semibold border ${borderClass} hover:bg-zinc-800 hover:text-white transition-all`}
      >
        <IconComponent className="w-3 h-3" />
        <span className="capitalize">{platform}</span>
      </a>
    );
  };

  if (loading) {
    return null; 
  }

  const nameInitials = `${firstName ? firstName[0] : 'W'}${lastName ? lastName[0] : ''}`.toUpperCase();

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-16 relative text-left">
      {/* Header back link */}
      <div className="flex items-center space-x-3 text-left relative z-10">
        <button
          onClick={() => navigate('/')}
          className="p-2 rounded-lg border border-zinc-800 hover:bg-zinc-900 hover:text-white transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-lg font-semibold text-white tracking-tight">Account Settings</h1>
          <p className="text-xs text-zinc-400">Configure profile cards and passwords.</p>
        </div>
      </div>

      {/* Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch relative z-10">
        
        {/* Left Side: Avatar Preview Card */}
        <div className="md:col-span-1">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center shadow-xl flex flex-col justify-between h-full space-y-6">
            
            {/* Top avatar section */}
            <div className="space-y-4">
              <div className="relative group mx-auto w-20 h-20 select-none">
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt={`${firstName} ${lastName}`}
                    className="w-20 h-20 rounded-full object-cover border border-zinc-800 shadow-md"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-semibold text-zinc-300 text-2xl shadow-md">
                    {nameInitials}
                  </div>
                )}
                
                {/* Upload overlay */}
                <label className="absolute inset-0 bg-black/60 rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white text-[9px] font-bold">
                  <span>Change</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </label>
              </div>
              
              <div className="space-y-1">
                <h2 className="text-sm font-semibold text-white">
                  {firstName} {lastName}
                </h2>
                <p className="text-xs text-zinc-450 font-medium">@{username}</p>
                <div className="flex items-center justify-center space-x-1.5 text-[10px] text-zinc-400 mt-1">
                  <Mail className="w-3 h-3" />
                  <span>{email}</span>
                </div>
              </div>
            </div>

            {/* Middle bio section */}
            <div className="flex-1 flex flex-col justify-center">
              {bio.trim() ? (
                <div className="p-3.5 rounded-lg bg-zinc-950 border border-zinc-800 text-left">
                  <p className="text-[11px] text-zinc-400 leading-relaxed italic">
                    "{bio}"
                  </p>
                </div>
              ) : (
                <div className="p-3.5 rounded-lg bg-zinc-950/20 border border-dashed border-zinc-850 text-center">
                  <p className="text-[10px] text-zinc-500">No bio set. Introduce yourself in settings.</p>
                </div>
              )}
            </div>

            {/* Bottom social badge section */}
            <div className="border-t border-zinc-800 pt-4 text-left">
              <h3 className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 mb-2.5">Connections</h3>
              
              {github.trim() || twitter.trim() || facebook.trim() || instagram.trim() || website.trim() ? (
                <div className="flex flex-wrap gap-1.5">
                  {renderSocialBadge('github', github, Github, 'border-zinc-800 text-zinc-300')}
                  {renderSocialBadge('twitter', twitter, Twitter, 'border-zinc-800 text-zinc-400')}
                  {renderSocialBadge('facebook', facebook, Facebook, 'border-zinc-800 text-zinc-400')}
                  {renderSocialBadge('instagram', instagram, Instagram, 'border-zinc-800 text-zinc-400')}
                  {renderSocialBadge('website', website, Globe, 'border-zinc-800 text-zinc-400')}
                </div>
              ) : (
                <p className="text-[10px] text-zinc-650 italic">No social profiles linked.</p>
              )}
            </div>

          </div>
        </div>

        {/* Right Side: Tabbed Forms Card */}
        <div className="md:col-span-2">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 md:p-8 shadow-xl flex flex-col justify-between h-full min-h-[520px] space-y-6">
            
            {/* Header Tabs */}
            <div className="flex bg-zinc-950 p-1 rounded-lg border border-zinc-800">
              <button
                onClick={() => setActiveTab('details')}
                className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                  activeTab === 'details'
                    ? 'bg-zinc-900 text-white border border-zinc-800'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <User className="w-4 h-4" />
                <span>Profile Settings</span>
              </button>
              <button
                onClick={() => setActiveTab('security')}
                className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                  activeTab === 'security'
                    ? 'bg-zinc-900 text-white border border-zinc-800'
                    : 'text-zinc-500 hover:text-zinc-300'
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
                      <label className="text-xs font-medium text-zinc-400">First Name</label>
                      <input
                        type="text"
                        required
                        placeholder="First Name"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700 rounded-lg px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-zinc-400">Last Name</label>
                      <input
                        type="text"
                        placeholder="Last Name"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-750 focus:ring-1 focus:ring-zinc-700 rounded-lg px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 text-left">
                    <label className="text-xs font-medium text-zinc-400">Public Bio</label>
                    <textarea
                      placeholder="Share a short bio with other watchers..."
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      rows={2}
                      maxLength={100}
                      className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700 rounded-lg px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 outline-none transition-all resize-none"
                    />
                  </div>

                  <div className="border-t border-zinc-850 pt-4 space-y-4 text-left">
                    <h3 className="text-[11px] font-bold text-zinc-450 uppercase tracking-wider">Social Channels</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-zinc-400 flex items-center space-x-1.5">
                          <Github className="w-3 h-3" />
                          <span>GitHub Profile</span>
                        </label>
                        <input
                          type="text"
                          placeholder="github.com/username"
                          value={github}
                          onChange={(e) => setGithub(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-750 focus:ring-1 focus:ring-zinc-700 rounded-lg px-3.5 py-2 text-xs text-white placeholder-zinc-650 outline-none transition-all"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-zinc-400 flex items-center space-x-1.5">
                          <Twitter className="w-3 h-3" />
                          <span>Twitter (X)</span>
                        </label>
                        <input
                          type="text"
                          placeholder="twitter.com/username"
                          value={twitter}
                          onChange={(e) => setTwitter(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-750 focus:ring-1 focus:ring-zinc-700 rounded-lg px-3.5 py-2 text-xs text-white placeholder-zinc-650 outline-none transition-all"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-zinc-400 flex items-center space-x-1.5">
                          <Facebook className="w-3 h-3" />
                          <span>Facebook Profile</span>
                        </label>
                        <input
                          type="text"
                          placeholder="facebook.com/username"
                          value={facebook}
                          onChange={(e) => setFacebook(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-750 focus:ring-1 focus:ring-zinc-700 rounded-lg px-3.5 py-2 text-xs text-white placeholder-zinc-650 outline-none transition-all"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-zinc-400 flex items-center space-x-1.5">
                          <Instagram className="w-3 h-3" />
                          <span>Instagram URL</span>
                        </label>
                        <input
                          type="text"
                          placeholder="instagram.com/username"
                          value={instagram}
                          onChange={(e) => setInstagram(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-750 focus:ring-1 focus:ring-zinc-700 rounded-lg px-3.5 py-2 text-xs text-white placeholder-zinc-650 outline-none transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-zinc-400 flex items-center space-x-1.5">
                        <Globe className="w-3 h-3" />
                        <span>Website Address</span>
                      </label>
                      <input
                        type="text"
                        placeholder="https://mywebsite.com"
                        value={website}
                        onChange={(e) => setWebsite(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-750 focus:ring-1 focus:ring-zinc-700 rounded-lg px-3.5 py-2 text-xs text-white placeholder-zinc-650 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full mt-2 py-2.5 rounded-lg bg-primary hover:bg-primary-hover text-black text-xs font-semibold transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Profile Settings</span>
                  </button>
                </form>
              ) : (
                /* Tab 2: Security Password Form */
                <form onSubmit={handlePasswordSubmit} className="space-y-4 text-left">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-400">Current Password</label>
                    <input
                      type="password"
                      required
                      placeholder="Enter current password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700 rounded-lg px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 outline-none transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-zinc-400">New Password</label>
                      <input
                        type="password"
                        required
                        placeholder="Min 6 characters"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700 rounded-lg px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-zinc-400">Confirm New Password</label>
                      <input
                        type="password"
                        required
                        placeholder="Repeat new password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-750 focus:ring-1 focus:ring-zinc-700 rounded-lg px-3.5 py-2.5 text-xs text-white placeholder-zinc-650 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full mt-4 py-2.5 rounded-lg bg-primary hover:bg-primary-hover text-black text-xs font-semibold transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Update Security Password</span>
                  </button>
                </form>
              )}
            </div>

          </div>
        </div>

      </div>

      {/* Monochromatic Avatar Editor Modal with Magnifier and Mouse/Touch Panning */}
      {showEditor && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-md w-full p-6 space-y-6 shadow-2xl animate-scale-up">
            <div className="text-left space-y-1">
              <h3 className="text-sm font-semibold text-white">Adjust Avatar View</h3>
              <p className="text-xs text-zinc-400">Drag to center and use the magnifier slider to fit.</p>
            </div>

            {/* Circular Panning Window */}
            <div className="flex justify-center">
              <div 
                className="w-48 h-48 rounded-full overflow-hidden border border-zinc-800 relative cursor-grab active:cursor-grabbing bg-zinc-950 select-none"
                onMouseDown={handleDragStart}
                onMouseMove={handleDragMove}
                onMouseUp={handleDragEnd}
                onMouseLeave={handleDragEnd}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleDragEnd}
              >
                {editorImage && (
                  <img
                    src={editorImage}
                    alt="Original Upload preview"
                    draggable={false}
                    className="absolute max-w-none origin-center pointer-events-none"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                      transition: isDragging ? 'none' : 'transform 0.1s ease-out'
                    }}
                  />
                )}
                {/* Visual alignment grid help */}
                <div className="absolute inset-0 rounded-full border border-white/10 pointer-events-none" />
              </div>
            </div>

            {/* Magnifier zoom scale bar */}
            <div className="space-y-2 text-left">
              <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-400">
                <span className="flex items-center space-x-1">
                  <ZoomIn className="w-3.5 h-3.5 text-zinc-450" />
                  <span>Magnify Level</span>
                </span>
                <span>{zoom.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="1.0"
                max="3.0"
                step="0.05"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-white"
              />
            </div>

            {/* Modal actions */}
            <div className="flex space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowEditor(false)}
                className="flex-1 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={applyAvatarCrop}
                className="flex-1 py-2 rounded-lg bg-primary hover:bg-primary-hover text-black text-xs font-semibold transition-colors cursor-pointer"
              >
                Apply Crop
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
