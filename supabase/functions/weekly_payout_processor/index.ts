import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PayoutSummary {
    total_appointments: number
    total_consultation_fees: number
    total_room_rentals: number
    total_doctor_payouts: number
    total_platform_commission: number
    payouts_created: number
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // 1. Verify caller is admin/super_admin (optional for cron, required for manual)
        const authHeader = req.headers.get('Authorization')

        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        )

        // If called manually (with auth header), verify admin role
        if (authHeader) {
            const userClient = createClient(
                Deno.env.get('SUPABASE_URL') ?? '',
                Deno.env.get('SUPABASE_ANON_KEY') ?? '',
                { global: { headers: { Authorization: authHeader } } }
            )

            const { data: { user } } = await userClient.auth.getUser()
            if (user) {
                const { data: roles } = await userClient
                    .from('user_roles')
                    .select('role')
                    .eq('user_id', user.id)
                    .in('role', ['admin', 'super_admin'])

                if (!roles || roles.length === 0) {
                    return new Response(
                        JSON.stringify({ error: 'Only admins can trigger payout processing' }),
                        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                    )
                }
            }
        }

        // 2. Get week to process (default: last week)
        const url = new URL(req.url)
        const weekStartParam = url.searchParams.get('week_start')

        let weekStartDate: string
        if (weekStartParam) {
            weekStartDate = weekStartParam
        } else {
            // Calculate last Monday
            const { data: lastMonday, error: mondayError } = await supabaseClient
                .rpc('get_last_monday')

            if (mondayError || !lastMonday) {
                // Fallback calculation
                const today = new Date()
                const dayOfWeek = today.getDay()
                const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek // If Sunday, go back 6 days; otherwise go to last Monday
                const lastMon = new Date(today)
                lastMon.setDate(today.getDate() + diff - 7) // Last week's Monday
                weekStartDate = lastMon.toISOString().split('T')[0]
            } else {
                weekStartDate = lastMonday
            }
        }

        console.log(`Processing payouts for week starting: ${weekStartDate}`)

        // 3. Call calculate_weekly_payouts function
        const { data: summary, error: calcError } = await supabaseClient
            .rpc('calculate_weekly_payouts', {
                _week_start_date: weekStartDate,
                _platform_commission_rate: 0.05 // 5% platform commission
            })

        if (calcError) {
            console.error('Error calculating payouts:', calcError)
            return new Response(
                JSON.stringify({ error: `Payout calculation failed: ${calcError.message}` }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const result: PayoutSummary = summary?.[0] || {
            total_appointments: 0,
            total_consultation_fees: 0,
            total_room_rentals: 0,
            total_doctor_payouts: 0,
            total_platform_commission: 0,
            payouts_created: 0
        }

        console.log('Payout processing complete:', result)

        // 4. TODO: Optionally trigger external payment gateway API here
        // e.g., Stripe batch payouts, bank transfer API, etc.

        // 5. TODO: Send notification emails to admins
        // You can integrate with Supabase Edge Function for sending emails
        // or use a third-party service like SendGrid, Resend, etc.

        return new Response(
            JSON.stringify({
                success: true,
                message: `Payouts processed for week of ${weekStartDate}`,
                week_start_date: weekStartDate,
                summary: result
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error('Error in weekly_payout_processor:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
