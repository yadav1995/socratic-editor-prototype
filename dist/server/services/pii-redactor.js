/**
 * PII redaction before LLM context (Architecture §12).
 */
const PII_PATTERNS = [
  { name: 'email', regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, replacement: '[REDACTED_EMAIL]' },
  { name: 'phone', regex: /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g, replacement: '[REDACTED_PHONE]' },
  { name: 'ssn', regex: /\b\d{3}-\d{2}-\d{4}\b/g, replacement: '[REDACTED_SSN]' },
  { name: 'credit_card', regex: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g, replacement: '[REDACTED_CARD]' },
  { name: 'ip', regex: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, replacement: '[REDACTED_IP]' },
];

function redactContent(content) {
  if (!content) return { redacted: '', redactions: [] };

  let redacted = content;
  const redactions = [];

  for (const pattern of PII_PATTERNS) {
    const matches = content.match(pattern.regex);
    if (matches?.length) {
      redactions.push({ type: pattern.name, count: matches.length });
      redacted = redacted.replace(pattern.regex, pattern.replacement);
    }
  }

  return { redacted, redactions };
}

function redactFiles(files) {
  return files.map((file) => {
    const { redacted, redactions } = redactContent(file.content || '');
    return { ...file, content: redacted, redactions };
  });
}

module.exports = { redactContent, redactFiles };
