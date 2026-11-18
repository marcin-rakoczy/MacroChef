const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' }
});

const providerHeaders = (key) => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${key}`
});

const base64FromBytes = (bytes) => {
  let binary = '';
  const chunkSize = 8192;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
};

const bytesFromBase64 = (value) => {
  const base64 = String(value).replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '');
  return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
};

async function uploadGeneratedImage({ supabaseUrl, serviceRoleKey, userId, recipeId, bytes, contentType }) {
  const extension = contentType.includes('webp') ? 'webp' : contentType.includes('jpeg') ? 'jpg' : 'png';
  const path = `${userId}/${recipeId || crypto.randomUUID()}-${Date.now()}.${extension}`;
  const uploadResponse = await fetch(
    `${supabaseUrl}/storage/v1/object/recipe-images/${path}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey,
        'Content-Type': contentType,
        'x-upsert': 'true'
      },
      body: bytes
    }
  );
  if (!uploadResponse.ok) {
    throw new Error(`Storage upload failed: ${uploadResponse.status} ${await uploadResponse.text()}`);
  }
  return `${supabaseUrl}/storage/v1/object/public/recipe-images/${path}`;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const authorization = request.headers.get('Authorization') || '';
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const endpoint = Deno.env.get('RECIPE_IMAGE_AI_ENDPOINT');
  const providerKey = Deno.env.get('RECIPE_IMAGE_AI_KEY');
  const model = Deno.env.get('RECIPE_IMAGE_AI_MODEL') || '@cf/black-forest-labs/flux-1-schnell';
  if (!supabaseUrl || !anonKey || !serviceRoleKey || !endpoint || !providerKey) {
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
  const isCloudflare = endpoint.includes('api.cloudflare.com');
  if (isCloudflare && payload.operation === 'verify') {
    return json({
      valid: true,
      matchesRecipe: true,
      matchesStyle: false,
      reason: 'Cloudflare image generation endpoint does not provide vision verification'
    });
  }

  const providerPayload = isCloudflare && payload.operation !== 'verify'
    ? { model, prompt: payload.prompt }
    : payload;
  const providerResponse = await fetch(endpoint, {
    method: 'POST',
    headers: providerHeaders(providerKey),
    body: JSON.stringify(providerPayload)
  });
  if (!providerResponse.ok) {
    return json({
      error: 'Image provider request failed',
      providerStatus: providerResponse.status,
      providerMessage: await providerResponse.text()
    }, 502);
  }

  const responseType = providerResponse.headers.get('Content-Type') || '';
  if (payload.operation !== 'verify' && responseType.startsWith('image/')) {
    const bytes = new Uint8Array(await providerResponse.arrayBuffer());
    const imageUrl = await uploadGeneratedImage({
      supabaseUrl, serviceRoleKey, userId: user.id,
      recipeId: payload.recipe && payload.recipe.id,
      bytes, contentType: responseType.split(';')[0]
    });
    return json({ imageUrl });
  }

  let providerBody;
  try {
    providerBody = await providerResponse.json();
  } catch {
    return json({ error: 'Image provider returned an unsupported response' }, 502);
  }
  if (payload.operation === 'verify') return json(providerBody);

  const base64 = providerBody.result && providerBody.result.image
    ? providerBody.result.image
    : providerBody.image || providerBody.imageBase64 || providerBody.imageDataUrl;
  const directUrl = providerBody.imageUrl || providerBody.url ||
    (providerBody.result && providerBody.result.imageUrl);
  if (directUrl) return json({ imageUrl: directUrl });
  if (!base64) {
    return json({
      error: 'Image provider returned no image',
      providerResponse: providerBody
    }, 502);
  }

  const bytes = bytesFromBase64(base64);
  const contentType = String(base64).startsWith('data:image/')
    ? String(base64).slice(5, String(base64).indexOf(';'))
    : (Deno.env.get('RECIPE_IMAGE_AI_FORMAT') || 'image/png');
  const imageUrl = await uploadGeneratedImage({
    supabaseUrl, serviceRoleKey, userId: user.id,
    recipeId: payload.recipe && payload.recipe.id,
    bytes, contentType
  });
  return json({
    imageUrl,
    imageDataUrl: `data:${contentType};base64,${base64FromBytes(bytes)}`
  });
});
