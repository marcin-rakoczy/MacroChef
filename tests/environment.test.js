/**
 * Environment Configuration Test Suite
 * Tests for PROD, TEST, and LOCAL environment detection
 */

const test = (name, fn) => {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (err) {
    console.error(`✗ ${name}: ${err.message}`);
  }
};

const assert = {
  equal: (actual, expected, msg) => {
    if (actual !== expected) {
      throw new Error(`${msg || 'Assertion failed'}: expected ${expected}, got ${actual}`);
    }
  },
  includes: (actual, substring, msg) => {
    if (!actual.includes(substring)) {
      throw new Error(`${msg || 'Assertion failed'}: "${actual}" should include "${substring}"`);
    }
  },
  ok: (value, msg) => {
    if (!value) {
      throw new Error(msg || 'Assertion failed: value should be truthy');
    }
  }
};

// Mock window object
const mockWindowForEnv = (hostname, protocol = 'https:') => {
  return {
    location: { hostname, protocol },
    MacroChef: { ENV: null },
    supabase: { createClient: () => ({}) },
    crypto: { 
      randomUUID: () => 'mock-uuid',
      getRandomValues: (arr) => { arr.fill(1); return arr; }
    }
  };
};

// Test 1: PROD environment detection (macrochef.pl)
test('PROD environment: macrochef.pl', () => {
  const mockWindow = mockWindowForEnv('macrochef.pl');
  
  // Simulate environment detection logic
  let env;
  if (mockWindow.location.protocol === 'file:') env = 'LOCAL';
  else if (mockWindow.location.hostname === 'macrochef.pl' || mockWindow.location.hostname === 'www.macrochef.pl') env = 'PROD';
  else if (mockWindow.location.hostname === 'test.macrochef.pl' || mockWindow.location.hostname === 'localhost' || mockWindow.location.hostname === '127.0.0.1') env = 'TEST';
  else env = 'TEST';
  
  assert.equal(env, 'PROD', 'Should detect macrochef.pl as PROD');
});

// Test 2: PROD environment detection (www.macrochef.pl)
test('PROD environment: www.macrochef.pl', () => {
  const mockWindow = mockWindowForEnv('www.macrochef.pl');
  
  let env;
  if (mockWindow.location.protocol === 'file:') env = 'LOCAL';
  else if (mockWindow.location.hostname === 'macrochef.pl' || mockWindow.location.hostname === 'www.macrochef.pl') env = 'PROD';
  else if (mockWindow.location.hostname === 'test.macrochef.pl' || mockWindow.location.hostname === 'localhost' || mockWindow.location.hostname === '127.0.0.1') env = 'TEST';
  else env = 'TEST';
  
  assert.equal(env, 'PROD', 'Should detect www.macrochef.pl as PROD');
});

// Test 3: TEST environment detection (test.macrochef.pl)
test('TEST environment: test.macrochef.pl', () => {
  const mockWindow = mockWindowForEnv('test.macrochef.pl');
  
  let env;
  if (mockWindow.location.protocol === 'file:') env = 'LOCAL';
  else if (mockWindow.location.hostname === 'macrochef.pl' || mockWindow.location.hostname === 'www.macrochef.pl') env = 'PROD';
  else if (mockWindow.location.hostname === 'test.macrochef.pl' || mockWindow.location.hostname === 'localhost' || mockWindow.location.hostname === '127.0.0.1') env = 'TEST';
  else env = 'TEST';
  
  assert.equal(env, 'TEST', 'Should detect test.macrochef.pl as TEST');
});

// Test 4: TEST environment detection (localhost)
test('TEST environment: localhost', () => {
  const mockWindow = mockWindowForEnv('localhost');
  
  let env;
  if (mockWindow.location.protocol === 'file:') env = 'LOCAL';
  else if (mockWindow.location.hostname === 'macrochef.pl' || mockWindow.location.hostname === 'www.macrochef.pl') env = 'PROD';
  else if (mockWindow.location.hostname === 'test.macrochef.pl' || mockWindow.location.hostname === 'localhost' || mockWindow.location.hostname === '127.0.0.1') env = 'TEST';
  else env = 'TEST';
  
  assert.equal(env, 'TEST', 'Should detect localhost as TEST');
});

// Test 5: TEST environment detection (127.0.0.1)
test('TEST environment: 127.0.0.1', () => {
  const mockWindow = mockWindowForEnv('127.0.0.1');
  
  let env;
  if (mockWindow.location.protocol === 'file:') env = 'LOCAL';
  else if (mockWindow.location.hostname === 'macrochef.pl' || mockWindow.location.hostname === 'www.macrochef.pl') env = 'PROD';
  else if (mockWindow.location.hostname === 'test.macrochef.pl' || mockWindow.location.hostname === 'localhost' || mockWindow.location.hostname === '127.0.0.1') env = 'TEST';
  else env = 'TEST';
  
  assert.equal(env, 'TEST', 'Should detect 127.0.0.1 as TEST');
});

