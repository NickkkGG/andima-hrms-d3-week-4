import { cookies } from "next/headers";
import { languageCookieName, normalizeLanguage } from "@/lib/i18n";

/** Reads the same persisted preference used by the global language toggle. */
export async function getServerLanguage() {
  const cookieStore = await cookies();
  return normalizeLanguage(cookieStore.get(languageCookieName)?.value);
}
