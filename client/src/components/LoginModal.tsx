import React, { useState } from 'react';
import { 
  X, 
  Lock, 
  User, 
  ShieldCheck, 
  AlertCircle, 
  Loader2, 
  Sparkles,
  KeyRound
} from 'lucide-react';
import type { AuthUser, LoginPayload } from '../types';
import { login } from '../services/api';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: AuthUser) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFillCredentials = (user: string, pass: string) => {
    setUsername(user);
    setPassword(pass);
    setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!username.trim() || !password) {
      setErrorMessage('Please enter both username and password.');
      return;
    }

    setIsLoading(true);

    try {
      const payload: LoginPayload = {
        username: username.trim(),
        password,
      };

      const res = await login(payload);
      setIsLoading(false);
      onLoginSuccess(res.user);
      onClose();
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(err.message || 'Authentication failed. Please verify credentials.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in select-none">
      <div 
        className="relative w-full max-w-md bg-tm-midnight border border-tm-border rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with TM Gradient Accent */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-tm-border bg-tm-slate/50">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-tm-orange to-tm-flame shadow-md shadow-tm-orange/30 text-white">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide">
                VizAI Security Authentication
              </h2>
              <p className="text-xs text-tm-muted">
                Telekom Malaysia VMS Operator Control Plane
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-tm-muted hover:text-white hover:bg-tm-slate transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Fill Preset Pills */}
        <div className="px-6 py-2.5 bg-tm-slate/30 border-b border-tm-border/50 flex items-center justify-between text-xs">
          <span className="text-tm-muted flex items-center space-x-1.5 text-[11px]">
            <Sparkles className="w-3.5 h-3.5 text-tm-orange" />
            <span>Preset Accounts:</span>
          </span>
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={() => handleFillCredentials('admin', 'admin123')}
              className="text-[11px] px-2.5 py-1 rounded bg-tm-orange/15 hover:bg-tm-orange text-tm-orange hover:text-white border border-tm-orange/30 font-semibold transition-all"
            >
              Admin
            </button>
            <button
              type="button"
              onClick={() => handleFillCredentials('operator', 'operator123')}
              className="text-[11px] px-2.5 py-1 rounded bg-blue-500/15 hover:bg-blue-500 text-blue-400 hover:text-white border border-blue-500/30 font-semibold transition-all"
            >
              Operator
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 rounded-lg bg-tm-red/15 border border-tm-red/40 text-tm-red text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Username */}
          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1.5 flex items-center space-x-1.5">
              <User className="w-3.5 h-3.5 text-tm-orange" />
              <span>Username</span>
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. admin or operator"
              className="w-full bg-tm-slate border border-tm-border rounded-lg px-3.5 py-2.5 text-xs text-white placeholder-tm-muted focus:outline-none focus:border-tm-orange focus:ring-1 focus:ring-tm-orange transition-all"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1.5 flex items-center space-x-1.5">
              <Lock className="w-3.5 h-3.5 text-tm-orange" />
              <span>Password</span>
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-tm-slate border border-tm-border rounded-lg px-3.5 py-2.5 text-xs text-white placeholder-tm-muted focus:outline-none focus:border-tm-orange focus:ring-1 focus:ring-tm-orange transition-all font-mono"
            />
          </div>

          <div className="p-3 rounded-xl bg-tm-slate/50 border border-tm-border/60 text-[11px] text-tm-muted space-y-1">
            <p className="flex items-center space-x-1.5 font-medium text-slate-300">
              <KeyRound className="w-3.5 h-3.5 text-tm-orange" />
              <span>Role Permissions:</span>
            </p>
            <p>• <strong>ADMIN:</strong> Manage camera matrix, add/edit/delete feeds, manage staff users.</p>
            <p>• <strong>OPERATOR:</strong> Real-time video wall monitoring and snapshot telemetry.</p>
          </div>

          {/* Submit Actions */}
          <div className="pt-2 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2.5 rounded-lg border border-tm-border text-xs font-semibold text-tm-muted hover:text-white hover:bg-tm-slate transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-tm-orange to-tm-flame hover:brightness-110 text-white font-bold text-xs flex items-center space-x-2 shadow-lg shadow-tm-orange/30 transition-all disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Authenticate Session</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
