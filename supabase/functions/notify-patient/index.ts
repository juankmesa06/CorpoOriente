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

        const { appointment_id, rental_id } = await req.json()

        if (!appointment_id || !rental_id) {
            return new Response(JSON.stringify({ error: 'Missing appointment_id or rental_id' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        // 1. Get Appointment & Patient Details
        const { data: appointment, error: aptError } = await supabase
            .from('appointments')
            .select(`
            *,
            patient_profiles!inner(
                profiles!inner(full_name, email, phone)
            ),
            doctor_profiles!inner(
                profiles!inner(full_name)
            )
        `)
            .eq('id', appointment_id)
            .single()

        if (aptError || !appointment) {
            throw new Error('Appointment not found')
        }

        // 2. Get Rental Details
        const { data: rental } = await supabase
            .from('room_rentals')
            .select(`*, rooms(*)`)
            .eq('id', rental_id)
            .single()

        // 3. Construct Message
        const patientName = appointment.patient_profiles.profiles.full_name
        const doctorName = appointment.doctor_profiles.profiles.full_name
        const date = new Date(appointment.start_time).toLocaleString('es-CO', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
        })

        let locationInfo = ""
        if (rental?.rooms?.room_type === 'virtual') {
            locationInfo = `💻 Cita Virtual via Enlace: ${appointment.meeting_url || 'Pendiente por confirmar'}`
        } else {
            locationInfo = `🏢 Dirección: ${rental?.rooms?.name || 'Consultorio Principal'} - (Sede Principal)`
        }

        const message = `
    Hola ${patientName},
    
    Su cita con Dr. ${doctorName} ha sido confirmada.
    📅 Fecha: ${date}
    ${locationInfo}
    
    ¡Gracias por confiar en nosotros!
    `.trim()

        // 4. Log/Send (Simulation)
        console.log(`=== NOTIFICATION [${appointment.patient_profiles.profiles.email}] ===`)
        console.log(message)
        console.log('==========================================')

        // Here we would call Resend/SendGrid API
        // await fetch('https://api.resend.com/emails', ...)

        return new Response(JSON.stringify({ success: true, message: 'Notification processed' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })

    } catch (error) {
        console.error('Error:', error)
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }
})
