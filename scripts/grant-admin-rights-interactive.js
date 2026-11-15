#!/usr/bin/env node
/**
 * Interactive Admin Grant CLI
 * 
 * For users who prefer interactive prompt over command-line arguments
 * Usage: node scripts/grant-admin-rights-interactive.js
 */

const readline = require('readline');
const { createClient } = require('@supabase/supabase-js');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (prompt) => new Promise((resolve) => {
  rl.question(prompt, resolve);
});

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

(async () => {
  console.clear();
  console.log('🔐 MacroChef - Grant Admin Rights (Interactive)\n');

  try {
    // Step 1: Select environment
    console.log('Select Supabase environment:');
    console.log('  1) TEST (macrochef-test) - Default for development');
    console.log('  2) PROD (macrochef-prod) - Production');
    
    const envChoice = await question('\nChoose [1-2] (default=1): ');
    const env = envChoice === '2' ? 'PROD' : 'TEST';
    
    console.log(`\n✅ Selected: ${env}`);

    // Step 2: Get email
    const email = await question('\n📧 Enter email address to grant admin rights: ');
    
    if (!email || !email.includes('@')) {
      console.log('❌ Invalid email address');
      rl.close();
      process.exit(1);
    }

    // Step 3: Check for service key
    const config = environments[env];
    if (!config.key) {
      console.log(`\n❌ Error: Service key not configured for ${env}`);
      console.log(`\nPlease set environment variable: SUPABASE_${env}_SERVICE_KEY`);
      console.log('\nTo get the key:');
      console.log('  1. Go to https://app.supabase.com/');
      console.log('  2. Select your project');
      console.log('  3. Settings → API');
      console.log('  4. Copy "Service Role Secret"');
      rl.close();
      process.exit(1);
    }

    // Step 4: Confirm action
    console.log(`\n📋 Summary:`);
    console.log(`  Email: ${email}`);
    console.log(`  Environment: ${env}`);
    
    const confirm = await question(`\nProceed? (y/N): `);
    if (confirm.toLowerCase() !== 'y') {
      console.log('Cancelled.');
      rl.close();
      process.exit(0);
    }

    rl.close();

    // Step 5: Execute
    console.log(`\n🔄 Connecting to Supabase...`);
    const supabase = createClient(config.url, config.key);

    console.log(`📧 Looking up user: ${email}`);
    const { data: authUsers, error: authError } = await supabase
      .rpc('check_user_exists', { user_email: email });

    if (authError) {
      console.error(`❌ Error:`, authError.message);
      process.exit(1);
    }

    // Try direct query
    const { data: users, error: queryError } = await supabase
      .from('auth.users')
      .select('id, email')
      .eq('email', email);

    if (queryError || !users || users.length === 0) {
      console.error(`❌ User not found: ${email}`);
      console.error('User must be registered first via signup or Supabase dashboard');
      process.exit(1);
    }

    const userId = users[0].id;
    console.log(`✅ Found user: ${email} (ID: ${userId})`);

    console.log(`🔄 Setting role to Admin...`);
    const { data: profile, error: updateError } = await supabase
      .from('user_profiles')
      .update({ role: 'Admin' })
      .eq('user_id', userId)
      .select();

    if (updateError && updateError.code !== 'PGRST116') {
      console.error(`❌ Error:`, updateError.message);
      process.exit(1);
    }

    if (!profile || profile.length === 0) {
      console.log(`ℹ️  Creating profile...`);
      const { data: inserted, error: insertError } = await supabase
        .from('user_profiles')
        .insert([{ user_id: userId, email, role: 'Admin' }])
        .select();

      if (insertError) {
        console.error(`❌ Error:`, insertError.message);
        process.exit(1);
      }
    }

    // Verify
    const { data: verified } = await supabase
      .from('user_profiles')
      .select('user_id, email, role, created_at')
      .eq('user_id', userId);

    console.log(`\n✅ SUCCESS!\n`);
    console.log(`Admin rights granted to: ${email}`);
    console.table(verified[0]);
    console.log(`\n✨ User can now access:`);
    console.log(`  • Import recipes`);
    console.log(`  • Create new recipes`);
    console.log(`  • Edit/delete recipes`);
    console.log(`  • Manage products`);
    console.log(`  • Admin panel`);

  } catch (error) {
    console.error(`❌ Error:`, error.message);
    rl.close();
    process.exit(1);
  }
})();
