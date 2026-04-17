import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import IssueFeed from './components/IssueFeed';
import ReportIssue from './components/ReportIssue';
import EmergencyPortal from './components/EmergencyPortal';
import CitizenLayout from './components/CitizenLayout';
import AdminDashboard from './components/AdminDashboard';
import AdminLayout from './components/AdminLayout';
import Login from './components/Login';
import MapView from './components/MapView';
import UserProfile from './components/UserProfile';
import AdminProfile from './components/AdminProfile';
import SafetyReport from './components/SafetyReport';
import AdminSafety from './components/AdminSafety';
import Support from './components/Support';
import { AuthProvider, useAuth } from './context/AuthContext';

const DynamicTitle = () => {
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname;
    let title = 'UrbanEye';

    if (path === '/login') title = 'Login - UrbanEye';
    else if (path === '/map') title = 'Map - UrbanEye';
    else if (path === '/report') title = 'Report Issue - UrbanEye';
    else if (path === '/emergency') title = 'Emergency - UrbanEye';
    else if (path === '/profile') title = 'Profile - UrbanEye';
    else if (path === '/safety') title = 'Safety - UrbanEye';
    else if (path === '/support') title = 'Support - UrbanEye';
    else if (path === '/admin') title = 'Admin Dashboard - UrbanEye';
    else if (path === '/admin/profile') title = 'Admin Profile - UrbanEye';
    else if (path === '/admin/safety') title = 'Admin Safety - UrbanEye';
    else if (path === '/admin/support') title = 'Admin Support - UrbanEye';
    else if (path === '/') title = 'Feed - UrbanEye';

    document.title = title;
  }, [location]);

  return null;
};

const ProtectedRoute = ({ children }) => {
  const { currentUser } = useAuth();
  if (!currentUser) return <Navigate to="/login" replace />;
  return children;
};

function App() {
  return (
    <GoogleOAuthProvider clientId="501606887885-ue21k3oc6hf50lu4g9cq86c6hjpcnulj.apps.googleusercontent.com">
      <AuthProvider>
        <Router>
          <DynamicTitle />
          <Routes>
            <Route path="/login" element={<Login />} />

            {/* Public Citizen Flow */}
            <Route path="/*" element={
              <ProtectedRoute>
                <CitizenLayout>
                  <Routes>
                    <Route path="/" element={<IssueFeed />} />
                    <Route path="/map" element={<MapView />} />
                    <Route path="/report" element={<ReportIssue />} />
                    <Route path="/emergency" element={<EmergencyPortal />} />
                    <Route path="/profile" element={<UserProfile />} />
                    <Route path="/safety" element={<SafetyReport />} />
                    <Route path="/support" element={<Support />} />
                  </Routes>
                </CitizenLayout>
              </ProtectedRoute>
            } />

            {/* Admin Flow */}
            <Route path="/admin/*" element={
              <ProtectedRoute>
                <AdminLayout>
                  <Routes>
                    <Route path="/" element={<AdminDashboard />} />
                    <Route path="/profile" element={<AdminProfile />} />
                    <Route path="/safety" element={<AdminSafety />} />
                    <Route path="/support" element={<Support />} />
                  </Routes>
                </AdminLayout>
              </ProtectedRoute>
            } />
          </Routes>
        </Router>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}

export default App;