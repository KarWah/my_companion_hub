/**
 * Test script to verify security headers are properly configured
 * Run: node scripts/test-security-headers.js
 *
 * Prerequisites: Start dev server with `npm run dev` first
 */

async function testSecurityHeaders() {
  const url = 'http://localhost:3000';

  console.log('🔒 Testing Security Headers...\n');
  console.log(`Testing: ${url}\n`);

  try {
    const response = await fetch(url);
    const headers = response.headers;

    // Expected security headers
    const securityHeaders = {
      'x-frame-options': 'SAMEORIGIN',
      'x-content-type-options': 'nosniff',
      'x-xss-protection': '1; mode=block',
      'referrer-policy': 'origin-when-cross-origin',
      'x-dns-prefetch-control': 'on',
      'permissions-policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
      'content-security-policy': 'default-src',
    };

    let allPassed = true;

    for (const [header, expectedValue] of Object.entries(securityHeaders)) {
      const actualValue = headers.get(header);

      if (!actualValue) {
        console.log(`❌ ${header}: MISSING`);
        allPassed = false;
      } else if (actualValue.includes(expectedValue) || expectedValue.includes(actualValue)) {
        console.log(`✅ ${header}: ${actualValue}`);
      } else {
        console.log(`⚠️  ${header}: ${actualValue} (expected to contain "${expectedValue}")`);
        allPassed = false;
      }
    }

    // Check if HSTS is present (should only be in production)
    const hsts = headers.get('strict-transport-security');
    if (process.env.NODE_ENV === 'production') {
      if (hsts) {
        console.log(`✅ strict-transport-security: ${hsts} (production only)`);
      } else {
        console.log(`❌ strict-transport-security: MISSING (expected in production)`);
        allPassed = false;
      }
    } else {
      if (hsts) {
        console.log(`⚠️  strict-transport-security: ${hsts} (should only be in production)`);
      } else {
        console.log(`✅ strict-transport-security: Not present (correct for development)`);
      }
    }

    console.log('\n' + '='.repeat(60));
    if (allPassed) {
      console.log('✅ All security headers are properly configured!');
    } else {
      console.log('⚠️  Some security headers are missing or incorrect');
      console.log('   Make sure Next.js dev server is running: npm run dev');
    }
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Error testing headers:', error.message);
    console.log('\n💡 Make sure the dev server is running:');
    console.log('   npm run dev');
  }
}

testSecurityHeaders();
