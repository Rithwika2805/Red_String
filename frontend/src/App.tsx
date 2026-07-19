import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { GameProvider } from './context/GameContext';
import Office from './components/Office';
import BackgroundRain from './components/BackgroundRain';
import { FileText, Key, Mail, ShieldCheck } from 'lucide-react';

const LoginGate: React.FC = () => {
  const { token, loading, login } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
    const body = isRegister ? { username, email, password } : { email, password };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Authentication failed');
      } else {
        login(data.token, data.user);
      }
    } catch (err) {
      setErrorMsg('Server connection failed. Is the API server running?');
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-noir-950 text-parchment-300 font-typewriter text-sm">
        <div className="flex flex-col items-center gap-2">
          <div className="w-6 h-6 border-2 border-t-yellow-500 border-wood-900 rounded-full animate-spin" />
          <span>Restoring session files...</span>
        </div>
      </div>
    );
  }

  if (token) {
    return <Office />;
  }

  return (
    <div className="relative h-screen w-screen flex items-center justify-center bg-wood-950 overflow-hidden select-none">
      {/* Background glass rain drop simulation */}
      <BackgroundRain />

      {/* Retro Telegram style card container */}
      <div className="relative w-full max-w-[420px] bg-parchment-100 paper-texture text-noir-900 p-8 rounded-lg shadow-2xl z-10 border-4 border-wood-950/20 m-4 flex flex-col gap-5">
        
        {/* Header */}
        <div className="text-center border-b border-noir-900/10 pb-4">
          <h2 className="font-serif text-2xl font-bold tracking-widest uppercase text-noir-950 flex items-center justify-center gap-2">
            <ShieldCheck className="w-7 h-7 text-crimson" />
            Red String
          </h2>
          <span className="font-typewriter text-[10px] text-noir-900/50 uppercase tracking-widest block mt-1">
            Department Case Records Verification
          </span>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 font-typewriter text-xs">
          {isRegister && (
            <div className="flex flex-col gap-1.5 text-left">
              <span className="text-[10px] text-noir-900/60 uppercase">Officer Badge Name:</span>
              <div className="relative">
                <FileText className="absolute left-2.5 top-2.5 w-4 h-4 text-noir-900/40" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. Detective Cole"
                  className="w-full bg-white border border-noir-900/15 rounded pl-9 pr-3 py-2 text-noir-900 focus:outline-none focus:border-noir-900"
                />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1.5 text-left">
            <span className="text-[10px] text-noir-900/60 uppercase">Official Email:</span>
            <div className="relative">
              <Mail className="absolute left-2.5 top-2.5 w-4 h-4 text-noir-900/40" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="officer@redstring.gov"
                className="w-full bg-white border border-noir-900/15 rounded pl-9 pr-3 py-2 text-noir-900 focus:outline-none focus:border-noir-900"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5 text-left">
            <span className="text-[10px] text-noir-900/60 uppercase">Records Password:</span>
            <div className="relative">
              <Key className="absolute left-2.5 top-2.5 w-4 h-4 text-noir-900/40" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white border border-noir-900/15 rounded pl-9 pr-3 py-2 text-noir-900 focus:outline-none focus:border-noir-900"
              />
            </div>
          </div>

          {errorMsg && (
            <div className="text-[10px] font-sans text-red-700 bg-red-50 p-2.5 rounded border border-red-200 text-center font-bold">
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            className="w-full py-2.5 bg-noir-900 hover:bg-noir-950 text-parchment-100 font-bold uppercase tracking-wider rounded shadow transition mt-2 cursor-pointer"
          >
            {isRegister ? 'Register Badge' : 'Verify Credentials'}
          </button>
        </form>

        {/* Toggle */}
        <div className="text-center font-typewriter text-[10px] text-noir-900/50 mt-1 border-t border-noir-900/10 pt-4 flex flex-col gap-1">
          <span>
            {isRegister ? 'Already registered?' : 'First time accessing files?'}
          </span>
          <button
            onClick={() => {
              setIsRegister(!isRegister);
              setErrorMsg('');
            }}
            className="text-crimson hover:underline font-bold uppercase tracking-wider mt-1 cursor-pointer"
          >
            {isRegister ? 'Verify Badge instead' : 'Register Officer Badge'}
          </button>
        </div>

      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <GameProvider>
        <LoginGate />
      </GameProvider>
    </AuthProvider>
  );
};
export default App;
