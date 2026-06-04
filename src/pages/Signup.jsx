import AuthCard from "../components/AuthCard";
import SignupForm from "../components/SignupForm";

function Signup() {
  return (
    <AuthCard
      alternateLabel="Login here"
      alternateText="Already have an account?"
      alternateTo="/login"
      subtitle="Create your customer account with name, email, and password."
      title="Customer Signup"
    >
      <SignupForm />
    </AuthCard>
  );
}

export default Signup;
