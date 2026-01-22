import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// UUID validation regex
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validateUserId(userId: unknown): { valid: boolean; error?: string } {
  if (typeof userId !== 'string') {
    return { valid: false, error: 'User ID must be a string' };
  }
  if (userId.trim().length === 0) {
    return { valid: false, error: 'User ID is required' };
  }
  if (!uuidRegex.test(userId)) {
    return { valid: false, error: 'Invalid user ID format' };
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

    const adminUserId = claims.claims.sub

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Check if user is admin
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', adminUserId)
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

    const { userId } = requestBody;

    // Validate userId
    const userIdValidation = validateUserId(userId);
    if (!userIdValidation.valid) {
      return new Response(JSON.stringify({ error: userIdValidation.error }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Prevent self-deletion
    if (userId === adminUserId) {
      return new Response(JSON.stringify({ error: 'Cannot delete your own account' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    // Delete user (this will cascade delete their role due to ON DELETE CASCADE)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (deleteError) {
      console.error('User deletion failed:', deleteError);
      return new Response(JSON.stringify({ error: 'Failed to delete user. Please try again.' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    return new Response(JSON.stringify({ success: true }), { 
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
