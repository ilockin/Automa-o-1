export type MatchType = "contains" | "exact" | "any";

// Combining diacritical marks (U+0300–U+036F), montado por escape para
// manter o código-fonte em ASCII puro.
const DIACRITICS = new RegExp("[\\u0300-\\u036f]", "g");

// Normaliza para comparar: minúsculas, sem acento, sem espaços nas pontas.
function normalize(s: string): string {
  return s.trim().toLowerCase().normalize("NFD").replace(DIACRITICS, "");
}

// Decide se um texto casa com as palavras-chave da automação.
// - "any": qualquer texto casa (ignora keywords)
// - "exact": o texto inteiro precisa ser igual a uma keyword
// - "contains": o texto precisa conter uma keyword
export function matchKeyword(
  text: string,
  keywords: string[],
  matchType: MatchType
): boolean {
  if (matchType === "any") return true;
  const t = normalize(text || "");
  if (!t) return false;
  return keywords.some((k) => {
    const kk = normalize(k);
    if (!kk) return false;
    return matchType === "exact" ? t === kk : t.includes(kk);
  });
}
