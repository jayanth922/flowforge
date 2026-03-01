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
    <header className="border-b border-gray-800 bg-gray-950 px-6 py-3">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <Link
          to="/dashboard"
          className="text-lg font-bold tracking-tight text-white"
        >
          FlowForge
        </Link>

        <Link
          to="/dashboard"
          className="text-sm text-gray-400 transition-colors hover:text-white"
        >
          Dashboard
        </Link>

        <div className="flex items-center gap-4">
          {user && (
            <span className="text-sm text-gray-500">{user.email}</span>
          )}
          <button
            onClick={handleLogout}
            className="text-sm text-gray-400 transition-colors hover:text-white"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
};

export default NavHeader;
