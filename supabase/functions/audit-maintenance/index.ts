import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface ArchiveResult {
  archived_count: number;
}

interface CleanupResult {
  deleted_count: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Немає токена авторизації' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Не авторизовано' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'super_admin') {
      return new Response(
        JSON.stringify({ error: 'Доступ заборонено' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { action } = await req.json();

    let result: any = {};

    if (action === 'archive' || action === 'both') {
      const { data: archiveData, error: archiveError } = await supabase
        .rpc('archive_old_audit_logs');

      if (archiveError) {
        throw archiveError;
      }

      result.archived = archiveData?.[0]?.archived_count || 0;
    }

    if (action === 'cleanup' || action === 'both') {
      const { data: cleanupData, error: cleanupError } = await supabase
        .rpc('cleanup_archived_logs');

      if (cleanupError) {
        throw cleanupError;
      }

      result.deleted = cleanupData?.[0]?.deleted_count || 0;
    }

    const { data: stats } = await supabase.rpc('get_audit_stats');

    return new Response(
      JSON.stringify({
        success: true,
        result,
        stats: stats?.[0] || {},
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});