const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type LoginFormErrors = {
  email?: string;
  password?: string;
};

export type RegisterFormErrors = LoginFormErrors & {
  firstName?: string;
  lastName?: string;
  confirmPassword?: string;
};

function validateEmail(email: string) {
  if (!email.trim()) {
    return 'E-posta adresinizi girin.';
  }

  if (!EMAIL_PATTERN.test(email.trim())) {
    return 'Geçerli bir e-posta adresi girin.';
  }
}

function validatePassword(password: string) {
  if (!password) {
    return 'Şifrenizi girin.';
  }

  if (password.length < 8) {
    return 'Şifre en az 8 karakter olmalıdır.';
  }
}

export function validateLoginForm(
  email: string,
  password: string,
): LoginFormErrors {
  return {
    email: validateEmail(email),
    password: validatePassword(password),
  };
}

export function validateRegisterForm(
  firstName: string,
  lastName: string,
  email: string,
  password: string,
  confirmPassword: string,
): RegisterFormErrors {
  const errors: RegisterFormErrors = validateLoginForm(email, password);

  if (!firstName.trim()) {
    errors.firstName = 'Adınızı girin.';
  }

  if (!lastName.trim()) {
    errors.lastName = 'Soyadınızı girin.';
  }

  if (password && password.length >= 8 && !/[A-Za-z]/.test(password)) {
    errors.password = 'Şifre en az bir harf içermelidir.';
  } else if (password && password.length >= 8 && !/\d/.test(password)) {
    errors.password = 'Şifre en az bir rakam içermelidir.';
  }

  if (!confirmPassword) {
    errors.confirmPassword = 'Şifrenizi tekrar girin.';
  } else if (password !== confirmPassword) {
    errors.confirmPassword = 'Şifreler eşleşmiyor.';
  }

  return errors;
}

export function hasFormErrors(errors: object) {
  return Object.values(errors).some(Boolean);
}
