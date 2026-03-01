import { create } from "zustand";
import type { AuthResponse, SafeUser } from "../types/api";

interface AuthState {
  user: SafeUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  login: (response: AuthResponse) => void;
  logout: () => void;
  setToken: (token: string) => void;
}

const loadInitialState = () => {
  const accessToken = localStorage.getItem("accessToken");
  const userJson = localStorage.getItem("user");
  let user: SafeUser | null = null;

  if (userJson) {
    try {
      user = JSON.parse(userJson) as SafeUser;
    } catch {
      user = null;
    }
  }

  return {
    user,
    accessToken,
    isAuthenticated: !!accessToken && !!user,
  };
};

export const useAuthStore = create<AuthState>((set) => ({
  ...loadInitialState(),

  login: (response: AuthResponse) => {
    localStorage.setItem("accessToken", response.accessToken);
    localStorage.setItem("refreshToken", response.refreshToken);
    localStorage.setItem("user", JSON.stringify(response.user));
    set({
      user: response.user,
      accessToken: response.accessToken,
      isAuthenticated: true,
    });
  },

  logout: () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    set({
      user: null,
      accessToken: null,
      isAuthenticated: false,
    });
  },

  setToken: (token: string) => {
    localStorage.setItem("accessToken", token);
    set({ accessToken: token });
  },
}));
