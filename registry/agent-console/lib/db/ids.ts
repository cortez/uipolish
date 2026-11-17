/** "run_8fK2c1x9": a prefix and eight random characters. Works on the server and in the browser. */
export function newId(prefix: string) {
  const alphabet = "0123456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return `${prefix}_${[...bytes].map((b) => alphabet[b % alphabet.length]).join("")}`;
}
