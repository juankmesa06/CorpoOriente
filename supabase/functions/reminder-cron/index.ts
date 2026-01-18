import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * CRON JOB: Generación y envío de recordatorios automáticos
 * 
 * Flujo:
 * 1. Genera recordatorios para citas en las próximas 25 horas
 * 2. Envía recordatorios pendientes cuya hora programada ya pasó
 * 3. Simula envío de WhatsApp (log + actualización de estado)
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('=== CRON: Iniciando proceso de recordatorios ===')

    // 1. Generar recordatorios pendientes
    const { data: generatedCount, error: genError } = await supabase
      .rpc('generate_pending_reminders')

    if (genError) {
      console.error('Error generando recordatorios:', genError)
    } else {
      console.log(`Recordatorios generados: ${generatedCount}`)
    }

    // 2. Obtener recordatorios listos para enviar
    const { data: pendingReminders, error: fetchError } = await supabase
      .from('reminders')
      .select(`
        id,
        token,
        scheduled_for,
        message_content,
        appointment_id
      `)
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString())
      .limit(50) // Procesar en lotes

    if (fetchError) {
      console.error('Error obteniendo recordatorios:', fetchError)
      return new Response(JSON.stringify({ error: 'Error procesando recordatorios' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`Recordatorios pendientes a enviar: ${pendingReminders?.length || 0}`)

    // 3. Procesar cada recordatorio
    const results = {
      sent: 0,
      failed: 0
    }

    for (const reminder of pendingReminders || []) {
      try {
        // Obtener la cita y datos relacionados
        const { data: appointment } = await supabase
          .from('appointments')
          .select('id, start_time, is_virtual, patient_id')
          .eq('id', reminder.appointment_id)
          .single()

        if (!appointment) {
          console.log(`Recordatorio ${reminder.id}: Cita no encontrada`)
          continue
        }

        // Obtener perfil del paciente
        const { data: patientProfile } = await supabase
          .from('patient_profiles')
          .select('id, user_id')
          .eq('id', appointment.patient_id)
          .single()

        if (!patientProfile) {
          console.log(`Recordatorio ${reminder.id}: Sin perfil de paciente`)
          continue
        }

        // Obtener datos del usuario para el teléfono
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, phone')
          .eq('user_id', patientProfile.user_id)
          .single()

        const appointmentDate = new Date(appointment.start_time)
        const formattedDate = appointmentDate.toLocaleDateString('es-ES', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          hour: '2-digit',
          minute: '2-digit'
        })

        // Generar URL de respuesta (simulada)
        const baseUrl = Deno.env.get('SUPABASE_URL')
        const confirmUrl = `${baseUrl}/functions/v1/reminder-response?token=${reminder.token}&action=confirm`
        const cancelUrl = `${baseUrl}/functions/v1/reminder-response?token=${reminder.token}&action=cancel`

        // Mensaje simulado de WhatsApp
        const whatsappMessage = `
🏥 *RECORDATORIO DE CITA*

Hola ${profile?.full_name || 'Paciente'},

Le recordamos que tiene una cita programada:
📅 ${formattedDate}
${appointment.is_virtual ? '💻 Modalidad: Virtual' : '🏢 Modalidad: Presencial'}

Por favor confirme su asistencia:
✅ CONFIRMAR: ${confirmUrl}
❌ CANCELAR: ${cancelUrl}

_Recuerde que las cancelaciones deben hacerse con al menos 3 horas de anticipación._
        `.trim()

        // SIMULACIÓN: Log del mensaje (en producción iría a WhatsApp API)
        console.log(`\n📱 WHATSAPP SIMULADO para ${profile?.phone || 'sin teléfono'}:`)
        console.log(whatsappMessage)

        // Marcar como enviado
        await supabase
          .from('reminders')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            message_content: whatsappMessage
          })
          .eq('id', reminder.id)

        results.sent++

      } catch (err) {
        console.error(`Error procesando recordatorio ${reminder.id}:`, err)
        results.failed++
      }
    }

    console.log(`\n=== CRON: Proceso completado ===`)
    console.log(`Enviados: ${results.sent}, Fallidos: ${results.failed}`)

    return new Response(JSON.stringify({
      success: true,
      generated: generatedCount,
      sent: results.sent,
      failed: results.failed
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error en CRON de recordatorios:', error)
    return new Response(JSON.stringify({ error: 'Error interno del servidor' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
