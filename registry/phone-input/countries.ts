export type Country = {
  /** ISO 3166-1 alpha-2. Also makes the flag. */
  code: string;
  name: string;
  dial: string;
  /** `#` is a digit; anything else is printed as is. For display, not validation. */
  pattern: string;
  /** Fewest digits in a full national number, without the trunk 0. */
  min: number;
  /** National numbers are dialled with a leading 0 that drops after the code. */
  trunk?: boolean;
  /** Placeholder number, national format. */
  example: string;
};

export const COUNTRIES: Country[] = [
  { code: "US", name: "United States", dial: "1", pattern: "(###) ###-####", min: 10, example: "2015550123" },
  { code: "CA", name: "Canada", dial: "1", pattern: "(###) ###-####", min: 10, example: "6135550123" },
  { code: "GB", name: "United Kingdom", dial: "44", pattern: "#### ######", min: 10, trunk: true, example: "7400123456" },
  { code: "IE", name: "Ireland", dial: "353", pattern: "## ### ####", min: 9, trunk: true, example: "851234567" },
  { code: "FR", name: "France", dial: "33", pattern: "# ## ## ## ##", min: 9, trunk: true, example: "612345678" },
  { code: "DE", name: "Germany", dial: "49", pattern: "#### ########", min: 10, trunk: true, example: "15123456789" },
  { code: "ES", name: "Spain", dial: "34", pattern: "### ### ###", min: 9, example: "612345678" },
  { code: "IT", name: "Italy", dial: "39", pattern: "### ### ####", min: 9, example: "3123456789" },
  { code: "PT", name: "Portugal", dial: "351", pattern: "### ### ###", min: 9, example: "912345678" },
  { code: "NL", name: "Netherlands", dial: "31", pattern: "# ## ## ## ##", min: 9, trunk: true, example: "612345678" },
  { code: "BE", name: "Belgium", dial: "32", pattern: "### ## ## ##", min: 8, trunk: true, example: "470123456" },
  { code: "CH", name: "Switzerland", dial: "41", pattern: "## ### ## ##", min: 9, trunk: true, example: "781234567" },
  { code: "AT", name: "Austria", dial: "43", pattern: "### #######", min: 10, trunk: true, example: "6641234567" },
  { code: "SE", name: "Sweden", dial: "46", pattern: "##-### ## ##", min: 9, trunk: true, example: "701234567" },
  { code: "NO", name: "Norway", dial: "47", pattern: "### ## ###", min: 8, example: "40612345" },
  { code: "DK", name: "Denmark", dial: "45", pattern: "## ## ## ##", min: 8, example: "20123456" },
  { code: "FI", name: "Finland", dial: "358", pattern: "## ### ####", min: 9, trunk: true, example: "412345678" },
  { code: "PL", name: "Poland", dial: "48", pattern: "### ### ###", min: 9, example: "512345678" },
  { code: "GR", name: "Greece", dial: "30", pattern: "### ### ####", min: 10, example: "6912345678" },
  { code: "IL", name: "Israel", dial: "972", pattern: "##-###-####", min: 9, trunk: true, example: "501234567" },
  { code: "AE", name: "United Arab Emirates", dial: "971", pattern: "## ### ####", min: 9, trunk: true, example: "501234567" },
  { code: "ZA", name: "South Africa", dial: "27", pattern: "## ### ####", min: 9, trunk: true, example: "711234567" },
  { code: "NG", name: "Nigeria", dial: "234", pattern: "### ### ####", min: 10, trunk: true, example: "8021234567" },
  { code: "KE", name: "Kenya", dial: "254", pattern: "### ######", min: 9, trunk: true, example: "712123456" },
  { code: "IN", name: "India", dial: "91", pattern: "##### #####", min: 10, trunk: true, example: "9123456789" },
  { code: "SG", name: "Singapore", dial: "65", pattern: "#### ####", min: 8, example: "81234567" },
  { code: "HK", name: "Hong Kong", dial: "852", pattern: "#### ####", min: 8, example: "51234567" },
  { code: "CN", name: "China", dial: "86", pattern: "### #### ####", min: 11, example: "13123456789" },
  { code: "JP", name: "Japan", dial: "81", pattern: "##-####-####", min: 10, trunk: true, example: "9012345678" },
  { code: "KR", name: "South Korea", dial: "82", pattern: "##-####-####", min: 9, trunk: true, example: "1012345678" },
  { code: "AU", name: "Australia", dial: "61", pattern: "### ### ###", min: 9, trunk: true, example: "412345678" },
  { code: "NZ", name: "New Zealand", dial: "64", pattern: "## ### ####", min: 8, trunk: true, example: "211234567" },
  { code: "MX", name: "Mexico", dial: "52", pattern: "## #### ####", min: 10, example: "5512345678" },
  { code: "BR", name: "Brazil", dial: "55", pattern: "## #####-####", min: 10, trunk: true, example: "11961234567" },
  { code: "AR", name: "Argentina", dial: "54", pattern: "## ####-####", min: 10, trunk: true, example: "1123456789" },
];

/** Two regional indicator letters, which platforms draw as the flag. */
export function flag(code: string) {
  return String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}
