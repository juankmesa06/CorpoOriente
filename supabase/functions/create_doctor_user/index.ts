import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CreateDoctorRequest {
    email: string
    full_name: string
    specialty: string
    license_number?: string
    phone?: string
    bio?: string
    consultation_fee?: number
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // 1. Verify caller is admin/super_admin
        const authHeader = req.headers.get('Authorization')!
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: authHeader } } }
        )

        const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
        if (userError || !user) {
            throw new Error('Unauthorized')
        }

        // Check if user has admin/super_admin role
        const { data: roles, error: rolesError } = await supabaseClient
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .in('role', ['admin', 'super_admin'])

        if (rolesError || !roles || roles.length === 0) {
            return new Response(
                JSON.stringify({ error: 'Only admins can create doctor accounts' }),
                { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // 2. Parse request body
        const body: CreateDoctorRequest = await req.json()
        const { email, full_name, specialty, license_number, phone, bio, consultation_fee } = body

        if (!email || !full_name || !specialty) {
            return new Response(
                JSON.stringify({ error: 'Missing required fields: email, full_name, specialty' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // 3. Create user with service_role (bypasses RLS)
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        )

        // Generate temporary password (doctor must reset on first login)
        const tempPassword = crypto.randomUUID()

        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: email,
            password: tempPassword,
            email_confirm: true, // Auto-confirm email
            user_metadata: {
                full_name: full_name,
                role: 'doctor' // This will be picked up by handle_new_user trigger
            }
        })

        if (createError || !newUser.user) {
            console.error('Error creating user:', createError)
            return new Response(
                JSON.stringify({ error: `Failed to create user: ${createError?.message}` }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // 4. Update doctor profile with additional details
        const { error: profileError } = await supabaseAdmin
            .from('doctor_profiles')
            .update({
                specialty: specialty,
                license_number: license_number,
                bio: bio,
                consultation_fee: consultation_fee
            })
            .eq('user_id', newUser.user.id)

        if (profileError) {
            console.error('Error updating doctor profile:', profileError)
        }

        // 5. Update main profile with phone if provided
        if (phone) {
            const { error: phoneError } = await supabaseAdmin
                .from('profiles')
                .update({ phone: phone })
                .eq('user_id', newUser.user.id)

            if (phoneError) console.error('Error updating phone:', phoneError)
        }

        // 6. Send password reset email so doctor can set their own password
        // Use public client to trigger the actual email sending
        const supabasePublic = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? ''
        )

        const { error: resetError } = await supabasePublic.auth.resetPasswordForEmail(email, {
            redirectTo: `${req.headers.get('origin')}/auth/reset-password`
        })

        if (resetError) {
            console.warn('Failed to send password reset email:', resetError)
        }

        return new Response(
            JSON.stringify({
                success: true,
                message: 'Doctor account created successfully. Password reset email sent.',
                user_id: newUser.user.id,
                email: email
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error('Error in create_doctor_user:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
