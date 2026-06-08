import { useState } from "react";

const defaultFormData = {
  name: "",
  email: "",
  password: "",
};

function SignupForm() {
  const [formData, setFormData] = useState(defaultFormData);
  const [message, setMessage] = useState("");

  function handleChange(event) {
    const { name, value } = event.target;
    setMessage("");
    setFormData((current) => ({ ...current, [name]: value }));
  }

  
  async function handleSubmit(event) {
    event.preventDefault();

    try {
      const res = await fetch("https://ecom-common-backend.onrender.com/auth/customer/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
      });

      const data = await res.json();

      console.log("SIGNUP RESPONSE:", data);

      if (data.message === "User Registered Successfully") {
        setMessage("Signup Successful ✅");
        setFormData(defaultFormData);
      } else {
        setMessage(data.message || "Signup Failed ❌");
      }

    } catch (err) {
      console.log("ERROR:", err);
      setMessage("Server Error ❌");
    }
  }

  return (
    <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
      <input
        required
        className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 outline-none transition focus:border-amber-400"
        name="name"
        onChange={handleChange}
        placeholder="Full name"
        type="text"
        value={formData.name}
      />
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
        <p className="m-0 text-sm font-semibold text-emerald-600">
          {message}
        </p>
      ) : null}

      <button
        className="rounded-full bg-amber-400 px-6 py-3 text-lg font-black text-[#081b45]"
        type="submit"
      >
        Sign up
      </button>
    </form>
  );
}

export default SignupForm;