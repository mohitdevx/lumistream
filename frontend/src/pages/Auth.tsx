import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Film, User, Mail, Lock, Loader2, ArrowRight, CheckCircle2, UserCheck, AlertTriangle } from 'lucide-react';

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
    <div className="min-h-screen bg-bg-main text-text-main flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background ambient glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-accent/5 blur-[120px] pointer-events-none" />

      {/* Auth Box Container */}
      <div className="max-w-md w-full space-y-6 relative z-10 animate-fade-in">
        {/* Logo Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center space-x-2 text-2xl font-black tracking-tight text-glow text-primary">
            <Film className="w-7 h-7 text-primary" />
            <span>LumiStream</span>
          </div>
          <p className="text-xs text-text-muted">
            Aesthetic Synchronized Cinema for Friends
          </p>
        </div>

        {/* Card Body */}
        <div className="bg-bg-surface border border-border-main rounded-2xl p-6 md:p-8 shadow-2xl relative">
          {/* Tabs */}
          <div className="flex bg-bg-main p-1 rounded-xl border border-border-main/50 mb-6">
            <button
              onClick={() => handleModeSwitch('login')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                mode === 'login'
                  ? 'bg-bg-surface text-primary shadow-sm border border-border-main/30'
                  : 'text-text-muted hover:text-text-main'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => handleModeSwitch('signup')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                mode === 'signup'
                  ? 'bg-bg-surface text-primary shadow-sm border border-border-main/30'
                  : 'text-text-muted hover:text-text-main'
              }`}
            >
              Register
            </button>
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-950/30 border border-red-500/20 text-xs text-red-400 font-medium flex items-start space-x-2.5 mb-5 animate-shake">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {mode === 'login' ? (
            /* Login Form */
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="space-y-1.5 text-left">
                <label className="text-xs font-bold text-text-muted">Username or Email</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-text-muted">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="Enter your username or email"
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    className="w-full bg-bg-main border border-border-main focus:border-primary rounded-xl pl-10 pr-4 py-3 text-xs text-text-main placeholder-text-muted outline-none transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5 text-left">
                <label className="text-xs font-bold text-text-muted">Password</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-text-muted">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full bg-bg-main border border-border-main focus:border-primary rounded-xl pl-10 pr-4 py-3 text-xs text-text-main placeholder-text-muted outline-none transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 rounded-xl bg-primary hover:bg-primary-hover disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed text-bg-main text-xs font-bold transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-lg shadow-primary/10"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            /* Signup Form */
            <form onSubmit={handleSignupSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3.5">
                <div className="space-y-1.5 text-left">
                  <label className="text-xs font-bold text-text-muted">First Name</label>
                  <input
                    type="text"
                    required
                    placeholder="First Name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full bg-bg-main border border-border-main focus:border-primary rounded-xl px-4 py-3 text-xs text-text-main placeholder-text-muted outline-none transition-all"
                  />
                </div>

                <div className="space-y-1.5 text-left">
                  <label className="text-xs font-bold text-text-muted">Last Name <span className="text-[10px] text-text-muted/65 font-normal">(Opt)</span></label>
                  <input
                    type="text"
                    placeholder="Last Name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full bg-bg-main border border-border-main focus:border-primary rounded-xl px-4 py-3 text-xs text-text-main placeholder-text-muted outline-none transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5 text-left">
                <label className="text-xs font-bold text-text-muted">Username <span className="text-[10px] text-primary/70 font-bold">(Unique)</span></label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-text-muted">
                    <UserCheck className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="choose_username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-bg-main border border-border-main focus:border-primary rounded-xl pl-10 pr-4 py-3 text-xs text-text-main placeholder-text-muted outline-none transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5 text-left">
                <label className="text-xs font-bold text-text-muted">Email Address</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-text-muted">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    type="email"
                    required
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-bg-main border border-border-main focus:border-primary rounded-xl pl-10 pr-4 py-3 text-xs text-text-main placeholder-text-muted outline-none transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5 text-left">
                <label className="text-xs font-bold text-text-muted">Password</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-text-muted">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type="password"
                    required
                    placeholder="Create a strong password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-bg-main border border-border-main focus:border-primary rounded-xl pl-10 pr-4 py-3 text-xs text-text-main placeholder-text-muted outline-none transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 rounded-xl bg-primary hover:bg-primary-hover disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed text-bg-main text-xs font-bold transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-lg shadow-primary/10"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Creating account...</span>
                  </>
                ) : (
                  <>
                    <span>Register Account</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
