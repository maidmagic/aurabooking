const PII_PATTERNS = [
  /\b\d{5}(-\d{4})?\b/g,
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
  /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
  /\b(?:\d[ -]*?){13,16}\b/g,
  /\bM[rz]\.\s[A-Z][a-z]+\b/g,
  /\b\d{3}[-.]?\d{2}[-.]?\d{4}\b/g,
];

export function redactPII(text: string): string {
  let result = text;
  result = result.replace(PII_PATTERNS[0], "[REDACTED_ZIP]");
  result = result.replace(PII_PATTERNS[1], "[REDACTED_EMAIL]");
  result = result.replace(PII_PATTERNS[2], "[REDACTED_PHONE]");
  result = result.replace(PII_PATTERNS[3], "[REDACTED_CREDIT_CARD]");
  result = result.replace(PII_PATTERNS[4], (match) => {
    return "[REDACTED_NAME]";
  });
  result = result.replace(PII_PATTERNS[5], "[REDACTED_SSN]");
  return result;
}
