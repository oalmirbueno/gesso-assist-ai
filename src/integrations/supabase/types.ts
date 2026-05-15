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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ai_learning_suggestions: {
        Row: {
          approved_by: string | null
          conversation_id: string | null
          created_at: string
          human_edited_response: string | null
          id: string
          original_ai_response: string | null
          status: string
          suggested_learning: string | null
          updated_at: string
        }
        Insert: {
          approved_by?: string | null
          conversation_id?: string | null
          created_at?: string
          human_edited_response?: string | null
          id?: string
          original_ai_response?: string | null
          status?: string
          suggested_learning?: string | null
          updated_at?: string
        }
        Update: {
          approved_by?: string | null
          conversation_id?: string | null
          created_at?: string
          human_edited_response?: string | null
          id?: string
          original_ai_response?: string | null
          status?: string
          suggested_learning?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_learning_suggestions_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          city: string | null
          created_at: string
          customer_type: string | null
          id: string
          name: string | null
          neighborhood: string | null
          notes: string | null
          phone: string
          responsible_user_id: string | null
          source: string | null
          stage: string | null
          tags: Json
          updated_at: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          customer_type?: string | null
          id?: string
          name?: string | null
          neighborhood?: string | null
          notes?: string | null
          phone: string
          responsible_user_id?: string | null
          source?: string | null
          stage?: string | null
          tags?: Json
          updated_at?: string
        }
        Update: {
          city?: string | null
          created_at?: string
          customer_type?: string | null
          id?: string
          name?: string | null
          neighborhood?: string | null
          notes?: string | null
          phone?: string
          responsible_user_id?: string | null
          source?: string | null
          stage?: string | null
          tags?: Json
          updated_at?: string
        }
        Relationships: []
      }
      conversation_events: {
        Row: {
          conversation_id: string
          created_at: string
          event_type: string
          id: string
          payload: Json | null
        }
        Insert: {
          conversation_id: string
          created_at?: string
          event_type: string
          id?: string
          payload?: Json | null
        }
        Update: {
          conversation_id?: string
          created_at?: string
          event_type?: string
          id?: string
          payload?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_events_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          ai_confidence: number | null
          ai_draft_reply: string | null
          ai_enabled: boolean
          ai_last_decision: Json | null
          ai_summary: string | null
          assigned_user_id: string | null
          contact_id: string
          created_at: string
          funnel_stage: string | null
          id: string
          intent: string | null
          last_ai_action: string | null
          last_message_at: string | null
          needs_human: boolean
          needs_human_reason: string | null
          priority: string
          status: string
          unread_count: number
          updated_at: string
        }
        Insert: {
          ai_confidence?: number | null
          ai_draft_reply?: string | null
          ai_enabled?: boolean
          ai_last_decision?: Json | null
          ai_summary?: string | null
          assigned_user_id?: string | null
          contact_id: string
          created_at?: string
          funnel_stage?: string | null
          id?: string
          intent?: string | null
          last_ai_action?: string | null
          last_message_at?: string | null
          needs_human?: boolean
          needs_human_reason?: string | null
          priority?: string
          status?: string
          unread_count?: number
          updated_at?: string
        }
        Update: {
          ai_confidence?: number | null
          ai_draft_reply?: string | null
          ai_enabled?: boolean
          ai_last_decision?: Json | null
          ai_summary?: string | null
          assigned_user_id?: string | null
          contact_id?: string
          created_at?: string
          funnel_stage?: string | null
          id?: string
          intent?: string | null
          last_ai_action?: string | null
          last_message_at?: string | null
          needs_human?: boolean
          needs_human_reason?: string | null
          priority?: string
          status?: string
          unread_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      gs_availability_slots: {
        Row: {
          created_at: string
          ends_at: string
          id: string
          label: string | null
          notes: string | null
          raw: Json
          seller_id: string | null
          seller_key: string | null
          slot_end: string | null
          slot_start: string | null
          source: string
          starts_at: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          ends_at: string
          id?: string
          label?: string | null
          notes?: string | null
          raw?: Json
          seller_id?: string | null
          seller_key?: string | null
          slot_end?: string | null
          slot_start?: string | null
          source?: string
          starts_at: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          ends_at?: string
          id?: string
          label?: string | null
          notes?: string | null
          raw?: Json
          seller_id?: string | null
          seller_key?: string | null
          slot_end?: string | null
          slot_start?: string | null
          source?: string
          starts_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gs_availability_slots_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "gs_sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      gs_commercial_facts: {
        Row: {
          active: boolean
          approved_by: string | null
          created_at: string
          fact_type: string
          id: string
          key: string
          kind: string | null
          metadata: Json
          source: string | null
          title: string | null
          updated_at: string
          valid_from: string | null
          valid_until: string | null
          value: string
          value_json: Json
        }
        Insert: {
          active?: boolean
          approved_by?: string | null
          created_at?: string
          fact_type: string
          id?: string
          key: string
          kind?: string | null
          metadata?: Json
          source?: string | null
          title?: string | null
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
          value: string
          value_json?: Json
        }
        Update: {
          active?: boolean
          approved_by?: string | null
          created_at?: string
          fact_type?: string
          id?: string
          key?: string
          kind?: string | null
          metadata?: Json
          source?: string | null
          title?: string | null
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
          value?: string
          value_json?: Json
        }
        Relationships: []
      }
      gs_sellers: {
        Row: {
          active: boolean
          created_at: string
          id: string
          key: string
          name: string
          persona_prompt: string | null
          role: string
          schedule: Json
          updated_at: string
          whatsapp_phone: string | null
          working_hours: Json
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          key: string
          name: string
          persona_prompt?: string | null
          role?: string
          schedule?: Json
          updated_at?: string
          whatsapp_phone?: string | null
          working_hours?: Json
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          key?: string
          name?: string
          persona_prompt?: string | null
          role?: string
          schedule?: Json
          updated_at?: string
          whatsapp_phone?: string | null
          working_hours?: Json
        }
        Relationships: []
      }
      gs_whatsapp_contacts: {
        Row: {
          city: string | null
          created_at: string
          display_name: string | null
          id: string
          interest: string | null
          last_message_at: string | null
          name: string | null
          neighborhood: string | null
          next_action: string | null
          notes: string | null
          phone: string
          raw: Json
          responsible_seller_id: string | null
          responsible_user_id: string | null
          source: string | null
          stage: string
          tags: Json
          updated_at: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          interest?: string | null
          last_message_at?: string | null
          name?: string | null
          neighborhood?: string | null
          next_action?: string | null
          notes?: string | null
          phone: string
          raw?: Json
          responsible_seller_id?: string | null
          responsible_user_id?: string | null
          source?: string | null
          stage?: string
          tags?: Json
          updated_at?: string
        }
        Update: {
          city?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          interest?: string | null
          last_message_at?: string | null
          name?: string | null
          neighborhood?: string | null
          next_action?: string | null
          notes?: string | null
          phone?: string
          raw?: Json
          responsible_seller_id?: string | null
          responsible_user_id?: string | null
          source?: string | null
          stage?: string
          tags?: Json
          updated_at?: string
        }
        Relationships: []
      }
      gs_whatsapp_conversations: {
        Row: {
          ai_confidence: number | null
          ai_draft_reply: string | null
          ai_enabled: boolean
          ai_last_decision: Json | null
          assigned_user_id: string | null
          contact_id: string
          created_at: string
          current_seller_id: string | null
          current_seller_key: string | null
          external_id: string | null
          funnel_stage: string | null
          id: string
          intent: string | null
          last_ai_action: string | null
          last_inbound_at: string | null
          last_message_at: string | null
          last_outbound_at: string | null
          needs_human: boolean
          needs_human_reason: string | null
          persona_key: string | null
          provider: string | null
          provider_instance: string | null
          raw: Json
          remote_jid: string | null
          status: string
          summary: string | null
          unread_count: number
          updated_at: string
        }
        Insert: {
          ai_confidence?: number | null
          ai_draft_reply?: string | null
          ai_enabled?: boolean
          ai_last_decision?: Json | null
          assigned_user_id?: string | null
          contact_id: string
          created_at?: string
          current_seller_id?: string | null
          current_seller_key?: string | null
          external_id?: string | null
          funnel_stage?: string | null
          id?: string
          intent?: string | null
          last_ai_action?: string | null
          last_inbound_at?: string | null
          last_message_at?: string | null
          last_outbound_at?: string | null
          needs_human?: boolean
          needs_human_reason?: string | null
          persona_key?: string | null
          provider?: string | null
          provider_instance?: string | null
          raw?: Json
          remote_jid?: string | null
          status?: string
          summary?: string | null
          unread_count?: number
          updated_at?: string
        }
        Update: {
          ai_confidence?: number | null
          ai_draft_reply?: string | null
          ai_enabled?: boolean
          ai_last_decision?: Json | null
          assigned_user_id?: string | null
          contact_id?: string
          created_at?: string
          current_seller_id?: string | null
          current_seller_key?: string | null
          external_id?: string | null
          funnel_stage?: string | null
          id?: string
          intent?: string | null
          last_ai_action?: string | null
          last_inbound_at?: string | null
          last_message_at?: string | null
          last_outbound_at?: string | null
          needs_human?: boolean
          needs_human_reason?: string | null
          persona_key?: string | null
          provider?: string | null
          provider_instance?: string | null
          raw?: Json
          remote_jid?: string | null
          status?: string
          summary?: string | null
          unread_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gs_whatsapp_conversations_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "gs_whatsapp_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gs_whatsapp_conversations_current_seller_id_fkey"
            columns: ["current_seller_id"]
            isOneToOne: false
            referencedRelation: "gs_sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      gs_whatsapp_events: {
        Row: {
          contact_id: string | null
          conversation_id: string | null
          created_at: string
          event_type: string
          id: string
          payload: Json | null
        }
        Insert: {
          contact_id?: string | null
          conversation_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          payload?: Json | null
        }
        Update: {
          contact_id?: string | null
          conversation_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          payload?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "gs_whatsapp_events_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "gs_whatsapp_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      gs_whatsapp_messages: {
        Row: {
          ai_reply: string | null
          audio_url: string | null
          body: string | null
          confidence: number | null
          contact_id: string | null
          conversation_id: string
          created_at: string
          direction: string
          id: string
          intent: string | null
          media: Json
          message_type: string
          needs_human: boolean | null
          persona_key: string | null
          provider_message_id: string | null
          provider_status: string | null
          raw: Json | null
          seller_key: string | null
          sender_type: string
          transcript: string | null
        }
        Insert: {
          ai_reply?: string | null
          audio_url?: string | null
          body?: string | null
          confidence?: number | null
          contact_id?: string | null
          conversation_id: string
          created_at?: string
          direction: string
          id?: string
          intent?: string | null
          media?: Json
          message_type?: string
          needs_human?: boolean | null
          persona_key?: string | null
          provider_message_id?: string | null
          provider_status?: string | null
          raw?: Json | null
          seller_key?: string | null
          sender_type: string
          transcript?: string | null
        }
        Update: {
          ai_reply?: string | null
          audio_url?: string | null
          body?: string | null
          confidence?: number | null
          contact_id?: string | null
          conversation_id?: string
          created_at?: string
          direction?: string
          id?: string
          intent?: string | null
          media?: Json
          message_type?: string
          needs_human?: boolean | null
          persona_key?: string | null
          provider_message_id?: string | null
          provider_status?: string | null
          raw?: Json | null
          seller_key?: string | null
          sender_type?: string
          transcript?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gs_whatsapp_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "gs_whatsapp_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_items: {
        Row: {
          active: boolean
          category: string | null
          content: string
          created_at: string
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          category?: string | null
          content: string
          created_at?: string
          id?: string
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          category?: string | null
          content?: string
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          audio_url: string | null
          body: string | null
          conversation_id: string
          created_at: string
          direction: string
          id: string
          message_type: string
          provider_message_id: string | null
          raw: Json | null
          sender_type: string
          transcript: string | null
        }
        Insert: {
          audio_url?: string | null
          body?: string | null
          conversation_id: string
          created_at?: string
          direction: string
          id?: string
          message_type?: string
          provider_message_id?: string | null
          raw?: Json | null
          sender_type: string
          transcript?: string | null
        }
        Update: {
          audio_url?: string | null
          body?: string | null
          conversation_id?: string
          created_at?: string
          direction?: string
          id?: string
          message_type?: string
          provider_message_id?: string | null
          raw?: Json | null
          sender_type?: string
          transcript?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      objections: {
        Row: {
          active: boolean
          category: string | null
          created_at: string
          examples: Json
          id: string
          needs_human: boolean
          recommended_response: string | null
          risk_level: string | null
          title: string
          updated_at: string
          when_to_use: string | null
        }
        Insert: {
          active?: boolean
          category?: string | null
          created_at?: string
          examples?: Json
          id?: string
          needs_human?: boolean
          recommended_response?: string | null
          risk_level?: string | null
          title: string
          updated_at?: string
          when_to_use?: string | null
        }
        Update: {
          active?: boolean
          category?: string | null
          created_at?: string
          examples?: Json
          id?: string
          needs_human?: boolean
          recommended_response?: string | null
          risk_level?: string | null
          title?: string
          updated_at?: string
          when_to_use?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          active: boolean
          created_at: string
          email: string | null
          id: string
          name: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          email?: string | null
          id: string
          name?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          updated_at?: string
        }
        Relationships: []
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
          role?: Database["public"]["Enums"]["app_role"]
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "gestor" | "atendente"
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
      app_role: ["admin", "gestor", "atendente"],
    },
  },
} as const
