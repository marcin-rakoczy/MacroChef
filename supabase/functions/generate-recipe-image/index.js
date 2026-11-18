const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' }
});

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const authorization = request.headers.get('Authorization') || '';
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const endpoint = Deno.env.get('RECIPE_IMAGE_AI_ENDPOINT');
  const providerKey = Deno.env.get('RECIPE_IMAGE_AI_KEY');
  if (!supabaseUrl || !anonKey || !endpoint || !providerKey) {
    return json({ error: 'Recipe image AI provider is not configured' }, 503);
  }
  if (!authorization.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);

  const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { Authorization: authorization, apikey: anonKey }
  });
  if (!userResponse.ok) return json({ error: 'Unauthorized' }, 401);
  const user = await userResponse.json();
  const profileResponse = await fetch(
    `${supabaseUrl}/rest/v1/user_profiles?select=role&user_id=eq.${encodeURIComponent(user.id)}`,
    { headers: { Authorization: authorization, apikey: anonKey } }
  );
  if (!profileResponse.ok) return json({ error: 'Could not verify account role' }, 403);
  const profiles = await profileResponse.json();
  if (!profiles[0] || profiles[0].role !== 'Admin') {
    return json({ error: 'Administrator role required' }, 403);
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }
  if (!['verify', 'restylize', 'generate'].includes(payload.operation)) {
    return json({ error: 'Invalid operation' }, 400);
  }

  const providerResponse = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${providerKey}`
    },
    body: JSON.stringify(payload)
  });
  const providerBody = await providerResponse.text();
  if (!providerResponse.ok) {
    return json({ error: 'Image provider request failed', status: providerResponse.status }, 502);
  }
  return new Response(providerBody, {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': providerResponse.headers.get('Content-Type') || 'application/json' }
  });
});
