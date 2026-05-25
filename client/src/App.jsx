import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import ProfessorDashboard from './pages/ProfessorDashboard';
import SessionHistory from './pages/SessionHistory';
import StudentAttendance from './pages/StudentAttendance';

function ProtectedRoute({ children, requireProfessor = false }) {
  const { isAuthenticated, isProfessor } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (requireProfessor && !isProfessor) return <Navigate to="/login" replace />;
  return children;
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Navigate to={isAuthenticated ? '/professor/dashboard' : '/login'} replace />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/professor/dashboard"
          element={
            <ProtectedRoute requireProfessor>
              <ProfessorDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/professor/history"
          element={
            <ProtectedRoute requireProfessor>
              <SessionHistory />
            </ProtectedRoute>
          }
        />
        <Route path="/attend" element={<StudentAttendance />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: { fontSize: '14px', borderRadius: '8px' },
          }}
        />
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
