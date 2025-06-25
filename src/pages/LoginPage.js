import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      console.log('Login attempt with username:', username);
      const result = await login(username, password);
      console.log('Login result:', result);
      navigate('/');
    } catch (err) {
      console.error('Login error in LoginPage:', {
        message: err.message,
        name: err.name
      });
      setError(err.message || 'Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-blue-50 to-green-100 flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl px-8 py-10 flex flex-col gap-6 border border-blue-100">
          <div className="flex flex-col items-center gap-2 mb-2">
            <svg className="w-12 h-12 text-blue-400 mb-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="4" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
            <h2 className="text-3xl font-extrabold text-blue-800 text-center">Pediatrician Portal</h2>
            <p className="text-base text-blue-600 text-center">Sign in to your account</p>
          </div>
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label htmlFor="username" className="sr-only">Username</label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-5 py-3 rounded-full border border-blue-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300 text-gray-800 bg-white text-base placeholder-blue-300"
                  placeholder="Username"
                />
              </div>
              <div>
                <label htmlFor="password" className="sr-only">Password</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-5 py-3 rounded-full border border-blue-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300 text-gray-800 bg-white text-base placeholder-blue-300"
                  placeholder="Password"
                />
              </div>
            </div>

            {error && (
              <div className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-full border border-red-200 font-semibold">
                {error}
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-6 rounded-full font-bold bg-gradient-to-r from-blue-500 to-emerald-500 text-white shadow-lg hover:from-blue-600 hover:to-emerald-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:opacity-50 text-lg"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mx-auto"></div>
                ) : (
                  'Sign in'
                )}
              </button>
            </div>
            <div className="mt-4 text-center">
              <button
                type="button"
                className="text-blue-600 underline hover:text-blue-800 text-sm font-medium"
                onClick={() => navigate('/forgot-password')}
              >
                Forgot Password?
              </button>
            </div>

            <div className="text-sm text-center text-blue-700 bg-blue-50 rounded-xl p-4 border border-blue-100 mt-2">
              <p className="font-semibold mb-1">Demo Credentials:</p>
              <p>Admin: <span className="font-mono">admin / admin123</span></p>
              <p>Doctor: <span className="font-mono">doctor / doctor123</span></p>
              <p>Support: <span className="font-mono">support / support123</span></p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage; 