import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const action = pathParts[pathParts.length - 1] || url.searchParams.get('action');

    // Actions that don't require auth (token-based)
    if (action === 'submit' && req.method === 'POST') {
      const body = await req.json();
      const { token, doctor_rating, punctuality_rating, clarity_rating, treatment_rating, comment } = body;

      if (!token) {
        return new Response(
          JSON.stringify({ success: false, error: 'Token requerido' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Validate ratings
      const ratings = [doctor_rating, punctuality_rating, clarity_rating, treatment_rating];
      if (ratings.some(r => !r || r < 1 || r > 5)) {
        return new Response(
          JSON.stringify({ success: false, error: 'Todas las calificaciones deben estar entre 1 y 5' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data, error } = await supabase.rpc('submit_survey_response', {
        _token: token,
        _doctor_rating: doctor_rating,
        _punctuality_rating: punctuality_rating,
        _clarity_rating: clarity_rating,
        _treatment_rating: treatment_rating,
        _comment: comment || null
      });

      if (error) {
        console.error('Error submitting survey:', error);
        return new Response(
          JSON.stringify({ success: false, error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get survey by token (public, for patient to view before submitting)
    if (action === 'get' && req.method === 'GET') {
      const token = url.searchParams.get('token');
      
      if (!token) {
        return new Response(
          JSON.stringify({ success: false, error: 'Token requerido' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: survey, error } = await supabase
        .from('surveys')
        .select(`
          id,
          status,
          scheduled_for,
          appointment_id,
          appointments!inner(
            start_time,
            end_time,
            doctor_profiles!inner(
              specialty,
              profiles!inner(full_name)
            )
          )
        `)
        .eq('token', token)
        .single();

      if (error || !survey) {
        return new Response(
          JSON.stringify({ success: false, error: 'Encuesta no encontrada' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (survey.status === 'completed') {
        return new Response(
          JSON.stringify({ success: false, error: 'Esta encuesta ya fue completada' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, survey }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Actions requiring authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'No autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Token inválido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user roles
    const { data: roles } = await supabase.rpc('get_user_roles', { _user_id: user.id });
    const isAdmin = roles?.includes('admin');
    const isDoctor = roles?.includes('doctor');

    // Generate pending surveys (admin only, or can be called by cron)
    if (action === 'generate' && req.method === 'POST') {
      if (!isAdmin) {
        return new Response(
          JSON.stringify({ success: false, error: 'Solo administradores pueden generar encuestas' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: count, error } = await supabase.rpc('generate_pending_surveys');

      if (error) {
        console.error('Error generating surveys:', error);
        return new Response(
          JSON.stringify({ success: false, error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, surveys_generated: count }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get doctor metrics (doctors see their own, admins see any)
    if (action === 'metrics' && req.method === 'GET') {
      let doctorId = url.searchParams.get('doctor_id');

      if (isDoctor && !isAdmin) {
        // Get doctor's own profile
        const { data: doctorProfile } = await supabase
          .from('doctor_profiles')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (!doctorProfile) {
          return new Response(
            JSON.stringify({ success: false, error: 'Perfil de doctor no encontrado' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        doctorId = doctorProfile.id;
      } else if (!isAdmin) {
        return new Response(
          JSON.stringify({ success: false, error: 'No autorizado' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!doctorId) {
        return new Response(
          JSON.stringify({ success: false, error: 'doctor_id requerido' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data, error } = await supabase.rpc('get_doctor_survey_metrics', {
        _doctor_id: doctorId
      });

      if (error) {
        console.error('Error getting metrics:', error);
        return new Response(
          JSON.stringify({ success: false, error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, metrics: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get alerts (admin only)
    if (action === 'alerts' && req.method === 'GET') {
      if (!isAdmin) {
        return new Response(
          JSON.stringify({ success: false, error: 'Solo administradores pueden ver alertas' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data, error } = await supabase.rpc('get_survey_alerts');

      if (error) {
        console.error('Error getting alerts:', error);
        return new Response(
          JSON.stringify({ success: false, error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, alerts: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // List pending surveys (admin only)
    if (action === 'pending' && req.method === 'GET') {
      if (!isAdmin) {
        return new Response(
          JSON.stringify({ success: false, error: 'Solo administradores' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data, error } = await supabase
        .from('surveys')
        .select(`
          id,
          status,
          scheduled_for,
          sent_at,
          patient_profiles!inner(
            id,
            profiles!inner(full_name, phone)
          ),
          doctor_profiles!inner(
            specialty,
            profiles!inner(full_name)
          )
        `)
        .in('status', ['pending', 'sent'])
        .order('scheduled_for', { ascending: true });

      if (error) {
        console.error('Error listing pending surveys:', error);
        return new Response(
          JSON.stringify({ success: false, error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, surveys: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Acción no válida' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Server error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Error interno del servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
