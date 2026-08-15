import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Film, User, Mail, Lock, Loader2, ArrowRight, CheckCircle2, UserCheck, AlertTriangle, Tv, MessageSquare, Sparkles, Zap, Share2 } from 'lucide-react';

type AuthMode = 'login' | 'signup';

export const Auth: React.FC = () => {
  const navigate = useNavigate();
  
  const [mode, setMode] = useState<AuthMode>('login');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Transition success states
  const [authSuccess, setAuthSuccess] = useState(false);
  const [successUser, setSuccessUser] = useState<string>('');

  // Signup fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Login fields
  const [loginIdentifier, setLoginIdentifier] = useState(''); // username or email
  const [loginPassword, setLoginPassword] = useState('');

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const resetForms = () => {
    setFirstName('');
    setLastName('');
    setUsername('');
    setEmail('');
    setPassword('');
    setLoginIdentifier('');
    setLoginPassword('');
    setErrorMsg(null);
  };

  const handleModeSwitch = (newMode: AuthMode) => {
    setMode(newMode);
    resetForms();
  };

  const triggerSuccessTransition = (userObj: any, token: string) => {
    setAuthSuccess(true);
    setSuccessUser(userObj.firstName);
    
    // Store credentials
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userObj));

    // Smooth delay before dashboard navigation
    setTimeout(() => {
      navigate('/', { replace: true });
    }, 2200);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginIdentifier.trim() || !loginPassword) {
      setErrorMsg('Please fill in all fields.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usernameOrEmail: loginIdentifier,
          password: loginPassword
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      triggerSuccessTransition(data.user, data.token);
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred during login.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !username.trim() || !email.trim() || !password) {
      setErrorMsg('Please fill in all required fields.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`${API_URL}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName,
          lastName: lastName.trim() || undefined,
          username: username,
          email,
          password
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Signup failed');
      }

      // Automatically log in after successful signup
      const loginRes = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usernameOrEmail: username,
          password: password
        })
      });
      const loginData = await loginRes.json();
      if (!loginRes.ok) {
        throw new Error(loginData.error || 'Login auto-initialization failed');
      }

      triggerSuccessTransition(loginData.user, loginData.token);
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred during signup.');
    } finally {
      setLoading(false);
    }
  };

  if (authSuccess) {
    return (
      <div className="min-h-screen bg-bg-main text-text-main flex flex-col items-center justify-center p-6 relative overflow-hidden">
        {/* Background ambient glows */}
        <div className="absolute top-1/4 left-1/4 w-80 h-80 rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-accent/10 blur-[120px]" />

        <div className="max-w-md w-full text-center space-y-6 animate-fade-in relative z-10">
          <div className="w-20 h-20 mx-auto rounded-full bg-primary-light border border-primary/20 flex items-center justify-center text-primary relative">
            <CheckCircle2 className="w-10 h-10 animate-pulse" />
            <div className="absolute inset-0 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold tracking-tight text-glow text-primary">
              Welcome, {successUser}!
            </h2>
            <p className="text-xs text-text-muted">
              Syncing screening rooms and watch preferences...
            </p>
          </div>

          <div className="w-full max-w-[240px] mx-auto bg-zinc-800 h-1 rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full animate-[loading-bar_2s_ease-in-out_forwards]" style={{ animation: 'loading-bar 2s ease-in-out forwards' }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-screen overflow-x-hidden overflow-y-auto bg-bg-main text-text-main flex flex-col items-center justify-between p-6 relative select-none">
      {/* Subtle grid background to keep depth, but muted */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f1f23_1px,transparent_1px),linear-gradient(to_bottom,#1f1f23_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none opacity-40" />

      {/* Header bar */}
      <header className="w-full max-w-6xl flex items-center justify-between py-2 relative z-10">
        <div className="flex items-center space-x-2 text-base font-semibold text-text-main">
          <Film className="w-5 h-5 text-primary" />
          <span className="tracking-tight">LumiStream</span>
        </div>
      </header>

      {/* Main hero & auth forms area */}
      <main className="w-full max-w-6xl flex-1 flex flex-col justify-center py-4 relative z-10">
        <div className="w-full flex flex-col lg:flex-row items-start justify-between gap-12 lg:gap-16 py-6">
          {/* Left Column: Hero Text */}
          <div className="flex-1 text-left space-y-4 max-w-xl lg:pt-10">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-white leading-[1.1]">
              Watch videos together. <br />
              Synchronized perfectly.
            </h1>
            <p className="text-sm sm:text-base text-text-muted leading-relaxed">
              Create high-performance synchronized rooms for your video files. Share a link, manage playback as host, and chat with friends in real-time. Zero lag, zero configuration.
            </p>
          </div>

          {/* Right Column: Auth form card */}
          <div className={`w-full max-w-md bg-zinc-900/40 border border-zinc-800/85 rounded-xl p-6 sm:p-8 shadow-xl backdrop-blur-md transition-all duration-500 ease-in-out overflow-hidden ${
            mode === 'login' ? 'max-h-[380px] sm:max-h-[400px]' : 'max-h-[550px] sm:max-h-[575px]'
          }`}>
            {/* Custom Minimal tab headers */}
            <div className="flex border-b border-zinc-800/80 mb-6 pb-0.5 space-x-6">
              <button
                onClick={() => handleModeSwitch('login')}
                className={`pb-2.5 text-xs font-semibold tracking-tight transition-all relative cursor-pointer ${
                  mode === 'login' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Sign In
                {mode === 'login' && (
                  <div className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-primary rounded-full" />
                )}
              </button>
              <button
                onClick={() => handleModeSwitch('signup')}
                className={`pb-2.5 text-xs font-semibold tracking-tight transition-all relative cursor-pointer ${
                  mode === 'signup' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Create Account
                {mode === 'signup' && (
                  <div className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-primary rounded-full" />
                )}
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-lg bg-red-950/20 border border-red-500/25 text-xs text-red-400 font-medium flex items-start space-x-2 mb-4 animate-shake">
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="relative">
              {/* Login Form */}
              <div className={`transition-all duration-500 ease-in-out ${
                mode === 'login' 
                  ? 'opacity-100 translate-y-0' 
                  : 'opacity-0 -translate-y-4 pointer-events-none absolute inset-x-0 top-0'
              }`}>
                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <div className="space-y-1.5 text-left">
                    <label className="text-[11px] font-medium text-zinc-400">Username or Email</label>
                    <input
                      type="text"
                      required
                      placeholder="name@example.com"
                      value={loginIdentifier}
                      onChange={(e) => setLoginIdentifier(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-750 focus:ring-1 focus:ring-zinc-700 rounded-lg px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-1.5 text-left">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-medium text-zinc-400">Password</label>
                    </div>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-750 focus:ring-1 focus:ring-zinc-700 rounded-lg px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 outline-none transition-all"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-2 py-2.5 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold transition-colors flex items-center justify-center space-x-1.5 cursor-pointer disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Signing in...</span>
                      </>
                    ) : (
                      <>
                        <span>Sign In</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Signup Form */}
              <div className={`transition-all duration-500 ease-in-out ${
                mode === 'signup' 
                  ? 'opacity-100 translate-y-0' 
                  : 'opacity-0 translate-y-4 pointer-events-none absolute inset-x-0 top-0'
              }`}>
                <form onSubmit={handleSignupSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5 text-left">
                      <label className="text-[11px] font-medium text-zinc-400">First Name</label>
                      <input
                        type="text"
                        required
                        placeholder="Jane"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-750 focus:ring-1 focus:ring-zinc-700 rounded-lg px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-1.5 text-left">
                      <label className="text-[11px] font-medium text-zinc-400">Last Name <span className="text-[9px] text-zinc-500 font-normal">(Opt)</span></label>
                      <input
                        type="text"
                        placeholder="Doe"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-750 focus:ring-1 focus:ring-zinc-700 rounded-lg px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 text-left">
                    <label className="text-[11px] font-medium text-zinc-400">Username</label>
                    <input
                      type="text"
                      required
                      placeholder="janedoe"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-750 focus:ring-1 focus:ring-zinc-700 rounded-lg px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-1.5 text-left">
                    <label className="text-[11px] font-medium text-zinc-400">Email Address</label>
                    <input
                      type="email"
                      required
                      placeholder="jane@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-750 focus:ring-1 focus:ring-zinc-700 rounded-lg px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-1.5 text-left">
                    <label className="text-[11px] font-medium text-zinc-400">Password</label>
                    <input
                      type="password"
                      required
                      placeholder="Minimum 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-750 focus:ring-1 focus:ring-zinc-700 rounded-lg px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 outline-none transition-all"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-2 py-2.5 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold transition-colors flex items-center justify-center space-x-1.5 cursor-pointer disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Creating account...</span>
                      </>
                    ) : (
                      <>
                        <span>Register Account</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>

          </div>
        </div>

        {/* Feature Grid Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl w-full pt-8 border-t border-zinc-900 mt-8 text-left">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Zap className="w-4 h-4 text-primary" />
              <h3 className="text-xs font-semibold text-zinc-100 uppercase tracking-wider">Zero Drift Sync</h3>
            </div>
            <p className="text-xs text-text-muted leading-relaxed">
              Continuous background time alignment ensuring all viewers match host playback. Drift correction handles lag in under 2 seconds.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Tv className="w-4 h-4 text-primary" />
              <h3 className="text-xs font-semibold text-zinc-100 uppercase tracking-wider">Host Control</h3>
            </div>
            <p className="text-xs text-text-muted leading-relaxed">
              Designated hosts manage video events (play, pause, seek), instantly syncing settings to everyone in the room.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <MessageSquare className="w-4 h-4 text-primary" />
              <h3 className="text-xs font-semibold text-zinc-100 uppercase tracking-wider">Integrated Chat</h3>
            </div>
            <p className="text-xs text-text-muted leading-relaxed">
              Real-time message threads and active participant counts built right next to the screening room with no extra tools needed.
            </p>
          </div>
        </div>
      </main>

      {/* Footer bar */}
      <footer className="w-full max-w-6xl border-t border-zinc-900 py-4 text-center text-[10px] text-text-muted relative z-10">
        <p>&copy; {new Date().getFullYear()} LumiStream. Aesthetic Synchronized Video Streaming.</p>
      </footer>
    </div>
  );
};
