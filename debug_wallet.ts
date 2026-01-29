
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL'; // User might need to fill this or I rely on env
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'YOUR_ANON_KEY';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkWalletData() {
    console.log("Checking wallet data...");

    // 1. Mock getting user (Assuming I can get a user or search by email if I know it, otherwise just list recent appointments)
    // Since I don't have the auth context here, I'll query appointments generally to see if *any* exist strictly for debugging structure.

    // Check doctor profiles
    const { data: doctors } = await supabase.from('doctor_profiles').select('id, user_id, consultation_fee').limit(5);
    console.log("Doctors found:", doctors);

    if (doctors && doctors.length > 0) {
        const doctorId = doctors[0].id;
        console.log("Checking appointments for doctor:", doctorId);

        const { data: appointments, error } = await supabase
            .from('appointments')
            .select(`
                    id,
                    start_time,
                    doctor_id,
                    status,
                    payment_status,
                    patient_profiles (
                        id
                    ),
                    room_rentals (
                        total_price,
                        rooms (name)
                    ),
                    payments (
                        amount
                    )
                `)
            .eq('doctor_id', doctorId)
            .order('start_time', { ascending: false });

        if (error) console.error("Error fetching appointments:", error);
        else console.log("Appointments fetched:", JSON.stringify(appointments, null, 2));
    }
}

checkWalletData();
