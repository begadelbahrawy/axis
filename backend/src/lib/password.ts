// Mirrors generatePassword() from the reference prototype.
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';

export function generateTempPassword(): string {
  let p = '';
  for (let i = 0; i < 8; i++) p += CHARS[Math.floor(Math.random() * CHARS.length)];
  return p;
}
