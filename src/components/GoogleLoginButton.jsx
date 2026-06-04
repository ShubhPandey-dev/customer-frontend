import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import useAuthStore from "../store/authStore";

const googleScriptSrc = "https://accounts.google.com/gsi/client";
let initializedClientId = "";
let credentialHandler = null;

function loadGoogleScript() {
  const existingScript = document.querySelector(`script[src="${googleScriptSrc}"]`);

  if (existingScript) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = googleScriptSrc;
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    script.onerror = reject;
    document.body.appendChild(script);
  });
}

function GoogleLoginButton() {
  const buttonRef = useRef(null);
  const [message, setMessage] = useState("");
  const setToken = useAuthStore((state) => state.setToken);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    const redirectPath = location.state?.from?.pathname || "/products";

    if (!clientId) {
      setMessage("Google login is not configured");
      return;
    }

    let isMounted = true;

    credentialHandler = async (response) => {
      if (!isMounted) {
        return;
      }

      setMessage("");

      try {
        const res = await fetch("http://localhost:5000/auth/customer/google", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ credential: response.credential }),
        });

        const data = await res.json();
        // console.log(data.token);

        if (data.token) {
          setToken(data.token);
          navigate(redirectPath, { replace: true });
        } else {
          setMessage(data.message || "Google login failed");
        }
      } catch (error) {
        console.log(error);
        setMessage("Server error");
      }
    };

    loadGoogleScript()
      .then(() => {
        if (!isMounted || !window.google || !buttonRef.current) {
          return;
        }

        if (initializedClientId !== clientId) {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: (response) => credentialHandler?.(response),
          });
          initializedClientId = clientId;
        }

        window.google.accounts.id.renderButton(buttonRef.current, {
          logo_alignment: "center",
          shape: "pill",
          size: "large",
          text: "continue_with",
          theme: "outline",
          width: 320,
        });
      })
      .catch(() => {
        if (isMounted) {
          setMessage("Google login failed to load");
        }
      });

    return () => {
      isMounted = false;
    };
  }, [location.state?.from?.pathname, navigate, setToken]);

  return (
    <div className="grid justify-items-center gap-3">
      <div
        ref={buttonRef}
        className="flex min-h-11 w-full max-w-80 justify-center"
      />
      
      {message ? (
        <p className="m-0 text-center text-sm font-semibold text-rose-600">
          {message}
        </p>
      ) : null}
    </div>
  );
}

export default GoogleLoginButton;
