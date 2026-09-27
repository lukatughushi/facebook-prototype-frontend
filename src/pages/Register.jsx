import { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Facebook, Camera } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import LanguageToggle from "../components/LanguageToggle";
import { useLanguage } from "../context/LanguageContext";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [avatar, setAvatar] = useState(null);
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatar(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError(t("password.tooShort"));
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("email", email);
      formData.append("password", password);
      if (avatar) formData.append("avatar", avatar);

      await register(formData);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || t("register.failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-fb-bg dark:bg-fb-bg-dark px-4 py-8">
      <div className="absolute top-4 right-4">
        <LanguageToggle />
      </div>
      <div className="flex items-center gap-2 text-fb-blue mb-6">
        <Facebook size={44} strokeWidth={0} fill="currentColor" />
        <span className="text-3xl font-bold">facebook</span>
      </div>

      <form onSubmit={handleSubmit} className="card w-full max-w-sm p-6 space-y-3">
        <h1 className="text-lg font-semibold text-center mb-2">{t("register.title")}</h1>

        {error && <p className="text-red-500 text-sm text-center">{error}</p>}

        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="relative h-20 w-20 rounded-full bg-fb-bg dark:bg-fb-bg-dark border-2 border-dashed border-fb-border dark:border-fb-border-dark flex items-center justify-center overflow-hidden"
          >
            {preview ? (
              <img src={preview} alt={t("register.avatarPreview")} className="h-full w-full object-cover" />
            ) : (
              <Camera size={24} className="text-fb-muted dark:text-fb-muted-dark" />
            )}
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
          <span className="text-xs text-fb-muted dark:text-fb-muted-dark">{t("register.avatarOptional")}</span>
        </div>

        <input
          type="text"
          required
          placeholder={t("register.fullName")}
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="input"
        />
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
          placeholder={t("register.passwordPlaceholder")}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="input"
        />

        <button type="submit" disabled={loading} className="btn-primary w-full !bg-fb-green hover:!bg-green-600">
          {loading ? t("register.creating") : t("register.submit")}
        </button>

        <p className="text-center text-sm">
          {t("register.haveAccount")}{" "}
          <Link to="/login" className="text-fb-blue font-semibold hover:underline">
            {t("auth.login")}
          </Link>
        </p>
      </form>
    </div>
  );
}
