import {
  hasFormErrors,
  validateLoginForm,
  validateRegisterForm,
} from './authValidation';

describe('auth form validation', () => {
  it('requires valid login fields', () => {
    expect(hasFormErrors(validateLoginForm('', ''))).toBe(true);
    expect(validateLoginForm('not-an-email', 'short').email).toBeDefined();
    expect(
      hasFormErrors(validateLoginForm('user@example.com', 'Password1')),
    ).toBe(false);
  });

  it('requires first and last name during registration', () => {
    expect(
      validateRegisterForm('', '', 'user@example.com', 'Password1', 'Password1'),
    ).toMatchObject({
      firstName: 'Adınızı girin.',
      lastName: 'Soyadınızı girin.',
    });
  });

  it('requires a letter and number in registration passwords', () => {
    expect(
      validateRegisterForm(
        'Ada',
        'Lovelace',
        'user@example.com',
        '12345678',
        '12345678',
      ).password,
    ).toContain('harf');
    expect(
      validateRegisterForm(
        'Ada',
        'Lovelace',
        'user@example.com',
        'abcdefgh',
        'abcdefgh',
      ).password,
    ).toContain('rakam');
  });

  it('requires matching password confirmation', () => {
    expect(
      validateRegisterForm(
        'Ada',
        'Lovelace',
        'user@example.com',
        'Password1',
        'Password2',
      ).confirmPassword,
    ).toBe('Şifreler eşleşmiyor.');
    expect(
      hasFormErrors(
        validateRegisterForm(
          'Ada',
          'Lovelace',
          'user@example.com',
          'Password1',
          'Password1',
        ),
      ),
    ).toBe(false);
  });
});
