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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      clients: {
        Row: {
          adresse: string | null
          code_postal: string | null
          created_at: string | null
          email: string | null
          id: string
          message: string | null
          nom: string
          notes: string | null
          prenom: string
          service_souhaite: string | null
          statut: Database["public"]["Enums"]["client_status"] | null
          telephone: string | null
          updated_at: string | null
          ville: string | null
        }
        Insert: {
          adresse?: string | null
          code_postal?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          message?: string | null
          nom: string
          notes?: string | null
          prenom: string
          service_souhaite?: string | null
          statut?: Database["public"]["Enums"]["client_status"] | null
          telephone?: string | null
          updated_at?: string | null
          ville?: string | null
        }
        Update: {
          adresse?: string | null
          code_postal?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          message?: string | null
          nom?: string
          notes?: string | null
          prenom?: string
          service_souhaite?: string | null
          statut?: Database["public"]["Enums"]["client_status"] | null
          telephone?: string | null
          updated_at?: string | null
          ville?: string | null
        }
        Relationships: []
      }
      company_info: {
        Row: {
          adresse_siege: string
          denomination_sociale: string
          email: string | null
          id: string
          logo_url: string | null
          numero_tva: string
          site_web: string | null
          telephone: string | null
          updated_at: string | null
        }
        Insert: {
          adresse_siege?: string
          denomination_sociale?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          numero_tva?: string
          site_web?: string | null
          telephone?: string | null
          updated_at?: string | null
        }
        Update: {
          adresse_siege?: string
          denomination_sociale?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          numero_tva?: string
          site_web?: string | null
          telephone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      invoices: {
        Row: {
          client_id: string
          created_at: string | null
          date_echeance: string | null
          id: string
          lignes: Json | null
          montant_ht: number | null
          montant_ttc: number | null
          notes: string | null
          numero: string
          quote_id: string | null
          statut: Database["public"]["Enums"]["invoice_status"] | null
          tva: number | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          date_echeance?: string | null
          id?: string
          lignes?: Json | null
          montant_ht?: number | null
          montant_ttc?: number | null
          notes?: string | null
          numero: string
          quote_id?: string | null
          statut?: Database["public"]["Enums"]["invoice_status"] | null
          tva?: number | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          date_echeance?: string | null
          id?: string
          lignes?: Json | null
          montant_ht?: number | null
          montant_ttc?: number | null
          notes?: string | null
          numero?: string
          quote_id?: string | null
          statut?: Database["public"]["Enums"]["invoice_status"] | null
          tva?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
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
      missions: {
        Row: {
          client_id: string
          created_at: string | null
          date: string
          description: string | null
          heure_debut: string
          heure_fin: string
          id: string
          montant: number | null
          nannysitter_id: string | null
          statut: Database["public"]["Enums"]["mission_status"] | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          date: string
          description?: string | null
          heure_debut?: string
          heure_fin?: string
          id?: string
          montant?: number | null
          nannysitter_id?: string | null
          statut?: Database["public"]["Enums"]["mission_status"] | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          date?: string
          description?: string | null
          heure_debut?: string
          heure_fin?: string
          id?: string
          montant?: number | null
          nannysitter_id?: string | null
          statut?: Database["public"]["Enums"]["mission_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "missions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "missions_nannysitter_id_fkey"
            columns: ["nannysitter_id"]
            isOneToOne: false
            referencedRelation: "nannysitters"
            referencedColumns: ["id"]
          },
        ]
      }
      nannysitters: {
        Row: {
          actif: boolean | null
          competences: string | null
          created_at: string | null
          email: string | null
          id: string
          nom: string
          prenom: string
          tarif_horaire: number | null
          telephone: string | null
          updated_at: string | null
        }
        Insert: {
          actif?: boolean | null
          competences?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          nom: string
          prenom: string
          tarif_horaire?: number | null
          telephone?: string | null
          updated_at?: string | null
        }
        Update: {
          actif?: boolean | null
          competences?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          nom?: string
          prenom?: string
          tarif_horaire?: number | null
          telephone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      quotes: {
        Row: {
          client_id: string
          created_at: string | null
          date_validite: string | null
          id: string
          lignes: Json | null
          montant_ht: number | null
          montant_ttc: number | null
          notes: string | null
          numero: string
          statut: Database["public"]["Enums"]["quote_status"] | null
          tva: number | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          date_validite?: string | null
          id?: string
          lignes?: Json | null
          montant_ht?: number | null
          montant_ttc?: number | null
          notes?: string | null
          numero: string
          statut?: Database["public"]["Enums"]["quote_status"] | null
          tva?: number | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          date_validite?: string | null
          id?: string
          lignes?: Json | null
          montant_ht?: number | null
          montant_ttc?: number | null
          notes?: string | null
          numero?: string
          statut?: Database["public"]["Enums"]["quote_status"] | null
          tva?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
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
    }
    Enums: {
      app_role: "owner"
      client_status: "prospect" | "client"
      invoice_status: "brouillon" | "envoyee" | "payee" | "en_retard"
      mission_status:
        | "planifie"
        | "a_attribuer"
        | "en_cours"
        | "termine"
        | "annule"
      quote_status: "brouillon" | "envoye" | "accepte" | "refuse" | "expire"
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
      app_role: ["owner"],
      client_status: ["prospect", "client"],
      invoice_status: ["brouillon", "envoyee", "payee", "en_retard"],
      mission_status: [
        "planifie",
        "a_attribuer",
        "en_cours",
        "termine",
        "annule",
      ],
      quote_status: ["brouillon", "envoye", "accepte", "refuse", "expire"],
    },
  },
} as const
