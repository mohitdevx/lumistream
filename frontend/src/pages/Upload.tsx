import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Film, Loader2, CheckCircle2, AlertTriangle, ArrowLeft } from 'lucide-react';

export const UploadVideo: React.FC = () => {
  const navigate = useNavigate();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  
  // Upload states
  const [status, setStatus] = useState<'idle' | 'uploading' | 'transcoding' | 'success' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
    setErrorMsg(null);

    const formData = new FormData();
    formData.append('video', file);
    formData.append('title', title);
    formData.append('description', description);

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const xhr = new XMLHttpRequest();

    // Track upload progress
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
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
        {status === 'idle' || status === 'error' ? (
          <form onSubmit={handleUploadSubmit} className="space-y-6 text-left">
            {status === 'error' && (
              <div className="p-4 rounded-lg bg-red-950/40 border border-red-500/30 text-xs text-red-400 font-medium flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

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
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-6 animate-fade-in">
            {status === 'uploading' && (
              <>
                <div className="w-16 h-16 rounded-full bg-primary-light flex items-center justify-center text-primary relative">
                  <Loader2 className="w-8 h-8 animate-spin" />
                  <span className="absolute text-[10px] font-bold">{progress}%</span>
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-text-main">Uploading Video File</h3>
                  <p className="text-xs text-text-muted max-w-sm">
                    Sending video to the server. Please do not close this window or navigate away.
                  </p>
                </div>
                <div className="w-full max-w-sm bg-zinc-800 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-primary h-full transition-all duration-300 rounded-full" 
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </>
            )}

            {status === 'transcoding' && (
              <>
                <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center text-accent animate-pulse">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-text-main">Transcoding into HLS</h3>
                  <p className="text-xs text-text-muted max-w-sm">
                    File uploaded successfully! The server is currently converting it to adaptive HLS streams (1080p, 720p, 480p) and extracting thumbnail.
                  </p>
                </div>
                <div className="p-3 bg-bg-main/50 border border-border-main/50 rounded-lg text-left text-xs max-w-sm space-y-1">
                  <p className="font-semibold text-primary">&#10003; Upload Complete</p>
                  <p className="text-text-muted">HLS stream conversion in progress...</p>
                  <p className="text-[10px] text-accent mt-2">You can safely leave this page now. The conversion will run in the background, and the video will appear in the library when complete.</p>
                </div>
                <button
                  onClick={() => navigate('/')}
                  className="px-6 py-2.5 rounded-lg bg-border-main hover:bg-border-active text-text-main text-xs font-semibold transition-all cursor-pointer"
                >
                  Return to Dashboard
                </button>
              </>
            )}

            {status === 'success' && (
              <>
                <div className="w-16 h-16 rounded-full bg-primary-light flex items-center justify-center text-primary">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-text-main">Upload & Processing Initialized</h3>
                  <p className="text-xs text-text-muted max-w-sm">
                    Your video is being processed into adaptive bitrates. It will appear on your watch lists shortly.
                  </p>
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setStatus('idle')}
                    className="px-5 py-2.5 rounded-lg border border-border-main hover:bg-bg-card text-text-main text-xs font-semibold transition-all cursor-pointer"
                  >
                    Upload Another
                  </button>
                  <button
                    onClick={() => navigate('/')}
                    className="px-5 py-2.5 rounded-lg bg-primary hover:bg-primary-hover text-bg-main text-xs font-bold transition-all cursor-pointer"
                  >
                    Go to Dashboard
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
