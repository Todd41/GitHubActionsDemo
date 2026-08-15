export function greet(name, secretPhrase) {
  const who = name && name.trim() ? name.trim() : "world";
  const suffix = secretPhrase ? ` (${secretPhrase})` : "";
  return `Hello, ${who}!${suffix}`;
}
