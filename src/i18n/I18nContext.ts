import { createContext } from "react";
import { translations, type Lang } from "./translations";

export type Translations = typeof translations.en;

export interface I18nContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: Translations;
  helpMode: boolean;
  setHelpMode: (v: boolean) => void;
}

export const I18nContext = createContext<I18nContextValue | null>(null);
