import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || ''; // Needs service role for trigger/fix

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixData() {
    console.log('--- FIXING TRIGGER & BACKFILLING DATA ---');

    const sql = `
    -- 1. Fix the trigger function to use the doctor's fee
    CREATE OR REPLACE FUNCTION public.create_payment_for_appointment()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
    DECLARE
      _doctor_fee DECIMAL(10, 2);
    BEGIN
      -- Get the consultation fee from doctor profile
      SELECT 
        CASE WHEN NEW.is_virtual THEN COALESCE(consultation_fee_virtual, consultation_fee, 0)
             ELSE COALESCE(consultation_fee, 0)
        END INTO _doctor_fee
      FROM doctor_profiles
      WHERE id = NEW.doctor_id;

      -- Default to 0 if not found (don't hardcode 500)
      _doctor_fee := COALESCE(_doctor_fee, 150000); -- Use a realistic default like 150k or leave 0

      -- Insert/Update payment record
      INSERT INTO payments (appointment_id, amount, currency, status)
      VALUES (NEW.id, _doctor_fee, 'COP', 'pending')
      ON CONFLICT (appointment_id) DO UPDATE 
      SET amount = EXCLUDED.amount,
          currency = EXCLUDED.currency;

      RETURN NEW;
    END;
    $$;

    -- 2. Backfill existing records that have 500.00
    DO $$
    DECLARE
        r RECORD;
        _correct_fee DECIMAL(10, 2);
    BEGIN
        FOR r IN 
            SELECT p.id, p.appointment_id, a.doctor_id, a.is_virtual
            FROM payments p
            JOIN appointments a ON p.appointment_id = a.id
            WHERE p.amount = 500.00
        LOOP
            SELECT 
                CASE WHEN r.is_virtual THEN COALESCE(consultation_fee_virtual, consultation_fee, 150000)
                     ELSE COALESCE(consultation_fee, 150000)
                END INTO _correct_fee
            FROM doctor_profiles
            WHERE id = r.doctor_id;

            IF _correct_fee IS NOT NULL THEN
                UPDATE payments 
                SET amount = _correct_fee,
                    currency = 'COP'
                WHERE id = r.id;
            END IF;
        END LOOP;
    END $$;
    `;

    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
        console.error('RPC Error:', error);
        // Fallback if exec_sql is not available
        console.log('Falling back to direct table updates...');

        const { data: incorrectPayments } = await supabase
            .from('payments')
            .select(`
                id,
                amount,
                appointments (
                    doctor_id,
                    is_virtual,
                    doctor_profiles (
                        consultation_fee,
                        consultation_fee_virtual
                    )
                )
            `)
            .eq('amount', 500);

        if (incorrectPayments) {
            console.log(`Found ${incorrectPayments.length} incorrect payments. Fixing...`);
            for (const p of incorrectPayments) {
                const apt: any = p.appointments;
                const fee = apt.is_virtual
                    ? (apt.doctor_profiles.consultation_fee_virtual || apt.doctor_profiles.consultation_fee || 150000)
                    : (apt.doctor_profiles.consultation_fee || 150000);

                await supabase.from('payments').update({ amount: fee, currency: 'COP' }).eq('id', p.id);
            }
        }
    } else {
        console.log('SQL Applied successfully via RPC.');
    }
}

fixData();
