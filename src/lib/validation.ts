export const NICKNAME_MIN = 3;
export const NICKNAME_MAX = 16;
export const PASSWORD_MIN = 8;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const NICKNAME_RE = /^[A-Za-z0-9_]+$/;

export function validateEmail(email: string): string | null {
  const value = email.trim();
  if (!value) return 'Enter your email';
  if (!EMAIL_RE.test(value)) return "That email doesn't look right";
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) return 'Create a password';
  if (password.length < PASSWORD_MIN) return `Use at least ${PASSWORD_MIN} characters`;
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return 'Mix letters and numbers';
  return null;
}

/** 0 = empty, 1 = weak, 2 = good, 3 = strong. */
export function passwordStrength(password: string): 0 | 1 | 2 | 3 {
  if (!password) return 0;
  let score = 1;
  if (password.length >= PASSWORD_MIN && /[A-Za-z]/.test(password) && /\d/.test(password)) score++;
  if (score === 2 && (password.length >= 12 || /[^A-Za-z0-9]/.test(password))) score++;
  return score as 1 | 2 | 3;
}

export function validateNickname(nickname: string): string | null {
  const value = nickname.trim();
  if (!value) return 'Pick a nickname';
  if (value.length < NICKNAME_MIN) return `At least ${NICKNAME_MIN} characters`;
  if (value.length > NICKNAME_MAX) return `At most ${NICKNAME_MAX} characters`;
  if (!NICKNAME_RE.test(value)) return 'Letters, numbers and _ only';
  return null;
}
