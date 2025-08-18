import crypto from 'crypto';

const ENC_ALGO = 'aes-256-gcm';
const ENC_KEY = (() => {
  const raw = process.env.ENCRYPTION_SECRET || '';
  if (raw.length < 32) {
    // Derive a 32-byte key from provided secret
    return crypto.createHash('sha256').update(raw || 'default-insecure-key').digest();
  }
  return Buffer.from(raw.slice(0, 32));
})();

export function encryptSecret(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ENC_ALGO, ENC_KEY, iv);
  const enc = Buffer.concat([cipher.update(Buffer.from(plain, 'utf8')), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64');
}

export function decryptSecret(encB64: string): string {
  const buf = Buffer.from(encB64, 'base64');
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const data = buf.subarray(28);
  const decipher = crypto.createDecipheriv(ENC_ALGO, ENC_KEY, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(data), decipher.final()]);
  return dec.toString('utf8');
}


