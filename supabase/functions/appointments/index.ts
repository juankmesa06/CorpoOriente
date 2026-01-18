import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Horario de atención: 7:00 AM - 9:00 PM
const WORKING_HOURS = { start: 7, end: 21 }
const APPOINTMENT_DURATION_HOURS = 1
const MIN_CANCELLATION_HOURS = 3

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

    const url = new URL(req.url)
    const action = url.searchParams.get('action')

    // GET: Obtener disponibilidad
    if (req.method === 'GET' && action === 'availability') {
      const doctorId = url.searchParams.get('doctor_id')
      const date = url.searchParams.get('date')

      if (!doctorId || !date) {
        return new Response(JSON.stringify({ error: 'doctor_id y date son requeridos' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Obtener citas existentes del día
      const startOfDay = new Date(date)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(date)
      endOfDay.setHours(23, 59, 59, 999)

      const { data: existingAppointments } = await supabase
        .from('appointments')
        .select('start_time, end_time')
        .eq('doctor_id', doctorId)
        .not('status', 'in', '("cancelled","no_show")')
        .gte('start_time', startOfDay.toISOString())
        .lte('start_time', endOfDay.toISOString())

      // Generar slots disponibles
      const slots: string[] = []
      const now = new Date()

      for (let hour = WORKING_HOURS.start; hour < WORKING_HOURS.end; hour++) {
        const slotStart = new Date(date)
        slotStart.setHours(hour, 0, 0, 0)
        
        // No mostrar slots pasados
        if (slotStart <= now) continue

        const slotEnd = new Date(slotStart)
        slotEnd.setHours(hour + APPOINTMENT_DURATION_HOURS)

        // Verificar si el slot está ocupado
        const isOccupied = existingAppointments?.some(apt => {
          const aptStart = new Date(apt.start_time)
          const aptEnd = new Date(apt.end_time)
          return (slotStart < aptEnd && slotEnd > aptStart)
        })

        if (!isOccupied) {
          slots.push(slotStart.toISOString())
        }
      }

      return new Response(JSON.stringify({ slots }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // POST: Crear cita
    if (req.method === 'POST' && action === 'create') {
      const body = await req.json()
      const { doctor_id, patient_id, start_time, is_virtual, notes, room_id } = body

      // Validaciones básicas
      if (!doctor_id || !patient_id || !start_time) {
        return new Response(JSON.stringify({ 
          error: 'doctor_id, patient_id y start_time son requeridos' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Cita presencial REQUIERE consultorio
      if (!is_virtual && !room_id) {
        return new Response(JSON.stringify({ 
          error: 'Las citas presenciales requieren un consultorio asignado' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      const startDate = new Date(start_time)
      const endDate = new Date(startDate)
      endDate.setHours(endDate.getHours() + APPOINTMENT_DURATION_HOURS)

      // 1. Validar horario de atención (7am - 9pm)
      const hour = startDate.getHours()
      if (hour < WORKING_HOURS.start || hour >= WORKING_HOURS.end) {
        return new Response(JSON.stringify({ 
          error: `Horario fuera de atención. Horario: ${WORKING_HOURS.start}:00 - ${WORKING_HOURS.end}:00` 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // 2. Validar que la cita no sea en el pasado
      if (startDate <= new Date()) {
        return new Response(JSON.stringify({ 
          error: 'No se pueden crear citas en el pasado' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // 3. Verificar relación médico-paciente
      const { data: relationship } = await supabase
        .rpc('check_doctor_patient_relationship', {
          _doctor_id: doctor_id,
          _patient_id: patient_id
        })

      if (!relationship) {
        return new Response(JSON.stringify({ 
          error: 'El paciente solo puede reservar con su médico asignado' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // 4. Verificar disponibilidad del médico (sin cruces de horario)
      const { data: isDoctorAvailable } = await supabase
        .rpc('check_appointment_availability', {
          _doctor_id: doctor_id,
          _start_time: startDate.toISOString(),
          _end_time: endDate.toISOString()
        })

      if (!isDoctorAvailable) {
        return new Response(JSON.stringify({ 
          error: 'El horario seleccionado no está disponible para el médico' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // 5. Verificar disponibilidad del consultorio (solo para citas presenciales)
      if (!is_virtual && room_id) {
        const { data: isRoomAvailable } = await supabase
          .rpc('check_room_availability', {
            _room_id: room_id,
            _start_time: startDate.toISOString(),
            _end_time: endDate.toISOString()
          })

        if (!isRoomAvailable) {
          return new Response(JSON.stringify({ 
            error: 'El consultorio seleccionado no está disponible en ese horario' 
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }
      }

      // Crear la cita
      const { data: appointment, error: createError } = await supabase
        .from('appointments')
        .insert({
          doctor_id,
          patient_id,
          start_time: startDate.toISOString(),
          end_time: endDate.toISOString(),
          is_virtual: is_virtual || false,
          room_id: is_virtual ? null : room_id,
          notes,
          created_by: user.id
        })
        .select()
        .single()

      if (createError) {
        console.error('Error creando cita:', createError)
        return new Response(JSON.stringify({ error: 'Error al crear la cita' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      console.log('Cita creada:', appointment.id)
      return new Response(JSON.stringify({ appointment }), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // POST: Cancelar cita
    if (req.method === 'POST' && action === 'cancel') {
      const body = await req.json()
      const { appointment_id, reason } = body

      if (!appointment_id) {
        return new Response(JSON.stringify({ error: 'appointment_id es requerido' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Obtener la cita
      const { data: appointment, error: fetchError } = await supabase
        .from('appointments')
        .select('*')
        .eq('id', appointment_id)
        .single()

      if (fetchError || !appointment) {
        return new Response(JSON.stringify({ error: 'Cita no encontrada' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Verificar política de cancelación (mínimo 3 horas antes)
      const appointmentStart = new Date(appointment.start_time)
      const now = new Date()
      const hoursUntilAppointment = (appointmentStart.getTime() - now.getTime()) / (1000 * 60 * 60)

      if (hoursUntilAppointment < MIN_CANCELLATION_HOURS) {
        return new Response(JSON.stringify({ 
          error: `Cancelación solo permitida con ${MIN_CANCELLATION_HOURS} horas de anticipación` 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Cancelar la cita
      const { error: updateError } = await supabase
        .from('appointments')
        .update({
          status: 'cancelled',
          cancellation_reason: reason,
          cancelled_at: new Date().toISOString(),
          cancelled_by: user.id
        })
        .eq('id', appointment_id)

      if (updateError) {
        console.error('Error cancelando cita:', updateError)
        return new Response(JSON.stringify({ error: 'Error al cancelar la cita' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Procesar crédito si el pago estaba completado
      const { data: creditResult } = await supabase.rpc('process_cancellation_credit', {
        _appointment_id: appointment_id
      })

      console.log('Cita cancelada:', appointment_id, 'Crédito:', creditResult)
      return new Response(JSON.stringify({ 
        success: true,
        credit_info: creditResult
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // POST: Confirmar cita (requiere pago)
    if (req.method === 'POST' && action === 'confirm') {
      const body = await req.json()
      const { appointment_id } = body

      if (!appointment_id) {
        return new Response(JSON.stringify({ error: 'appointment_id es requerido' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Verificar estado del pago
      const { data: paymentStatus } = await supabase.rpc('check_payment_status', {
        _appointment_id: appointment_id
      })

      if (paymentStatus !== 'paid') {
        return new Response(JSON.stringify({ 
          error: 'La cita no puede confirmarse sin pago completado',
          payment_status: paymentStatus
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Confirmar la cita
      const { error: updateError } = await supabase
        .from('appointments')
        .update({ status: 'confirmed' })
        .eq('id', appointment_id)

      if (updateError) {
        console.error('Error confirmando cita:', updateError)
        return new Response(JSON.stringify({ error: 'Error al confirmar la cita' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      console.log('Cita confirmada:', appointment_id)
      return new Response(JSON.stringify({ success: true }), {
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
