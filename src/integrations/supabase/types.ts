export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      appointments: {
        Row: {
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string
          created_by: string
          doctor_id: string
          end_time: string
          id: string
          is_virtual: boolean
          meeting_url: string | null
          notes: string | null
          patient_id: string
          room_id: string | null
          start_time: string
          status: Database["public"]["Enums"]["appointment_status"]
          updated_at: string
        }
        Insert: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          created_by: string
          doctor_id: string
          end_time: string
          id?: string
          is_virtual?: boolean
          meeting_url?: string | null
          notes?: string | null
          patient_id: string
          room_id?: string | null
          start_time: string
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
        }
        Update: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          created_by?: string
          doctor_id?: string
          end_time?: string
          id?: string
          is_virtual?: boolean
          meeting_url?: string | null
          notes?: string | null
          patient_id?: string
          room_id?: string | null
          start_time?: string
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctor_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      doctor_patients: {
        Row: {
          assigned_at: string
          doctor_id: string
          id: string
          patient_id: string
          status: string | null
        }
        Insert: {
          assigned_at?: string
          doctor_id: string
          id?: string
          patient_id: string
          status?: string | null
        }
        Update: {
          assigned_at?: string
          doctor_id?: string
          id?: string
          patient_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "doctor_patients_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctor_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctor_patients_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      doctor_profiles: {
        Row: {
          bio: string | null
          consultation_duration_min: number | null
          consultation_fee: number | null
          created_at: string
          education: string | null
          id: string
          is_virtual_enabled: boolean | null
          license_number: string | null
          photo_url: string | null
          specialty: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bio?: string | null
          consultation_duration_min?: number | null
          consultation_fee?: number | null
          created_at?: string
          education?: string | null
          id?: string
          is_virtual_enabled?: boolean | null
          license_number?: string | null
          photo_url?: string | null
          specialty: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bio?: string | null
          consultation_duration_min?: number | null
          consultation_fee?: number | null
          created_at?: string
          education?: string | null
          id?: string
          is_virtual_enabled?: boolean | null
          license_number?: string | null
          photo_url?: string | null
          specialty?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      medical_record_audit: {
        Row: {
          action: string
          action_details: Json | null
          created_at: string
          entry_id: string | null
          id: string
          ip_address: string | null
          medical_record_id: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          action_details?: Json | null
          created_at?: string
          entry_id?: string | null
          id?: string
          ip_address?: string | null
          medical_record_id?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          action_details?: Json | null
          created_at?: string
          entry_id?: string | null
          id?: string
          ip_address?: string | null
          medical_record_id?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "medical_record_audit_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "medical_record_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_record_audit_medical_record_id_fkey"
            columns: ["medical_record_id"]
            isOneToOne: false
            referencedRelation: "medical_records"
            referencedColumns: ["id"]
          },
        ]
      }
      medical_record_entries: {
        Row: {
          appointment_id: string | null
          attachments: string[] | null
          chief_complaint: string
          created_at: string
          diagnosis: string | null
          doctor_id: string
          evolution: string | null
          id: string
          is_current: boolean
          medical_record_id: string
          observations: string | null
          parent_entry_id: string | null
          treatment_plan: string | null
          version: number
          vital_signs: Json | null
        }
        Insert: {
          appointment_id?: string | null
          attachments?: string[] | null
          chief_complaint: string
          created_at?: string
          diagnosis?: string | null
          doctor_id: string
          evolution?: string | null
          id?: string
          is_current?: boolean
          medical_record_id: string
          observations?: string | null
          parent_entry_id?: string | null
          treatment_plan?: string | null
          version?: number
          vital_signs?: Json | null
        }
        Update: {
          appointment_id?: string | null
          attachments?: string[] | null
          chief_complaint?: string
          created_at?: string
          diagnosis?: string | null
          doctor_id?: string
          evolution?: string | null
          id?: string
          is_current?: boolean
          medical_record_id?: string
          observations?: string | null
          parent_entry_id?: string | null
          treatment_plan?: string | null
          version?: number
          vital_signs?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "medical_record_entries_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_record_entries_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctor_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_record_entries_medical_record_id_fkey"
            columns: ["medical_record_id"]
            isOneToOne: false
            referencedRelation: "medical_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_record_entries_parent_entry_id_fkey"
            columns: ["parent_entry_id"]
            isOneToOne: false
            referencedRelation: "medical_record_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      medical_records: {
        Row: {
          blood_type: string | null
          chronic_conditions: string[] | null
          created_at: string
          created_by: string
          current_medications: string[] | null
          family_history: string | null
          id: string
          patient_id: string
          surgical_history: string[] | null
          updated_at: string
        }
        Insert: {
          blood_type?: string | null
          chronic_conditions?: string[] | null
          created_at?: string
          created_by: string
          current_medications?: string[] | null
          family_history?: string | null
          id?: string
          patient_id: string
          surgical_history?: string[] | null
          updated_at?: string
        }
        Update: {
          blood_type?: string | null
          chronic_conditions?: string[] | null
          created_at?: string
          created_by?: string
          current_medications?: string[] | null
          family_history?: string | null
          id?: string
          patient_id?: string
          surgical_history?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "medical_records_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: true
            referencedRelation: "patient_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          address: string | null
          business_hours: Json | null
          cancellation_policy_hours: number | null
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          settings: Json | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          business_hours?: Json | null
          cancellation_policy_hours?: number | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          settings?: Json | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          business_hours?: Json | null
          cancellation_policy_hours?: number | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          settings?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      patient_profiles: {
        Row: {
          allergies: string[] | null
          blood_type: string | null
          created_at: string
          date_of_birth: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          gender: string | null
          id: string
          insurance_number: string | null
          insurance_provider: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          allergies?: string[] | null
          blood_type?: string | null
          created_at?: string
          date_of_birth?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          gender?: string | null
          id?: string
          insurance_number?: string | null
          insurance_provider?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          allergies?: string[] | null
          blood_type?: string | null
          created_at?: string
          date_of_birth?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          gender?: string | null
          id?: string
          insurance_number?: string | null
          insurance_provider?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          appointment_id: string
          created_at: string
          credit_from_appointment_id: string | null
          currency: string
          id: string
          notes: string | null
          paid_at: string | null
          paid_by: string | null
          payment_method: string | null
          status: Database["public"]["Enums"]["payment_status"]
          transaction_id: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          appointment_id: string
          created_at?: string
          credit_from_appointment_id?: string | null
          currency?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          paid_by?: string | null
          payment_method?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          transaction_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          appointment_id?: string
          created_at?: string
          credit_from_appointment_id?: string | null
          currency?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          paid_by?: string | null
          payment_method?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          transaction_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          is_active: boolean | null
          last_login: string | null
          organization_id: string | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          is_active?: boolean | null
          last_login?: string | null
          organization_id?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          is_active?: boolean | null
          last_login?: string | null
          organization_id?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      reminders: {
        Row: {
          appointment_id: string
          channel: string
          created_at: string
          id: string
          message_content: string | null
          reminder_type: string
          response_action: string | null
          response_at: string | null
          scheduled_for: string
          sent_at: string | null
          status: string
          token: string | null
          updated_at: string
        }
        Insert: {
          appointment_id: string
          channel?: string
          created_at?: string
          id?: string
          message_content?: string | null
          reminder_type?: string
          response_action?: string | null
          response_at?: string | null
          scheduled_for: string
          sent_at?: string | null
          status?: string
          token?: string | null
          updated_at?: string
        }
        Update: {
          appointment_id?: string
          channel?: string
          created_at?: string
          id?: string
          message_content?: string | null
          reminder_type?: string
          response_action?: string | null
          response_at?: string | null
          scheduled_for?: string
          sent_at?: string | null
          status?: string
          token?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminders_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          capacity: number | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          organization_id: string | null
          updated_at: string
        }
        Insert: {
          capacity?: number | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          organization_id?: string | null
          updated_at?: string
        }
        Update: {
          capacity?: number | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rooms_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_responses: {
        Row: {
          average_score: number | null
          clarity_rating: number
          comment: string | null
          created_at: string
          doctor_rating: number
          has_admin_alert: boolean
          id: string
          punctuality_rating: number
          survey_id: string
          treatment_rating: number
        }
        Insert: {
          average_score?: number | null
          clarity_rating: number
          comment?: string | null
          created_at?: string
          doctor_rating: number
          has_admin_alert?: boolean
          id?: string
          punctuality_rating: number
          survey_id: string
          treatment_rating: number
        }
        Update: {
          average_score?: number | null
          clarity_rating?: number
          comment?: string | null
          created_at?: string
          doctor_rating?: number
          has_admin_alert?: boolean
          id?: string
          punctuality_rating?: number
          survey_id?: string
          treatment_rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "survey_responses_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: true
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      surveys: {
        Row: {
          appointment_id: string
          completed_at: string | null
          created_at: string
          doctor_id: string
          id: string
          patient_id: string
          scheduled_for: string
          sent_at: string | null
          status: string
          token: string
          updated_at: string
        }
        Insert: {
          appointment_id: string
          completed_at?: string | null
          created_at?: string
          doctor_id: string
          id?: string
          patient_id: string
          scheduled_for: string
          sent_at?: string | null
          status?: string
          token?: string
          updated_at?: string
        }
        Update: {
          appointment_id?: string
          completed_at?: string | null
          created_at?: string
          doctor_id?: string
          id?: string
          patient_id?: string
          scheduled_for?: string
          sent_at?: string | null
          status?: string
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "surveys_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "surveys_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctor_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "surveys_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_appointment_availability: {
        Args: {
          _doctor_id: string
          _end_time: string
          _exclude_appointment_id?: string
          _start_time: string
        }
        Returns: boolean
      }
      check_doctor_patient_relationship: {
        Args: { _doctor_id: string; _patient_id: string }
        Returns: boolean
      }
      check_payment_status: {
        Args: { _appointment_id: string }
        Returns: Database["public"]["Enums"]["payment_status"]
      }
      check_room_availability: {
        Args: {
          _end_time: string
          _exclude_appointment_id?: string
          _room_id: string
          _start_time: string
        }
        Returns: boolean
      }
      create_medical_entry: {
        Args: {
          _appointment_id: string
          _attachments?: string[]
          _chief_complaint: string
          _diagnosis?: string
          _doctor_id: string
          _evolution?: string
          _observations?: string
          _patient_id: string
          _treatment_plan?: string
          _vital_signs?: Json
        }
        Returns: Json
      }
      generate_pending_reminders: { Args: never; Returns: number }
      generate_pending_surveys: { Args: never; Returns: number }
      get_doctor_survey_metrics: { Args: { _doctor_id: string }; Returns: Json }
      get_or_create_medical_record: {
        Args: { _created_by: string; _patient_id: string }
        Returns: string
      }
      get_patient_medical_history: {
        Args: { _patient_id: string }
        Returns: Json
      }
      get_survey_alerts: {
        Args: never
        Returns: {
          appointment_id: string
          average_score: number
          completed_at: string
          doctor_name: string
          patient_name: string
          survey_id: string
        }[]
      }
      get_user_roles: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"][]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      log_medical_record_access: {
        Args: { _action?: string; _medical_record_id: string; _user_id: string }
        Returns: undefined
      }
      process_cancellation_credit: {
        Args: { _appointment_id: string }
        Returns: Json
      }
      process_manual_payment: {
        Args: {
          _amount?: number
          _appointment_id: string
          _notes?: string
          _payment_method: string
        }
        Returns: Json
      }
      process_reminder_response: {
        Args: { _action: string; _token: string }
        Returns: Json
      }
      report_appointments_by_status: {
        Args: { _end_date?: string; _start_date?: string }
        Returns: {
          count: number
          percentage: number
          status: string
        }[]
      }
      report_dashboard_summary: {
        Args: { _end_date?: string; _start_date?: string }
        Returns: Json
      }
      report_income_by_day: {
        Args: { _end_date?: string; _start_date?: string }
        Returns: {
          date: string
          payments_count: number
          total_income: number
        }[]
      }
      report_income_by_doctor: {
        Args: { _end_date?: string; _start_date?: string }
        Returns: {
          appointments_count: number
          avg_per_appointment: number
          doctor_id: string
          doctor_name: string
          specialty: string
          total_income: number
        }[]
      }
      report_income_by_month: {
        Args: { _months_back?: number }
        Returns: {
          month: number
          month_name: string
          payments_count: number
          total_income: number
          year: number
        }[]
      }
      report_income_by_room: {
        Args: { _end_date?: string; _start_date?: string }
        Returns: {
          appointments_count: number
          room_id: string
          room_name: string
          total_income: number
        }[]
      }
      report_payments_summary: {
        Args: { _end_date?: string; _start_date?: string }
        Returns: {
          count: number
          status: string
          total_amount: number
        }[]
      }
      report_room_hours: {
        Args: { _end_date?: string; _start_date?: string }
        Returns: {
          appointments_count: number
          avg_hours_per_day: number
          room_id: string
          room_name: string
          total_hours: number
        }[]
      }
      report_room_occupancy: {
        Args: {
          _end_date?: string
          _start_date?: string
          _working_hours_per_day?: number
        }
        Returns: {
          occupancy_percentage: number
          room_id: string
          room_name: string
          status: string
          total_available_hours: number
          total_used_hours: number
        }[]
      }
      submit_survey_response: {
        Args: {
          _clarity_rating: number
          _comment?: string
          _doctor_rating: number
          _punctuality_rating: number
          _token: string
          _treatment_rating: number
        }
        Returns: Json
      }
      update_medical_entry: {
        Args: {
          _attachments?: string[]
          _chief_complaint: string
          _diagnosis?: string
          _doctor_id: string
          _entry_id: string
          _evolution?: string
          _observations?: string
          _treatment_plan?: string
          _vital_signs?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "receptionist" | "doctor" | "patient"
      appointment_status:
      | "scheduled"
      | "confirmed"
      | "completed"
      | "cancelled"
      | "no_show"
      payment_status: "pending" | "paid" | "failed" | "refunded" | "credit"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
  | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
    DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
  : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
    DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
  ? R
  : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
    DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] &
    DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
  ? R
  : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
  | keyof DefaultSchema["Tables"]
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Insert: infer I
  }
  ? I
  : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
    Insert: infer I
  }
  ? I
  : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
  | keyof DefaultSchema["Tables"]
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Update: infer U
  }
  ? U
  : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
    Update: infer U
  }
  ? U
  : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
  | keyof DefaultSchema["Enums"]
  | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
  : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
  | keyof DefaultSchema["CompositeTypes"]
  | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
  : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "receptionist", "doctor", "patient"],
      appointment_status: [
        "scheduled",
        "confirmed",
        "completed",
        "cancelled",
        "no_show",
      ],
      payment_status: ["pending", "paid", "failed", "refunded", "credit"],
    },
  },
} as const
