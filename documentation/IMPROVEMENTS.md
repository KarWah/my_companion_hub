# My Companion Hub - Improvements & Roadmap

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Critical Security Issues](#critical-security-issues)
3. [High Priority Improvements](#high-priority-improvements)
4. [Medium Priority Enhancements](#medium-priority-enhancements)
5. [Low Priority Optimizations](#low-priority-optimizations)
6. [Architecture Improvements](#architecture-improvements)
7. [Feature Enhancements](#feature-enhancements)
8. [Implementation Roadmap](#implementation-roadmap)
9. [Testing Strategy](#testing-strategy)
10. [Monitoring & Observability](#monitoring--observability)

---

## Executive Summary

This document provides a comprehensive analysis of identified issues, suggested improvements, and a prioritized roadmap for the My Companion Hub application. The project shows solid foundational architecture but requires immediate attention to security concerns before production deployment.

### Issue Severity Breakdown

| Category | Critical | High | Medium | Low | Total |
|----------|----------|------|--------|-----|-------|
| Security Issues | 0 | 7 | 2 | 0 | 10 |
| Best Practices | 0 | 5 | 13 | 4 | 22 |
| Architecture | 0 | 0 | 3 | 1 | 4 |
| **TOTAL** | **0** | **12** | **18** | **5** | **36** |

### Immediate Actions Required

1. **HIGH**: Implement rate limiting on all public endpoints
2. **HIGH**: Strengthen password requirements
3. **HIGH**: Sanitize logged data to prevent sensitive information exposure


## High Priority Improvements

### 1. Weak Password Requirements

**Severity**: HIGH
**Status**: Should fix before production
**Files**: `src/lib/validation.ts:28-30`

#### Current Implementation

```typescript
password: z.string()
  .min(8, "Password must be at least 8 characters")
// No complexity requirements
```

#### Issues

- Only enforces minimum length
- No character diversity requirements
- Vulnerable to dictionary attacks
- Doesn't follow OWASP guidelines

#### Recommended Solution

```typescript
export const registrationSchema = z.object({
  // ... other fields
  password: z.string()
    .min(12, "Password must be at least 12 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[!@#$%^&*(),.?":{}|<>]/, "Password must contain at least one special character")
    .refine(
      (password) => !commonPasswords.includes(password.toLowerCase()),
      "This password is too common. Please choose a stronger password."
    )
});

// Optional: Add password strength indicator
export function calculatePasswordStrength(password: string): number {
  let strength = 0;
  if (password.length >= 8) strength += 20;
  if (password.length >= 12) strength += 20;
  if (password.length >= 16) strength += 20;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength += 20;
  if (/[0-9]/.test(password)) strength += 10;
  if (/[!@#$%^&*]/.test(password)) strength += 10;
  return strength;
}
```

**Additional Enhancements**:

1. **Password strength meter** in UI:
   ```typescript
   // components/PasswordStrengthMeter.tsx
   export function PasswordStrengthMeter({ password }: { password: string }) {
     const strength = calculatePasswordStrength(password);
     return (
       <div className="mt-2">
         <div className="flex gap-1">
           {[0, 1, 2, 3, 4].map((i) => (
             <div
               key={i}
               className={`h-2 flex-1 rounded ${
                 strength > i * 20 ? 'bg-green-500' : 'bg-slate-700'
               }`}
             />
           ))}
         </div>
         <p className="text-xs mt-1 text-slate-400">
           {strength < 40 && "Weak"}
           {strength >= 40 && strength < 70 && "Fair"}
           {strength >= 70 && strength < 90 && "Good"}
           {strength >= 90 && "Strong"}
         </p>
       </div>
     );
   }
   ```

2. **Implement password breach checking**:
   ```typescript
   // Use haveibeenpwned API
   import crypto from 'crypto';

   async function checkPasswordBreach(password: string): Promise<boolean> {
     const sha1 = crypto.createHash('sha1').update(password).digest('hex').toUpperCase();
     const prefix = sha1.slice(0, 5);
     const suffix = sha1.slice(5);

     const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
     const text = await response.text();

     return text.includes(suffix);
   }
   ```

**Estimated Time**: 4-6 hours
**Files to Modify**:
- `src/lib/validation.ts`
- `src/app/register/page.tsx`
- `src/components/PasswordStrengthMeter.tsx` (new)

---

### 2. Missing Rate Limiting

**Severity**: HIGH
**Status**: Required for production
**Files**: `src/app/auth-actions.ts`, `src/app/chat-actions.ts`, `src/app/image-actions.ts`

#### Issue

No rate limiting on any endpoints:
- Login attempts → brute force attacks
- Registration → spam accounts
- Chat messages → resource exhaustion
- Image generation → expensive API abuse

#### Recommended Solution

**Option 1: Using Upstash Rate Limit (Recommended)**

```bash
npm install @upstash/ratelimit @upstash/redis
```

```typescript
// lib/rate-limit.ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Different rate limiters for different operations
export const loginRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "15 m"), // 5 attempts per 15 minutes
  analytics: true,
  prefix: "@ratelimit/login",
});

export const registrationRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, "1 d"), // 3 registrations per day per IP
  analytics: true,
  prefix: "@ratelimit/register",
});

export const chatRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, "1 m"), // 30 messages per minute
  analytics: true,
  prefix: "@ratelimit/chat",
});

export const imageGenerationRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "1 h"), // 10 images per hour
  analytics: true,
  prefix: "@ratelimit/image",
});

// Helper function
export async function checkRateLimit(
  ratelimit: Ratelimit,
  identifier: string
): Promise<{ success: boolean; error?: string }> {
  const { success, limit, remaining, reset } = await ratelimit.limit(identifier);

  if (!success) {
    const resetDate = new Date(reset);
    return {
      success: false,
      error: `Rate limit exceeded. Try again at ${resetDate.toLocaleTimeString()}`
    };
  }

  return { success: true };
}
```

**Usage in Server Actions**:

```typescript
// src/app/auth-actions.ts
import { registrationRateLimit, checkRateLimit } from "@/lib/rate-limit";

export async function registerUser(formData: FormData) {
  const email = formData.get("email") as string;

  // Rate limit by email
  const rateLimitResult = await checkRateLimit(
    registrationRateLimit,
    email.toLowerCase()
  );

  if (!rateLimitResult.success) {
    return { success: false, error: rateLimitResult.error };
  }

  // ... rest of registration logic
}

// src/app/chat-actions.ts
import { chatRateLimit, checkRateLimit } from "@/lib/rate-limit";

export async function sendMessage(formData: FormData) {
  const user = await getAuthenticatedUser();

  // Rate limit by user ID
  const rateLimitResult = await checkRateLimit(
    chatRateLimit,
    user.id
  );

  if (!rateLimitResult.success) {
    return { success: false, error: rateLimitResult.error };
  }

  // ... rest of message logic
}

// src/app/image-actions.ts
import { imageGenerationRateLimit, checkRateLimit } from "@/lib/rate-limit";

export async function generateStandaloneImage(formData: FormData) {
  const user = await getAuthenticatedUser();

  const rateLimitResult = await checkRateLimit(
    imageGenerationRateLimit,
    user.id
  );

  if (!rateLimitResult.success) {
    return { success: false, error: rateLimitResult.error };
  }

  // ... rest of generation logic
}
```

**Option 2: Simple In-Memory Rate Limiting (Development Only)**

```typescript
// lib/simple-rate-limit.ts
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function simpleRateLimit(
  identifier: string,
  maxAttempts: number,
  windowMs: number
): boolean {
  const now = Date.now();
  const record = rateLimitStore.get(identifier);

  if (!record || now > record.resetTime) {
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime: now + windowMs
    });
    return true;
  }

  if (record.count >= maxAttempts) {
    return false;
  }

  record.count++;
  return true;
}
```

**Rate Limit Recommendations**:

| Endpoint | Limit | Window | Identifier |
|----------|-------|--------|------------|
| Login | 5 attempts | 15 minutes | IP + Email |
| Registration | 3 accounts | 24 hours | IP |
| Chat Message | 30 messages | 1 minute | User ID |
| Image Generation | 10 images | 1 hour | User ID |
| Companion Creation | 10 companions | 1 hour | User ID |
| Settings Update | 20 updates | 1 hour | User ID |

**Estimated Time**: 6-8 hours
**Files to Create/Modify**:
- `lib/rate-limit.ts` (new)
- `src/app/auth-actions.ts`
- `src/app/chat-actions.ts`
- `src/app/image-actions.ts`
- `src/app/actions.ts`

---

### 3. Sensitive Data in Logs

**Severity**: HIGH
**Status**: Fix before production
**Files**: Multiple files with console.error/console.warn

#### Issue

Full error objects and sensitive data logged to console:

**Problematic Code Examples**:
```typescript
// src/temporal/activities.ts:65
console.error("JSON Extraction Failed: No braces found", cleanText);
// Logs entire LLM response including user data

// src/temporal/activities.ts:230
console.error("Novita API Error:", errorText);
// May contain sensitive API error details

// src/app/image-actions.ts:28-29
console.error("SD API Error:", error);
// Logs full error with potential sensitive data
```

#### Recommended Solution

**1. Create structured logging utility**:

```typescript
// lib/logger.ts
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  userId?: string;
  companionId?: string;
  action?: string;
  [key: string]: any;
}

class Logger {
  private shouldLog(level: LogLevel): boolean {
    if (process.env.NODE_ENV === 'production') {
      return level === 'error' || level === 'warn';
    }
    return true; // Log everything in development
  }

  private sanitize(data: any): any {
    if (typeof data === 'string') {
      // Redact potential sensitive patterns
      return data
        .replace(/Bearer\s+[\w-]+/gi, 'Bearer [REDACTED]')
        .replace(/api[_-]?key[\s:=]+[\w-]+/gi, 'api_key=[REDACTED]')
        .replace(/password[\s:=]+[\w-]+/gi, 'password=[REDACTED]');
    }

    if (typeof data === 'object' && data !== null) {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(data)) {
        if (['password', 'apiKey', 'token', 'secret'].includes(key)) {
          sanitized[key] = '[REDACTED]';
        } else {
          sanitized[key] = this.sanitize(value);
        }
      }
      return sanitized;
    }

    return data;
  }

  private log(level: LogLevel, message: string, context?: LogContext) {
    if (!this.shouldLog(level)) return;

    const timestamp = new Date().toISOString();
    const sanitizedContext = context ? this.sanitize(context) : {};

    const logEntry = {
      timestamp,
      level,
      message,
      ...sanitizedContext,
      env: process.env.NODE_ENV
    };

    // In production, send to logging service (Sentry, DataDog, etc.)
    if (process.env.NODE_ENV === 'production') {
      // TODO: Send to external logging service
      console[level](JSON.stringify(logEntry));
    } else {
      // In development, pretty print
      console[level](`[${level.toUpperCase()}] ${message}`, sanitizedContext);
    }
  }

  debug(message: string, context?: LogContext) {
    this.log('debug', message, context);
  }

  info(message: string, context?: LogContext) {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext) {
    this.log('warn', message, context);
  }

  error(message: string, error?: Error, context?: LogContext) {
    const errorContext = error ? {
      errorMessage: error.message,
      errorStack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      ...context
    } : context;

    this.log('error', message, errorContext);
  }
}

export const logger = new Logger();
```

**2. Replace console.error calls**:

```typescript
// Before (src/temporal/activities.ts:65)
console.error("JSON Extraction Failed: No braces found", cleanText);

// After
import { logger } from "@/lib/logger";

logger.error("JSON extraction failed", new Error("No braces found"), {
  action: "analyzeContext",
  textLength: cleanText.length,
  // Don't log full text in production
  preview: process.env.NODE_ENV === 'development'
    ? cleanText.slice(0, 100)
    : undefined
});
```

```typescript
// Before (src/temporal/activities.ts:230)
console.error("Novita API Error:", errorText);

// After
logger.error("Novita API request failed", undefined, {
  action: "analyzeContext",
  statusCode: response.status,
  // Don't log error body
});
```

```typescript
// Before (src/app/image-actions.ts:28-29)
console.error("SD API Error:", error);

// After
logger.error("Stable Diffusion API error", error instanceof Error ? error : undefined, {
  action: "generateStandaloneImage",
  // Only log safe metadata
});
```

**3. Add error reporting integration**:

```typescript
// lib/error-reporting.ts
import * as Sentry from "@sentry/nextjs";

export function initErrorReporting() {
  if (process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV,
      tracesSampleRate: 0.1,
      beforeSend(event) {
        // Sanitize before sending to Sentry
        if (event.request) {
          delete event.request.cookies;
          delete event.request.headers;
        }
        return event;
      }
    });
  }
}

export function captureException(error: Error, context?: Record<string, any>) {
  if (process.env.NODE_ENV === 'production') {
    Sentry.captureException(error, { extra: context });
  } else {
    console.error(error, context);
  }
}
```

**Estimated Time**: 6-8 hours
**Files to Create/Modify**:
- `lib/logger.ts` (new)
- `lib/error-reporting.ts` (new)
- `src/temporal/activities.ts`
- `src/app/image-actions.ts`
- `src/app/actions.ts`
- `src/app/chat-actions.ts`
- All other files with console.error

---

### 4. Missing Input Validation on File Uploads

**Severity**: HIGH
**Status**: Fix before production
**Files**: `src/components/companion-form.tsx:45-70`

#### Issue

Large files accepted without size validation before base64 encoding:

```typescript
const handleFile = async (file: File) => {
  if (!file.type.startsWith('image/')) {
    alert('Please select an image file');
    return;
  }
  // NO SIZE CHECK - could be >100MB
  const base64 = await fileToBase64(file);
  // ...
}
```

#### Impact

- Memory exhaustion on client
- Server rejection at 10MB limit (wasted processing)
- Poor user experience
- Potential DoS vector

#### Recommended Solution

```typescript
// src/components/companion-form.tsx

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_DIMENSIONS = { width: 2048, height: 2048 };

const validateImageFile = async (file: File): Promise<{
  valid: boolean;
  error?: string
}> => {
  // Check file type
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: 'Invalid file type. Please upload JPG, PNG, or WebP images.'
    };
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    const sizeMB = (file.size / 1024 / 1024).toFixed(2);
    return {
      valid: false,
      error: `File is too large (${sizeMB}MB). Maximum size is 5MB.`
    };
  }

  // Check image dimensions
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      if (img.width > MAX_DIMENSIONS.width || img.height > MAX_DIMENSIONS.height) {
        resolve({
          valid: false,
          error: `Image dimensions too large (${img.width}x${img.height}). Maximum is ${MAX_DIMENSIONS.width}x${MAX_DIMENSIONS.height}.`
        });
      } else {
        resolve({ valid: true });
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({
        valid: false,
        error: 'Failed to load image. File may be corrupted.'
      });
    };

    img.src = url;
  });
};

const handleFile = async (file: File) => {
  setUploadError(null);
  setIsUploading(true);

  try {
    const validation = await validateImageFile(file);

    if (!validation.valid) {
      setUploadError(validation.error);
      return;
    }

    const base64 = await fileToBase64(file);
    setTempImage(base64);
    setShowCropper(true);
  } catch (error) {
    setUploadError('Failed to process image. Please try again.');
    console.error('Image upload error:', error);
  } finally {
    setIsUploading(false);
  }
};
```

**Additional Improvements**:

1. **Add client-side image compression**:
   ```bash
   npm install browser-image-compression
   ```

   ```typescript
   import imageCompression from 'browser-image-compression';

   const compressImage = async (file: File): Promise<File> => {
     const options = {
       maxSizeMB: 1,
       maxWidthOrHeight: 1024,
       useWebWorker: true
     };

     return await imageCompression(file, options);
   };
   ```

2. **Add upload progress indicator**:
   ```typescript
   {isUploading && (
     <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center">
       <div className="text-center">
         <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto" />
         <p className="mt-2 text-sm text-slate-300">Processing image...</p>
       </div>
     </div>
   )}
   ```

3. **Add visual file size warning**:
   ```typescript
   {file && (
     <div className="mt-2 text-xs text-slate-400">
       File size: {(file.size / 1024).toFixed(2)} KB
       {file.size > MAX_FILE_SIZE * 0.8 && (
         <span className="text-yellow-400 ml-2">
           (Approaching size limit)
         </span>
       )}
     </div>
   )}
   ```

**Server-Side Validation** (defense in depth):

```typescript
// src/app/actions.ts
function validateBase64Image(base64: string): { valid: boolean; error?: string } {
  if (!base64.startsWith('data:image/')) {
    return { valid: false, error: 'Invalid image format' };
  }

  // Check size (base64 is ~33% larger than binary)
  const sizeEstimate = (base64.length * 0.75) / 1024 / 1024;
  if (sizeEstimate > 10) {
    return { valid: false, error: 'Image too large after encoding' };
  }

  return { valid: true };
}

export async function createCompanion(formData: FormData) {
  // ... existing code

  if (validated.headerImage) {
    const imageValidation = validateBase64Image(validated.headerImage);
    if (!imageValidation.valid) {
      return { success: false, error: imageValidation.error };
    }
  }

  // ... rest of function
}
```

**Estimated Time**: 4-6 hours
**Files to Modify**:
- `src/components/companion-form.tsx`
- `src/app/actions.ts`

---

### 6. Type-Unsafe JWT Token Handling

**Severity**: HIGH
**Status**: Fix before production
**Files**: `src/lib/auth.ts:62, 69`

#### Issue

Using `as any` type assertions defeats TypeScript safety:

```typescript
token.username = (user as any).username;  // Line 62
(session.user as any).username = token.username as string;  // Line 69
```

#### Recommended Solution

**1. Fix NextAuth type definitions**:

```typescript
// src/types/next-auth.d.ts (update existing file)
import { DefaultSession, DefaultUser } from "next-auth";
import { DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface User extends DefaultUser {
    id: string;
    username: string;
    email: string;
    name: string;
  }

  interface Session extends DefaultSession {
    user: {
      id: string;
      username: string;
      email: string;
      name: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    username: string;
  }
}
```

**2. Update auth.ts with proper typing**:

```typescript
// src/lib/auth.ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";
import type { User as PrismaUser } from "@prisma/client";

export const authConfig = {
  adapter: PrismaAdapter(prisma),
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials): Promise<any> {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findFirst({
          where: {
            OR: [
              { email: credentials.email.toLowerCase() },
              { username: credentials.email.toLowerCase() }
            ]
          }
        });

        if (!user) {
          return null;
        }

        const isValid = await bcrypt.compare(
          credentials.password,
          user.hashedPassword
        );

        if (!isValid) {
          return null;
        }

        // Return user object matching our User interface
        return {
          id: user.id,
          email: user.email,
          username: user.username,
          name: user.name
        };
      }
    })
  ],
  session: {
    strategy: "jwt" as const,
    maxAge: 30 * 24 * 60 * 60
  },
  callbacks: {
    async jwt({ token, user }) {
      // user is only available on signin
      if (user) {
        token.id = user.id;
        token.username = user.username;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.username = token.username;
        // email and name already populated by NextAuth
      }
      return session;
    }
  },
  pages: {
    signIn: "/login"
  }
};

export const { handlers, signIn, signOut, auth } = NextAuth(authConfig);
```

**3. Update type usage throughout codebase**:

```typescript
// src/lib/auth-helpers.ts
import type { Session } from "next-auth";

export async function getAuthenticatedUser() {
  const session: Session | null = await auth();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  // Now properly typed!
  const userId: string = session.user.id;
  const username: string = session.user.username;

  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user) {
    throw new Error("User not found");
  }

  return user;
}
```

**Estimated Time**: 2-3 hours
**Files to Modify**:
- `src/types/next-auth.d.ts`
- `src/lib/auth.ts`
- `src/lib/auth-helpers.ts`

---

### 7. Missing Client-Side Error Boundaries

**Severity**: MEDIUM
**Status**: Improve user experience
**Files**: Missing `src/app/error.tsx` for main chat page

#### Issue

Some pages lack error.tsx files, leading to white screen errors instead of user-friendly error pages.

**Existing Error Boundaries**:
- ✓ `src/app/companions/error.tsx`
- ✓ `src/app/gallery/error.tsx`
- ✓ `src/app/generate/error.tsx`
- ✓ `src/app/settings/error.tsx`

**Missing Error Boundaries**:
- ✗ `src/app/error.tsx` (main chat page - ROOT LEVEL)
- ✗ Individual login/register error pages (less critical)

#### Recommended Solution

**Create root-level error boundary**:

```typescript
// src/app/error.tsx
"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to error reporting service
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900 rounded-2xl p-8 text-center">
        <div className="flex justify-center mb-4">
          <div className="bg-red-500/10 p-4 rounded-full">
            <AlertTriangle className="w-12 h-12 text-red-400" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-white mb-2">
          Something went wrong
        </h1>

        <p className="text-slate-400 mb-6">
          {error.message || "An unexpected error occurred. Please try again."}
        </p>

        {error.digest && (
          <p className="text-xs text-slate-500 mb-6 font-mono">
            Error ID: {error.digest}
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={reset}
            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>

          <Link
            href="/"
            className="flex-1 flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-3 rounded-lg transition-colors"
          >
            <Home className="w-4 h-4" />
            Go Home
          </Link>
        </div>

        <p className="text-xs text-slate-500 mt-6">
          If this problem persists, please contact support.
        </p>
      </div>
    </div>
  );
}
```

**Create enhanced error boundaries with context**:

```typescript
// components/enhanced-error-boundary.tsx
"use client";

import React, { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class EnhancedErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.reset);
      }

      return (
        <div className="p-8 text-center">
          <h2 className="text-2xl font-bold text-red-400 mb-4">
            Something went wrong
          </h2>
          <p className="text-slate-400 mb-4">{this.state.error.message}</p>
          <button
            onClick={this.reset}
            className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

**Estimated Time**: 2-3 hours
**Files to Create**:
- `src/app/error.tsx` (new)
- `components/enhanced-error-boundary.tsx` (new - optional)

---

## Medium Priority Enhancements

### 8. Implement Proper Pagination

**Severity**: MEDIUM
**Status**: Performance optimization
**Files**: `src/app/gallery/[id]/page.tsx`, `src/app/page.tsx`

#### Issue

Two performance concerns:
1. **Gallery**: Loads ALL images without pagination
2. **Chat History**: Loads 30 messages (reasonable, but could be optimized)

```typescript
// src/app/gallery/[id]/page.tsx
const messagesWithImages = await prisma.message.findMany({
  where: { companionId: companion.id, imageUrl: { not: null } },
  orderBy: { createdAt: "desc" }
  // NO LIMIT!
});
```

#### Impact

- Slow page loads with many images
- Memory exhaustion with hundreds of base64 images
- Poor mobile experience
- Database performance degradation

#### Recommended Solution

**Implement cursor-based pagination**:

```typescript
// lib/pagination.ts
export interface PaginationParams {
  cursor?: string;
  limit?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

export async function paginateMessages(
  where: any,
  params: PaginationParams
): Promise<PaginatedResult<Message>> {
  const limit = params.limit || 50;

  const messages = await prisma.message.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit + 1, // Fetch one extra to check if there are more
    ...(params.cursor && {
      cursor: { id: params.cursor },
      skip: 1 // Skip the cursor
    })
  });

  const hasMore = messages.length > limit;
  const items = hasMore ? messages.slice(0, limit) : messages;
  const nextCursor = hasMore ? items[items.length - 1].id : null;

  return {
    items,
    nextCursor,
    hasMore
  };
}
```

**Update gallery page with pagination**:

```typescript
// src/app/gallery/[id]/page.tsx
import { paginateMessages } from "@/lib/pagination";

interface PageProps {
  params: { id: string };
  searchParams: { cursor?: string };
}

export default async function CompanionGalleryPage({
  params,
  searchParams
}: PageProps) {
  const user = await getAuthenticatedUser();
  const companion = await verifyCompanionOwnership(params.id, user.id);

  const { items: messagesWithImages, nextCursor, hasMore } =
    await paginateMessages(
      { companionId: companion.id, imageUrl: { not: null } },
      { cursor: searchParams.cursor, limit: 24 } // 24 images per page (4x6 grid)
    );

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">{companion.name}'s Gallery</h1>

      {messagesWithImages.length === 0 ? (
        <p className="text-slate-400">No images generated yet.</p>
      ) : (
        <>
          <ImageGalleryGrid messages={messagesWithImages} />

          {hasMore && (
            <div className="mt-8 text-center">
              <Link
                href={`/gallery/${companion.id}?cursor=${nextCursor}`}
                className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg inline-block"
              >
                Load More
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}
```

**Implement infinite scroll (alternative)**:

```typescript
// components/infinite-gallery.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { Message } from "@prisma/client";
import { ImageGalleryGrid } from "./image-gallery-grid";

interface InfiniteGalleryProps {
  initialMessages: Message[];
  companionId: string;
  initialCursor: string | null;
}

export function InfiniteGallery({
  initialMessages,
  companionId,
  initialCursor
}: InfiniteGalleryProps) {
  const [messages, setMessages] = useState(initialMessages);
  const [cursor, setCursor] = useState(initialCursor);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialCursor !== null);

  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loadMoreRef.current || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(loadMoreRef.current);

    return () => observer.disconnect();
  }, [hasMore, loading]);

  const loadMore = async () => {
    if (!cursor || loading) return;

    setLoading(true);

    try {
      const response = await fetch(
        `/api/gallery/${companionId}/images?cursor=${cursor}`
      );
      const data = await response.json();

      setMessages((prev) => [...prev, ...data.items]);
      setCursor(data.nextCursor);
      setHasMore(data.hasMore);
    } catch (error) {
      console.error("Failed to load more images:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <ImageGalleryGrid messages={messages} />

      {hasMore && (
        <div ref={loadMoreRef} className="mt-8 text-center py-4">
          {loading ? (
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto" />
          ) : (
            <p className="text-slate-500">Scroll to load more...</p>
          )}
        </div>
      )}
    </div>
  );
}
```

**Estimated Time**: 6-8 hours
**Files to Create/Modify**:
- `lib/pagination.ts` (new)
- `src/app/gallery/[id]/page.tsx`
- `components/infinite-gallery.tsx` (new - optional)
- `src/app/api/gallery/[id]/images/route.ts` (new - for infinite scroll)

---

### 9. Move from Base64 to Object Storage

**Severity**: MEDIUM
**Status**: Scalability improvement
**Impact**: Large refactor, significant performance improvement

#### Issue

All images stored as base64 strings in PostgreSQL:
- Bloats database size dramatically (base64 is ~33% larger than binary)
- Slow queries when fetching messages with images
- Inefficient memory usage
- No CDN benefits
- Expensive database backups

**Current Storage**:
```
Message with image:
- content: "Here's a selfie" (20 bytes)
- imageUrl: "data:image/png;base64,iVBORw0KG..." (2-5 MB)
```

#### Recommended Solution

**Option 1: Cloudflare R2 (Recommended)**

```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

```typescript
// lib/storage.ts
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { nanoid } from "nanoid";

const s3Client = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT, // https://<account-id>.r2.cloudflarestorage.com
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!
  }
});

const BUCKET_NAME = process.env.R2_BUCKET_NAME!;

export async function uploadImage(
  base64Data: string,
  userId: string
): Promise<string> {
  // Extract base64 content
  const matches = base64Data.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!matches) throw new Error("Invalid base64 image");

  const [, extension, base64Content] = matches;
  const buffer = Buffer.from(base64Content, "base64");

  // Generate unique key
  const key = `images/${userId}/${nanoid()}.${extension}`;

  // Upload to R2
  await s3Client.send(
    new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: `image/${extension}`,
      CacheControl: "public, max-age=31536000, immutable"
    })
  );

  // Return public URL
  return `${process.env.R2_PUBLIC_URL}/${key}`;
}

export async function getImageUrl(key: string, expiresIn: number = 3600): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key
  });

  return await getSignedUrl(s3Client, command, { expiresIn });
}

export async function deleteImage(key: string): Promise<void> {
  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key
    })
  );
}
```

**Update activities to use object storage**:

```typescript
// src/temporal/activities.ts
import { uploadImage } from "@/lib/storage";

export async function generateCompanionImage(
  companionId: string,
  visualDescription: string,
  userAppearance: string | null,
  context: LLMAnalysisResponse
): Promise<string> {
  // ... existing prompt building code

  const response = await fetch(`${process.env.SD_API_URL}/sdapi/v1/txt2img`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params)
  });

  const data = await response.json();
  const base64Image = `data:image/png;base64,${data.images[0]}`;

  // Fetch companion to get userId
  const companion = await prisma.companion.findUnique({
    where: { id: companionId },
    select: { userId: true }
  });

  // Upload to object storage instead of returning base64
  const imageUrl = await uploadImage(base64Image, companion!.userId);

  return imageUrl; // Returns https://... URL instead of data:image/...
}
```

**Update schema to optimize for URLs**:

```prisma
model Message {
  id           String    @id @default(uuid())
  role         String
  content      String
  imageUrl     String?   // Now stores https://... instead of data:image/...
  imageKey     String?   // Store key for deletion
  companionId  String
  companion    Companion @relation(fields: [companionId], references: [id], onDelete: Cascade)
  createdAt    DateTime  @default(now())

  @@index([companionId])
  @@index([createdAt])
  @@index([companionId, imageUrl])
}
```

**Migration strategy**:

```typescript
// scripts/migrate-images-to-r2.ts
import { prisma } from "../src/lib/prisma";
import { uploadImage } from "../src/lib/storage";

async function migrateImages() {
  const messages = await prisma.message.findMany({
    where: {
      imageUrl: { startsWith: "data:image/" }
    },
    include: {
      companion: { select: { userId: true } }
    }
  });

  console.log(`Migrating ${messages.length} images to R2...`);

  for (const message of messages) {
    try {
      const newUrl = await uploadImage(message.imageUrl!, message.companion.userId);

      await prisma.message.update({
        where: { id: message.id },
        data: {
          imageUrl: newUrl,
          imageKey: new URL(newUrl).pathname
        }
      });

      console.log(`Migrated image for message ${message.id}`);
    } catch (error) {
      console.error(`Failed to migrate message ${message.id}:`, error);
    }
  }

  console.log("Migration complete!");
}

migrateImages();
```

**Benefits**:
- 70-80% reduction in database size
- Faster query performance
- CDN caching benefits
- Cheaper storage costs (~$0.015/GB vs PostgreSQL storage)
- Better scalability

**Estimated Time**: 12-16 hours
**Files to Create/Modify**:
- `lib/storage.ts` (new)
- `src/temporal/activities.ts`
- `src/app/image-actions.ts`
- `prisma/schema.prisma`
- `scripts/migrate-images-to-r2.ts` (new)

---

### 10. Add Comprehensive Testing

**Severity**: MEDIUM
**Status**: Quality assurance
**Current State**: No tests

#### Recommended Solution

**1. Set up testing infrastructure**:

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom @vitejs/plugin-react jsdom
npm install -D @testing-library/user-event
npm install -D msw # Mock Service Worker for API mocking
```

**Configure Vitest**:

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts']
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});
```

**2. Write unit tests for utilities**:

```typescript
// tests/lib/validation.test.ts
import { describe, it, expect } from 'vitest';
import { companionSchema, messageSchema, registrationSchema } from '@/lib/validation';

describe('Validation Schemas', () => {
  describe('companionSchema', () => {
    it('should validate valid companion data', () => {
      const validData = {
        name: 'Luna',
        description: 'Friendly and outgoing companion',
        visualDescription: 'Blonde hair, blue eyes',
        defaultOutfit: 'casual clothes'
      };

      expect(() => companionSchema.parse(validData)).not.toThrow();
    });

    it('should reject name that is too long', () => {
      const invalidData = {
        name: 'A'.repeat(101),
        description: 'Valid description',
        visualDescription: 'Valid visual',
        defaultOutfit: 'casual'
      };

      expect(() => companionSchema.parse(invalidData)).toThrow();
    });

    it('should reject description that is too short', () => {
      const invalidData = {
        name: 'Luna',
        description: 'Short',
        visualDescription: 'Valid visual description',
        defaultOutfit: 'casual'
      };

      expect(() => companionSchema.parse(invalidData)).toThrow();
    });
  });

  describe('registrationSchema', () => {
    it('should validate valid registration data', () => {
      const validData = {
        name: 'John Doe',
        email: 'john@example.com',
        username: 'johndoe',
        password: 'SecurePass123!'
      };

      expect(() => registrationSchema.parse(validData)).not.toThrow();
    });

    it('should reject weak password', () => {
      const invalidData = {
        name: 'John Doe',
        email: 'john@example.com',
        username: 'johndoe',
        password: 'weak'
      };

      expect(() => registrationSchema.parse(invalidData)).toThrow();
    });

    it('should reject invalid username format', () => {
      const invalidData = {
        name: 'John Doe',
        email: 'john@example.com',
        username: 'john-doe!', // Invalid characters
        password: 'SecurePass123!'
      };

      expect(() => registrationSchema.parse(invalidData)).toThrow();
    });
  });
});
```

**3. Write integration tests for server actions**:

```typescript
// tests/app/actions.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createCompanion, deleteCompanion } from '@/app/actions';
import { prisma } from '@/lib/prisma';

vi.mock('@/lib/auth-helpers', () => ({
  getAuthenticatedUser: vi.fn().mockResolvedValue({
    id: 'test-user-id',
    email: 'test@example.com',
    username: 'testuser',
    name: 'Test User'
  }),
  verifyCompanionOwnership: vi.fn().mockResolvedValue({
    id: 'test-companion-id',
    name: 'Test Companion',
    userId: 'test-user-id'
  })
}));

describe('Companion Actions', () => {
  beforeEach(async () => {
    // Clean up test data
    await prisma.message.deleteMany();
    await prisma.companion.deleteMany();
    await prisma.user.deleteMany();
  });

  describe('createCompanion', () => {
    it('should create companion with valid data', async () => {
      const formData = new FormData();
      formData.append('name', 'Luna');
      formData.append('description', 'Friendly and outgoing companion');
      formData.append('visualDescription', 'Blonde hair, blue eyes');
      formData.append('defaultOutfit', 'casual clothes');

      const result = await createCompanion(formData);

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject invalid data', async () => {
      const formData = new FormData();
      formData.append('name', ''); // Invalid: empty name
      formData.append('description', 'Valid description');
      formData.append('visualDescription', 'Valid visual');
      formData.append('defaultOutfit', 'casual');

      const result = await createCompanion(formData);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
```

**4. Write component tests**:

```typescript
// tests/components/ChatForm.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatForm } from '@/components/ChatForm';

describe('ChatForm', () => {
  it('should render form elements', () => {
    render(<ChatForm companionId="test-id" />);

    expect(screen.getByPlaceholderText(/type your message/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /generate image/i })).toBeInTheDocument();
  });

  it('should submit form with message', async () => {
    const user = userEvent.setup();
    render(<ChatForm companionId="test-id" />);

    const input = screen.getByPlaceholderText(/type your message/i);
    const submitButton = screen.getByRole('button', { name: /send/i });

    await user.type(input, 'Hello, Luna!');
    await user.click(submitButton);

    await waitFor(() => {
      expect(input).toHaveValue(''); // Form should be cleared
    });
  });

  it('should not submit empty message', async () => {
    const user = userEvent.setup();
    render(<ChatForm companionId="test-id" />);

    const submitButton = screen.getByRole('button', { name: /send/i });

    await user.click(submitButton);

    // Form should still be empty, not submitted
    expect(screen.getByPlaceholderText(/type your message/i)).toHaveValue('');
  });
});
```

**5. Add test scripts to package.json**:

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage"
  }
}
```

**Estimated Time**: 20-30 hours (comprehensive test suite)
**Priority**: Implement incrementally

---

## Low Priority Optimizations

### 11. Add Database Indexes

**Severity**: LOW
**Status**: Performance optimization
**Files**: `prisma/schema.prisma`

#### Issue

Missing indexes that could improve query performance:
- No index on `Message.createdAt` (queries order by this)
- No composite index on `(companionId, imageUrl)` for gallery queries

#### Recommended Solution

```prisma
model Message {
  id           String    @id @default(uuid())
  role         String
  content      String
  imageUrl     String?
  companionId  String
  companion    Companion @relation(fields: [companionId], references: [id], onDelete: Cascade)
  createdAt    DateTime  @default(now())

  @@index([companionId])
  @@index([createdAt])  // New: Speed up time-based queries
  @@index([companionId, imageUrl])  // New: Optimize gallery queries
}

model Companion {
  // ... existing fields

  @@index([userId])
  @@index([userId, updatedAt])  // New: Speed up "recently updated" queries
}
```

**Apply migration**:
```bash
npx prisma db push
```

**Estimated Time**: 1-2 hours
**Impact**: 10-30% query performance improvement on large datasets

---

### 12. Implement Content Security Policy

**Severity**: LOW
**Status**: Security hardening
**Files**: `next.config.js`

#### Recommended Solution

```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // Next.js requires unsafe-inline
              "style-src 'self' 'unsafe-inline'", // Tailwind requires unsafe-inline
              "img-src 'self' data: blob: https:",
              "font-src 'self' data:",
              "connect-src 'self' https://api.novita.ai",
              "frame-ancestors 'none'",
            ].join('; ')
          }
        ]
      }
    ];
  }
};

module.exports = nextConfig;
```

**Estimated Time**: 2-3 hours

---

## Architecture Improvements

### 13. Refactor Activities into Separate Files

**Severity**: MEDIUM
**Status**: Code maintainability
**Files**: `src/temporal/activities.ts` (780+ lines)

#### Issue

Single activities.ts file handles:
- LLM interactions
- Context analysis
- Image generation
- Database updates
- JSON parsing utilities

Violates Single Responsibility Principle.

#### Recommended Solution

**Restructure as**:

```
src/temporal/
├── activities/
│   ├── index.ts              # Export all activities
│   ├── llm-activities.ts     # LLM chat & response generation
│   ├── context-activities.ts # Context analysis
│   ├── image-activities.ts   # Image generation
│   └── db-activities.ts      # Database operations
├── utils/
│   ├── json-parser.ts        # JSON extraction utilities
│   └── prompt-builder.ts     # Prompt building logic
├── workflows.ts
└── worker.ts
```

**Example split**:

```typescript
// temporal/activities/llm-activities.ts
import { prisma } from "@/lib/prisma";
import { MessageHistory } from "../types";

export async function generateLLMResponse(
  companionId: string,
  companionName: string,
  userMessage: string,
  userName: string,
  currentOutfit: string,
  currentLocation: string,
  currentAction: string,
  msgHistory: MessageHistory[]
): Promise<string> {
  // ... LLM response generation logic
}

// temporal/activities/context-activities.ts
import { LLMAnalysisResponse } from "../types";
import { extractJSON } from "../utils/json-parser";

export async function analyzeContext(
  messageText: string
): Promise<LLMAnalysisResponse> {
  // ... context analysis logic
}

// temporal/activities/image-activities.ts
export async function generateCompanionImage(
  companionId: string,
  visualDescription: string,
  userAppearance: string | null,
  context: LLMAnalysisResponse
): Promise<string> {
  // ... image generation logic
}

// temporal/activities/db-activities.ts
export async function updateCompanionContext(
  companionId: string,
  newOutfit: string,
  newLocation: string,
  newAction: string
): Promise<void> {
  // ... database update logic
}

// temporal/activities/index.ts
export * from './llm-activities';
export * from './context-activities';
export * from './image-activities';
export * from './db-activities';
```

**Estimated Time**: 4-6 hours

---

### 14. Create API Client Abstractions

**Severity**: MEDIUM
**Status**: Code maintainability
**Files**: Multiple files with direct fetch() calls

#### Recommended Solution

```typescript
// lib/api/novita-client.ts
export class NovitaClient {
  private apiKey: string;
  private baseUrl = "https://api.novita.ai/v3";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async chat(messages: any[], config: any) {
    const response = await fetch(`${this.baseUrl}/openai/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        temperature: config.temperature,
        max_tokens: config.max_tokens,
        top_p: config.top_p,
        repetition_penalty: config.repetition_penalty
      })
    });

    if (!response.ok) {
      throw new NovitaAPIError(response.status, await response.text());
    }

    return await response.json();
  }
}

class NovitaAPIError extends Error {
  constructor(public status: number, public body: string) {
    super(`Novita API error: ${status}`);
  }
}

// lib/api/stable-diffusion-client.ts
export class StableDiffusionClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async txt2img(params: SDGenerationParams) {
    const response = await fetch(`${this.baseUrl}/sdapi/v1/txt2img`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params)
    });

    if (!response.ok) {
      throw new SDAPIError(response.status, await response.text());
    }

    return await response.json();
  }
}

class SDAPIError extends Error {
  constructor(public status: number, public body: string) {
    super(`Stable Diffusion API error: ${status}`);
  }
}

// Usage in activities
import { NovitaClient } from "@/lib/api/novita-client";

const novita = new NovitaClient(process.env.NOVITA_KEY!);
const response = await novita.chat(messages, LLM_CHAT_CONFIG);
```

**Estimated Time**: 4-6 hours

---

## Feature Enhancements

### 15. Implement Settings Toggles

**Severity**: MEDIUM
**Status**: Feature completion
**Files**: `src/components/settingsList.tsx`

#### Issue

RAG and DeepThink toggles are UI-only, not functional.

#### Recommended Solution

**Add to Companion schema**:

```prisma
model Companion {
  // ... existing fields
  ragEnabled      Boolean  @default(true)
  deepThinkEnabled Boolean @default(false)
}
```

**Update settings actions**:

```typescript
// src/app/actions.ts
export async function updateCompanionSettings(
  companionId: string,
  settings: {
    ragEnabled?: boolean;
    deepThinkEnabled?: boolean;
  }
): Promise<ActionResult> {
  try {
    const user = await getAuthenticatedUser();
    await verifyCompanionOwnership(companionId, user.id);

    await prisma.companion.update({
      where: { id: companionId },
      data: settings
    });

    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to update settings" };
  }
}
```

**Implement RAG (Retrieval-Augmented Generation)**:

```typescript
// lib/rag/vector-store.ts
import { Pinecone } from '@pinecone-database/pinecone';

const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
const index = pinecone.index('companion-memories');

export async function storeMemory(
  companionId: string,
  message: string,
  embedding: number[]
) {
  await index.upsert([{
    id: `${companionId}-${Date.now()}`,
    values: embedding,
    metadata: { companionId, message, timestamp: Date.now() }
  }]);
}

export async function retrieveRelevantMemories(
  companionId: string,
  queryEmbedding: number[],
  topK: number = 5
) {
  const results = await index.query({
    vector: queryEmbedding,
    filter: { companionId },
    topK,
    includeMetadata: true
  });

  return results.matches;
}
```

**Estimated Time**: 16-24 hours (full RAG implementation)

---

### 16. Add Multi-User Conversations

**Severity**: LOW
**Status**: Feature enhancement

#### Concept

Allow multiple users to chat with the same companion in shared rooms.

#### Schema Changes

```prisma
model ChatRoom {
  id           String    @id @default(uuid())
  name         String
  companionId  String
  companion    Companion @relation(fields: [companionId], references: [id])
  members      User[]    @relation("RoomMembers")
  messages     RoomMessage[]
  createdAt    DateTime  @default(now())
}

model RoomMessage {
  id           String    @id @default(uuid())
  role         String    // "user" | "assistant"
  content      String
  userId       String?   // null for assistant messages
  user         User?     @relation(fields: [userId], references: [id])
  roomId       String
  room         ChatRoom  @relation(fields: [roomId], references: [id])
  createdAt    DateTime  @default(now())
}
```

**Estimated Time**: 40+ hours

---

## Implementation Roadmap

### Phase 1: Critical Security (Week 1) - HIGHEST PRIORITY

**Must complete before any other work**:

1. **Day 1-2**: Fix exposed secrets
   - Revoke all exposed API keys
   - Remove .env from git history
   - Rotate all credentials
   - Set up secret management

2. **Day 3-4**: Implement rate limiting
   - Set up Upstash or similar
   - Add rate limiting to all endpoints
   - Test limits

3. **Day 5**: Strengthen password requirements
   - Update validation schema
   - Add password strength meter
   - Test registration flow

**Deliverable**: Application is secure enough for limited beta testing

---

### Phase 2: High Priority Improvements (Week 2-3)

1. **Week 2**: Logging and error handling
   - Create structured logging system
   - Sanitize all logs
   - Add error boundary pages
   - Set up Sentry/error tracking

2. **Week 3**: Input validation and type safety
   - Fix file upload validation
   - Fix NextAuth type safety
   - Add server-side validation

**Deliverable**: Application is production-ready for security

---

### Phase 3: Performance Optimization (Week 4-5)

1. **Week 4**: Database optimization
   - Add database indexes
   - Implement pagination
   - Optimize queries

2. **Week 5**: Storage migration
   - Set up object storage (R2/S3)
   - Migrate images from base64
   - Update all image handling code

**Deliverable**: Application can scale to thousands of users

---

### Phase 4: Architecture Improvements (Week 6-7)

1. **Week 6**: Code refactoring
   - Split activities file
   - Create API client abstractions
   - Improve code organization

2. **Week 7**: Testing infrastructure
   - Set up testing framework
   - Write unit tests
   - Write integration tests

**Deliverable**: Codebase is maintainable and testable

---

### Phase 5: Feature Enhancements (Week 8+)

1. **Implement settings functionality** (RAG, DeepThink)
2. **Add advanced features** (multi-user chat, voice, etc.)
3. **UI/UX improvements**
4. **Mobile optimization**

**Deliverable**: Feature-complete application

---

## Testing Strategy

### Unit Tests

**Target Coverage**: 80%

**Priority Areas**:
1. Validation schemas
2. Utility functions
3. Business logic

### Integration Tests

**Focus Areas**:
1. Server actions
2. Database operations
3. External API interactions

### End-to-End Tests

**Critical Flows**:
1. User registration → login → create companion → chat → logout
2. Image generation flow
3. Gallery viewing
4. Settings management

**Tools**: Playwright or Cypress

---

## Monitoring & Observability

### Essential Metrics

1. **Application Metrics**:
   - Request latency (p50, p95, p99)
   - Error rates
   - API call success rates
   - Workflow completion rates

2. **Business Metrics**:
   - Active users
   - Messages per day
   - Images generated
   - API costs

3. **Infrastructure Metrics**:
   - Database query performance
   - Temporal workflow duration
   - Memory usage
   - CPU usage

### Recommended Tools

1. **Error Tracking**: Sentry
2. **Application Monitoring**: DataDog or New Relic
3. **Log Management**: Logtail or Papertrail
4. **Uptime Monitoring**: Better Uptime or Pingdom
5. **Analytics**: PostHog or Mixpanel

---

## Conclusion

This roadmap provides a clear path from the current state to a production-ready, scalable application. The critical security issues must be addressed immediately, followed by systematic improvements in each phase.

**Estimated Total Time**: 16-20 weeks for complete implementation

**Priority Order**:
1. CRITICAL: Security fixes (Week 1)
2. HIGH: Production readiness (Week 2-3)
3. MEDIUM: Performance & architecture (Week 4-7)
4. LOW: Additional features (Week 8+)

Remember: **Do not skip Phase 1**. The security issues must be fixed before any other work is done or the application is deployed to production.
