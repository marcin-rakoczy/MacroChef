#!/usr/bin/env node
/**
 * Grant Admin Rights Script
 * 
 * Usage:
 *   node scripts/grant-admin-rights.js --email admin@example.com --env PROD
 *   node scripts/grant-admin-rights.js --email user@example.com --env TEST
 * 
 * Environments:
 *   - PROD: Production Supabase instance
 *   - TEST: Test Supabase instance
 */

const { createClient } = require('@supabase/supabase-js');

// Environment configurations (matches supabaseClient.js)
const environments = {
  PROD: {
    url: 'https://xymudnmqahgayqvpznwz.supabase.co',
    key: process.env.SUPABASE_PROD_SERVICE_KEY || ''
  },
  TEST: {
    url: 'https://pcjlrcuyhtqoijtkrlyj.supabase.co',
    key: process.env.SUPABASE_TEST_SERVICE_KEY || ''
  }
};

// Parse CLI arguments
const args = process.argv.slice(2);
let email = null;
let env = 'TEST';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--email' && i + 1 < args.length) {
    email = args[i + 1];
  }
  if (args[i] === '--env' && i + 1 < args.length) {
    env = args[i + 1].toUpperCase();
  }
}

if (!email) {
  console.error('❌ Error: --email parameter is required');
  console.error('Usage: node scripts/grant-admin-rights.js --email user@example.com [--env PROD|TEST]');
  process.exit(1);
}

if (!environments[env]) {
  console.error(`❌ Error: Invalid environment "${env}". Must be PROD or TEST`);
  process.exit(1);
}

const config = environments[env];
if (!config.key) {
  console.error(`❌ Error: Service key not configured for ${env}`);
  console.error(`Set environment variable: SUPABASE_${env}_SERVICE_KEY`);
  process.exit(1);
}

// Main function
(async () => {
  try {
    console.log(`🔐 Connecting to Supabase ${env} instance...`);
    const supabase = createClient(config.url, config.key);

    // Step 1: Check if user exists in auth.users
    console.log(`📧 Looking up user: ${email}`);
    const { data: authUsers, error: authError } = await supabase
      .from('auth.users')
      .select('id, email')
      .eq('email', email);

    if (authError) {
      console.error(`❌ Error querying auth.users:`, authError.message);
      process.exit(1);
    }

    if (!authUsers || authUsers.length === 0) {
      console.error(`❌ Error: User "${email}" not found in auth.users`);
      console.error('Please register the user first via signup or Supabase dashboard');
      process.exit(1);
    }

    const userId = authUsers[0].id;
    console.log(`✅ Found user: ${email} (ID: ${userId})`);

    // Step 2: Update or insert user_profiles role to 'Admin'
    console.log(`🔄 Setting role to 'Admin'...`);
    const { data: profile, error: updateError } = await supabase
      .from('user_profiles')
      .update({ role: 'Admin' })
      .eq('user_id', userId)
      .select();

    if (updateError && updateError.code !== 'PGRST116') {
      console.error(`❌ Error updating user_profiles:`, updateError.message);
      process.exit(1);
    }

    // If no rows were updated, try to insert
    if (!profile || profile.length === 0) {
      console.log(`ℹ️  No existing profile found. Creating new profile...`);
      const { data: inserted, error: insertError } = await supabase
        .from('user_profiles')
        .insert([{ user_id: userId, email, role: 'Admin' }])
        .select();

      if (insertError) {
        console.error(`❌ Error inserting user_profiles:`, insertError.message);
        process.exit(1);
      }

      console.log(`✅ Profile created with Admin role`);
    } else {
      console.log(`✅ Role updated to 'Admin'`);
    }

    // Step 3: Verify
    const { data: verified, error: verifyError } = await supabase
      .from('user_profiles')
      .select('user_id, email, role, created_at')
      .eq('user_id', userId);

    if (verifyError) {
      console.error(`❌ Error verifying:`, verifyError.message);
      process.exit(1);
    }

    console.log(`\n✅ SUCCESS! Admin rights granted to ${email}`);
    console.log(`📋 User Profile:`);
    console.table(verified[0]);
    console.log(`\n💡 User can now:`);
    console.log(`   • Import recipes`);
    console.log(`   • Create new recipes`);
    console.log(`   • Edit/delete recipes`);
    console.log(`   • Manage products`);
    console.log(`   • Access admin panel`);
    console.log(`   • No ads displayed`);

  } catch (error) {
    console.error(`❌ Unexpected error:`, error.message);
    process.exit(1);
  }
})();
