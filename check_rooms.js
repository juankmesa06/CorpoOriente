
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars from .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://vjbatvjcnbmnwlnpaznt.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseKey) {
    console.error("No VITE_SUPABASE_ANON_KEY found");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRooms() {
    const { data, error } = await supabase
        .from('rooms')
        .select('*');

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Rooms found:', data.length);
        data.forEach(r => console.log(`- ${r.name} (${r.room_type})`));
    }
}

checkRooms();
