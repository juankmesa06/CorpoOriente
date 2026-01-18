import { supabase } from "@/integrations/supabase/client";

export interface VitalSigns {
  blood_pressure?: string;
  heart_rate?: number;
  temperature?: number;
  weight?: number;
  height?: number;
  oxygen_saturation?: number;
}

export interface MedicalEntry {
  id: string;
  version: number;
  chief_complaint: string;
  diagnosis: string | null;
  evolution: string | null;
  treatment_plan: string | null;
  observations: string | null;
  vital_signs: VitalSigns | null;
  attachments: string[] | null;
  created_at: string;
  doctor: {
    id: string;
    specialty: string;
    name: string;
  };
  appointment_date: string | null;
}

export interface MedicalRecord {
  id: string;
  blood_type: string | null;
  chronic_conditions: string[] | null;
  current_medications: string[] | null;
  surgical_history: string[] | null;
  family_history: string | null;
  created_at: string;
}

export interface PatientMedicalHistory {
  medical_record: MedicalRecord | null;
  entries: MedicalEntry[];
  patient: {
    id: string;
    name: string;
    date_of_birth: string | null;
    gender: string | null;
    allergies: string[] | null;
  };
}

export interface CreateEntryInput {
  patient_id: string;
  appointment_id?: string;
  chief_complaint: string;
  diagnosis?: string;
  evolution?: string;
  treatment_plan?: string;
  observations?: string;
  vital_signs?: VitalSigns;
  attachments?: string[];
}

export interface UpdateEntryInput {
  entry_id: string;
  chief_complaint: string;
  diagnosis?: string;
  evolution?: string;
  treatment_plan?: string;
  observations?: string;
  vital_signs?: VitalSigns;
  attachments?: string[];
}

export interface UpdateRecordInput {
  patient_id: string;
  blood_type?: string;
  chronic_conditions?: string[];
  current_medications?: string[];
  surgical_history?: string[];
  family_history?: string;
}

export interface DoctorPatient {
  patient_id: string;
  status: string;
  patient_profiles: {
    id: string;
    date_of_birth: string | null;
    gender: string | null;
    profiles: {
      full_name: string;
      phone: string | null;
      email: string | null;
    };
  };
}

export const useMedicalRecords = () => {
  const functionsUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/medical-records`;

  const getAuthHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('No autenticado');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`
    };
  };

  // Get patient medical history
  const getPatientHistory = async (patientId: string): Promise<PatientMedicalHistory> => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${functionsUrl}?action=history&patient_id=${patientId}`, {
      method: 'GET',
      headers
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return data.data;
  };

  // Create medical entry
  const createEntry = async (input: CreateEntryInput): Promise<{ entry_id: string; medical_record_id: string }> => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${functionsUrl}?action=create-entry`, {
      method: 'POST',
      headers,
      body: JSON.stringify(input)
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return data;
  };

  // Update medical entry (creates new version)
  const updateEntry = async (input: UpdateEntryInput): Promise<{ entry_id: string; version: number }> => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${functionsUrl}?action=update-entry`, {
      method: 'POST',
      headers,
      body: JSON.stringify(input)
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return data;
  };

  // Update medical record base info
  const updateRecord = async (input: UpdateRecordInput): Promise<{ medical_record_id: string }> => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${functionsUrl}?action=update-record`, {
      method: 'POST',
      headers,
      body: JSON.stringify(input)
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return data;
  };

  // Get audit log (admin only)
  const getAuditLog = async (patientId?: string, limit?: number) => {
    const headers = await getAuthHeaders();
    let url = `${functionsUrl}?action=audit`;
    if (patientId) url += `&patient_id=${patientId}`;
    if (limit) url += `&limit=${limit}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return data.audit;
  };

  // Get doctor's patients
  const getMyPatients = async (): Promise<DoctorPatient[]> => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${functionsUrl}?action=my-patients`, {
      method: 'GET',
      headers
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return data.patients;
  };

  return {
    getPatientHistory,
    createEntry,
    updateEntry,
    updateRecord,
    getAuditLog,
    getMyPatients
  };
};
