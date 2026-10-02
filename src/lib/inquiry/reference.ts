// No 0/O, 1/I/L, so the code is easy to read out over the phone.
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

/** Short code that ties a WhatsApp conversation to an inquiry list, e.g. "FL-7K3Q". */
export function newReferenceCode(random: () => number = Math.random): string {
  let code = "";
  for (let i = 0; i < 4; i++) code += ALPHABET[Math.floor(random() * ALPHABET.length)];
  return `FL-${code}`;
}
