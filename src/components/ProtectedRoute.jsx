import { Navigate, useLocation } from "react-router-dom";
import useAuthStore from "../store/authStore";

function ProtectedRoute({ children }) {
  const token = useAuthStore((state) => state.token);
  const location = useLocation();

  // 🔥 FIX: direct localStorage fallback
  const storedToken = localStorage.getItem("customer_token");

  if (!token && !storedToken) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: location,
          message: "Please login first.",
        }}
      />
    );
  }

  return children;
}

export default ProtectedRoute;