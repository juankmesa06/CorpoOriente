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

    // Verificar rol (solo admin y receptionist pueden gestionar pagos)
    const { data: roles } = await supabase.rpc('get_user_roles', { _user_id: user.id })
    const canManagePayments = roles?.includes('admin') || roles?.includes('receptionist')

    const url = new URL(req.url)
    const action = url.searchParams.get('action')

    // GET: Obtener pago de una cita
    if (req.method === 'GET' && action === 'status') {
      const appointmentId = url.searchParams.get('appointment_id')

      if (!appointmentId) {
        return new Response(JSON.stringify({ error: 'appointment_id es requerido' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      const { data: payment, error: fetchError } = await supabase
        .from('payments')
        .select('*')
        .eq('appointment_id', appointmentId)
        .single()

      if (fetchError) {
        console.error('Error obteniendo pago:', fetchError)
        return new Response(JSON.stringify({ error: 'Pago no encontrado' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      return new Response(JSON.stringify({ payment }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // GET: Listar pagos (admin/receptionist)
    if (req.method === 'GET' && action === 'list') {
      if (!canManagePayments) {
        return new Response(JSON.stringify({ error: 'No autorizado para ver pagos' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      const status = url.searchParams.get('status')
      const limit = parseInt(url.searchParams.get('limit') || '50')

      let query = supabase
        .from('payments')
        .select(`
          *,
          appointments (
            id,
            start_time,
            doctor_id,
            patient_id,
            status
          )
        `)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (status) {
        query = query.eq('status', status)
      }

      const { data: payments, error: listError } = await query

      if (listError) {
        console.error('Error listando pagos:', listError)
        return new Response(JSON.stringify({ error: 'Error al listar pagos' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      return new Response(JSON.stringify({ payments }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // GET: Obtener créditos de un paciente
    if (req.method === 'GET' && action === 'credits') {
      const patientId = url.searchParams.get('patient_id')

      if (!patientId) {
        return new Response(JSON.stringify({ error: 'patient_id es requerido' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      const { data: credits, error: creditsError } = await supabase
        .from('payments')
        .select(`
          *,
          appointments!inner (
            patient_id
          )
        `)
        .eq('status', 'credit')
        .eq('appointments.patient_id', patientId)

      if (creditsError) {
        console.error('Error obteniendo créditos:', creditsError)
        return new Response(JSON.stringify({ error: 'Error al obtener créditos' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      const totalCredits = credits?.reduce((sum, c) => sum + parseFloat(c.amount), 0) || 0

      return new Response(JSON.stringify({ 
        credits,
        total_credits: totalCredits
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // POST: Marcar pago manual (admin/receptionist)
    if (req.method === 'POST' && action === 'mark-paid') {
      if (!canManagePayments) {
        return new Response(JSON.stringify({ error: 'No autorizado para gestionar pagos' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      const body = await req.json()
      const { appointment_id, payment_method, amount, notes } = body

      if (!appointment_id || !payment_method) {
        return new Response(JSON.stringify({ 
          error: 'appointment_id y payment_method son requeridos' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Usar función de base de datos para procesar pago
      const { data: result, error: paymentError } = await supabase.rpc('process_manual_payment', {
        _appointment_id: appointment_id,
        _payment_method: payment_method,
        _amount: amount || null,
        _notes: notes || null
      })

      if (paymentError) {
        console.error('Error procesando pago:', paymentError)
        return new Response(JSON.stringify({ error: 'Error al procesar pago' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      if (!result?.success) {
        return new Response(JSON.stringify({ error: result?.error || 'Error desconocido' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      console.log('Pago procesado para cita:', appointment_id)
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // POST: Aplicar crédito a nueva cita
    if (req.method === 'POST' && action === 'apply-credit') {
      if (!canManagePayments) {
        return new Response(JSON.stringify({ error: 'No autorizado para gestionar pagos' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      const body = await req.json()
      const { credit_payment_id, new_appointment_id } = body

      if (!credit_payment_id || !new_appointment_id) {
        return new Response(JSON.stringify({ 
          error: 'credit_payment_id y new_appointment_id son requeridos' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Obtener crédito
      const { data: credit, error: creditError } = await supabase
        .from('payments')
        .select('*')
        .eq('id', credit_payment_id)
        .eq('status', 'credit')
        .single()

      if (creditError || !credit) {
        return new Response(JSON.stringify({ error: 'Crédito no encontrado o ya utilizado' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Obtener pago de la nueva cita
      const { data: newPayment, error: newPaymentError } = await supabase
        .from('payments')
        .select('*')
        .eq('appointment_id', new_appointment_id)
        .single()

      if (newPaymentError || !newPayment) {
        return new Response(JSON.stringify({ error: 'Pago de nueva cita no encontrado' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Marcar crédito como usado
      await supabase
        .from('payments')
        .update({
          status: 'refunded',
          notes: `${credit.notes || ''} | Crédito aplicado a cita ${new_appointment_id}`
        })
        .eq('id', credit_payment_id)

      // Marcar nueva cita como pagada
      await supabase
        .from('payments')
        .update({
          status: 'paid',
          payment_method: 'credit',
          paid_at: new Date().toISOString(),
          paid_by: user.id,
          credit_from_appointment_id: credit.appointment_id,
          notes: `Pagado con crédito de cita ${credit.appointment_id}`
        })
        .eq('id', newPayment.id)

      console.log('Crédito aplicado:', credit_payment_id, 'a cita:', new_appointment_id)
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Crédito aplicado exitosamente' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ error: 'Acción no válida' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ error: 'Error interno del servidor' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
