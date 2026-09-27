import { useState } from "react";
import { Link } from "react-router-dom";
import { Facebook } from "lucide-react";
import api from "../api/axios";
import { useLanguage } from "../context/LanguageContext";
import LanguageToggle from "../components/LanguageToggle";

const errorText = (err, fallback) => {
  const msg = err.response?.data?.message;
  return Array.isArray(msg) ? msg.join(", ") : msg || fallback;
};

// /forgot-password - three steps: email -> 6-digit code -> new password.
// The backend has no mail server; outside production it returns the code
// as `devCode`, which is shown here (it is also printed in the server log).
export default function ForgotPassword() {
  const { t } = useLanguage();
  const [step, setStep] = useState("email"); // email | code | reset | done
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState("");
  const [passwords, setPasswords] = useState({ next: "", confirm: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const run = async (fn) => {
    setError("");
    setBusy(true);
    try {
      await fn();
    } catch (err) {
      setError(errorText(err, t("forgot.failed")));
    } finally {
      setBusy(false);
    }
  };

  const requestCode = (e) => {
    e?.preventDefault();
    run(async () => {
      const { data } = await api.post("/auth/forgot-password", { email: email.trim() });
      setDevCode(data.devCode || "");
      if (data.devCode) console.info(`Verification Code: ${data.devCode}`);
      setCode("");
      setStep("code");
    });
  };

  const verify = (e) => {
    e.preventDefault();
    run(async () => {
      await api.post("/auth/verify-reset-code", { email: email.trim(), code });
      setStep("reset");
    });
  };

  const reset = (e) => {
    e.preventDefault();
    if (passwords.next.length < 6) return setError(t("password.tooShort"));
    if (passwords.next !== passwords.confirm) return setError(t("password.mismatch"));
    run(async () => {
      await api.post("/auth/reset-password", { email: email.trim(), code, newPassword: passwords.next });
      setStep("done");
    });
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

      <div className="card w-full max-w-sm p-6 space-y-3">
        {step === "email" && (
          <form onSubmit={requestCode} className="space-y-3">
            <h1 className="text-lg font-semibold">{t("forgot.findTitle")}</h1>
            <p className="text-sm text-hx-text2">{t("forgot.findText")}</p>
            <input
              type="email"
              required
              autoFocus
              autoComplete="email"
              placeholder={t("auth.email")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
            />
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button type="submit" disabled={busy} className="btn-primary w-full">
              {busy ? t("forgot.sending") : t("forgot.sendCode")}
            </button>
          </form>
        )}

        {step === "code" && (
          <form onSubmit={verify} className="space-y-3">
            <h1 className="text-lg font-semibold">{t("forgot.codeTitle")}</h1>
            {/* There's no mail server: the backend returns the code (devCode)
                and it's shown right in the sentence. */}
            <p className="text-sm text-hx-text2">
              {t("forgot.codeText", { email: email.trim() })}
              {devCode && (
                <>
                  {" "}
                  <strong className="text-base text-hx-accent tracking-wider whitespace-nowrap">
                    {t("forgot.demoCode", { code: devCode })}
                  </strong>
                </>
              )}
            </p>
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              required
              pattern="\d{6}"
              maxLength={6}
              aria-label={t("forgot.codeLabel")}
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="input text-center text-2xl tracking-[0.5em] font-semibold"
            />
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button type="submit" disabled={busy || code.length !== 6} className="btn-primary w-full">
              {t("forgot.verify")}
            </button>
            <button type="button" onClick={requestCode} disabled={busy} className="w-full text-sm text-fb-blue font-semibold hover:underline">
              {t("forgot.resend")}
            </button>
          </form>
        )}

        {step === "reset" && (
          <form onSubmit={reset} className="space-y-3">
            <h1 className="text-lg font-semibold">{t("forgot.resetTitle")}</h1>
            <input
              type="password"
              required
              autoFocus
              minLength={6}
              autoComplete="new-password"
              placeholder={t("forgot.newPassword")}
              value={passwords.next}
              onChange={(e) => setPasswords((p) => ({ ...p, next: e.target.value }))}
              className="input"
            />
            <input
              type="password"
              required
              autoComplete="new-password"
              placeholder={t("forgot.confirmPassword")}
              value={passwords.confirm}
              onChange={(e) => setPasswords((p) => ({ ...p, confirm: e.target.value }))}
              className="input"
            />
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button type="submit" disabled={busy} className="btn-primary w-full">
              {t("forgot.reset")}
            </button>
          </form>
        )}

        {step === "done" && <p className="text-green-600 font-medium">{t("forgot.done")}</p>}

        <hr className="border-fb-border dark:border-fb-border-dark" />
        <p className="text-center text-sm">
          <Link to="/login" className="text-fb-blue font-semibold hover:underline">
            {t("forgot.backToLogin")}
          </Link>
        </p>
      </div>
    </div>
  );
}
