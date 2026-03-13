import { useState, useCallback, type ReactNode } from "react";
import { I18nContext } from "./I18nContext";
import { translations, type Lang } from "./translations";

const STORAGE_LANG = "blue-intelligence-lang";

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    try {
      const s = localStorage.getItem(STORAGE_LANG);
      if (s === "fr" || s === "en") return s;
    } catch {}
    return "en";
  });
  const [helpMode, setHelpMode] = useState(false);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(STORAGE_LANG, l);
    } catch {}
  }, []);

  const value = {
    lang,
    setLang,
    t: translations[lang],
    helpMode,
    setHelpMode,
  };

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
