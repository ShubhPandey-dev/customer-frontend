import AuthCard from "../components/AuthCard";
import LoginForm from "../components/LoginForm";
import { useLocation } from "react-router-dom";

function Login() {
  const location = useLocation();

  return (
    <AuthCard
      alternateLabel="Create one"
      alternateText="Don't have an account?"
      alternateTo="/signup"
      subtitle="Login with your email and password to continue shopping."
      title="Customer Login"
    >
      {location.state?.message ? (
        <p className="mb-4 rounded-xl bg-amber-100 px-4 py-3 text-sm font-semibold text-amber-800">
          {location.state.message}
        </p>
      ) : null}
      <LoginForm />
    </AuthCard>
  );
}

export default Login;
