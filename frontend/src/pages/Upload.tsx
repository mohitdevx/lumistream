import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Film, Loader2, CheckCircle2, AlertTriangle, ArrowLeft, XCircle } from 'lucide-react';

export const UploadVideo: React.FC = () => {
  const navigate = useNavigate();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  
  // Upload states
  const [status, setStatus] = useState<'idle' | 'uploading' | 'transcoding' | 'success' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [loadedBytes, setLoadedBytes] = useState(0);
  const [totalBytes, setTotalBytes] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      // Pre-fill title with filename (without extension) if empty
      if (!title) {
        const nameWithoutExt = selectedFile.name.substring(0, selectedFile.name.lastIndexOf('.')) || selectedFile.name;
        setTitle(nameWithoutExt);
      }
    }
  };

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title.trim()) {
      setErrorMsg('Please select a file and enter a title.');
      return;
    }

    setStatus('uploading');
    setProgress(0);
    setLoadedBytes(0);
    setTotalBytes(0);
    setErrorMsg(null);

    const userJson = localStorage.getItem('user');
    const user = userJson ? JSON.parse(userJson) : null;
    const userId = user?.id;

    const formData = new FormData();
    formData.append('video', file);
    formData.append('title', title);
    formData.append('description', description);
    if (userId) {
      formData.append('userId', userId);
    }

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const xhr = new XMLHttpRequest();

    // Track upload progress
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        setLoadedBytes(event.loaded);
        setTotalBytes(event.total);
        const percentCompleted = Math.round((event.loaded * 100) / event.total);
        setProgress(percentCompleted);
        if (percentCompleted === 100) {
          // Once upload reaches 100%, server starts HLS transcoding
          setStatus('transcoding');
        }
      }
    });

    // Handle response
    xhr.onload = () => {
      if (xhr.status === 200 || xhr.status === 201 || xhr.status === 202) {
        setStatus('success');
        setFile(null);
        setTitle('');
        setDescription('');
      } else {
        try {
          const response = JSON.parse(xhr.responseText);
          setErrorMsg(response.error || 'Upload failed');
        } catch {
          setErrorMsg('An error occurred during upload.');
        }
        setStatus('error');
      }
    };

    // Handle network errors
    xhr.onerror = () => {
      setErrorMsg('Network error. Could not connect to the server.');
      setStatus('error');
    };

    xhr.open('POST', `${API_URL}/api/videos`, true);
    xhr.send(formData);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate('/')}
          className="p-2 rounded-lg border border-border-main hover:bg-bg-surface hover:text-primary transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="text-left">
          <h1 className="text-xl font-bold text-text-main">Upload a Video/Movie</h1>
          <p className="text-xs text-text-muted">Upload a video to segment it into HLS streams for synchronized watching.</p>
        </div>
      </div>

      <div className="bg-bg-surface border border-border-main rounded-xl p-6 md:p-8">
        {status === 'idle' ? (
          <form onSubmit={handleUploadSubmit} className="space-y-6 text-left">


            {/* Drag & Drop File Selector */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-text-muted">Select Video File (MP4, MKV, etc.)</label>
              <div className="relative border-2 border-dashed border-border-main hover:border-primary/50 rounded-xl p-8 text-center bg-bg-main/30 hover:bg-bg-main/50 transition-all flex flex-col items-center justify-center cursor-pointer group">
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <div className="p-4 rounded-full bg-border-main/50 text-text-muted group-hover:text-primary group-hover:bg-primary-light transition-all mb-4">
                  <Upload className="w-8 h-8" />
                </div>
                {file ? (
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-text-main">{file.name}</p>
                    <p className="text-xs text-text-muted">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-text-main">Drag and drop your file here</p>
                    <p className="text-xs text-text-muted">or click to browse from your computer</p>
                  </div>
                )}
              </div>
            </div>

            {/* Video Title */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-muted">Video Title</label>
              <input
                type="text"
                placeholder="Enter movie or show title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-bg-main border border-border-main focus:border-primary rounded-lg px-4 py-2.5 text-xs text-text-main placeholder-text-muted outline-none transition-colors"
                required
              />
            </div>

            {/* Video Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-muted">Description (Optional)</label>
              <textarea
                placeholder="Enter description, tags, cast, or release details..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-bg-main border border-border-main focus:border-primary rounded-lg px-4 py-2.5 text-xs text-text-main placeholder-text-muted outline-none resize-none h-24 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={!file}
              className="w-full py-3 rounded-lg bg-primary hover:bg-primary-hover disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed text-bg-main text-xs font-bold transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-lg shadow-primary/10"
            >
              <Film className="w-4 h-4" />
              <span>Upload and Transcode</span>
            </button>
          </form>
        ) : (
          <div className="py-8 px-4 flex flex-col items-center justify-center text-center space-y-6 animate-fade-in">
            {/* Header Icon */}
            {status === 'uploading' && (
              <div className="w-16 h-16 rounded-full bg-primary-light flex items-center justify-center text-primary relative">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            )}
            
            {status === 'transcoding' && (
              <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center text-accent animate-pulse relative">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            )}

            {status === 'success' && (
              <div className="w-16 h-16 rounded-full bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-8 h-8" />
              </div>
            )}

            {status === 'error' && (
              <div className="w-16 h-16 rounded-full bg-red-950/40 border border-red-500/30 flex items-center justify-center text-red-400">
                <XCircle className="w-8 h-8" />
              </div>
            )}

            {/* Title & Description */}
            <div className="space-y-2 max-w-md">
              <h3 className="text-lg font-bold text-text-main">
                {status === 'uploading' && 'Uploading Video File'}
                {status === 'transcoding' && 'Transcoding HLS Stream'}
                {status === 'success' && 'Upload & Transcoding Success'}
                {status === 'error' && 'Upload Failed'}
              </h3>
              
              <p className="text-xs text-text-muted">
                {status === 'uploading' && `Sending "${file?.name || 'video'}" to the server. Please keep this tab open.`}
                {status === 'transcoding' && 'Video file successfully uploaded! The server is now generating the adaptive HLS streams (1080p, 720p, 480p) and extracting thumbnails.'}
                {status === 'success' && 'Your video has been uploaded and registered successfully. It is ready for screening!'}
                {status === 'error' && (errorMsg || 'An error occurred during the video upload process.')}
              </p>
            </div>

            {/* Progress Bar Container */}
            <div className="w-full max-w-md bg-bg-main border border-border-main rounded-xl p-4 space-y-3 text-left">
              <div className="flex justify-between text-xs font-semibold">
                <span className={
                  status === 'success' ? 'text-emerald-400' :
                  status === 'error' ? 'text-red-400' :
                  status === 'transcoding' ? 'text-accent' : 'text-primary'
                }>
                  {status === 'uploading' && `Uploading... ${progress}%`}
                  {status === 'transcoding' && `Transcoding... 100%`}
                  {status === 'success' && 'Complete'}
                  {status === 'error' && 'Failed'}
                </span>
                <span className="text-text-muted">
                  {status === 'uploading' && totalBytes > 0 && `${formatBytes(loadedBytes)} of ${formatBytes(totalBytes)}`}
                  {(status === 'transcoding' || status === 'success') && totalBytes > 0 && `${formatBytes(totalBytes)} of ${formatBytes(totalBytes)}`}
                  {status === 'error' && totalBytes > 0 && `${formatBytes(loadedBytes)} of ${formatBytes(totalBytes)}`}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-zinc-800 h-2.5 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-300 rounded-full ${
                    status === 'success' ? 'bg-emerald-500' :
                    status === 'error' ? 'bg-red-500' :
                    status === 'transcoding' ? 'bg-accent animate-pulse' : 'bg-primary'
                  }`} 
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-center space-x-3 mt-4">
              {status === 'error' && (
                <button
                  onClick={() => setStatus('idle')}
                  className="px-5 py-2.5 rounded-lg bg-primary hover:bg-primary-hover text-bg-main text-xs font-bold transition-all cursor-pointer"
                >
                  Try Again
                </button>
              )}
              {status === 'success' && (
                <button
                  onClick={() => setStatus('idle')}
                  className="px-5 py-2.5 rounded-lg border border-border-main hover:bg-bg-card text-text-main text-xs font-semibold transition-all cursor-pointer"
                >
                  Upload Another
                </button>
              )}
              <button
                onClick={() => navigate('/')}
                className={`px-5 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  status === 'error' 
                    ? 'border border-border-main hover:bg-bg-card text-text-main' 
                    : status === 'success'
                    ? 'bg-primary text-bg-main font-bold hover:bg-primary-hover'
                    : 'bg-border-main hover:bg-border-active text-text-main'
                }`}
              >
                Return to Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
