import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export const ProtectedRoute: React.FC = () => {
  const { isInitializing, isAuthenticated } = useAuth();

  if (isInitializing) {
    return (
      <div className="flex h-screen items-center justify-center text-slate-500">
        読み込み中...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};
