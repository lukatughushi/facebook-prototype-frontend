import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../api/axios";
import Header from "../components/Header";
import Icon from "../components/Icon";
import { useAuth } from "../context/AuthContext";
import { LANGUAGES, useLanguage } from "../context/LanguageContext";

const NAME_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

const TABS = [
  { key: "personal", icon: "users", label: "settings.personal" },
  { key: "security", icon: "lock", label: "settings.security" },
  { key: "language", icon: "globe", label: "settings.language" },
];

const errorText = (err, fallback) => {
  const msg = err.response?.data?.message;
  return Array.isArray(msg) ? msg.join(", ") : msg || fallback;
};

function Field({ label, ...props }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[13px] font-semibold text-hx-text2">{label}</span>
      <input className="input text-[15px] disabled:opacity-60 disabled:cursor-not-allowed" {...props} />
    </label>
  );
}

// Success/error line under a form.
function Status({ status }) {
  if (!status) return null;
  return (
    <p role="status" className={`text-[13px] ${status.ok ? "text-green-600" : "text-red-500"}`}>
      {status.text}
    </p>
  );
}

function Section({ title, children }) {
  return (
    <section className="card p-4 flex flex-col gap-3">
      <h2 className="text-[17px] font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function NameForm() {
  const { user, updateUser } = useAuth();
  const { t, locale } = useLanguage();
  const [first, ...rest] = (user?.name || "").split(" ");
  const [form, setForm] = useState({ firstName: first || "", lastName: rest.join(" ") });
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);

  const last = user?.lastProfileUpdateDate ? new Date(user.lastProfileUpdateDate) : null;
  const unlockAt = last ? new Date(last.getTime() + NAME_COOLDOWN_MS) : null;
  const locked = !!unlockAt && unlockAt > new Date();
  const unchanged = `${form.firstName.trim()} ${form.lastName.trim()}`.trim() === user?.name;

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setStatus(null);
    try {
      const { data } = await api.patch("/users/profile", { firstName: form.firstName.trim(), lastName: form.lastName.trim() });
      updateUser({ name: data.user.name, lastProfileUpdateDate: data.user.lastProfileUpdateDate });
      setStatus({ ok: true, text: t("settings.nameSaved") });
    } catch (err) {
      setStatus({ ok: false, text: errorText(err, t("settings.failed")) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Section title={t("settings.nameSection")}>
      <form onSubmit={save} className="flex flex-col gap-3">
        <div className="grid gap-3 min-[520px]:grid-cols-2">
          <Field
            label={t("settings.firstName")}
            value={form.firstName}
            maxLength={40}
            required
            disabled={locked || saving}
            onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
          />
          <Field
            label={t("settings.lastName")}
            value={form.lastName}
            maxLength={40}
            disabled={locked || saving}
            onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
          />
        </div>
        {locked ? (
          <div className="flex gap-2 items-start rounded-md bg-hx-input px-3 py-2 text-[14px]">
            <Icon name="clock" size={18} />
            <span>
              <b className="font-semibold">{t("settings.nameLocked")}</b>{" "}
              {t("settings.nameLockedUntil", {
                date: unlockAt.toLocaleString(locale, { dateStyle: "long", timeStyle: "short" }),
              })}
            </span>
          </div>
        ) : (
          <p className="text-[13px] text-hx-text2">{t("settings.nameRule")}</p>
        )}
        <Status status={status} />
        <button type="submit" disabled={locked || saving || unchanged || !form.firstName.trim()} className="btn-primary self-start">
          {saving ? t("common.saving") : t("common.save")}
        </button>
      </form>
    </Section>
  );
}

function EmailForm() {
  const { user, updateUser } = useAuth();
  const { t } = useLanguage();
  const [email, setEmail] = useState(user?.email || "");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);
  const changed = email.trim().toLowerCase() !== (user?.email || "");

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setStatus(null);
    try {
      const { data } = await api.patch("/users/profile", { email: email.trim(), currentPassword: password });
      updateUser({ email: data.user.email });
      setEmail(data.user.email);
      setPassword("");
      setStatus({ ok: true, text: t("settings.emailSaved") });
    } catch (err) {
      setStatus({ ok: false, text: errorText(err, t("settings.failed")) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Section title={t("settings.emailSection")}>
      <form onSubmit={save} className="flex flex-col gap-3">
        <Field label={t("settings.emailLabel")} type="email" value={email} required onChange={(e) => setEmail(e.target.value)} />
        {changed && (
          <Field
            label={t("settings.emailPassword")}
            type="password"
            autoComplete="current-password"
            value={password}
            required
            onChange={(e) => setPassword(e.target.value)}
          />
        )}
        <Status status={status} />
        <button type="submit" disabled={saving || !changed || !password} className="btn-primary self-start">
          {saving ? t("common.saving") : t("common.save")}
        </button>
      </form>
    </Section>
  );
}

function PasswordForm() {
  const { t } = useLanguage();
  const empty = { currentPassword: "", newPassword: "", confirm: "" };
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    if (form.newPassword.length < 6) return setStatus({ ok: false, text: t("password.tooShort") });
    if (form.newPassword !== form.confirm) return setStatus({ ok: false, text: t("password.mismatch") });
    setSaving(true);
    setStatus(null);
    try {
      await api.post("/auth/change-password", { currentPassword: form.currentPassword, newPassword: form.newPassword });
      setForm(empty);
      setStatus({ ok: true, text: t("settings.passwordChanged") });
    } catch (err) {
      setStatus({ ok: false, text: errorText(err, t("settings.failed")) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Section title={t("settings.changePassword")}>
      <form onSubmit={save} className="flex flex-col gap-3">
        <Field label={t("settings.currentPassword")} type="password" autoComplete="current-password" required value={form.currentPassword} onChange={set("currentPassword")} />
        <Field label={t("settings.newPassword")} type="password" autoComplete="new-password" required minLength={6} value={form.newPassword} onChange={set("newPassword")} />
        <Field label={t("settings.confirmPassword")} type="password" autoComplete="new-password" required value={form.confirm} onChange={set("confirm")} />
        <Status status={status} />
        <button type="submit" disabled={saving} className="btn-primary self-start">
          {saving ? t("common.saving") : t("settings.changePassword")}
        </button>
      </form>
    </Section>
  );
}

function LanguagePicker() {
  const { t, lang, setLang } = useLanguage();
  return (
    <Section title={t("settings.language")}>
      <p className="text-[15px] text-hx-text2">{t("settings.languageText")}</p>
      <div role="radiogroup" className="flex flex-col gap-1">
        {LANGUAGES.map((l) => (
          <label key={l.code} className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-hx-hover">
            <input type="radio" name="language" checked={lang === l.code} onChange={() => setLang(l.code)} className="w-4 h-4 accent-[rgb(var(--accent))]" />
            <span className="font-medium">{l.label}</span>
            <span className="text-[13px] text-hx-text2">{l.short}</span>
          </label>
        ))}
      </div>
    </Section>
  );
}

// /settings - Settings & privacy: personal information (name with a 7-day
// cooldown, email), security (change password) and language. ?tab= picks the tab.
export default function Settings() {
  const { t } = useLanguage();
  const [params, setParams] = useSearchParams();
  const tab = TABS.some((x) => x.key === params.get("tab")) ? params.get("tab") : "personal";

  return (
    <div className="min-h-screen bg-hx-bg">
      <Header />
      <div className="max-w-[900px] mx-auto px-2 py-4 min-[600px]:px-6 min-[600px]:py-6 flex flex-col min-[760px]:flex-row gap-4 items-start">
        <nav className="card w-full min-[760px]:w-[260px] flex-shrink-0 p-2" aria-label={t("settings.title")}>
          <h1 className="text-2xl font-bold px-2 pt-1 pb-2 break-words">{t("settings.title")}</h1>
          <div role="tablist" className="flex min-[760px]:flex-col gap-1 overflow-x-auto scrollbar-none">
            {TABS.map((x) => (
              <button
                key={x.key}
                role="tab"
                aria-selected={tab === x.key}
                onClick={() => setParams({ tab: x.key }, { replace: true })}
                className={`flex items-center gap-3 p-2 rounded-lg text-left font-medium whitespace-nowrap min-[760px]:whitespace-normal transition-colors ${
                  tab === x.key ? "bg-hx-accent-soft text-hx-accent" : "hover:bg-hx-hover"
                }`}
              >
                <span className="w-9 h-9 rounded-full bg-hx-btn flex items-center justify-center flex-shrink-0">
                  <Icon name={x.icon} size={18} />
                </span>
                {t(x.label)}
              </button>
            ))}
          </div>
        </nav>

        <main className="flex-1 min-w-0 w-full flex flex-col gap-4">
          {tab === "personal" && (
            <>
              <NameForm />
              <EmailForm />
            </>
          )}
          {tab === "security" && <PasswordForm />}
          {tab === "language" && <LanguagePicker />}
        </main>
      </div>
    </div>
  );
}
