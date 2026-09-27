import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Facebook } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import LanguageToggle from "../components/LanguageToggle";

export default function Login() {
  const { login } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate(location.state?.from || "/", { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || t("auth.loginFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-fb-bg dark:bg-fb-bg-dark px-4">
      <div className="absolute top-4 right-4">
        <LanguageToggle />
      </div>
      <div className="flex items-center gap-2 text-fb-blue mb-6">
        <Facebook size={44} strokeWidth={0} fill="currentColor" />
        <span className="text-3xl font-bold">facebook</span>
      </div>

      <form onSubmit={handleSubmit} className="card w-full max-w-sm p-6 space-y-3">
        <h1 className="text-lg font-semibold text-center mb-2">{t("auth.loginTitle")}</h1>

        {error && <p className="text-red-500 text-sm text-center">{error}</p>}

        <input
          type="email"
          required
          placeholder={t("auth.email")}
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input"
        />
        <input
          type="password"
          required
          placeholder={t("auth.password")}
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="input"
        />
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? t("auth.loggingIn") : t("auth.login")}
        </button>
        <p className="text-center">
          <Link to="/forgot-password" className="text-fb-blue text-sm font-semibold hover:underline">
            {t("auth.forgot")}
          </Link>
        </p>

        <hr className="border-fb-border dark:border-fb-border-dark" />

        <p className="text-center text-sm">
          {t("auth.noAccount")}{" "}
          <Link to="/register" className="text-fb-blue font-semibold hover:underline">
            {t("auth.signUp")}
          </Link>
        </p>
      </form>
    </div>
  );
}
