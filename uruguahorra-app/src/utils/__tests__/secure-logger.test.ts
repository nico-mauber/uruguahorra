/**
 * Tests para verificar la sanitización de logs
 * Asegura que no se exponga información sensible
 */

import { SecureLogger } from '../secure-logger';

describe('SecureLogger Sanitization', () => {
  describe('Sensitive Fields Redaction', () => {
    test('should redact password fields', () => {
      const data = {
        email: 'user@example.com',
        password: 'super-secret-password-123',
        username: 'testuser',
      };

      const sanitized = SecureLogger.sanitizeData(data);
      expect(sanitized).toEqual({
        email: 'us***m@example.com',
        password: '[REDACTED]',
        username: 'testuser',
      });
    });

    test('should redact various token fields', () => {
      const data = {
        token: 'abc123token',
        access_token: 'bearer-token-xyz',
        refresh_token: 'refresh-xyz',
        apiKey: 'secret-api-key',
        api_key: 'another-secret-key',
        authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      };

      const sanitized = SecureLogger.sanitizeData(data);
      Object.values(sanitized).forEach((value) => {
        expect(value).toBe('[REDACTED]');
      });
    });

    test('should detect and redact JWT tokens in strings', () => {
      const data = {
        message:
          'User authenticated with token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
      };

      const sanitized = SecureLogger.sanitizeData(data);
      expect(sanitized.message).toContain('[REDACTED]');
      expect(sanitized.message).not.toContain('eyJ');
    });

    test('should redact credit card patterns', () => {
      const data = {
        card: '4111 1111 1111 1111',
        cvv: 'CVV: 123',
        payment: 'Card ending in 1234',
      };

      const sanitized = SecureLogger.sanitizeData(data);
      expect(sanitized.card).toBe('[REDACTED]');
      expect(sanitized.cvv).toContain('[REDACTED]');
    });
  });

  describe('Log Injection Prevention', () => {
    test('should remove control characters', () => {
      const data = {
        message: 'Normal message\x00\x01\x02\x1F with control chars',
      };

      const sanitized = SecureLogger.sanitizeData(data);
      expect(sanitized.message).toBe('Normal message with control chars');
    });

    test('should remove ANSI escape sequences', () => {
      const data = {
        message: 'Text with \x1b[31mred color\x1b[0m codes',
      };

      const sanitized = SecureLogger.sanitizeData(data);
      expect(sanitized.message).toBe('Text with red color codes');
    });

    test('should replace newline characters to prevent log injection', () => {
      const data = {
        userInput: 'Normal text\n[ERROR] FAKE ERROR\r\n[CRITICAL] Injected log',
      };

      const sanitized = SecureLogger.sanitizeData(data);
      expect(sanitized.userInput).not.toContain('\n');
      expect(sanitized.userInput).not.toContain('\r');
      expect(sanitized.userInput).toContain(
        'Normal text [ERROR] FAKE ERROR  [CRITICAL] Injected log'
      );
    });
  });

  describe('Email and Phone Obfuscation', () => {
    test('should partially obfuscate email addresses', () => {
      const data = {
        email: 'john.doe@example.com',
        user_email: 'admin@company.org',
      };

      const sanitized = SecureLogger.sanitizeData(data);
      expect(sanitized.email).toBe('jo***e@example.com');
      expect(sanitized.user_email).toBe('ad***n@company.org');
    });

    test('should partially obfuscate phone numbers', () => {
      const data = {
        phone: '+1-555-123-4567',
        telephone: '555 123 4567',
      };

      const sanitized = SecureLogger.sanitizeData(data);
      expect(sanitized.phone).toBe('***-4567');
      expect(sanitized.telephone).toBe('***-4567');
    });
  });

  describe('Error Sanitization', () => {
    test('should sanitize error objects', () => {
      const error = new Error(
        'Database connection failed with password=secret123'
      );
      error.stack = 'Stack trace with api_key=xyz789';

      const sanitized = SecureLogger.sanitizeError(error);
      expect(sanitized.message).not.toContain('secret123');
      expect(sanitized.message).toContain('[REDACTED]');
      expect(sanitized.stack).not.toContain('xyz789');
      expect(sanitized.stack).toContain('[REDACTED]');
    });

    test('should handle non-Error objects', () => {
      const error = {
        code: 'AUTH_FAILED',
        details: {
          password: 'user-password',
          attempts: 3,
        },
      };

      const sanitized = SecureLogger.sanitizeError(error);
      expect(sanitized.details.password).toBe('[REDACTED]');
      expect(sanitized.details.attempts).toBe(3);
    });
  });

  describe('Nested Object Sanitization', () => {
    test('should sanitize deeply nested objects', () => {
      const data = {
        user: {
          profile: {
            email: 'user@test.com',
            settings: {
              apiKey: 'secret-key',
              preferences: {
                theme: 'dark',
                notifications: true,
              },
            },
          },
        },
      };

      const sanitized = SecureLogger.sanitizeData(data);
      expect(sanitized.user.profile.email).toBe('us***m@test.com');
      expect(sanitized.user.profile.settings.apiKey).toBe('[REDACTED]');
      expect(sanitized.user.profile.settings.preferences.theme).toBe('dark');
    });

    test('should handle circular references', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any = { name: 'test' };
      data.circular = data;

      // Should not throw error
      expect(() => SecureLogger.sanitizeData(data)).not.toThrow();
    });

    test('should respect max depth limit', () => {
      const deeplyNested = {
        l1: {
          l2: { l3: { l4: { l5: { l6: { l7: { password: 'secret' } } } } } },
        },
      };

      const sanitized = SecureLogger.sanitizeData(deeplyNested);
      // At max depth, should show MAX_DEPTH_EXCEEDED
      expect(JSON.stringify(sanitized)).toContain('MAX_DEPTH_EXCEEDED');
    });
  });

  describe('String Truncation', () => {
    test('should truncate very long strings', () => {
      const longString = 'x'.repeat(2000);
      const data = { message: longString };

      const sanitized = SecureLogger.sanitizeData(data);
      expect(sanitized.message.length).toBeLessThan(1100);
      expect(sanitized.message).toContain('[TRUNCATED]');
    });
  });

  describe('Safe Summary Creation', () => {
    test('should create safe JSON summary', () => {
      const data = {
        user: 'john',
        password: 'secret',
        action: 'login',
      };

      const summary = SecureLogger.createSafeSummary(data);
      const parsed = JSON.parse(summary);
      expect(parsed.password).toBe('[REDACTED]');
      expect(parsed.user).toBe('john');
    });

    test('should handle serialization errors gracefully', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = { circular: null as any };
      data.circular = data; // Create circular reference

      const summary = SecureLogger.createSafeSummary(data);
      expect(summary).toBe('[SERIALIZATION_ERROR]');
    });
  });
});

// Ejemplos de uso en el código real
describe('Real-world Usage Examples', () => {

  test('Auth service logging should not expose credentials', () => {
    const authLog = {
      action: 'signUp',
      email: 'newuser@example.com',
      password: 'MySecurePassword123!',
      metadata: {
        country: 'Uruguay',
        referralCode: 'ABC123',
      },
    };

    const sanitized = SecureLogger.sanitizeData(authLog);
    expect(sanitized.password).toBe('[REDACTED]');
    expect(sanitized.email).toBe('ne***r@example.com');
    expect(sanitized.metadata.country).toBe('Uruguay');
  });

  test('Supabase error should be sanitized', () => {
    const supabaseError = {
      message: 'Authentication failed',
      status: 401,
      details: {
        email: 'user@test.com',
        password: 'wrong-password',
        auth_token: 'Bearer eyJhbGc...',
      },
    };

    const sanitized = SecureLogger.sanitizeData(supabaseError);
    expect(sanitized.details.password).toBe('[REDACTED]');
    expect(sanitized.details.auth_token).toBe('[REDACTED]');
    expect(sanitized.status).toBe(401);
  });
});
