import type { ReactElement } from "react";
import { LocalizedText } from "@/components/i18n/LocalizedText";
import type { SupportedLanguage } from "@/lib/i18n";

type CopyValue = string | readonly string[];
type CopyShape = Record<string, CopyValue>;
type Localized<T extends CopyShape> = { [K in keyof T]: T[K] extends string ? ReactElement : ReactElement[] };

/**
 * Copy for server components. Pass the Indonesian and English text with the
 * same keys; each value comes back as an element that follows the language
 * toggle in the browser right away. Use it for text children only. For
 * placeholders and <option> labels, read the plain strings from the same
 * objects and use LocalizedInput / LocalizedOption.
 */
export function localizedCopy<T extends CopyShape>(copy: { id: T; en: { [K in keyof T]: T[K] extends string ? string : readonly string[] } }): Localized<T> {
  const result = {} as Record<string, ReactElement | ReactElement[]>;
  for (const key of Object.keys(copy.id)) {
    const id = copy.id[key];
    const en = copy.en[key as keyof T] as CopyValue;
    result[key] = typeof id === "string"
      ? <LocalizedText key={key} id={id} en={en as string} />
      : id.map((text, index) => <LocalizedText key={`${key}-${index}`} id={text} en={(en as readonly string[])[index] ?? text} />);
  }
  return result as Localized<T>;
}

/**
 * Text a server component builds with a language-aware formatter (dates,
 * fallbacks, durations). Both versions are rendered on the server; the
 * browser shows the one for the active language.
 */
export function bilingual(render: (language: SupportedLanguage) => string): ReactElement {
  return <LocalizedText id={render("id")} en={render("en")} />;
}
