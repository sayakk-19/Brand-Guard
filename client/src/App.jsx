import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import AppLayout from './components/AppLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Reviews from './pages/Reviews';
import NewReview from './pages/NewReview';
import ReviewDetail from './pages/ReviewDetail';
import BrandBrain from './pages/BrandBrain';
import Insights from './pages/Insights';
import Profile from './pages/Profile';
import AppSettings from './pages/AppSettings';

function LoadingScreen() {
  return <div className="loading-screen"><div className="brand-mark brand-mark-large">B</div><span>Opening your workspace</span><div className="loading-line" /></div>;
}

export default function App() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Routes><Route path="*" element={<Login />} /></Routes>;
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="reviews" element={<Reviews />} />
        <Route path="reviews/new" element={<NewReview />} />
        <Route path="reviews/:id" element={<ReviewDetail />} />
        <Route path="brand" element={<BrandBrain />} />
        <Route path="insights" element={<Insights />} />
        <Route path="profile" element={<Profile />} />
        <Route path="settings" element={<AppSettings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
