import { useState, useEffect, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login } from "../services/api";
import { useAuthStore } from "../store/authStore";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const storeLogin = useAuthStore((s) => s.login);

  useEffect(() => {
    document.title = "FlowForge — Login";
  }, []);

  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(null), 5000);
    return () => clearTimeout(timer);
  }, [error]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await login(email, password);
      storeLogin(response);
      navigate("/dashboard");
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Invalid email or password");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-8 text-center text-3xl font-bold tracking-tight text-white">
          FlowForge
        </h1>

        <div className="mb-4 rounded-lg border border-blue-800/50 bg-blue-900/20 p-3">
          <p className="text-center text-xs text-blue-300">
            Try the demo &mdash;{" "}
            <span className="font-mono text-blue-200">demo@flowforge.com</span>{" "}
            / <span className="font-mono text-blue-200">Demo1234!</span>
          </p>
          <button
            type="button"
            onClick={() => {
              setEmail("demo@flowforge.com");
              setPassword("Demo1234!");
            }}
            className="mt-2 w-full rounded-md bg-blue-800/40 px-3 py-1.5 text-xs font-medium text-blue-200 transition-colors hover:bg-blue-800/60"
          >
            Use Demo Credentials
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm text-gray-400">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-sm text-gray-400"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-800 bg-red-900/30 p-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Don&apos;t have an account?{" "}
          <Link to="/register" className="text-blue-400 hover:text-blue-300">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
