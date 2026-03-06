import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { data: { users } } = await supabaseAdmin.auth.admin.listUsers()
  const { data: roles } = await supabaseAdmin.from('user_roles').select('user_id, role')
  
  const result = users.map(u => ({
    id: u.id,
    email: u.email,
    role: roles?.find(r => r.user_id === u.id)?.role || 'none',
    confirmed: u.email_confirmed_at ? true : false
  }))

  return new Response(JSON.stringify(result), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
})
