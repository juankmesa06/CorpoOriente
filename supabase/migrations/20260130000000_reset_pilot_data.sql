-- Reset data for Pilot Test
-- This script truncates all transaction/activity tables while preserving configuration (users, rooms, doctors).

BEGIN;

-- Truncate tables with CASCADE to handle foreign key references
TRUNCATE TABLE 
  payments,
  appointments,
  room_rentals,
  payouts,
  medical_records,
  medical_record_entries,
  medical_record_audit,
  surveys,
  survey_responses,
  reminders,
  doctor_patients
CASCADE;

COMMIT;
