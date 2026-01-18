import { supabase } from "@/integrations/supabase/client";

export interface SurveySubmission {
  token: string;
  doctor_rating: number;
  punctuality_rating: number;
  clarity_rating: number;
  treatment_rating: number;
  comment?: string;
}

export interface SurveyMetrics {
  total_surveys: number;
  average_overall: number | null;
  average_doctor_rating: number | null;
  average_punctuality: number | null;
  average_clarity: number | null;
  average_treatment: number | null;
  ratings_distribution: {
    '5_stars': number;
    '4_stars': number;
    '3_stars': number;
    '2_stars': number;
    '1_star': number;
  };
}

export interface SurveyAlert {
  survey_id: string;
  appointment_id: string;
  doctor_name: string;
  patient_name: string;
  average_score: number;
  completed_at: string;
}

export interface SurveyInfo {
  id: string;
  status: string;
  scheduled_for: string;
  appointment_id: string;
  appointments: {
    start_time: string;
    end_time: string;
    doctor_profiles: {
      specialty: string;
      profiles: {
        full_name: string;
      };
    };
  };
}

export const useSurveys = () => {
  const functionsUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/surveys`;

  const getAuthHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return {
      'Content-Type': 'application/json',
      ...(session?.access_token && { 'Authorization': `Bearer ${session.access_token}` })
    };
  };

  // Get survey info by token (public)
  const getSurveyByToken = async (token: string): Promise<SurveyInfo | null> => {
    const response = await fetch(`${functionsUrl}?action=get&token=${token}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return data.survey;
  };

  // Submit survey response (public, token-based)
  const submitSurvey = async (submission: SurveySubmission): Promise<{ success: boolean; alert_generated?: boolean }> => {
    const response = await fetch(`${functionsUrl}?action=submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(submission)
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return data;
  };

  // Generate pending surveys (admin only)
  const generateSurveys = async (): Promise<number> => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${functionsUrl}?action=generate`, {
      method: 'POST',
      headers
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return data.surveys_generated;
  };

  // Get doctor metrics (doctors see their own, admins can see any)
  const getDoctorMetrics = async (doctorId?: string): Promise<SurveyMetrics> => {
    const headers = await getAuthHeaders();
    const url = doctorId 
      ? `${functionsUrl}?action=metrics&doctor_id=${doctorId}`
      : `${functionsUrl}?action=metrics`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return data.metrics;
  };

  // Get alerts (admin only)
  const getAlerts = async (): Promise<SurveyAlert[]> => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${functionsUrl}?action=alerts`, {
      method: 'GET',
      headers
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return data.alerts;
  };

  // Get pending surveys (admin only)
  const getPendingSurveys = async () => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${functionsUrl}?action=pending`, {
      method: 'GET',
      headers
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return data.surveys;
  };

  return {
    getSurveyByToken,
    submitSurvey,
    generateSurveys,
    getDoctorMetrics,
    getAlerts,
    getPendingSurveys
  };
};
