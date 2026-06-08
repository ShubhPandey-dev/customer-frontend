import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import GoogleLoginButton from "./GoogleLoginButton";
import useAuthStore from "../store/authStore";

const defaultFormData = {
  email: "",
  password: "",
};

function LoginForm() {
  const [formData, setFormData] = useState(defaultFormData);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const setToken = useAuthStore((state) => state.setToken);
  const navigate = useNavigate();
  const location = useLocation();

  function handleChange(event) {
    const { name, value } = event.target;
    setMessage("");
    setFormData((current) => ({ ...current, [name]: value }));
  }

  
  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("https://ecom-common-backend.onrender.com/auth/customer/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (data.token) {
        setToken(data.token);
        setFormData(defaultFormData);
        setMessage("Login successful");

        const redirectPath = location.state?.from?.pathname || "/products";
        navigate(redirectPath, { replace: true });
      } else {
        setMessage(data.message || "Login failed");
      }
    } catch (error) {
      console.log(error);
      setMessage("Server error");
    }

    setLoading(false);
  }

  return (
    <div className="mt-6 grid gap-4">
      <form className="grid gap-4" onSubmit={handleSubmit}>
        <input
          required
          className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 outline-none transition focus:border-amber-400"
          name="email"
          onChange={handleChange}
          placeholder="Email address"
          type="email"
          value={formData.email}
        />

        <input
          required
          className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 outline-none transition focus:border-amber-400"
          name="password"
          onChange={handleChange}
          placeholder="Password"
          type="password"
          value={formData.password}
        />

        {message ? (
          <p className="m-0 text-sm font-semibold text-emerald-600">{message}</p>
        ) : null}

        <button
          className="rounded-full bg-amber-400 px-6 py-3 text-lg font-black text-[#081b45]"
          type="submit"
          disabled={loading}
        >
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>

      <div className="flex items-center gap-3 text-xs font-bold uppercase text-slate-400">
        <span className="h-px flex-1 bg-slate-200" />
        or continue with
        <span className="h-px flex-1 bg-slate-200" />
      </div>

      <GoogleLoginButton />
    </div>
  );
}

export default LoginForm;
