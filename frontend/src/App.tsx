import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./store/authStore";
import ProtectedRoute from "./components/ProtectedRoute";
import { AppLayout } from "./layout/AppLayout";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import WorkflowEditorPage from "./pages/WorkflowEditorPage";
import TemplatesPage from "./pages/TemplatesPage";
import IntegrationsPage from "./pages/IntegrationsPage";

const RootRedirect = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return <Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />;
};

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/templates" element={<TemplatesPage />} />
        <Route path="/integrations" element={<IntegrationsPage />} />
        <Route path="/workflows/new" element={<WorkflowEditorPage />} />
        <Route path="/workflows/:id" element={<WorkflowEditorPage />} />
      </Route>
    </Routes>
  );
};

export default App;