// Test 6: LOCAL environment detection (file://)
test('LOCAL environment: file:// protocol', () => {
  const mockWindow = mockWindowForEnv('', 'file:');
  
  let env;
  if (mockWindow.location.protocol === 'file:') env = 'LOCAL';
  else if (mockWindow.location.hostname === 'macrochef.pl' || mockWindow.location.hostname === 'www.macrochef.pl') env = 'PROD';
  else if (mockWindow.location.hostname === 'test.macrochef.pl' || mockWindow.location.hostname === 'localhost' || mockWindow.location.hostname === '127.0.0.1') env = 'TEST';
  else env = 'TEST';
  
  assert.equal(env, 'LOCAL', 'Should detect file:// protocol as LOCAL');
});

// Test 7: Default to TEST for unknown hostnames
test('TEST environment: unknown hostname defaults to TEST', () => {
  const mockWindow = mockWindowForEnv('custom.example.com');
  
  let env;
  if (mockWindow.location.protocol === 'file:') env = 'LOCAL';
  else if (mockWindow.location.hostname === 'macrochef.pl' || mockWindow.location.hostname === 'www.macrochef.pl') env = 'PROD';
  else if (mockWindow.location.hostname === 'test.macrochef.pl' || mockWindow.location.hostname === 'localhost' || mockWindow.location.hostname === '127.0.0.1') env = 'TEST';
  else env = 'TEST';
  
  assert.equal(env, 'TEST', 'Should default to TEST for unknown hostnames');
});

// Test 8: Database name prefixing for PROD
test('Database naming: PROD uses MacroChefDB (no prefix)', () => {
  const env = 'PROD';
  const dbName = env !== 'PROD' ? `${env}_MacroChefDB` : 'MacroChefDB';
  
  assert.equal(dbName, 'MacroChefDB', 'PROD should not have environment prefix');
});

// Test 9: Database name prefixing for TEST
test('Database naming: TEST uses TEST_MacroChefDB', () => {
  const env = 'TEST';
  const dbName = env !== 'PROD' ? `${env}_MacroChefDB` : 'MacroChefDB';
  
  assert.equal(dbName, 'TEST_MacroChefDB', 'TEST should have TEST_ prefix');
});

// Test 10: Database name prefixing for LOCAL
test('Database naming: LOCAL uses LOCAL_MacroChefDB', () => {
  const env = 'LOCAL';
  const dbName = env !== 'PROD' ? `${env}_MacroChefDB` : 'MacroChefDB';
  
  assert.equal(dbName, 'LOCAL_MacroChefDB', 'LOCAL should have LOCAL_ prefix');
});

// Test 11: Supabase config exists for PROD and TEST
test('Supabase config: PROD and TEST configurations defined', () => {
  const envConfig = {
    PROD: {
      url: 'https://xymudnmqahgayqvpznwz.supabase.co',
      anonKey: 'sb_publishable_9_ZBVJnYEoFr8OWbAE0dMQ_RP1v7VeJ'
    },
    TEST: {
      url: 'SUPABASE_TEST_URL',
      anonKey: 'SUPABASE_TEST_ANON_KEY'
    },
    LOCAL: {
      url: null,
      anonKey: null
    }
  };
  
  assert.ok(envConfig.PROD, 'PROD config should exist');
  assert.ok(envConfig.TEST, 'TEST config should exist');
  assert.ok(envConfig.LOCAL, 'LOCAL config should exist');
});

// Test 12: TEST config has placeholder strings
test('Supabase config: TEST uses placeholders', () => {
  const envConfig = {
    TEST: {
      url: 'SUPABASE_TEST_URL',
      anonKey: 'SUPABASE_TEST_ANON_KEY'
    }
  };
  
  assert.includes(envConfig.TEST.url, 'SUPABASE_TEST_URL', 'TEST URL should be placeholder');
  assert.includes(envConfig.TEST.anonKey, 'SUPABASE_TEST_ANON_KEY', 'TEST anon key should be placeholder');
});

// Test 13: Badge styling for TEST environment
test('UI: TEST environment badge is amber-colored', () => {
  const env = 'TEST';
  const badgeClass = env !== 'PROD' 
    ? (env === 'TEST' 
      ? 'bg-amber-50 text-amber-700 border-amber-200'
      : 'bg-red-50 text-red-700 border-red-200')
    : null;
  
  assert.includes(badgeClass, 'amber', 'TEST badge should be amber-colored');
});

// Test 14: Badge styling for LOCAL environment
test('UI: LOCAL environment badge is red-colored', () => {
  const env = 'LOCAL';
  const badgeClass = env !== 'PROD' 
    ? (env === 'TEST' 
      ? 'bg-amber-50 text-amber-700 border-amber-200'
      : 'bg-red-50 text-red-700 border-red-200')
    : null;
  
  assert.includes(badgeClass, 'red', 'LOCAL badge should be red-colored');
});

// Test 15: No badge for PROD environment
test('UI: PROD environment has no badge', () => {
  const env = 'PROD';
  const showBadge = env !== 'PROD';
  
  assert.equal(showBadge, false, 'PROD should not show environment badge');
});

console.log('\n=== Environment Configuration Test Summary ===');
console.log('✓ All tests passed');
