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
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          record_id: string | null
          table_name: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          record_id?: string | null
          table_name?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          record_id?: string | null
          table_name?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      drivers: {
        Row: {
          activity_id: string | null
          created_at: string
          default_vehicle_id: string | null
          id: string
          name: string
          role: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_id?: string | null
          created_at?: string
          default_vehicle_id?: string | null
          id?: string
          name: string
          role?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_id?: string | null
          created_at?: string
          default_vehicle_id?: string | null
          id?: string
          name?: string
          role?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "drivers_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "user_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drivers_default_vehicle_id_fkey"
            columns: ["default_vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          admin_note: string | null
          context: string | null
          created_at: string
          id: string
          message: string
          plugin: string | null
          screen: string | null
          status: string
          type: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          context?: string | null
          created_at?: string
          id?: string
          message: string
          plugin?: string | null
          screen?: string | null
          status?: string
          type: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          context?: string | null
          created_at?: string
          id?: string
          message?: string
          plugin?: string | null
          screen?: string | null
          status?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      frequent_routes: {
        Row: {
          activity_id: string | null
          created_at: string
          default_distance: number | null
          default_driver_id: string | null
          default_vehicle_id: string | null
          end_location: string
          id: string
          name: string
          start_location: string
          user_id: string
        }
        Insert: {
          activity_id?: string | null
          created_at?: string
          default_distance?: number | null
          default_driver_id?: string | null
          default_vehicle_id?: string | null
          end_location: string
          id?: string
          name: string
          start_location: string
          user_id: string
        }
        Update: {
          activity_id?: string | null
          created_at?: string
          default_distance?: number | null
          default_driver_id?: string | null
          default_vehicle_id?: string | null
          end_location?: string
          id?: string
          name?: string
          start_location?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "frequent_routes_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "user_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frequent_routes_default_driver_id_fkey"
            columns: ["default_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frequent_routes_default_vehicle_id_fkey"
            columns: ["default_vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          activity_id: string | null
          amount: number | null
          client: string | null
          created_at: string
          due_date: string | null
          id: string
          invoice_number: string
          quote_id: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_id?: string | null
          amount?: number | null
          client?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          invoice_number: string
          quote_id?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_id?: string | null
          amount?: number | null
          client?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          invoice_number?: string
          quote_id?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "user_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      log_entries: {
        Row: {
          activity_id: string | null
          created_at: string
          id: string
          text: string
          user_id: string
        }
        Insert: {
          activity_id?: string | null
          created_at?: string
          id?: string
          text: string
          user_id: string
        }
        Update: {
          activity_id?: string | null
          created_at?: string
          id?: string
          text?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "log_entries_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "user_activities"
            referencedColumns: ["id"]
          },
        ]
      }
      mission_activity_logs: {
        Row: {
          action_type: string | null
          created_at: string
          id: string
          mission_id: string
          text: string
        }
        Insert: {
          action_type?: string | null
          created_at?: string
          id?: string
          mission_id: string
          text: string
        }
        Update: {
          action_type?: string | null
          created_at?: string
          id?: string
          mission_id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "mission_activity_logs_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
        ]
      }
      mission_checklist_items: {
        Row: {
          created_at: string
          done: boolean
          id: string
          mission_id: string
          sort_order: number
          text: string
        }
        Insert: {
          created_at?: string
          done?: boolean
          id?: string
          mission_id: string
          sort_order?: number
          text: string
        }
        Update: {
          created_at?: string
          done?: boolean
          id?: string
          mission_id?: string
          sort_order?: number
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "mission_checklist_items_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
        ]
      }
      missions: {
        Row: {
          activity_id: string | null
          client: string | null
          created_at: string
          end_date: string | null
          id: string
          location: string | null
          notes: string | null
          start_date: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_id?: string | null
          client?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          start_date?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_id?: string | null
          client?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          start_date?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "missions_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "user_activities"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          invoice_id: string
          method: string | null
          paid_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          invoice_id: string
          method?: string | null
          paid_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          invoice_id?: string
          method?: string | null
          paid_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      plugins: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean
          is_locked: boolean
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          is_locked?: boolean
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          is_locked?: boolean
          name?: string
          slug?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          plan: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          plan?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          plan?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      promotions: {
        Row: {
          created_at: string
          created_by: string | null
          ends_at: string | null
          id: string
          is_active: boolean
          message: string | null
          starts_at: string | null
          title: string
          type: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          message?: string | null
          starts_at?: string | null
          title: string
          type?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          message?: string | null
          starts_at?: string | null
          title?: string
          type?: string | null
        }
        Relationships: []
      }
      quotes: {
        Row: {
          activity_id: string | null
          amount: number | null
          client: string | null
          created_at: string
          due_date: string | null
          id: string
          quote_number: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_id?: string | null
          amount?: number | null
          client?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          quote_number: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_id?: string | null
          amount?: number | null
          client?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          quote_number?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotes_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "user_activities"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          activity_id: string | null
          created_at: string
          id: string
          notes: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "user_activities"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          activity_id: string | null
          created_at: string
          done: boolean
          id: string
          priority: string
          text: string
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_id?: string | null
          created_at?: string
          done?: boolean
          id?: string
          priority?: string
          text: string
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_id?: string | null
          created_at?: string
          done?: boolean
          id?: string
          priority?: string
          text?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "user_activities"
            referencedColumns: ["id"]
          },
        ]
      }
      themes: {
        Row: {
          badges: Json | null
          card_style: Json | null
          colors: Json | null
          created_at: string
          created_by: string | null
          id: string
          is_default: boolean
          name: string
          typography: Json | null
        }
        Insert: {
          badges?: Json | null
          card_style?: Json | null
          colors?: Json | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_default?: boolean
          name: string
          typography?: Json | null
        }
        Update: {
          badges?: Json | null
          card_style?: Json | null
          colors?: Json | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_default?: boolean
          name?: string
          typography?: Json | null
        }
        Relationships: []
      }
      trips: {
        Row: {
          activity_id: string | null
          created_at: string
          date: string
          distance: number | null
          driver_id: string | null
          end_location: string | null
          end_mileage: number | null
          id: string
          ik_amount: number | null
          notes: string | null
          purpose: string | null
          start_location: string | null
          start_mileage: number | null
          updated_at: string
          user_id: string
          vehicle_id: string | null
        }
        Insert: {
          activity_id?: string | null
          created_at?: string
          date?: string
          distance?: number | null
          driver_id?: string | null
          end_location?: string | null
          end_mileage?: number | null
          id?: string
          ik_amount?: number | null
          notes?: string | null
          purpose?: string | null
          start_location?: string | null
          start_mileage?: number | null
          updated_at?: string
          user_id: string
          vehicle_id?: string | null
        }
        Update: {
          activity_id?: string | null
          created_at?: string
          date?: string
          distance?: number | null
          driver_id?: string | null
          end_location?: string | null
          end_mileage?: number | null
          id?: string
          ik_amount?: number | null
          notes?: string | null
          purpose?: string | null
          start_location?: string | null
          start_mileage?: number | null
          updated_at?: string
          user_id?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trips_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "user_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_activities: {
        Row: {
          color: string
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_plugins: {
        Row: {
          activated_at: string
          id: string
          plugin_id: string
          user_id: string
        }
        Insert: {
          activated_at?: string
          id?: string
          plugin_id: string
          user_id: string
        }
        Update: {
          activated_at?: string
          id?: string
          plugin_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_plugins_plugin_id_fkey"
            columns: ["plugin_id"]
            isOneToOne: false
            referencedRelation: "plugins"
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
      vehicles: {
        Row: {
          activity_id: string | null
          brand_model: string | null
          created_at: string
          current_mileage: number | null
          fiscal_power: string | null
          id: string
          license_plate: string | null
          name: string
          starting_mileage: number | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_id?: string | null
          brand_model?: string | null
          created_at?: string
          current_mileage?: number | null
          fiscal_power?: string | null
          id?: string
          license_plate?: string | null
          name: string
          starting_mileage?: number | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_id?: string | null
          brand_model?: string | null
          created_at?: string
          current_mileage?: number | null
          fiscal_power?: string | null
          id?: string
          license_plate?: string | null
          name?: string
          starting_mileage?: number | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "user_activities"
            referencedColumns: ["id"]
          },
        ]
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
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
