import { create } from "zustand";

const useAuthStore = create((set) => ({
  token: localStorage.getItem("customer_token"),

  loadToken: () => {
    const token = localStorage.getItem("customer_token");
    set({ token });
  },

  setToken: (token) => {
    localStorage.setItem("customer_token", token);
    set({ token });
  },

  logout: () => {
    localStorage.removeItem("customer_token");
    set({ token: null });
  },
}));

export default useAuthStore;
