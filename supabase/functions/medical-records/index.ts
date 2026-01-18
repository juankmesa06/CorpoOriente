import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Authenticate user
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

    // Get user roles and profiles
    const { data: roles } = await supabase.rpc('get_user_roles', { _user_id: user.id });
    const isAdmin = roles?.includes('admin');
    const isDoctor = roles?.includes('doctor');
    const isPatient = roles?.includes('patient');

    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const action = pathParts[pathParts.length - 1] || url.searchParams.get('action');

    // Get patient medical history
    if (action === 'history' && req.method === 'GET') {
      const patientId = url.searchParams.get('patient_id');

      if (!patientId) {
        return new Response(
          JSON.stringify({ success: false, error: 'patient_id requerido' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify access
      let hasAccess = isAdmin;

      if (isDoctor && !hasAccess) {
        const { data: doctorProfile } = await supabase
          .from('doctor_profiles')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (doctorProfile) {
          const { data: relationship } = await supabase
            .from('doctor_patients')
            .select('id')
            .eq('doctor_id', doctorProfile.id)
            .eq('patient_id', patientId)
            .eq('status', 'active')
            .single();

          hasAccess = !!relationship;
        }
      }

      if (isPatient && !hasAccess) {
        const { data: patientProfile } = await supabase
          .from('patient_profiles')
          .select('id')
          .eq('user_id', user.id)
          .single();

        hasAccess = patientProfile?.id === patientId;
      }

      if (!hasAccess) {
        return new Response(
          JSON.stringify({ success: false, error: 'No tiene acceso a este expediente' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get medical history
      const { data, error } = await supabase.rpc('get_patient_medical_history', {
        _patient_id: patientId
      });

      if (error) {
        console.error('Error getting medical history:', error);
        return new Response(
          JSON.stringify({ success: false, error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Log access
      if (data?.medical_record?.id) {
        await supabase.rpc('log_medical_record_access', {
          _medical_record_id: data.medical_record.id,
          _user_id: user.id,
          _action: 'view'
        });
      }

      return new Response(
        JSON.stringify({ success: true, data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create medical entry (doctors only)
    if (action === 'create-entry' && req.method === 'POST') {
      if (!isDoctor) {
        return new Response(
          JSON.stringify({ success: false, error: 'Solo médicos pueden crear entradas clínicas' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const body = await req.json();
      const { patient_id, appointment_id, chief_complaint, diagnosis, evolution, treatment_plan, observations, vital_signs, attachments } = body;

      if (!patient_id || !chief_complaint) {
        return new Response(
          JSON.stringify({ success: false, error: 'patient_id y chief_complaint son requeridos' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get doctor profile
      const { data: doctorProfile } = await supabase
        .from('doctor_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!doctorProfile) {
        return new Response(
          JSON.stringify({ success: false, error: 'Perfil de médico no encontrado' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data, error } = await supabase.rpc('create_medical_entry', {
        _patient_id: patient_id,
        _doctor_id: doctorProfile.id,
        _appointment_id: appointment_id || null,
        _chief_complaint: chief_complaint,
        _diagnosis: diagnosis || null,
        _evolution: evolution || null,
        _treatment_plan: treatment_plan || null,
        _observations: observations || null,
        _vital_signs: vital_signs || null,
        _attachments: attachments || null
      });

      if (error) {
        console.error('Error creating medical entry:', error);
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

    // Update medical entry (doctors only, creates new version)
    if (action === 'update-entry' && req.method === 'POST') {
      if (!isDoctor) {
        return new Response(
          JSON.stringify({ success: false, error: 'Solo médicos pueden actualizar entradas clínicas' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const body = await req.json();
      const { entry_id, chief_complaint, diagnosis, evolution, treatment_plan, observations, vital_signs, attachments } = body;

      if (!entry_id || !chief_complaint) {
        return new Response(
          JSON.stringify({ success: false, error: 'entry_id y chief_complaint son requeridos' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get doctor profile
      const { data: doctorProfile } = await supabase
        .from('doctor_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!doctorProfile) {
        return new Response(
          JSON.stringify({ success: false, error: 'Perfil de médico no encontrado' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data, error } = await supabase.rpc('update_medical_entry', {
        _entry_id: entry_id,
        _doctor_id: doctorProfile.id,
        _chief_complaint: chief_complaint,
        _diagnosis: diagnosis || null,
        _evolution: evolution || null,
        _treatment_plan: treatment_plan || null,
        _observations: observations || null,
        _vital_signs: vital_signs || null,
        _attachments: attachments || null
      });

      if (error) {
        console.error('Error updating medical entry:', error);
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

    // Update medical record base info (doctors only)
    if (action === 'update-record' && req.method === 'POST') {
      if (!isDoctor && !isAdmin) {
        return new Response(
          JSON.stringify({ success: false, error: 'No autorizado' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const body = await req.json();
      const { patient_id, blood_type, chronic_conditions, current_medications, surgical_history, family_history } = body;

      if (!patient_id) {
        return new Response(
          JSON.stringify({ success: false, error: 'patient_id requerido' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get or create medical record
      const { data: recordId, error: recordError } = await supabase.rpc('get_or_create_medical_record', {
        _patient_id: patient_id,
        _created_by: user.id
      });

      if (recordError) {
        return new Response(
          JSON.stringify({ success: false, error: recordError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update record
      const { error: updateError } = await supabase
        .from('medical_records')
        .update({
          blood_type,
          chronic_conditions,
          current_medications,
          surgical_history,
          family_history,
          updated_at: new Date().toISOString()
        })
        .eq('id', recordId);

      if (updateError) {
        return new Response(
          JSON.stringify({ success: false, error: updateError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Log update
      await supabase.rpc('log_medical_record_access', {
        _medical_record_id: recordId,
        _user_id: user.id,
        _action: 'update'
      });

      return new Response(
        JSON.stringify({ success: true, medical_record_id: recordId }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get audit log (admin only)
    if (action === 'audit' && req.method === 'GET') {
      if (!isAdmin) {
        return new Response(
          JSON.stringify({ success: false, error: 'Solo administradores pueden ver auditoría' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const patientId = url.searchParams.get('patient_id');
      const limit = parseInt(url.searchParams.get('limit') || '100');

      let query = supabase
        .from('medical_record_audit')
        .select(`
          id,
          action,
          action_details,
          created_at,
          medical_record_id,
          profiles!inner(full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (patientId) {
        const { data: record } = await supabase
          .from('medical_records')
          .select('id')
          .eq('patient_id', patientId)
          .single();

        if (record) {
          query = query.eq('medical_record_id', record.id);
        }
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error getting audit log:', error);
        return new Response(
          JSON.stringify({ success: false, error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, audit: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get doctor's patients for EMR access
    if (action === 'my-patients' && req.method === 'GET') {
      if (!isDoctor) {
        return new Response(
          JSON.stringify({ success: false, error: 'Solo médicos' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: doctorProfile } = await supabase
        .from('doctor_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!doctorProfile) {
        return new Response(
          JSON.stringify({ success: false, error: 'Perfil no encontrado' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data, error } = await supabase
        .from('doctor_patients')
        .select(`
          patient_id,
          status,
          patient_profiles!inner(
            id,
            date_of_birth,
            gender,
            profiles!inner(full_name, phone, email)
          )
        `)
        .eq('doctor_id', doctorProfile.id)
        .eq('status', 'active');

      if (error) {
        return new Response(
          JSON.stringify({ success: false, error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, patients: data }),
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
