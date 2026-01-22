import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Validation helpers
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const validRoles = ['admin', 'user'];
const MIN_PASSWORD_LENGTH = 8;
const MAX_EMAIL_LENGTH = 255;
const MAX_PASSWORD_LENGTH = 128;

function validateEmail(email: string): { valid: boolean; error?: string } {
  if (typeof email !== 'string') {
    return { valid: false, error: 'Email must be a string' };
  }
  const trimmedEmail = email.trim();
  if (trimmedEmail.length === 0) {
    return { valid: false, error: 'Email is required' };
  }
  if (trimmedEmail.length > MAX_EMAIL_LENGTH) {
    return { valid: false, error: `Email must be less than ${MAX_EMAIL_LENGTH} characters` };
  }
  if (!emailRegex.test(trimmedEmail)) {
    return { valid: false, error: 'Invalid email format' };
  }
  return { valid: true };
}

function validatePassword(password: string): { valid: boolean; error?: string } {
  if (typeof password !== 'string') {
    return { valid: false, error: 'Password must be a string' };
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { valid: false, error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` };
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return { valid: false, error: `Password must be less than ${MAX_PASSWORD_LENGTH} characters` };
  }
  return { valid: true };
}

function validateRole(role: string): { valid: boolean; error?: string } {
  if (typeof role !== 'string') {
    return { valid: false, error: 'Role must be a string' };
  }
  if (!validRoles.includes(role)) {
    return { valid: false, error: `Invalid role. Must be one of: ${validRoles.join(', ')}` };
  }
  return { valid: true };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    // Create client with user's token for auth check
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const token = authHeader.replace('Bearer ', '')
    const { data: claims, error: claimsError } = await supabaseUser.auth.getClaims(token)
    
    if (claimsError || !claims?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    const userId = claims.claims.sub

    // Check if user is admin using service role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .single()

    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Forbidden: Admin access required' }), { 
        status: 403, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    // Parse and validate input
    let requestBody;
    try {
      requestBody = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const { email, password, role = 'user' } = requestBody;

    // Validate email
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      return new Response(JSON.stringify({ error: emailValidation.error }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return new Response(JSON.stringify({ error: passwordValidation.error }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Validate role
    const roleValidation = validateRole(role);
    if (!roleValidation.valid) {
      return new Response(JSON.stringify({ error: roleValidation.error }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Create user with admin client
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim(),
      password,
      email_confirm: true,
    })

    if (createError) {
      console.error('User creation failed:', createError);
      return new Response(JSON.stringify({ error: 'Failed to create user. Please try again.' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    // Assign role to new user
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({ user_id: newUser.user.id, role })

    if (roleError) {
      console.error('Role assignment failed:', roleError);
      return new Response(JSON.stringify({ error: 'Failed to assign role. Please try again.' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    return new Response(JSON.stringify({ 
      success: true, 
      user: { id: newUser.user.id, email: newUser.user.email, role } 
    }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(JSON.stringify({ error: 'An unexpected error occurred' }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })
  }
})
