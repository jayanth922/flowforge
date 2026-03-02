import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

const NavHeader = () => {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/80 px-6 py-3 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <Link
          to="/dashboard"
          className="text-lg font-bold tracking-tight text-gray-900"
        >
          FlowForge
        </Link>

        <div className="flex items-center gap-6">
          <Link
            to="/dashboard"
            className="text-sm font-medium text-gray-500 transition-colors hover:text-gray-900"
          >
            Dashboard
          </Link>
          <Link
            to="/templates"
            className="text-sm font-medium text-gray-500 transition-colors hover:text-gray-900"
          >
            Templates
          </Link>
          <Link
            to="/integrations"
            className="text-sm font-medium text-gray-500 transition-colors hover:text-gray-900"
          >
            Integrations
          </Link>
        </div>

        <div className="flex items-center gap-4">
          {user && (
            <span className="text-sm font-medium text-gray-500">{user.email}</span>
          )}
          <button
            onClick={handleLogout}
            className="text-sm font-medium text-gray-500 transition-colors hover:text-gray-900"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
};

export default NavHeader;
