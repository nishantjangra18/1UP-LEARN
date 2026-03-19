import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { GameProvider } from './contexts/GameContext';

// Pages
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import GamesShowcase from './pages/GamesShowcase';
import LearningPath from './pages/LearningPath';
import ParentDashboard from './pages/ParentDashboard';
import Profile from './pages/Profile';
import GamePage from './pages/GamePage';
import Leaderboard from './pages/Leaderboard';

// Components
import Navbar from './components/Navbar';
import FloatingNotification from './components/FloatingNotification';
import EasterEggLayer from './components/EasterEggLayer';
import ChatWidget from './components/ChatWidget';

// Redirect logged-in users away from login/register
const GuestRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to={user.role === 'parent' ? '/parent' : '/dashboard'} />;
  return children;
};

// Child-only routes — parents are redirected to /parent
const ChildRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="font-game text-2xl text-white animate-pulse">Loading your adventure... 🚀</div>
    </div>
  );
  if (!user) return <Navigate to="/login" />;
  if (user.role === 'parent') return <Navigate to="/parent" />;
  return children;
};

// Parent-only route guard
const PrivateRoute = ({ children, parentOnly = false }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="font-game text-2xl text-white animate-pulse">Loading your adventure... 🚀</div>
    </div>
  );
  if (!user) return <Navigate to="/login" />;
  if (parentOnly && user.role !== 'parent') return <Navigate to="/dashboard" />;
  return children;
};

function AppInner() {
  return (
    <BrowserRouter>
      <div className="relative min-h-screen">
        <div className="star-bg" />
        <Navbar />
        <FloatingNotification />
        <EasterEggLayer />
        <ChatWidget />
        <Routes>
          {/* Public */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
          <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />

          {/* Child-only routes */}
          <Route path="/dashboard" element={<ChildRoute><Dashboard /></ChildRoute>} />
          <Route path="/games" element={<ChildRoute><GamesShowcase /></ChildRoute>} />
          <Route path="/games/:gameId" element={<ChildRoute><GamePage /></ChildRoute>} />
          <Route path="/learn" element={<ChildRoute><LearningPath /></ChildRoute>} />
          <Route path="/leaderboard" element={<ChildRoute><Leaderboard /></ChildRoute>} />

          {/* Shared authenticated routes */}
          <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />

          {/* Parent-only routes */}
          <Route path="/parent" element={<PrivateRoute parentOnly><ParentDashboard /></PrivateRoute>} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <GameProvider>
        <AppInner />
      </GameProvider>
    </AuthProvider>
  );
}
