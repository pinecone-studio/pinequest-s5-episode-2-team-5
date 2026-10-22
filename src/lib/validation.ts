export const NICKNAME_MIN = 3;
export const NICKNAME_MAX = 16;
export const PASSWORD_MIN = 8;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const NICKNAME_RE = /^[A-Za-z0-9_]+$/;

export function validateEmail(email: string): string | null {
  const value = email.trim();
  if (!value) return 'Имэйлээ оруулна уу';
  if (!EMAIL_RE.test(value)) return 'Имэйл хаяг буруу байна';
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) return 'Нууц үг үүсгэнэ үү';
  if (password.length < PASSWORD_MIN) return `Дор хаяж ${PASSWORD_MIN} тэмдэгт ашиглана уу`;
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return 'Үсэг, тоо хольж бичнэ үү';
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
  if (!value) return 'Хоч нэрээ оруулна уу';
  if (value.length < NICKNAME_MIN) return `Дор хаяж ${NICKNAME_MIN} тэмдэгт`;
  if (value.length > NICKNAME_MAX) return `Хамгийн ихдээ ${NICKNAME_MAX} тэмдэгт`;
  if (!NICKNAME_RE.test(value)) return 'Зөвхөн латин үсэг, тоо болон _ ашиглана';
  return null;
}
