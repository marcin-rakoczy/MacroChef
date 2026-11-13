const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const sql = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'migrations', '20261113210000_initial_schema.sql'), 'utf8');
const tables = ['user_profiles', 'products', 'recipes', 'planner', 'goals'];
const tableBody = (name) => {
  const match = sql.match(new RegExp(`CREATE TABLE IF NOT EXISTS public\\.${name} \\(([\\s\\S]*?)\\n\\);`));
  assert.ok(match, `table ${name} is defined`);
  return match[1];
};
const policy = (name) => {
  const match = sql.match(new RegExp(`CREATE POLICY ${name} ON [\\s\\S]*?;`));
  assert.ok(match, `policy ${name} is defined`);
  return match[0];
};

// Idempotency: every statement must be safe to re-run.
assert.equal(/CREATE TABLE (?!IF NOT EXISTS)/.test(sql), false, 'tables use IF NOT EXISTS');
assert.equal(/CREATE INDEX (?!IF NOT EXISTS)/.test(sql), false, 'indexes use IF NOT EXISTS');
assert.equal(/CREATE TRIGGER/.test(sql) && !/DROP TRIGGER IF EXISTS on_auth_user_created/.test(sql), false);
const policyNames = [...sql.matchAll(/CREATE POLICY (\w+) ON ([\w.]+)/g)];
assert.ok(policyNames.length >= 10);
policyNames.forEach(([, name, table]) => {
  assert.ok(sql.includes(`DROP POLICY IF EXISTS ${name} ON ${table};`), `${name} is dropped first`);
});

// user_profiles
const profiles = tableBody('user_profiles');
assert.match(profiles, /user_id\s+UUID PRIMARY KEY REFERENCES auth\.users\(id\) ON DELETE CASCADE/);
assert.match(profiles, /email\s+TEXT NOT NULL/);
assert.match(profiles, /role\s+TEXT NOT NULL DEFAULT 'UserWithAdvertisement'/);
assert.match(profiles, /CHECK \(role IN \('Admin', 'Tester', 'UserWithAdvertisement'\)\)/);
assert.match(profiles, /created_at\s+TIMESTAMPTZ NOT NULL DEFAULT now\(\)/);

// Registration trigger
assert.match(sql, /FUNCTION public\.handle_new_user\(\)[\s\S]*?SECURITY DEFINER/);
assert.match(sql, /CREATE TRIGGER on_auth_user_created\s+AFTER INSERT ON auth\.users/);
assert.match(sql, /VALUES \(NEW\.id, COALESCE\(NEW\.email, ''\), 'UserWithAdvertisement'\)/);

// Domain tables
const products = tableBody('products');
['id TEXT PRIMARY KEY', 'name_pl TEXT', 'name_en TEXT', 'category TEXT', 'category_pl TEXT',
  'category_en TEXT', 'unit TEXT', 'package_size NUMERIC', 'source_url TEXT', 'source_verified_at DATE']
  .forEach((column) => assert.match(products, new RegExp(column.replace(/ /g, '\\s+'))));
['recipes', 'planner', 'goals'].forEach((name) => {
  const body = tableBody(name);
  assert.match(body, /id\s+TEXT PRIMARY KEY/, `${name} uses a text key`);
  assert.match(body, /user_id\s+UUID NOT NULL REFERENCES auth\.users\(id\) ON DELETE CASCADE/);
  assert.match(body, /data\s+JSONB NOT NULL/);
});
assert.match(tableBody('planner'), /day_key\s+TEXT NOT NULL/);
['products', 'recipes', 'planner', 'goals'].forEach((name) => {
  assert.match(tableBody(name), /updated_at\s+TIMESTAMPTZ NOT NULL DEFAULT now\(\)/);
});

// set_updated_at trigger covers all domain tables on INSERT and UPDATE
assert.match(sql, /NEW\.updated_at = now\(\);/);
assert.match(sql, /ARRAY\['products', 'recipes', 'planner', 'goals'\]/);
assert.match(sql, /BEFORE INSERT OR UPDATE ON public\.%I/);

// RLS enabled everywhere
tables.forEach((name) => {
  assert.ok(sql.includes(`ALTER TABLE public.${name}`) &&
    new RegExp(`ALTER TABLE public\\.${name}\\s+ENABLE ROW LEVEL SECURITY`).test(sql), `${name} has RLS`);
});

// user_profiles: own row read-only, no client writes
assert.match(policy('user_profiles_select_own'), /FOR SELECT[\s\S]*auth\.uid\(\)\) = user_id/);
assert.match(sql, /REVOKE INSERT, UPDATE, DELETE ON public\.user_profiles FROM anon, authenticated;/);
assert.equal(/CREATE POLICY \w+ ON public\.user_profiles\s+FOR (INSERT|UPDATE|DELETE|ALL)/.test(sql), false);

// products: authenticated read, admin-only writes
assert.match(policy('products_select_authenticated'), /auth\.role\(\)\) = 'authenticated'/);
['insert', 'update', 'delete'].forEach((action) => {
  const text = policy(`products_${action}_admin`);
  assert.match(text, new RegExp(`FOR ${action.toUpperCase()}`));
  assert.match(text, /public\.is_admin\(\)/);
});

// recipes: own + admin library readable, admin-only writes
assert.match(policy('recipes_select_own_or_admin_library'), /auth\.uid\(\)\) = user_id OR public\.is_admin\(user_id\)/);
['insert', 'update', 'delete'].forEach((action) => {
  const text = policy(`recipes_${action}_admin`);
  assert.match(text, new RegExp(`FOR ${action.toUpperCase()}`));
  assert.match(text, /public\.is_admin\(\) AND \(SELECT auth\.uid\(\)\) = user_id/);
});

// planner / goals: owner-only for all commands
['planner_owner_all', 'goals_owner_all'].forEach((name) => {
  const text = policy(name);
  assert.match(text, /FOR ALL/);
  assert.match(text, /USING \(\(SELECT auth\.uid\(\)\) = user_id\)/);
  assert.match(text, /WITH CHECK \(\(SELECT auth\.uid\(\)\) = user_id\)/);
});

// Admin lookup must bypass RLS and be hardened
assert.match(sql, /FUNCTION public\.is_admin[\s\S]*?SECURITY DEFINER\s+SET search_path = public/);

console.log('supabase schema tests passed');
