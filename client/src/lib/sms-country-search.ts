export interface SmsCountrySearchRow {
  name: string;
  code?: string | null;
}

function normalizeSearchText(value: string) {
  return value.trim().toLowerCase();
}

function getCountrySearchTerms(country: SmsCountrySearchRow): string[] {
  const name = normalizeSearchText(country.name);
  const code = country.code ? normalizeSearchText(country.code) : '';
  const terms = new Set<string>([name]);

  if (code) {
    terms.add(code);
  }

  if (name === 'usa' || code === 'us') {
    terms.add('united states');
    terms.add('united states of america');
    terms.add('america');
    terms.add('u.s.');
    terms.add('u.s.a.');
  }

  return [...terms];
}

export function matchesSmsCountrySearch(country: SmsCountrySearchRow, query: string) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return true;

  return getCountrySearchTerms(country).some((term) => term.includes(normalizedQuery));
}
