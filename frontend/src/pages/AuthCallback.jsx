import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

export default function AuthCallback() {
  const [params] = useSearchParams();
  const { loginWithToken } = useAuth();
  const navigate = useNavigate();
  const [showRolePicker, setShowRolePicker] = useState(false);
  const [userId, setUserId] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);

  useEffect(() => {
    const token = params.get('token');
    const uid = params.get('userId');
    if (token && uid) {
      setUserId(uid);
      // Check if role needs to be set (new user will have 'child' as default)
      loginWithToken(token);
      setShowRolePicker(true);
    } else {
      navigate('/');
    }
  }, []);

  const confirmRole = async (role) => {
    setSelectedRole(role);
    try {
      const res = await axios.put('/api/auth/set-role', { userId, role });
      loginWithToken(res.data.token);
      navigate('/dashboard');
    } catch {
      navigate('/');
    }
  };

  if (showRolePicker) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-slate-800 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl border border-slate-700">
          <div className="text-5xl mb-4">👋</div>
          <h2 className="font-game text-3xl text-white mb-2">Welcome!</h2>
          <p className="text-slate-400 mb-8">Who are you? Choose your role:</p>

          <div className="grid grid-cols-2 gap-4">
            {/* Child */}
            <button
              onClick={() => confirmRole('child')}
              className="group p-6 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 transition text-white"
            >
              <div className="text-5xl mb-3 group-hover:animate-bounce">🧒</div>
              <div className="font-game text-xl">I'm a Kid!</div>
              <div className="text-xs text-white/70 mt-1">Play games & learn</div>
            </button>

            {/* Parent */}
            <button
              onClick={() => confirmRole('parent')}
              className="group p-6 rounded-2xl bg-gradient-to-br from-blue-600 to-teal-600 hover:from-blue-500 hover:to-teal-500 transition text-white"
            >
              <div className="text-5xl mb-3 group-hover:animate-bounce">👨‍👧</div>
              <div className="font-game text-xl">I'm a Parent</div>
              <div className="text-xs text-white/70 mt-1">Monitor my child</div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-white font-game text-2xl animate-pulse">Loading your adventure... 🚀</div>
    </div>
  );
}
