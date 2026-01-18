import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Verificar autenticación
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Token inválido' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Verificar rol ADMIN
    const { data: roles } = await supabase.rpc('get_user_roles', { _user_id: user.id })
    const isAdmin = roles?.includes('admin')

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Acceso denegado. Solo administradores.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const url = new URL(req.url)
    const report = url.searchParams.get('report')
    const startDate = url.searchParams.get('start_date') || null
    const endDate = url.searchParams.get('end_date') || null
    const monthsBack = parseInt(url.searchParams.get('months_back') || '12')

    // DASHBOARD RESUMEN
    if (report === 'dashboard') {
      const { data, error } = await supabase.rpc('report_dashboard_summary', {
        _start_date: startDate,
        _end_date: endDate
      })

      if (error) throw error
      return new Response(JSON.stringify({ data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // INGRESOS POR DÍA
    if (report === 'income-by-day') {
      const { data, error } = await supabase.rpc('report_income_by_day', {
        _start_date: startDate,
        _end_date: endDate
      })

      if (error) throw error
      return new Response(JSON.stringify({ data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // INGRESOS POR MES
    if (report === 'income-by-month') {
      const { data, error } = await supabase.rpc('report_income_by_month', {
        _months_back: monthsBack
      })

      if (error) throw error
      return new Response(JSON.stringify({ data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // INGRESOS POR MÉDICO
    if (report === 'income-by-doctor') {
      const { data, error } = await supabase.rpc('report_income_by_doctor', {
        _start_date: startDate,
        _end_date: endDate
      })

      if (error) throw error
      return new Response(JSON.stringify({ data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // INGRESOS POR CONSULTORIO
    if (report === 'income-by-room') {
      const { data, error } = await supabase.rpc('report_income_by_room', {
        _start_date: startDate,
        _end_date: endDate
      })

      if (error) throw error
      return new Response(JSON.stringify({ data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // CITAS POR ESTADO
    if (report === 'appointments-by-status') {
      const { data, error } = await supabase.rpc('report_appointments_by_status', {
        _start_date: startDate,
        _end_date: endDate
      })

      if (error) throw error
      return new Response(JSON.stringify({ data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // HORAS POR CONSULTORIO
    if (report === 'room-hours') {
      const { data, error } = await supabase.rpc('report_room_hours', {
        _start_date: startDate,
        _end_date: endDate
      })

      if (error) throw error
      return new Response(JSON.stringify({ data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // OCUPACIÓN DE CONSULTORIOS
    if (report === 'room-occupancy') {
      const { data, error } = await supabase.rpc('report_room_occupancy', {
        _start_date: startDate,
        _end_date: endDate
      })

      if (error) throw error
      return new Response(JSON.stringify({ data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // RESUMEN DE PAGOS
    if (report === 'payments-summary') {
      const { data, error } = await supabase.rpc('report_payments_summary', {
        _start_date: startDate,
        _end_date: endDate
      })

      if (error) throw error
      return new Response(JSON.stringify({ data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ 
      error: 'Reporte no válido',
      available_reports: [
        'dashboard',
        'income-by-day',
        'income-by-month',
        'income-by-doctor',
        'income-by-room',
        'appointments-by-status',
        'room-hours',
        'room-occupancy',
        'payments-summary'
      ]
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error en reportes:', error)
    return new Response(JSON.stringify({ error: 'Error interno del servidor' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
