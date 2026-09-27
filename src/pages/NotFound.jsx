import { Link } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";

export default function NotFound() {
  const { t } = useLanguage();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-center px-4">
      <h1 className="text-6xl font-bold text-fb-blue">404</h1>
      <p className="text-fb-muted dark:text-fb-muted-dark">{t("notFound.text")}</p>
      <Link to="/" className="btn-primary">
        {t("notFound.home")}
      </Link>
    </div>
  );
}
