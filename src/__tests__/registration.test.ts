import { describe, it, expect } from 'vitest';
import { registrationSchema } from '@/lib/validation';

describe('Registration Schema Validation', () => {
  describe('Valid Registration Data', () => {
    it('should validate correct registration data', () => {
      const validData = {
        name: 'John Doe',
        email: 'john@example.com',
        username: 'johndoe123',
        password: 'securepassword123',
      };

      const result = registrationSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should accept username with underscores', () => {
      const validData = {
        name: 'Jane',
        email: 'jane@example.com',
        username: 'jane_doe_2024',
        password: 'password123',
      };

      const result = registrationSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should accept minimum valid username (3 chars)', () => {
      const validData = {
        name: 'Bob',
        email: 'bob@example.com',
        username: 'bob',
        password: 'password123',
      };

      const result = registrationSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should accept maximum valid username (20 chars)', () => {
      const validData = {
        name: 'Alice',
        email: 'alice@example.com',
        username: 'alice_12345678901234', // exactly 20 chars
        password: 'password123',
      };

      const result = registrationSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should accept minimum valid password (8 chars)', () => {
      const validData = {
        name: 'Test User',
        email: 'test@example.com',
        username: 'testuser',
        password: '12345678', // exactly 8 chars
      };

      const result = registrationSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('Invalid Name', () => {
    it('should reject empty name', () => {
      const invalidData = {
        name: '',
        email: 'test@example.com',
        username: 'testuser',
        password: 'password123',
      };

      const result = registrationSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Name is required');
      }
    });

    it('should reject missing name', () => {
      const invalidData = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'password123',
      };

      const result = registrationSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('Invalid Email', () => {
    it('should reject invalid email format', () => {
      const invalidData = {
        name: 'Test User',
        email: 'not-an-email',
        username: 'testuser',
        password: 'password123',
      };

      const result = registrationSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Invalid email address');
      }
    });

    it('should reject email without @', () => {
      const invalidData = {
        name: 'Test User',
        email: 'testexample.com',
        username: 'testuser',
        password: 'password123',
      };

      const result = registrationSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject email without domain', () => {
      const invalidData = {
        name: 'Test User',
        email: 'test@',
        username: 'testuser',
        password: 'password123',
      };

      const result = registrationSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject missing email', () => {
      const invalidData = {
        name: 'Test User',
        username: 'testuser',
        password: 'password123',
      };

      const result = registrationSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('Invalid Username', () => {
    it('should reject username too short (less than 3 chars)', () => {
      const invalidData = {
        name: 'Test User',
        email: 'test@example.com',
        username: 'ab',
        password: 'password123',
      };

      const result = registrationSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Username must be at least 3 characters');
      }
    });

    it('should reject username too long (more than 20 chars)', () => {
      const invalidData = {
        name: 'Test User',
        email: 'test@example.com',
        username: 'this_username_is_way_too_long',
        password: 'password123',
      };

      const result = registrationSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Username must be at most 20 characters');
      }
    });

    it('should reject username with uppercase letters', () => {
      const invalidData = {
        name: 'Test User',
        email: 'test@example.com',
        username: 'TestUser',
        password: 'password123',
      };

      const result = registrationSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Username can only contain lowercase letters, numbers, and underscores');
      }
    });

    it('should reject username with spaces', () => {
      const invalidData = {
        name: 'Test User',
        email: 'test@example.com',
        username: 'test user',
        password: 'password123',
      };

      const result = registrationSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Username can only contain lowercase letters, numbers, and underscores');
      }
    });

    it('should reject username with special characters', () => {
      const invalidData = {
        name: 'Test User',
        email: 'test@example.com',
        username: 'test@user!',
        password: 'password123',
      };

      const result = registrationSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Username can only contain lowercase letters, numbers, and underscores');
      }
    });

    it('should reject username with hyphens', () => {
      const invalidData = {
        name: 'Test User',
        email: 'test@example.com',
        username: 'test-user',
        password: 'password123',
      };

      const result = registrationSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Username can only contain lowercase letters, numbers, and underscores');
      }
    });

    it('should reject missing username', () => {
      const invalidData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      };

      const result = registrationSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('Invalid Password', () => {
    it('should reject password too short (less than 8 chars)', () => {
      const invalidData = {
        name: 'Test User',
        email: 'test@example.com',
        username: 'testuser',
        password: 'short',
      };

      const result = registrationSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Password must be at least 8 characters');
      }
    });

    it('should reject password with exactly 7 chars', () => {
      const invalidData = {
        name: 'Test User',
        email: 'test@example.com',
        username: 'testuser',
        password: '1234567',
      };

      const result = registrationSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Password must be at least 8 characters');
      }
    });

    it('should reject missing password', () => {
      const invalidData = {
        name: 'Test User',
        email: 'test@example.com',
        username: 'testuser',
      };

      const result = registrationSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject empty password', () => {
      const invalidData = {
        name: 'Test User',
        email: 'test@example.com',
        username: 'testuser',
        password: '',
      };

      const result = registrationSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('Multiple Invalid Fields', () => {
    it('should report all validation errors when multiple fields are invalid', () => {
      const invalidData = {
        name: '',
        email: 'not-an-email',
        username: 'AB', // too short and has uppercase
        password: '123', // too short
      };

      const result = registrationSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        // Should have multiple errors
        expect(result.error.issues.length).toBeGreaterThan(1);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle username with only numbers', () => {
      const validData = {
        name: 'Test User',
        email: 'test@example.com',
        username: '123456',
        password: 'password123',
      };

      const result = registrationSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should handle username with only underscores and numbers', () => {
      const validData = {
        name: 'Test User',
        email: 'test@example.com',
        username: '___123___',
        password: 'password123',
      };

      const result = registrationSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should accept email with subdomain', () => {
      const validData = {
        name: 'Test User',
        email: 'test@mail.example.com',
        username: 'testuser',
        password: 'password123',
      };

      const result = registrationSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should accept email with plus sign', () => {
      const validData = {
        name: 'Test User',
        email: 'test+tag@example.com',
        username: 'testuser',
        password: 'password123',
      };

      const result = registrationSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });
});
