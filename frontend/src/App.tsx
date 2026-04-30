import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from '@store/authStore';

// Layouts
import MainLayout from '@components/Layout/MainLayout';
import AuthLayout from '@components/Layout/AuthLayout';

// Pages
import LoginPage from '@pages/LoginPage';
import RegisterPage from '@pages/RegisterPage';
import ProjectMapPage from '@pages/ProjectMapPage';
import SuperChatPage from '@pages/SuperChatPage';
import ProfilePage from '@pages/ProfilePage';
import TariffsPage from '@pages/TariffsPage';
import NotificationSettingsPage from '@pages/NotificationSettingsPage';

// Components
import ProtectedRoute from '@components/Auth/ProtectedRoute';
import LoadingScreen from '@components/common/LoadingScreen';

function App() {
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route element={<AuthLayout />}>
        <Route
          path="/login"
          element={
            isAuthenticated ? <Navigate to="/map" replace /> : <LoginPage />
          }
        />
        <Route
          path="/register"
          element={
            isAuthenticated ? <Navigate to="/map" replace /> : <RegisterPage />
          }
        />
      </Route>

      {/* Protected routes */}
      <Route
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/map" element={<ProjectMapPage />} />
        <Route path="/super-chat/:id" element={<SuperChatPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/tariffs" element={<TariffsPage />} />
        <Route path="/settings/notifications" element={<NotificationSettingsPage />} />
      </Route>

      {/* Redirects */}
      <Route
        path="/"
        element={<Navigate to={isAuthenticated ? '/map' : '/login'} replace />}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
