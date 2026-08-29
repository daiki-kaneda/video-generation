import { QueryClientProvider } from "@tanstack/react-query";
import {
  createBrowserRouter,
  Navigate,
  RouterProvider,
} from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { queryClient } from "./lib/queryClient";
import { LoginPage } from "./routes/LoginPage";
import { SignUpPage } from "./routes/SignUpPage";
import { DashboardPage } from "./routes/DashboardPage";
import { NewVideoPage } from "./routes/NewVideoPage";
import { VideoDetailPage } from "./routes/VideoDetailPage";

const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  { path: "/signup", element: <SignUpPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      { path: "/", element: <DashboardPage /> },
      { path: "/videos/new", element: <NewVideoPage /> },
      { path: "/videos/:videoId", element: <VideoDetailPage /> },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);

export const App: React.FC = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </QueryClientProvider>
);
