import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import { AppShell } from './components/AppShell';
import { Skeleton } from './components/ui/Feedback';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Rooms } from './pages/Rooms';
import { RoomSchedule } from './pages/RoomSchedule';
import { Users } from './pages/Users';
import { AuditLogs } from './pages/AuditLogs';
import { SystemLogs } from './pages/SystemLogs';

/** Client-side guard for navigation only; every endpoint re-checks the role on the server. */
function Protected({ admin = false, children }: { admin?: boolean; children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Skeleton className="m-8 h-40" />;
  if (!user) return <Navigate to="/login" replace />;
  if (admin && user.role !== 'ADMIN') return <Navigate to="/rooms" replace />;
  return <>{children}</>;
}

function Home() {
  const { user } = useAuth();
  return user?.role === 'ADMIN' ? <Dashboard /> : <Navigate to="/rooms" replace />;
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <Protected>
            <AppShell />
          </Protected>
        }
      >
        <Route index element={<Home />} />
        <Route path="rooms" element={<Rooms />} />
        <Route path="rooms/:id" element={<RoomSchedule />} />
        <Route path="users" element={<Protected admin><Users /></Protected>} />
        <Route path="audit-logs" element={<Protected admin><AuditLogs /></Protected>} />
        <Route path="system-logs" element={<Protected admin><SystemLogs /></Protected>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
