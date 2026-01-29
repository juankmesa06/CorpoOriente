import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // 1. Verify caller is admin/super_admin
        const authHeader = req.headers.get('Authorization')!
        console.log("Create-user invoked. Auth header present:", !!authHeader)

        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: authHeader } } }
        )

        const { data: { user: adminUser }, error: userError } = await supabaseClient.auth.getUser()
        if (userError || !adminUser) {
            console.error("Auth error:", userError)
            throw new Error('Unauthorized: ' + (userError?.message || 'No user found'))
        }
        console.log("User authenticated:", adminUser.id)

        // Check if user has admin/super_admin role
        const { data: roles, error: rolesError } = await supabaseClient
            .from('user_roles')
            .select('role')
            .eq('user_id', adminUser.id)
            .in('role', ['admin', 'super_admin'])

        if (rolesError || !roles || roles.length === 0) {
            console.error("Role check failed:", rolesError, roles)
            return new Response(
                JSON.stringify({ error: 'No tienes permisos para realizar esta acción' }),
                { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }
        console.log("Admin role verified.")

        const { email, full_name, role } = await req.json()
        console.log("Attempting to create user:", email, role)

        // Create Supabase admin client
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

        // 2. Invite the user (Supabase handles creation + email automatically)
        let user: any = null;
        let invitationSent = false;
        let temporaryPassword = null;

        try {
            const { data: userCreated, error: createError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
                data: { full_name, role, setup_required: true },
                redirectTo: `${req.headers.get('origin')}/dashboard`
            })

            if (createError) throw createError
            user = userCreated.user
            invitationSent = true
            console.log("User invited successfully:", user.id)

        } catch (inviteError: any) {
            console.warn("Invitation failed, checking cause:", inviteError)

            // FALLBACK: If rate limit exceeded, create user manually with temp password
            if (inviteError.message?.includes("rate limit") || inviteError.status === 429) {
                console.log("Rate limit hit. Falling back to manual creation.")
                temporaryPassword = "CorpoOriente2026!" // Default temp password

                const { data: userManual, error: manualError } = await supabaseAdmin.auth.admin.createUser({
                    email,
                    password: temporaryPassword,
                    email_confirm: true,
                    user_metadata: { full_name, role, setup_required: true }
                })

                if (manualError) throw manualError
                user = userManual.user
            } else {
                // Re-throw if it's not a rate limit issue (e.g. already registered)
                if (inviteError.message?.includes("already registered")) {
                    throw new Error(`El usuario ${email} ya está registrado.`)
                }
                throw inviteError
            }
        }

        if (!user) {
            throw new Error("No se pudo crear el usuario.")
        }

        // 3. Ensure profile is up to date
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .upsert({
                user_id: user.id,
                full_name,
                email
            }, { onConflict: 'user_id' })

        if (profileError) console.error("Error upserting profile:", profileError)

        // 4. Ensure role is assigned
        const { error: roleError } = await supabaseAdmin
            .from('user_roles')
            .upsert({
                user_id: user.id,
                role
            }, { onConflict: 'user_id,role' })

        if (roleError) console.error("Error upserting role:", roleError)

        // 5. Build response message
        let successMessage = 'Invitación enviada por correo exitosamente.'
        if (!invitationSent && temporaryPassword) {
            successMessage = `Usuario creado SIN correo (Límite excedido). Contraseña temporal: ${temporaryPassword}`
        }

        return new Response(
            JSON.stringify({
                success: true,
                user: user,
                message: successMessage
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            },
        )
    } catch (error) {
        console.error("Final error catch:", error)
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            },
        )
    }
})
