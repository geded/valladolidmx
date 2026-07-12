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
      admin_profiles: {
        Row: {
          active: boolean
          created_at: string
          department: string | null
          id: string
          permission_level: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          department?: string | null
          id?: string
          permission_level?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          department?: string | null
          id?: string
          permission_level?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      alux_traveler_suggestions: {
        Row: {
          capability: string
          created_at: string
          id: string
          meta: Json
          plan_id: string | null
          user_id: string
        }
        Insert: {
          capability: string
          created_at?: string
          id?: string
          meta?: Json
          plan_id?: string | null
          user_id: string
        }
        Update: {
          capability?: string
          created_at?: string
          id?: string
          meta?: Json
          plan_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alux_traveler_suggestions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "travel_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      articles: {
        Row: {
          author_user_id: string | null
          body: string | null
          cover_media_id: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          destination_id: string | null
          excerpt: string | null
          id: string
          locale: Database["public"]["Enums"]["locale_code"]
          metadata: Json
          published_at: string | null
          scheduled_at: string | null
          slug: string
          status: Database["public"]["Enums"]["content_status"]
          tags: string[]
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          author_user_id?: string | null
          body?: string | null
          cover_media_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          destination_id?: string | null
          excerpt?: string | null
          id?: string
          locale?: Database["public"]["Enums"]["locale_code"]
          metadata?: Json
          published_at?: string | null
          scheduled_at?: string | null
          slug: string
          status?: Database["public"]["Enums"]["content_status"]
          tags?: string[]
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          author_user_id?: string | null
          body?: string | null
          cover_media_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          destination_id?: string | null
          excerpt?: string | null
          id?: string
          locale?: Database["public"]["Enums"]["locale_code"]
          metadata?: Json
          published_at?: string | null
          scheduled_at?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["content_status"]
          tags?: string[]
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "articles_cover_media_id_fkey"
            columns: ["cover_media_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "articles_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "destinations"
            referencedColumns: ["id"]
          },
        ]
      }
      banners: {
        Row: {
          cover_media_id: string | null
          created_at: string
          created_by: string | null
          cta_label: string | null
          cta_url: string | null
          deleted_at: string | null
          deleted_by: string | null
          ends_at: string | null
          id: string
          locale: Database["public"]["Enums"]["locale_code"]
          palette: Database["public"]["Enums"]["hero_palette"] | null
          placement: string
          position: number
          published_at: string | null
          slug: string
          starts_at: string | null
          status: Database["public"]["Enums"]["content_status"]
          subtitle: string | null
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          cover_media_id?: string | null
          created_at?: string
          created_by?: string | null
          cta_label?: string | null
          cta_url?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          ends_at?: string | null
          id?: string
          locale?: Database["public"]["Enums"]["locale_code"]
          palette?: Database["public"]["Enums"]["hero_palette"] | null
          placement?: string
          position?: number
          published_at?: string | null
          slug: string
          starts_at?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          subtitle?: string | null
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          cover_media_id?: string | null
          created_at?: string
          created_by?: string | null
          cta_label?: string | null
          cta_url?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          ends_at?: string | null
          id?: string
          locale?: Database["public"]["Enums"]["locale_code"]
          palette?: Database["public"]["Enums"]["hero_palette"] | null
          placement?: string
          position?: number
          published_at?: string | null
          slug?: string
          starts_at?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          subtitle?: string | null
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "banners_cover_media_id_fkey"
            columns: ["cover_media_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      block_definitions: {
        Row: {
          capabilities: Json
          category: Database["public"]["Enums"]["block_category"]
          constraints: Json
          created_at: string
          current_version: string
          data_sources: Json
          description: string | null
          display_name: string
          i18n: Json
          id: string
          is_deprecated: boolean
          responsive: Json
          type: string
          updated_at: string
        }
        Insert: {
          capabilities?: Json
          category: Database["public"]["Enums"]["block_category"]
          constraints?: Json
          created_at?: string
          current_version: string
          data_sources?: Json
          description?: string | null
          display_name: string
          i18n?: Json
          id?: string
          is_deprecated?: boolean
          responsive?: Json
          type: string
          updated_at?: string
        }
        Update: {
          capabilities?: Json
          category?: Database["public"]["Enums"]["block_category"]
          constraints?: Json
          created_at?: string
          current_version?: string
          data_sources?: Json
          description?: string | null
          display_name?: string
          i18n?: Json
          id?: string
          is_deprecated?: boolean
          responsive?: Json
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      block_versions: {
        Row: {
          block_id: string
          capabilities: Json
          constraints: Json
          data_sources: Json
          i18n: Json
          id: string
          notes: string | null
          published_at: string
          published_by: string | null
          responsive: Json
          schema: Json
          status: Database["public"]["Enums"]["block_version_status"]
          version: string
        }
        Insert: {
          block_id: string
          capabilities?: Json
          constraints?: Json
          data_sources?: Json
          i18n?: Json
          id?: string
          notes?: string | null
          published_at?: string
          published_by?: string | null
          responsive?: Json
          schema: Json
          status?: Database["public"]["Enums"]["block_version_status"]
          version: string
        }
        Update: {
          block_id?: string
          capabilities?: Json
          constraints?: Json
          data_sources?: Json
          i18n?: Json
          id?: string
          notes?: string | null
          published_at?: string
          published_by?: string | null
          responsive?: Json
          schema?: Json
          status?: Database["public"]["Enums"]["block_version_status"]
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "block_versions_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "block_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      business_categories: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          icon: string | null
          id: string
          metadata: Json
          name: string
          parent_id: string | null
          slug: string
          sort_order: number
          status: Database["public"]["Enums"]["content_status"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          metadata?: Json
          name: string
          parent_id?: string | null
          slug: string
          sort_order?: number
          status?: Database["public"]["Enums"]["content_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          metadata?: Json
          name?: string
          parent_id?: string | null
          slug?: string
          sort_order?: number
          status?: Database["public"]["Enums"]["content_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "business_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      business_category_links: {
        Row: {
          business_id: string
          category_id: string
          created_at: string
        }
        Insert: {
          business_id: string
          category_id: string
          created_at?: string
        }
        Update: {
          business_id?: string
          category_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_category_links_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_effective_visibility"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "business_category_links_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_category_links_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "business_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      business_contacts: {
        Row: {
          business_id: string
          contact_type: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          id: string
          is_public: boolean
          label: string | null
          sort_order: number
          updated_at: string
          updated_by: string | null
          value: string
        }
        Insert: {
          business_id: string
          contact_type: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_public?: boolean
          label?: string | null
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
          value: string
        }
        Update: {
          business_id?: string
          contact_type?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_public?: boolean
          label?: string | null
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_contacts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_effective_visibility"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "business_contacts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_hours: {
        Row: {
          business_id: string
          closes_at: string | null
          created_at: string
          day_of_week: number
          id: string
          is_closed: boolean
          notes: string | null
          opens_at: string | null
          updated_at: string
        }
        Insert: {
          business_id: string
          closes_at?: string | null
          created_at?: string
          day_of_week: number
          id?: string
          is_closed?: boolean
          notes?: string | null
          opens_at?: string | null
          updated_at?: string
        }
        Update: {
          business_id?: string
          closes_at?: string | null
          created_at?: string
          day_of_week?: number
          id?: string
          is_closed?: boolean
          notes?: string | null
          opens_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_hours_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_effective_visibility"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "business_hours_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_locations: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          business_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          destination_zone_id: string | null
          id: string
          is_primary: boolean
          label: string | null
          latitude: number | null
          longitude: number | null
          metadata: Json
          postal_code: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          business_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          destination_zone_id?: string | null
          id?: string
          is_primary?: boolean
          label?: string | null
          latitude?: number | null
          longitude?: number | null
          metadata?: Json
          postal_code?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          business_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          destination_zone_id?: string | null
          id?: string
          is_primary?: boolean
          label?: string | null
          latitude?: number | null
          longitude?: number | null
          metadata?: Json
          postal_code?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_locations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_effective_visibility"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "business_locations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_locations_destination_zone_id_fkey"
            columns: ["destination_zone_id"]
            isOneToOne: false
            referencedRelation: "destination_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      business_media: {
        Row: {
          business_id: string
          created_at: string
          id: string
          media_asset_id: string
          role: string
          sort_order: number
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          media_asset_id: string
          role?: string
          sort_order?: number
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          media_asset_id?: string
          role?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "business_media_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_effective_visibility"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "business_media_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_media_media_asset_id_fkey"
            columns: ["media_asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      business_ownership_transfers: {
        Row: {
          business_id: string
          created_at: string
          expires_at: string
          from_user_id: string | null
          id: string
          notes: string | null
          requested_at: string
          responded_at: string | null
          status: Database["public"]["Enums"]["ownership_transfer_status"]
          to_user_id: string
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          expires_at?: string
          from_user_id?: string | null
          id?: string
          notes?: string | null
          requested_at?: string
          responded_at?: string | null
          status?: Database["public"]["Enums"]["ownership_transfer_status"]
          to_user_id: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          expires_at?: string
          from_user_id?: string | null
          id?: string
          notes?: string | null
          requested_at?: string
          responded_at?: string | null
          status?: Database["public"]["Enums"]["ownership_transfer_status"]
          to_user_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_ownership_transfers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_effective_visibility"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "business_ownership_transfers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_social_links: {
        Row: {
          business_id: string
          created_at: string
          id: string
          platform: string
          sort_order: number
          updated_at: string
          url: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          platform: string
          sort_order?: number
          updated_at?: string
          url: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          platform?: string
          sort_order?: number
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_social_links_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_effective_visibility"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "business_social_links_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_users: {
        Row: {
          business_id: string
          created_at: string
          id: string
          invited_by: string | null
          role: Database["public"]["Enums"]["business_user_role"]
          status: Database["public"]["Enums"]["membership_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["business_user_role"]
          status?: Database["public"]["Enums"]["membership_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["business_user_role"]
          status?: Database["public"]["Enums"]["membership_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_users_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_effective_visibility"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "business_users_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_view_events: {
        Row: {
          business_id: string
          country_code: string | null
          event_type: string
          id: string
          occurred_at: string
          referer: string | null
          session_hash: string | null
          source: string | null
        }
        Insert: {
          business_id: string
          country_code?: string | null
          event_type: string
          id?: string
          occurred_at?: string
          referer?: string | null
          session_hash?: string | null
          source?: string | null
        }
        Update: {
          business_id?: string
          country_code?: string | null
          event_type?: string
          id?: string
          occurred_at?: string
          referer?: string | null
          session_hash?: string | null
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_view_events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_effective_visibility"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "business_view_events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_visibility_grants: {
        Row: {
          amount_paid_mxn: number | null
          auto_renew: boolean
          business_id: string
          cancelled_at: string | null
          cancelled_reason: string | null
          created_at: string
          created_by: string | null
          cycle: string
          expires_at: string
          id: string
          notes: string | null
          notified_activated_at: string | null
          notified_expired_at: string | null
          notified_expiring_1d_at: string | null
          notified_expiring_7d_at: string | null
          notified_rejected_at: string | null
          plan_id: string
          source: string
          source_order_id: string | null
          starts_at: string
          status: string
          updated_at: string
        }
        Insert: {
          amount_paid_mxn?: number | null
          auto_renew?: boolean
          business_id: string
          cancelled_at?: string | null
          cancelled_reason?: string | null
          created_at?: string
          created_by?: string | null
          cycle?: string
          expires_at: string
          id?: string
          notes?: string | null
          notified_activated_at?: string | null
          notified_expired_at?: string | null
          notified_expiring_1d_at?: string | null
          notified_expiring_7d_at?: string | null
          notified_rejected_at?: string | null
          plan_id: string
          source?: string
          source_order_id?: string | null
          starts_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount_paid_mxn?: number | null
          auto_renew?: boolean
          business_id?: string
          cancelled_at?: string | null
          cancelled_reason?: string | null
          created_at?: string
          created_by?: string | null
          cycle?: string
          expires_at?: string
          id?: string
          notes?: string | null
          notified_activated_at?: string | null
          notified_expired_at?: string | null
          notified_expiring_1d_at?: string | null
          notified_expiring_7d_at?: string | null
          notified_rejected_at?: string | null
          plan_id?: string
          source?: string
          source_order_id?: string | null
          starts_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_visibility_grants_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_effective_visibility"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "business_visibility_grants_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_visibility_grants_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "visibility_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_visibility_grants_source_order_id_fkey"
            columns: ["source_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          can_self_publish: boolean
          cover_media_id: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          demo_seed_batch: string | null
          demo_source_url: string | null
          description: string | null
          destination_id: string
          display_name: string
          id: string
          is_demo_seed: boolean
          legal_name: string | null
          logo_media_id: string | null
          metadata: Json
          primary_category_id: string | null
          published_at: string | null
          review_notes: string | null
          slug: string
          status: Database["public"]["Enums"]["content_status"]
          submitted_for_review_at: string | null
          tagline: string | null
          updated_at: string
          updated_by: string | null
          verification_document_url: string | null
          verification_notes: string | null
          verified: boolean
        }
        Insert: {
          can_self_publish?: boolean
          cover_media_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          demo_seed_batch?: string | null
          demo_source_url?: string | null
          description?: string | null
          destination_id: string
          display_name: string
          id?: string
          is_demo_seed?: boolean
          legal_name?: string | null
          logo_media_id?: string | null
          metadata?: Json
          primary_category_id?: string | null
          published_at?: string | null
          review_notes?: string | null
          slug: string
          status?: Database["public"]["Enums"]["content_status"]
          submitted_for_review_at?: string | null
          tagline?: string | null
          updated_at?: string
          updated_by?: string | null
          verification_document_url?: string | null
          verification_notes?: string | null
          verified?: boolean
        }
        Update: {
          can_self_publish?: boolean
          cover_media_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          demo_seed_batch?: string | null
          demo_source_url?: string | null
          description?: string | null
          destination_id?: string
          display_name?: string
          id?: string
          is_demo_seed?: boolean
          legal_name?: string | null
          logo_media_id?: string | null
          metadata?: Json
          primary_category_id?: string | null
          published_at?: string | null
          review_notes?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["content_status"]
          submitted_for_review_at?: string | null
          tagline?: string | null
          updated_at?: string
          updated_by?: string | null
          verification_document_url?: string | null
          verification_notes?: string | null
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "businesses_cover_media_id_fkey"
            columns: ["cover_media_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "businesses_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "destinations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "businesses_logo_media_id_fkey"
            columns: ["logo_media_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "businesses_primary_category_id_fkey"
            columns: ["primary_category_id"]
            isOneToOne: false
            referencedRelation: "business_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      cc_case_evaluations: {
        Row: {
          case_id: string
          comment: string | null
          created_at: string
          id: string
          nps: number | null
          payload: Json
          rating: number
          traveler_user_id: string
          updated_at: string
        }
        Insert: {
          case_id: string
          comment?: string | null
          created_at?: string
          id?: string
          nps?: number | null
          payload?: Json
          rating: number
          traveler_user_id: string
          updated_at?: string
        }
        Update: {
          case_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          nps?: number | null
          payload?: Json
          rating?: number
          traveler_user_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cc_case_evaluations_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "concierge_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      composition_preview_tokens: {
        Row: {
          composition_id: string
          created_at: string
          created_by: string | null
          expires_at: string
          token: string
        }
        Insert: {
          composition_id: string
          created_at?: string
          created_by?: string | null
          expires_at: string
          token: string
        }
        Update: {
          composition_id?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "composition_preview_tokens_composition_id_fkey"
            columns: ["composition_id"]
            isOneToOne: false
            referencedRelation: "page_compositions"
            referencedColumns: ["id"]
          },
        ]
      }
      concierge_assignments: {
        Row: {
          assigned_at: string
          assigned_by_user_id: string
          case_id: string
          concierge_user_id: string
          created_at: string
          id: string
          payload: Json
          reason: string | null
          released_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          assigned_at?: string
          assigned_by_user_id: string
          case_id: string
          concierge_user_id: string
          created_at?: string
          id?: string
          payload?: Json
          reason?: string | null
          released_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_at?: string
          assigned_by_user_id?: string
          case_id?: string
          concierge_user_id?: string
          created_at?: string
          id?: string
          payload?: Json
          reason?: string | null
          released_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "concierge_assignments_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "concierge_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      concierge_case_links: {
        Row: {
          case_id: string
          created_at: string
          id: string
          link_type: string
          meta: Json
          target_id: string
        }
        Insert: {
          case_id: string
          created_at?: string
          id?: string
          link_type: string
          meta?: Json
          target_id: string
        }
        Update: {
          case_id?: string
          created_at?: string
          id?: string
          link_type?: string
          meta?: Json
          target_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "concierge_case_links_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "concierge_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      concierge_case_notes: {
        Row: {
          author_user_id: string | null
          body: string
          case_id: string
          created_at: string
          id: string
          updated_at: string
          visibility: string
        }
        Insert: {
          author_user_id?: string | null
          body: string
          case_id: string
          created_at?: string
          id?: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          author_user_id?: string | null
          body?: string
          case_id?: string
          created_at?: string
          id?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "concierge_case_notes_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "concierge_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      concierge_case_participants: {
        Row: {
          case_id: string
          created_at: string
          id: string
          is_active: boolean
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          case_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          role: string
          updated_at?: string
          user_id: string
        }
        Update: {
          case_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "concierge_case_participants_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "concierge_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      concierge_case_requests: {
        Row: {
          business_id: string | null
          case_id: string
          created_at: string
          id: string
          kind: string
          notes: string | null
          product_id: string | null
          source_ref: string | null
          source_type: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          business_id?: string | null
          case_id: string
          created_at?: string
          id?: string
          kind?: string
          notes?: string | null
          product_id?: string | null
          source_ref?: string | null
          source_type: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          business_id?: string | null
          case_id?: string
          created_at?: string
          id?: string
          kind?: string
          notes?: string | null
          product_id?: string | null
          source_ref?: string | null
          source_type?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "concierge_case_requests_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_effective_visibility"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "concierge_case_requests_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concierge_case_requests_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "concierge_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concierge_case_requests_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      concierge_case_timeline: {
        Row: {
          actor_user_id: string | null
          case_id: string
          event_type: string
          id: string
          occurred_at: string
          payload: Json
          severity: string
          summary: string | null
        }
        Insert: {
          actor_user_id?: string | null
          case_id: string
          event_type: string
          id?: string
          occurred_at?: string
          payload?: Json
          severity?: string
          summary?: string | null
        }
        Update: {
          actor_user_id?: string | null
          case_id?: string
          event_type?: string
          id?: string
          occurred_at?: string
          payload?: Json
          severity?: string
          summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "concierge_case_timeline_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "concierge_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      concierge_cases: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          last_activity_at: string
          priority: string
          priority_reason: string | null
          priority_source: string
          source: string
          status: string
          summary: string | null
          target_response_at: string | null
          traveler_user_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          last_activity_at?: string
          priority?: string
          priority_reason?: string | null
          priority_source?: string
          source?: string
          status?: string
          summary?: string | null
          target_response_at?: string | null
          traveler_user_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          last_activity_at?: string
          priority?: string
          priority_reason?: string | null
          priority_source?: string
          source?: string
          status?: string
          summary?: string | null
          target_response_at?: string | null
          traveler_user_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      concierge_profiles: {
        Row: {
          active: boolean
          created_at: string
          display_name: string | null
          id: string
          languages: Json
          max_active_requests: number
          specialties: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          display_name?: string | null
          id?: string
          languages?: Json
          max_active_requests?: number
          specialties?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          display_name?: string | null
          id?: string
          languages?: Json
          max_active_requests?: number
          specialties?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      concierge_proposal_items: {
        Row: {
          amount_cents: number
          created_at: string
          currency: string
          id: string
          notes: string | null
          position: number
          proposal_id: string
          quote_id: string
          request_id: string
          updated_at: string
        }
        Insert: {
          amount_cents?: number
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          position?: number
          proposal_id: string
          quote_id: string
          request_id: string
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          position?: number
          proposal_id?: string
          quote_id?: string
          request_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "concierge_proposal_items_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "concierge_proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concierge_proposal_items_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "concierge_quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concierge_proposal_items_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "concierge_case_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      concierge_proposals: {
        Row: {
          case_id: string
          created_at: string
          created_by_user_id: string | null
          currency: string
          id: string
          payload: Json
          responded_at: string | null
          sent_at: string | null
          status: string
          summary: string | null
          supersedes_proposal_id: string | null
          terms: string | null
          total_amount_cents: number
          updated_at: string
          valid_until: string | null
          version: number
          viewed_at: string | null
        }
        Insert: {
          case_id: string
          created_at?: string
          created_by_user_id?: string | null
          currency?: string
          id?: string
          payload?: Json
          responded_at?: string | null
          sent_at?: string | null
          status?: string
          summary?: string | null
          supersedes_proposal_id?: string | null
          terms?: string | null
          total_amount_cents?: number
          updated_at?: string
          valid_until?: string | null
          version?: number
          viewed_at?: string | null
        }
        Update: {
          case_id?: string
          created_at?: string
          created_by_user_id?: string | null
          currency?: string
          id?: string
          payload?: Json
          responded_at?: string | null
          sent_at?: string | null
          status?: string
          summary?: string | null
          supersedes_proposal_id?: string | null
          terms?: string | null
          total_amount_cents?: number
          updated_at?: string
          valid_until?: string | null
          version?: number
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "concierge_proposals_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "concierge_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concierge_proposals_supersedes_proposal_id_fkey"
            columns: ["supersedes_proposal_id"]
            isOneToOne: false
            referencedRelation: "concierge_proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      concierge_quotes: {
        Row: {
          business_id: string
          case_id: string
          created_at: string
          currency: string
          expired_at: string | null
          id: string
          notes: string | null
          payload: Json
          request_id: string
          status: string
          submitted_at: string | null
          submitted_by_user_id: string | null
          terms: string | null
          total_amount_cents: number | null
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          business_id: string
          case_id: string
          created_at?: string
          currency?: string
          expired_at?: string | null
          id?: string
          notes?: string | null
          payload?: Json
          request_id: string
          status?: string
          submitted_at?: string | null
          submitted_by_user_id?: string | null
          terms?: string | null
          total_amount_cents?: number | null
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          business_id?: string
          case_id?: string
          created_at?: string
          currency?: string
          expired_at?: string | null
          id?: string
          notes?: string | null
          payload?: Json
          request_id?: string
          status?: string
          submitted_at?: string | null
          submitted_by_user_id?: string | null
          terms?: string | null
          total_amount_cents?: number | null
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "concierge_quotes_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_effective_visibility"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "concierge_quotes_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concierge_quotes_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "concierge_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concierge_quotes_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "concierge_case_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      content_audit_log: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          entity_id: string
          entity_kind: Database["public"]["Enums"]["entity_kind"]
          from_status: Database["public"]["Enums"]["content_status"] | null
          id: string
          metadata: Json
          notes: string | null
          to_status: Database["public"]["Enums"]["content_status"] | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          entity_id: string
          entity_kind: Database["public"]["Enums"]["entity_kind"]
          from_status?: Database["public"]["Enums"]["content_status"] | null
          id?: string
          metadata?: Json
          notes?: string | null
          to_status?: Database["public"]["Enums"]["content_status"] | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          entity_id?: string
          entity_kind?: Database["public"]["Enums"]["entity_kind"]
          from_status?: Database["public"]["Enums"]["content_status"] | null
          id?: string
          metadata?: Json
          notes?: string | null
          to_status?: Database["public"]["Enums"]["content_status"] | null
        }
        Relationships: []
      }
      countries: {
        Row: {
          created_at: string
          created_by: string | null
          default_locale: Database["public"]["Enums"]["locale_code"]
          deleted_at: string | null
          deleted_by: string | null
          id: string
          iso_code: string
          metadata: Json
          name: string
          slug: string
          status: Database["public"]["Enums"]["content_status"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          default_locale?: Database["public"]["Enums"]["locale_code"]
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          iso_code: string
          metadata?: Json
          name: string
          slug: string
          status?: Database["public"]["Enums"]["content_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          default_locale?: Database["public"]["Enums"]["locale_code"]
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          iso_code?: string
          metadata?: Json
          name?: string
          slug?: string
          status?: Database["public"]["Enums"]["content_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      destination_media: {
        Row: {
          created_at: string
          destination_id: string
          id: string
          media_asset_id: string
          role: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          destination_id: string
          id?: string
          media_asset_id: string
          role?: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          destination_id?: string
          id?: string
          media_asset_id?: string
          role?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "destination_media_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "destinations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "destination_media_media_asset_id_fkey"
            columns: ["media_asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      destination_zone_media: {
        Row: {
          created_at: string
          id: string
          media_asset_id: string
          role: string
          sort_order: number
          zone_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          media_asset_id: string
          role?: string
          sort_order?: number
          zone_id: string
        }
        Update: {
          created_at?: string
          id?: string
          media_asset_id?: string
          role?: string
          sort_order?: number
          zone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "destination_zone_media_media_asset_id_fkey"
            columns: ["media_asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "destination_zone_media_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "destination_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      destination_zones: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          demo_seed_batch: string | null
          demo_source_url: string | null
          description: string | null
          destination_id: string
          id: string
          is_demo_seed: boolean
          metadata: Json
          name: string
          slug: string
          status: Database["public"]["Enums"]["content_status"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          demo_seed_batch?: string | null
          demo_source_url?: string | null
          description?: string | null
          destination_id: string
          id?: string
          is_demo_seed?: boolean
          metadata?: Json
          name: string
          slug: string
          status?: Database["public"]["Enums"]["content_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          demo_seed_batch?: string | null
          demo_source_url?: string | null
          description?: string | null
          destination_id?: string
          id?: string
          is_demo_seed?: boolean
          metadata?: Json
          name?: string
          slug?: string
          status?: Database["public"]["Enums"]["content_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "destination_zones_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "destinations"
            referencedColumns: ["id"]
          },
        ]
      }
      destinations: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          demo_seed_batch: string | null
          demo_source_url: string | null
          description: string | null
          hero_media_id: string | null
          hero_palette: Database["public"]["Enums"]["hero_palette"]
          highlights: string[]
          id: string
          is_demo_seed: boolean
          latitude: number | null
          longitude: number | null
          metadata: Json
          name: string
          published_at: string | null
          slug: string
          status: Database["public"]["Enums"]["content_status"]
          tagline: string | null
          tourism_region_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          demo_seed_batch?: string | null
          demo_source_url?: string | null
          description?: string | null
          hero_media_id?: string | null
          hero_palette?: Database["public"]["Enums"]["hero_palette"]
          highlights?: string[]
          id?: string
          is_demo_seed?: boolean
          latitude?: number | null
          longitude?: number | null
          metadata?: Json
          name: string
          published_at?: string | null
          slug: string
          status?: Database["public"]["Enums"]["content_status"]
          tagline?: string | null
          tourism_region_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          demo_seed_batch?: string | null
          demo_source_url?: string | null
          description?: string | null
          hero_media_id?: string | null
          hero_palette?: Database["public"]["Enums"]["hero_palette"]
          highlights?: string[]
          id?: string
          is_demo_seed?: boolean
          latitude?: number | null
          longitude?: number | null
          metadata?: Json
          name?: string
          published_at?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["content_status"]
          tagline?: string | null
          tourism_region_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "destinations_hero_media_id_fkey"
            columns: ["hero_media_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "destinations_tourism_region_id_fkey"
            columns: ["tourism_region_id"]
            isOneToOne: false
            referencedRelation: "tourism_regions"
            referencedColumns: ["id"]
          },
        ]
      }
      eb_block_comments: {
        Row: {
          author_id: string
          block_id: string
          body: string
          composition_id: string
          created_at: string
          id: string
          resolved_at: string | null
          resolved_by: string | null
          updated_at: string
        }
        Insert: {
          author_id: string
          block_id: string
          body: string
          composition_id: string
          created_at?: string
          id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          updated_at?: string
        }
        Update: {
          author_id?: string
          block_id?: string
          body?: string
          composition_id?: string
          created_at?: string
          id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "eb_block_comments_composition_id_fkey"
            columns: ["composition_id"]
            isOneToOne: false
            referencedRelation: "page_compositions"
            referencedColumns: ["id"]
          },
        ]
      }
      editorial_routes: {
        Row: {
          body: string | null
          cover_media_id: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          destination_ids: string[]
          duration_days: number
          id: string
          locale: Database["public"]["Enums"]["locale_code"]
          name: string
          palette: Database["public"]["Enums"]["hero_palette"] | null
          published_at: string | null
          slug: string
          status: Database["public"]["Enums"]["content_status"]
          summary: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          body?: string | null
          cover_media_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          destination_ids?: string[]
          duration_days?: number
          id?: string
          locale?: Database["public"]["Enums"]["locale_code"]
          name: string
          palette?: Database["public"]["Enums"]["hero_palette"] | null
          published_at?: string | null
          slug: string
          status?: Database["public"]["Enums"]["content_status"]
          summary?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          body?: string | null
          cover_media_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          destination_ids?: string[]
          duration_days?: number
          id?: string
          locale?: Database["public"]["Enums"]["locale_code"]
          name?: string
          palette?: Database["public"]["Enums"]["hero_palette"] | null
          published_at?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["content_status"]
          summary?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "editorial_routes_cover_media_id_fkey"
            columns: ["cover_media_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      events: {
        Row: {
          body: string | null
          business_id: string | null
          cover_media_id: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          demo_seed_batch: string | null
          demo_source_url: string | null
          destination_id: string | null
          ends_at: string | null
          external_url: string | null
          id: string
          is_demo_seed: boolean
          is_free: boolean
          locale: Database["public"]["Enums"]["locale_code"]
          published_at: string | null
          slug: string
          starts_at: string
          status: Database["public"]["Enums"]["content_status"]
          summary: string | null
          title: string
          updated_at: string
          updated_by: string | null
          venue_name: string | null
        }
        Insert: {
          body?: string | null
          business_id?: string | null
          cover_media_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          demo_seed_batch?: string | null
          demo_source_url?: string | null
          destination_id?: string | null
          ends_at?: string | null
          external_url?: string | null
          id?: string
          is_demo_seed?: boolean
          is_free?: boolean
          locale?: Database["public"]["Enums"]["locale_code"]
          published_at?: string | null
          slug: string
          starts_at: string
          status?: Database["public"]["Enums"]["content_status"]
          summary?: string | null
          title: string
          updated_at?: string
          updated_by?: string | null
          venue_name?: string | null
        }
        Update: {
          body?: string | null
          business_id?: string | null
          cover_media_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          demo_seed_batch?: string | null
          demo_source_url?: string | null
          destination_id?: string | null
          ends_at?: string | null
          external_url?: string | null
          id?: string
          is_demo_seed?: boolean
          is_free?: boolean
          locale?: Database["public"]["Enums"]["locale_code"]
          published_at?: string | null
          slug?: string
          starts_at?: string
          status?: Database["public"]["Enums"]["content_status"]
          summary?: string | null
          title?: string
          updated_at?: string
          updated_by?: string | null
          venue_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_effective_visibility"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_cover_media_id_fkey"
            columns: ["cover_media_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "destinations"
            referencedColumns: ["id"]
          },
        ]
      }
      faqs: {
        Row: {
          answer: string
          category: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          entity_id: string | null
          entity_kind: Database["public"]["Enums"]["entity_kind"] | null
          id: string
          locale: Database["public"]["Enums"]["locale_code"]
          position: number
          published_at: string | null
          question: string
          status: Database["public"]["Enums"]["content_status"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          answer: string
          category?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          entity_id?: string | null
          entity_kind?: Database["public"]["Enums"]["entity_kind"] | null
          id?: string
          locale?: Database["public"]["Enums"]["locale_code"]
          position?: number
          published_at?: string | null
          question: string
          status?: Database["public"]["Enums"]["content_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          answer?: string
          category?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          entity_id?: string | null
          entity_kind?: Database["public"]["Enums"]["entity_kind"] | null
          id?: string
          locale?: Database["public"]["Enums"]["locale_code"]
          position?: number
          published_at?: string | null
          question?: string
          status?: Database["public"]["Enums"]["content_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      founder_spotlights: {
        Row: {
          boost: number
          business_id: string
          created_at: string
          created_by: string | null
          ends_at: string
          headline: string | null
          id: string
          is_active: boolean
          reason: string
          starts_at: string
          updated_at: string
        }
        Insert: {
          boost?: number
          business_id: string
          created_at?: string
          created_by?: string | null
          ends_at: string
          headline?: string | null
          id?: string
          is_active?: boolean
          reason: string
          starts_at?: string
          updated_at?: string
        }
        Update: {
          boost?: number
          business_id?: string
          created_at?: string
          created_by?: string | null
          ends_at?: string
          headline?: string | null
          id?: string
          is_active?: boolean
          reason?: string
          starts_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "founder_spotlights_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_effective_visibility"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "founder_spotlights_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          role: Database["public"]["Enums"]["app_role"]
          scope_id: string | null
          scope_type: string | null
          status: Database["public"]["Enums"]["invitation_status"]
          token: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at: string
          id?: string
          invited_by?: string | null
          role: Database["public"]["Enums"]["app_role"]
          scope_id?: string | null
          scope_type?: string | null
          status?: Database["public"]["Enums"]["invitation_status"]
          token: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          scope_id?: string | null
          scope_type?: string | null
          status?: Database["public"]["Enums"]["invitation_status"]
          token?: string
          updated_at?: string
        }
        Relationships: []
      }
      marketplace_search_metrics: {
        Row: {
          category_slug: string | null
          created_at: string
          destination_slug: string | null
          duration_ms: number
          id: string
          q: string | null
          result_count: number
          user_id: string | null
        }
        Insert: {
          category_slug?: string | null
          created_at?: string
          destination_slug?: string | null
          duration_ms?: number
          id?: string
          q?: string | null
          result_count?: number
          user_id?: string | null
        }
        Update: {
          category_slug?: string | null
          created_at?: string
          destination_slug?: string | null
          duration_ms?: number
          id?: string
          q?: string | null
          result_count?: number
          user_id?: string | null
        }
        Relationships: []
      }
      media_assets: {
        Row: {
          alt_text: string | null
          caption: string | null
          created_at: string
          created_by: string | null
          credit: string | null
          deleted_at: string | null
          deleted_by: string | null
          demo_seed_batch: string | null
          demo_source_url: string | null
          duration_seconds: number | null
          height: number | null
          id: string
          is_demo_seed: boolean
          kind: Database["public"]["Enums"]["media_kind"]
          metadata: Json
          mime_type: string | null
          size_bytes: number | null
          status: Database["public"]["Enums"]["content_status"]
          storage_bucket: string
          storage_path: string
          updated_at: string
          updated_by: string | null
          width: number | null
        }
        Insert: {
          alt_text?: string | null
          caption?: string | null
          created_at?: string
          created_by?: string | null
          credit?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          demo_seed_batch?: string | null
          demo_source_url?: string | null
          duration_seconds?: number | null
          height?: number | null
          id?: string
          is_demo_seed?: boolean
          kind: Database["public"]["Enums"]["media_kind"]
          metadata?: Json
          mime_type?: string | null
          size_bytes?: number | null
          status?: Database["public"]["Enums"]["content_status"]
          storage_bucket: string
          storage_path: string
          updated_at?: string
          updated_by?: string | null
          width?: number | null
        }
        Update: {
          alt_text?: string | null
          caption?: string | null
          created_at?: string
          created_by?: string | null
          credit?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          demo_seed_batch?: string | null
          demo_source_url?: string | null
          duration_seconds?: number | null
          height?: number | null
          id?: string
          is_demo_seed?: boolean
          kind?: Database["public"]["Enums"]["media_kind"]
          metadata?: Json
          mime_type?: string | null
          size_bytes?: number | null
          status?: Database["public"]["Enums"]["content_status"]
          storage_bucket?: string
          storage_path?: string
          updated_at?: string
          updated_by?: string | null
          width?: number | null
        }
        Relationships: []
      }
      notification_deliveries: {
        Row: {
          attempt_count: number
          audience: string
          category: Database["public"]["Enums"]["notification_category"]
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at: string
          delivered_at: string | null
          event_id: string
          event_type: string
          id: string
          last_error: string | null
          payload_ref: Json
          read_at: string | null
          recipient_user_id: string | null
          status: Database["public"]["Enums"]["notification_delivery_status"]
          updated_at: string
        }
        Insert: {
          attempt_count?: number
          audience: string
          category: Database["public"]["Enums"]["notification_category"]
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          delivered_at?: string | null
          event_id: string
          event_type: string
          id?: string
          last_error?: string | null
          payload_ref?: Json
          read_at?: string | null
          recipient_user_id?: string | null
          status?: Database["public"]["Enums"]["notification_delivery_status"]
          updated_at?: string
        }
        Update: {
          attempt_count?: number
          audience?: string
          category?: Database["public"]["Enums"]["notification_category"]
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          delivered_at?: string | null
          event_id?: string
          event_type?: string
          id?: string
          last_error?: string | null
          payload_ref?: Json
          read_at?: string | null
          recipient_user_id?: string | null
          status?: Database["public"]["Enums"]["notification_delivery_status"]
          updated_at?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          category: Database["public"]["Enums"]["notification_category"]
          channel: Database["public"]["Enums"]["notification_channel"]
          consent_at: string | null
          created_at: string
          enabled: boolean
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category: Database["public"]["Enums"]["notification_category"]
          channel: Database["public"]["Enums"]["notification_channel"]
          consent_at?: string | null
          created_at?: string
          enabled?: boolean
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: Database["public"]["Enums"]["notification_category"]
          channel?: Database["public"]["Enums"]["notification_channel"]
          consent_at?: string | null
          created_at?: string
          enabled?: boolean
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          last_seen_at: string
          p256dh: string
          revoked_at: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          last_seen_at?: string
          p256dh: string
          revoked_at?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          last_seen_at?: string
          p256dh?: string
          revoked_at?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      notification_subscriptions: {
        Row: {
          audience: string
          category: Database["public"]["Enums"]["notification_category"]
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at: string
          event_type: string
          id: string
          is_active: boolean
          sender_identity: string | null
          template_key: string | null
          updated_at: string
        }
        Insert: {
          audience: string
          category: Database["public"]["Enums"]["notification_category"]
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          event_type: string
          id?: string
          is_active?: boolean
          sender_identity?: string | null
          template_key?: string | null
          updated_at?: string
        }
        Update: {
          audience?: string
          category?: Database["public"]["Enums"]["notification_category"]
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          event_type?: string
          id?: string
          is_active?: boolean
          sender_identity?: string | null
          template_key?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      notification_webhook_endpoints: {
        Row: {
          business_id: string | null
          created_at: string
          id: string
          is_active: boolean
          label: string | null
          owner_user_id: string
          secret_current: string
          secret_previous: string | null
          updated_at: string
          url: string
        }
        Insert: {
          business_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string | null
          owner_user_id: string
          secret_current: string
          secret_previous?: string | null
          updated_at?: string
          url: string
        }
        Update: {
          business_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string | null
          owner_user_id?: string
          secret_current?: string
          secret_previous?: string | null
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_webhook_endpoints_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_effective_visibility"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "notification_webhook_endpoints_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      order_events: {
        Row: {
          actor_user_id: string | null
          created_at: string
          event_type: Database["public"]["Enums"]["order_event_type"]
          id: string
          order_id: string
          payload: Json
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          event_type: Database["public"]["Enums"]["order_event_type"]
          id?: string
          order_id: string
          payload?: Json
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          event_type?: Database["public"]["Enums"]["order_event_type"]
          id?: string
          order_id?: string
          payload?: Json
        }
        Relationships: [
          {
            foreignKeyName: "order_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          business_id: string
          created_at: string
          currency: string
          id: string
          order_id: string
          product_id: string
          quantity: number
          snapshot_name: string
          snapshot_slug: string
          unit_price: number
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          currency: string
          id?: string
          order_id: string
          product_id: string
          quantity: number
          snapshot_name: string
          snapshot_slug: string
          unit_price: number
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          currency?: string
          id?: string
          order_id?: string
          product_id?: string
          quantity?: number
          snapshot_name?: string
          snapshot_slug?: string
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_items_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_effective_visibility"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "order_items_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          cancelled_at: string | null
          client_request_id: string | null
          confirmed_at: string | null
          created_at: string
          currency: string
          id: string
          notes: string | null
          paid_at: string | null
          payment_intent_id: string | null
          payment_provider: string | null
          payment_status: string
          status: Database["public"]["Enums"]["order_status"]
          subtotal_amount: number
          total_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          cancelled_at?: string | null
          client_request_id?: string | null
          confirmed_at?: string | null
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_intent_id?: string | null
          payment_provider?: string | null
          payment_status?: string
          status?: Database["public"]["Enums"]["order_status"]
          subtotal_amount?: number
          total_amount?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          cancelled_at?: string | null
          client_request_id?: string | null
          confirmed_at?: string | null
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_intent_id?: string | null
          payment_provider?: string | null
          payment_status?: string
          status?: Database["public"]["Enums"]["order_status"]
          subtotal_amount?: number
          total_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      page_compositions: {
        Row: {
          active_revision_id: string | null
          canonical_override: string | null
          created_at: string
          created_by: string | null
          current_draft: Json
          description: string | null
          editing_lock: Json | null
          id: string
          is_template: boolean
          kind: Database["public"]["Enums"]["eb_page_kind"]
          page_type: string
          previous_slug: string | null
          published_at: string | null
          published_by: string | null
          robots_directive: string
          scheduled_publish_at: string | null
          scheduled_publish_by: string | null
          scheduled_publish_notes: string | null
          sitemap_changefreq: string | null
          sitemap_priority: number | null
          slug: string
          status: string
          template_of_kind: Database["public"]["Enums"]["eb_page_kind"] | null
          title: string
          updated_at: string
          updated_by: string | null
          variant_key: string
          workflow_notes: string | null
          workflow_state: string
          workflow_updated_at: string | null
          workflow_updated_by: string | null
        }
        Insert: {
          active_revision_id?: string | null
          canonical_override?: string | null
          created_at?: string
          created_by?: string | null
          current_draft?: Json
          description?: string | null
          editing_lock?: Json | null
          id?: string
          is_template?: boolean
          kind?: Database["public"]["Enums"]["eb_page_kind"]
          page_type?: string
          previous_slug?: string | null
          published_at?: string | null
          published_by?: string | null
          robots_directive?: string
          scheduled_publish_at?: string | null
          scheduled_publish_by?: string | null
          scheduled_publish_notes?: string | null
          sitemap_changefreq?: string | null
          sitemap_priority?: number | null
          slug: string
          status?: string
          template_of_kind?: Database["public"]["Enums"]["eb_page_kind"] | null
          title: string
          updated_at?: string
          updated_by?: string | null
          variant_key?: string
          workflow_notes?: string | null
          workflow_state?: string
          workflow_updated_at?: string | null
          workflow_updated_by?: string | null
        }
        Update: {
          active_revision_id?: string | null
          canonical_override?: string | null
          created_at?: string
          created_by?: string | null
          current_draft?: Json
          description?: string | null
          editing_lock?: Json | null
          id?: string
          is_template?: boolean
          kind?: Database["public"]["Enums"]["eb_page_kind"]
          page_type?: string
          previous_slug?: string | null
          published_at?: string | null
          published_by?: string | null
          robots_directive?: string
          scheduled_publish_at?: string | null
          scheduled_publish_by?: string | null
          scheduled_publish_notes?: string | null
          sitemap_changefreq?: string | null
          sitemap_priority?: number | null
          slug?: string
          status?: string
          template_of_kind?: Database["public"]["Enums"]["eb_page_kind"] | null
          title?: string
          updated_at?: string
          updated_by?: string | null
          variant_key?: string
          workflow_notes?: string | null
          workflow_state?: string
          workflow_updated_at?: string | null
          workflow_updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "page_compositions_active_revision_fk"
            columns: ["active_revision_id"]
            isOneToOne: false
            referencedRelation: "page_revisions"
            referencedColumns: ["id"]
          },
        ]
      }
      page_redirects: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          from_path: string
          http_status: number
          id: string
          page_composition_id: string | null
          reason: string | null
          to_path: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          from_path: string
          http_status?: number
          id?: string
          page_composition_id?: string | null
          reason?: string | null
          to_path: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          from_path?: string
          http_status?: number
          id?: string
          page_composition_id?: string | null
          reason?: string | null
          to_path?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "page_redirects_page_composition_id_fkey"
            columns: ["page_composition_id"]
            isOneToOne: false
            referencedRelation: "page_compositions"
            referencedColumns: ["id"]
          },
        ]
      }
      page_revisions: {
        Row: {
          composition_id: string
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          revision_number: number
          snapshot: Json
        }
        Insert: {
          composition_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          revision_number: number
          snapshot: Json
        }
        Update: {
          composition_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          revision_number?: number
          snapshot?: Json
        }
        Relationships: [
          {
            foreignKeyName: "page_revisions_composition_id_fkey"
            columns: ["composition_id"]
            isOneToOne: false
            referencedRelation: "page_compositions"
            referencedColumns: ["id"]
          },
        ]
      }
      pages: {
        Row: {
          blocks: Json
          body: string | null
          cover_media_id: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          id: string
          is_system: boolean
          locale: Database["public"]["Enums"]["locale_code"]
          published_at: string | null
          slug: string
          status: Database["public"]["Enums"]["content_status"]
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          blocks?: Json
          body?: string | null
          cover_media_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_system?: boolean
          locale?: Database["public"]["Enums"]["locale_code"]
          published_at?: string | null
          slug: string
          status?: Database["public"]["Enums"]["content_status"]
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          blocks?: Json
          body?: string | null
          cover_media_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_system?: boolean
          locale?: Database["public"]["Enums"]["locale_code"]
          published_at?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["content_status"]
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pages_cover_media_id_fkey"
            columns: ["cover_media_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_events: {
        Row: {
          event_type: string
          id: string
          order_id: string | null
          payload: Json
          processed_at: string | null
          provider: string
          provider_event_id: string
          received_at: string
        }
        Insert: {
          event_type: string
          id?: string
          order_id?: string | null
          payload?: Json
          processed_at?: string | null
          provider: string
          provider_event_id: string
          received_at?: string
        }
        Update: {
          event_type?: string
          id?: string
          order_id?: string | null
          payload?: Json
          processed_at?: string | null
          provider?: string
          provider_event_id?: string
          received_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          action: string
          category: string
          created_at: string
          description: string | null
          id: string
          is_dangerous: boolean
          key: string
          label: string
          resource: string
        }
        Insert: {
          action: string
          category: string
          created_at?: string
          description?: string | null
          id?: string
          is_dangerous?: boolean
          key: string
          label: string
          resource: string
        }
        Update: {
          action?: string
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_dangerous?: boolean
          key?: string
          label?: string
          resource?: string
        }
        Relationships: []
      }
      permissions_audit_log: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          id: string
          metadata: Json
          role: Database["public"]["Enums"]["app_role"] | null
          scope_id: string | null
          scope_type: string | null
          target_user_id: string | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          role?: Database["public"]["Enums"]["app_role"] | null
          scope_id?: string | null
          scope_type?: string | null
          target_user_id?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          role?: Database["public"]["Enums"]["app_role"] | null
          scope_id?: string | null
          scope_type?: string | null
          target_user_id?: string | null
        }
        Relationships: []
      }
      platform_locales: {
        Row: {
          code: string
          created_at: string
          flag: string
          is_active: boolean
          is_default: boolean
          label: string
          native_label: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          flag?: string
          is_active?: boolean
          is_default?: boolean
          label: string
          native_label: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          flag?: string
          is_active?: boolean
          is_default?: boolean
          label?: string
          native_label?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      points_of_interest: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          demo_seed_batch: string | null
          demo_source_url: string | null
          description: string | null
          destination_id: string
          destination_zone_id: string | null
          id: string
          is_demo_seed: boolean
          latitude: number | null
          longitude: number | null
          metadata: Json
          name: string
          slug: string
          status: Database["public"]["Enums"]["content_status"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          demo_seed_batch?: string | null
          demo_source_url?: string | null
          description?: string | null
          destination_id: string
          destination_zone_id?: string | null
          id?: string
          is_demo_seed?: boolean
          latitude?: number | null
          longitude?: number | null
          metadata?: Json
          name: string
          slug: string
          status?: Database["public"]["Enums"]["content_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          demo_seed_batch?: string | null
          demo_source_url?: string | null
          description?: string | null
          destination_id?: string
          destination_zone_id?: string | null
          id?: string
          is_demo_seed?: boolean
          latitude?: number | null
          longitude?: number | null
          metadata?: Json
          name?: string
          slug?: string
          status?: Database["public"]["Enums"]["content_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "points_of_interest_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "destinations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "points_of_interest_destination_zone_id_fkey"
            columns: ["destination_zone_id"]
            isOneToOne: false
            referencedRelation: "destination_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      product_media: {
        Row: {
          created_at: string
          id: string
          media_asset_id: string
          product_id: string
          role: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          media_asset_id: string
          product_id: string
          role?: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          media_asset_id?: string
          product_id?: string
          role?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_media_media_asset_id_fkey"
            columns: ["media_asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_media_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          accepts_online_payment: boolean
          business_id: string
          capacity: number | null
          conversion_mode: Database["public"]["Enums"]["product_conversion_mode"]
          cover_media_id: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          demo_seed_batch: string | null
          demo_source_url: string | null
          description: string | null
          duration_minutes: number | null
          eligible_for_ems_campaigns: boolean
          generates_commission: boolean
          id: string
          is_demo_seed: boolean
          metadata: Json
          name: string
          price_amount: number | null
          price_currency: string
          primary_action_label: string | null
          product_type: Database["public"]["Enums"]["product_type"]
          published_at: string | null
          requires_availability: boolean
          secondary_action_label: string | null
          secondary_action_mode: string | null
          slug: string
          status: Database["public"]["Enums"]["content_status"]
          tagline: string | null
          updated_at: string
          updated_by: string | null
          visibility_level: Database["public"]["Enums"]["product_visibility_level"]
        }
        Insert: {
          accepts_online_payment?: boolean
          business_id: string
          capacity?: number | null
          conversion_mode?: Database["public"]["Enums"]["product_conversion_mode"]
          cover_media_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          demo_seed_batch?: string | null
          demo_source_url?: string | null
          description?: string | null
          duration_minutes?: number | null
          eligible_for_ems_campaigns?: boolean
          generates_commission?: boolean
          id?: string
          is_demo_seed?: boolean
          metadata?: Json
          name: string
          price_amount?: number | null
          price_currency?: string
          primary_action_label?: string | null
          product_type: Database["public"]["Enums"]["product_type"]
          published_at?: string | null
          requires_availability?: boolean
          secondary_action_label?: string | null
          secondary_action_mode?: string | null
          slug: string
          status?: Database["public"]["Enums"]["content_status"]
          tagline?: string | null
          updated_at?: string
          updated_by?: string | null
          visibility_level?: Database["public"]["Enums"]["product_visibility_level"]
        }
        Update: {
          accepts_online_payment?: boolean
          business_id?: string
          capacity?: number | null
          conversion_mode?: Database["public"]["Enums"]["product_conversion_mode"]
          cover_media_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          demo_seed_batch?: string | null
          demo_source_url?: string | null
          description?: string | null
          duration_minutes?: number | null
          eligible_for_ems_campaigns?: boolean
          generates_commission?: boolean
          id?: string
          is_demo_seed?: boolean
          metadata?: Json
          name?: string
          price_amount?: number | null
          price_currency?: string
          primary_action_label?: string | null
          product_type?: Database["public"]["Enums"]["product_type"]
          published_at?: string | null
          requires_availability?: boolean
          secondary_action_label?: string | null
          secondary_action_mode?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["content_status"]
          tagline?: string | null
          updated_at?: string
          updated_by?: string | null
          visibility_level?: Database["public"]["Enums"]["product_visibility_level"]
        }
        Relationships: [
          {
            foreignKeyName: "products_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_effective_visibility"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "products_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_cover_media_id_fkey"
            columns: ["cover_media_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active_mode: Database["public"]["Enums"]["profile_mode"]
          avatar_url: string | null
          country: string | null
          created_at: string
          display_name: string | null
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          phone: string | null
          preferred_language: string
          status: string
          timezone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active_mode?: Database["public"]["Enums"]["profile_mode"]
          avatar_url?: string | null
          country?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          preferred_language?: string
          status?: string
          timezone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          active_mode?: Database["public"]["Enums"]["profile_mode"]
          avatar_url?: string | null
          country?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          preferred_language?: string
          status?: string
          timezone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      promotions: {
        Row: {
          business_id: string | null
          cover_media_id: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          discount_percent: number | null
          ends_at: string | null
          id: string
          locale: Database["public"]["Enums"]["locale_code"]
          product_id: string | null
          published_at: string | null
          slug: string
          starts_at: string | null
          status: Database["public"]["Enums"]["content_status"]
          terms: string | null
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          business_id?: string | null
          cover_media_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          discount_percent?: number | null
          ends_at?: string | null
          id?: string
          locale?: Database["public"]["Enums"]["locale_code"]
          product_id?: string | null
          published_at?: string | null
          slug: string
          starts_at?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          terms?: string | null
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          business_id?: string | null
          cover_media_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          discount_percent?: number | null
          ends_at?: string | null
          id?: string
          locale?: Database["public"]["Enums"]["locale_code"]
          product_id?: string | null
          published_at?: string | null
          slug?: string
          starts_at?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          terms?: string | null
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promotions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_effective_visibility"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "promotions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotions_cover_media_id_fkey"
            columns: ["cover_media_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      related_overrides: {
        Row: {
          created_at: string
          created_by: string | null
          demo_seed_batch: string | null
          entity_id: string
          entity_type: Database["public"]["Enums"]["related_entity_kind"]
          id: string
          is_demo_seed: boolean
          mode: Database["public"]["Enums"]["related_override_mode"]
          note: string | null
          position: number | null
          related_entity_id: string
          related_entity_type: Database["public"]["Enums"]["related_entity_kind"]
          surface: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          demo_seed_batch?: string | null
          entity_id: string
          entity_type: Database["public"]["Enums"]["related_entity_kind"]
          id?: string
          is_demo_seed?: boolean
          mode: Database["public"]["Enums"]["related_override_mode"]
          note?: string | null
          position?: number | null
          related_entity_id: string
          related_entity_type: Database["public"]["Enums"]["related_entity_kind"]
          surface: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          demo_seed_batch?: string | null
          entity_id?: string
          entity_type?: Database["public"]["Enums"]["related_entity_kind"]
          id?: string
          is_demo_seed?: boolean
          mode?: Database["public"]["Enums"]["related_override_mode"]
          note?: string | null
          position?: number | null
          related_entity_id?: string
          related_entity_type?: Database["public"]["Enums"]["related_entity_kind"]
          surface?: string
          updated_at?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          author_display_name: string | null
          author_user_id: string | null
          body: string | null
          business_response: string | null
          business_response_at: string | null
          business_response_by: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          helpful_count: number
          id: string
          language: Database["public"]["Enums"]["locale_code"]
          metadata: Json
          published_at: string | null
          rating: number
          report_count: number
          status: Database["public"]["Enums"]["content_status"]
          subject_id: string
          subject_kind: Database["public"]["Enums"]["entity_kind"]
          title: string | null
          updated_at: string
          updated_by: string | null
          verified_source: string | null
          visit_date: string | null
          visit_type: string | null
          weight: number
        }
        Insert: {
          author_display_name?: string | null
          author_user_id?: string | null
          body?: string | null
          business_response?: string | null
          business_response_at?: string | null
          business_response_by?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          helpful_count?: number
          id?: string
          language?: Database["public"]["Enums"]["locale_code"]
          metadata?: Json
          published_at?: string | null
          rating: number
          report_count?: number
          status?: Database["public"]["Enums"]["content_status"]
          subject_id: string
          subject_kind: Database["public"]["Enums"]["entity_kind"]
          title?: string | null
          updated_at?: string
          updated_by?: string | null
          verified_source?: string | null
          visit_date?: string | null
          visit_type?: string | null
          weight?: number
        }
        Update: {
          author_display_name?: string | null
          author_user_id?: string | null
          body?: string | null
          business_response?: string | null
          business_response_at?: string | null
          business_response_by?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          helpful_count?: number
          id?: string
          language?: Database["public"]["Enums"]["locale_code"]
          metadata?: Json
          published_at?: string | null
          rating?: number
          report_count?: number
          status?: Database["public"]["Enums"]["content_status"]
          subject_id?: string
          subject_kind?: Database["public"]["Enums"]["entity_kind"]
          title?: string | null
          updated_at?: string
          updated_by?: string | null
          verified_source?: string | null
          visit_date?: string | null
          visit_type?: string | null
          weight?: number
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          granted_at: string
          granted_by: string | null
          permission_id: string
          role_id: string
        }
        Insert: {
          granted_at?: string
          granted_by?: string | null
          permission_id: string
          role_id: string
        }
        Update: {
          granted_at?: string
          granted_by?: string | null
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      roles_catalog: {
        Row: {
          color: string
          created_at: string
          created_by: string | null
          description: string | null
          icon: string | null
          id: string
          is_system: boolean
          name: string
          slug: string
          sort_order: number
          system_role: Database["public"]["Enums"]["app_role"] | null
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_system?: boolean
          name: string
          slug: string
          sort_order?: number
          system_role?: Database["public"]["Enums"]["app_role"] | null
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_system?: boolean
          name?: string
          slug?: string
          sort_order?: number
          system_role?: Database["public"]["Enums"]["app_role"] | null
          updated_at?: string
        }
        Relationships: []
      }
      seo_metadata: {
        Row: {
          canonical_url: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          entity_id: string
          entity_kind: Database["public"]["Enums"]["entity_kind"]
          id: string
          json_ld: Json | null
          locale: Database["public"]["Enums"]["locale_code"]
          meta_description: string | null
          meta_title: string | null
          noindex: boolean
          og_description: string | null
          og_image_media_id: string | null
          og_image_url: string | null
          og_title: string | null
          slug: string | null
          twitter_card: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          canonical_url?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          entity_id: string
          entity_kind: Database["public"]["Enums"]["entity_kind"]
          id?: string
          json_ld?: Json | null
          locale?: Database["public"]["Enums"]["locale_code"]
          meta_description?: string | null
          meta_title?: string | null
          noindex?: boolean
          og_description?: string | null
          og_image_media_id?: string | null
          og_image_url?: string | null
          og_title?: string | null
          slug?: string | null
          twitter_card?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          canonical_url?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          entity_id?: string
          entity_kind?: Database["public"]["Enums"]["entity_kind"]
          id?: string
          json_ld?: Json | null
          locale?: Database["public"]["Enums"]["locale_code"]
          meta_description?: string | null
          meta_title?: string | null
          noindex?: boolean
          og_description?: string | null
          og_image_media_id?: string | null
          og_image_url?: string | null
          og_title?: string | null
          slug?: string | null
          twitter_card?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seo_metadata_og_image_media_id_fkey"
            columns: ["og_image_media_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      states: {
        Row: {
          country_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          id: string
          iso_code: string | null
          metadata: Json
          name: string
          slug: string
          status: Database["public"]["Enums"]["content_status"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          country_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          iso_code?: string | null
          metadata?: Json
          name: string
          slug: string
          status?: Database["public"]["Enums"]["content_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          country_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          iso_code?: string | null
          metadata?: Json
          name?: string
          slug?: string
          status?: Database["public"]["Enums"]["content_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "states_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      system_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          created_at: string
          first_seen_at: string
          id: string
          kind: string
          last_seen_at: string
          message: string
          occurrences: number
          payload: Json
          resolved_at: string | null
          resolved_by: string | null
          severity: Database["public"]["Enums"]["system_alert_severity"]
          status: Database["public"]["Enums"]["system_alert_status"]
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          created_at?: string
          first_seen_at?: string
          id?: string
          kind: string
          last_seen_at?: string
          message: string
          occurrences?: number
          payload?: Json
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: Database["public"]["Enums"]["system_alert_severity"]
          status?: Database["public"]["Enums"]["system_alert_status"]
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          created_at?: string
          first_seen_at?: string
          id?: string
          kind?: string
          last_seen_at?: string
          message?: string
          occurrences?: number
          payload?: Json
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: Database["public"]["Enums"]["system_alert_severity"]
          status?: Database["public"]["Enums"]["system_alert_status"]
        }
        Relationships: []
      }
      tourism_regions: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          hero_media_id: string | null
          id: string
          metadata: Json
          name: string
          slug: string
          state_id: string
          status: Database["public"]["Enums"]["content_status"]
          tagline: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          hero_media_id?: string | null
          id?: string
          metadata?: Json
          name: string
          slug: string
          state_id: string
          status?: Database["public"]["Enums"]["content_status"]
          tagline?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          hero_media_id?: string | null
          id?: string
          metadata?: Json
          name?: string
          slug?: string
          state_id?: string
          status?: Database["public"]["Enums"]["content_status"]
          tagline?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tourism_regions_hero_media_id_fkey"
            columns: ["hero_media_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tourism_regions_state_id_fkey"
            columns: ["state_id"]
            isOneToOne: false
            referencedRelation: "states"
            referencedColumns: ["id"]
          },
        ]
      }
      translations: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          entity_id: string
          entity_kind: Database["public"]["Enums"]["entity_kind"]
          field: string
          id: string
          locale: Database["public"]["Enums"]["locale_code"]
          status: Database["public"]["Enums"]["content_status"]
          updated_at: string
          updated_by: string | null
          value: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          entity_id: string
          entity_kind: Database["public"]["Enums"]["entity_kind"]
          field: string
          id?: string
          locale: Database["public"]["Enums"]["locale_code"]
          status?: Database["public"]["Enums"]["content_status"]
          updated_at?: string
          updated_by?: string | null
          value: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          entity_id?: string
          entity_kind?: Database["public"]["Enums"]["entity_kind"]
          field?: string
          id?: string
          locale?: Database["public"]["Enums"]["locale_code"]
          status?: Database["public"]["Enums"]["content_status"]
          updated_at?: string
          updated_by?: string | null
          value?: string
        }
        Relationships: []
      }
      travel_plan_items: {
        Row: {
          created_at: string
          day_index: number | null
          id: string
          item_kind: Database["public"]["Enums"]["travel_item_kind"]
          notes: string | null
          plan_id: string
          position: number
          snapshot: Json
          target_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_index?: number | null
          id?: string
          item_kind: Database["public"]["Enums"]["travel_item_kind"]
          notes?: string | null
          plan_id: string
          position?: number
          snapshot?: Json
          target_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_index?: number | null
          id?: string
          item_kind?: Database["public"]["Enums"]["travel_item_kind"]
          notes?: string | null
          plan_id?: string
          position?: number
          snapshot?: Json
          target_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "travel_plan_items_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "travel_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      travel_plans: {
        Row: {
          archived_at: string | null
          case_id: string | null
          cover_image_url: string | null
          created_at: string
          end_date: string | null
          id: string
          meta: Json
          notes: string | null
          party_size: number | null
          share_token: string | null
          shared_at: string | null
          source: Database["public"]["Enums"]["travel_plan_source"]
          start_date: string | null
          status: Database["public"]["Enums"]["travel_plan_status"]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          case_id?: string | null
          cover_image_url?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          meta?: Json
          notes?: string | null
          party_size?: number | null
          share_token?: string | null
          shared_at?: string | null
          source?: Database["public"]["Enums"]["travel_plan_source"]
          start_date?: string | null
          status?: Database["public"]["Enums"]["travel_plan_status"]
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          archived_at?: string | null
          case_id?: string | null
          cover_image_url?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          meta?: Json
          notes?: string | null
          party_size?: number | null
          share_token?: string | null
          shared_at?: string | null
          source?: Database["public"]["Enums"]["travel_plan_source"]
          start_date?: string | null
          status?: Database["public"]["Enums"]["travel_plan_status"]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "travel_plans_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "concierge_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      traveler_coupons: {
        Row: {
          business_id: string | null
          code: string
          created_at: string
          discount_percent: number | null
          id: string
          promotion_id: string | null
          promotion_slug: string
          qr_token: string
          redeemed_at: string | null
          redeemed_by: string | null
          redeemed_channel:
            | Database["public"]["Enums"]["traveler_coupon_channel"]
            | null
          review_reminder_1_sent_at: string | null
          review_reminder_2_sent_at: string | null
          status: Database["public"]["Enums"]["traveler_coupon_status"]
          terms: string | null
          title: string
          updated_at: string
          user_id: string
          valid_until: string
        }
        Insert: {
          business_id?: string | null
          code: string
          created_at?: string
          discount_percent?: number | null
          id?: string
          promotion_id?: string | null
          promotion_slug: string
          qr_token?: string
          redeemed_at?: string | null
          redeemed_by?: string | null
          redeemed_channel?:
            | Database["public"]["Enums"]["traveler_coupon_channel"]
            | null
          review_reminder_1_sent_at?: string | null
          review_reminder_2_sent_at?: string | null
          status?: Database["public"]["Enums"]["traveler_coupon_status"]
          terms?: string | null
          title: string
          updated_at?: string
          user_id: string
          valid_until: string
        }
        Update: {
          business_id?: string | null
          code?: string
          created_at?: string
          discount_percent?: number | null
          id?: string
          promotion_id?: string | null
          promotion_slug?: string
          qr_token?: string
          redeemed_at?: string | null
          redeemed_by?: string | null
          redeemed_channel?:
            | Database["public"]["Enums"]["traveler_coupon_channel"]
            | null
          review_reminder_1_sent_at?: string | null
          review_reminder_2_sent_at?: string | null
          status?: Database["public"]["Enums"]["traveler_coupon_status"]
          terms?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          valid_until?: string
        }
        Relationships: []
      }
      traveler_favorites: {
        Row: {
          created_at: string
          entity_id: string
          entity_kind: Database["public"]["Enums"]["favorite_entity_kind"]
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_kind: Database["public"]["Enums"]["favorite_entity_kind"]
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_kind?: Database["public"]["Enums"]["favorite_entity_kind"]
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      traveler_profiles: {
        Row: {
          accessibility: string[]
          accessibility_needs: string | null
          avatar_url: string | null
          budget_band: string | null
          budget_range: string | null
          consent_personalize: boolean
          consent_share_alux: boolean
          created_at: string
          dietary: string[]
          dietary_restrictions: string | null
          home_country: string | null
          id: string
          interests: Json
          is_public: boolean
          languages: string[]
          preferred_destinations: Json
          preferred_language: string | null
          public_bio: string | null
          public_display_name: string | null
          public_handle: string | null
          signals: Json
          travel_party: Json
          travel_style: string | null
          travel_style_tags: string[]
          trip_context: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          accessibility?: string[]
          accessibility_needs?: string | null
          avatar_url?: string | null
          budget_band?: string | null
          budget_range?: string | null
          consent_personalize?: boolean
          consent_share_alux?: boolean
          created_at?: string
          dietary?: string[]
          dietary_restrictions?: string | null
          home_country?: string | null
          id?: string
          interests?: Json
          is_public?: boolean
          languages?: string[]
          preferred_destinations?: Json
          preferred_language?: string | null
          public_bio?: string | null
          public_display_name?: string | null
          public_handle?: string | null
          signals?: Json
          travel_party?: Json
          travel_style?: string | null
          travel_style_tags?: string[]
          trip_context?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          accessibility?: string[]
          accessibility_needs?: string | null
          avatar_url?: string | null
          budget_band?: string | null
          budget_range?: string | null
          consent_personalize?: boolean
          consent_share_alux?: boolean
          created_at?: string
          dietary?: string[]
          dietary_restrictions?: string | null
          home_country?: string | null
          id?: string
          interests?: Json
          is_public?: boolean
          languages?: string[]
          preferred_destinations?: Json
          preferred_language?: string | null
          public_bio?: string | null
          public_display_name?: string | null
          public_handle?: string | null
          signals?: Json
          travel_party?: Json
          travel_style?: string | null
          travel_style_tags?: string[]
          trip_context?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ui_translation_cache: {
        Row: {
          created_at: string
          locale: string
          source_hash: string
          source_text: string
          target_text: string
        }
        Insert: {
          created_at?: string
          locale: string
          source_hash: string
          source_text: string
          target_text: string
        }
        Update: {
          created_at?: string
          locale?: string
          source_hash?: string
          source_text?: string
          target_text?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          role_id: string | null
          scope_id: string | null
          scope_type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          role_id?: string | null
          scope_id?: string | null
          scope_type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          role_id?: string | null
          scope_id?: string | null
          scope_type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      user_zone_scopes: {
        Row: {
          created_at: string
          granted_by: string | null
          id: string
          notes: string | null
          role: Database["public"]["Enums"]["app_role"]
          scope_id: string
          scope_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          granted_by?: string | null
          id?: string
          notes?: string | null
          role: Database["public"]["Enums"]["app_role"]
          scope_id: string
          scope_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          granted_by?: string | null
          id?: string
          notes?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          scope_id?: string
          scope_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      visibility_plans: {
        Row: {
          badge_variant: string
          base_price_mxn: number
          color_token: string
          commercial_rules: Json
          created_at: string
          cycles: Json
          description_long: string | null
          description_short: string | null
          display_order: number
          id: string
          is_active: boolean
          is_public: boolean
          limits: Json
          name: string
          reporting: Json
          slug: string
          updated_at: string
          updated_by: string | null
          visibility_levers: Json
        }
        Insert: {
          badge_variant?: string
          base_price_mxn?: number
          color_token?: string
          commercial_rules?: Json
          created_at?: string
          cycles?: Json
          description_long?: string | null
          description_short?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          is_public?: boolean
          limits?: Json
          name: string
          reporting?: Json
          slug: string
          updated_at?: string
          updated_by?: string | null
          visibility_levers?: Json
        }
        Update: {
          badge_variant?: string
          base_price_mxn?: number
          color_token?: string
          commercial_rules?: Json
          created_at?: string
          cycles?: Json
          description_long?: string | null
          description_short?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          is_public?: boolean
          limits?: Json
          name?: string
          reporting?: Json
          slug?: string
          updated_at?: string
          updated_by?: string | null
          visibility_levers?: Json
        }
        Relationships: []
      }
    }
    Views: {
      active_founder_spotlights: {
        Row: {
          boost: number | null
          business_id: string | null
          ends_at: string | null
          headline: string | null
          starts_at: string | null
        }
        Insert: {
          boost?: number | null
          business_id?: string | null
          ends_at?: string | null
          headline?: string | null
          starts_at?: string | null
        }
        Update: {
          boost?: number | null
          business_id?: string | null
          ends_at?: string | null
          headline?: string | null
          starts_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "founder_spotlights_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_effective_visibility"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "founder_spotlights_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_effective_visibility: {
        Row: {
          badge_variant: string | null
          base_price_mxn: number | null
          business_id: string | null
          business_slug: string | null
          color_token: string | null
          cycle: string | null
          expires_at: string | null
          grant_id: string | null
          is_default: boolean | null
          levers: Json | null
          limits: Json | null
          plan_id: string | null
          plan_name: string | null
          plan_slug: string | null
          starts_at: string | null
        }
        Relationships: []
      }
      demo_seed_inventory: {
        Row: {
          demo_seed_batch: string | null
          entity: string | null
          total: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      _concierge_first_response_at: {
        Args: { _case_id: string }
        Returns: string
      }
      _concierge_proposal_publish_to_traveler: {
        Args: {
          _case_id: string
          _category: Database["public"]["Enums"]["notification_category"]
          _email_template?: string
          _event_id: string
          _event_type: string
          _payload: Json
        }
        Returns: undefined
      }
      _concierge_publish_case_created: {
        Args: { _case_id: string; _source: string; _traveler: string }
        Returns: undefined
      }
      _concierge_publish_request_created: {
        Args: { _case_id: string; _request_id: string }
        Returns: undefined
      }
      _concierge_quote_publish_to_business: {
        Args: {
          _business_id: string
          _category: Database["public"]["Enums"]["notification_category"]
          _email_template?: string
          _event_id: string
          _event_type: string
          _payload: Json
        }
        Returns: undefined
      }
      _concierge_quote_publish_to_case_staff: {
        Args: {
          _case_id: string
          _category: Database["public"]["Enums"]["notification_category"]
          _email_template?: string
          _event_id: string
          _event_type: string
          _payload: Json
        }
        Returns: undefined
      }
      _concierge_sla_status: {
        Args: {
          _created_at: string
          _first_response_at: string
          _target_response_at: string
        }
        Returns: string
      }
      _concierge_target_for_priority: {
        Args: { _priority: string }
        Returns: string
      }
      _order_recompute_totals: {
        Args: { p_order_id: string }
        Returns: undefined
      }
      accept_business_invitation: { Args: { _token: string }; Returns: Json }
      accept_business_ownership_transfer: {
        Args: { _transfer_id: string }
        Returns: Json
      }
      admin_acknowledge_system_alert: {
        Args: { p_id: string }
        Returns: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          created_at: string
          first_seen_at: string
          id: string
          kind: string
          last_seen_at: string
          message: string
          occurrences: number
          payload: Json
          resolved_at: string | null
          resolved_by: string | null
          severity: Database["public"]["Enums"]["system_alert_severity"]
          status: Database["public"]["Enums"]["system_alert_status"]
        }
        SetofOptions: {
          from: "*"
          to: "system_alerts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_assign_custom_role: {
        Args: { _role_id: string; _target_user_id: string }
        Returns: undefined
      }
      admin_assign_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _target_user_id: string
        }
        Returns: undefined
      }
      admin_evaluate_functional_alerts: {
        Args: { p_window_minutes?: number }
        Returns: Json
      }
      admin_list_system_alerts: {
        Args: { p_limit?: number; p_status?: string }
        Returns: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          created_at: string
          first_seen_at: string
          id: string
          kind: string
          last_seen_at: string
          message: string
          occurrences: number
          payload: Json
          resolved_at: string | null
          resolved_by: string | null
          severity: Database["public"]["Enums"]["system_alert_severity"]
          status: Database["public"]["Enums"]["system_alert_status"]
        }[]
        SetofOptions: {
          from: "*"
          to: "system_alerts"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      admin_list_users_with_roles: {
        Args: never
        Returns: {
          created_at: string
          custom_roles: Json
          display_name: string
          email: string
          last_sign_in_at: string
          roles: Database["public"]["Enums"]["app_role"][]
          user_id: string
        }[]
      }
      admin_marketplace_funnel: { Args: { p_days?: number }; Returns: Json }
      admin_resolve_system_alert: {
        Args: { p_id: string }
        Returns: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          created_at: string
          first_seen_at: string
          id: string
          kind: string
          last_seen_at: string
          message: string
          occurrences: number
          payload: Json
          resolved_at: string | null
          resolved_by: string | null
          severity: Database["public"]["Enums"]["system_alert_severity"]
          status: Database["public"]["Enums"]["system_alert_status"]
        }
        SetofOptions: {
          from: "*"
          to: "system_alerts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_revoke_custom_role: {
        Args: { _role_id: string; _target_user_id: string }
        Returns: undefined
      }
      admin_revoke_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _target_user_id: string
        }
        Returns: undefined
      }
      admin_search_metrics_summary: { Args: { p_days?: number }; Returns: Json }
      admin_top_products: {
        Args: { p_days?: number; p_kind?: string; p_limit?: number }
        Returns: {
          business_name: string
          metric: number
          product_id: string
          product_name: string
          product_slug: string
        }[]
      }
      alux_traveler_log_suggestion: {
        Args: { _capability: string; _meta: Json; _plan_id: string }
        Returns: string
      }
      approve_business_registration: {
        Args: { _approve: boolean; _business_id: string; _notes?: string }
        Returns: undefined
      }
      approve_ownership_claim: {
        Args: { _approve: boolean; _notes?: string; _transfer_id: string }
        Returns: undefined
      }
      archive_business_product: {
        Args: { _product_id: string }
        Returns: undefined
      }
      archive_business_promotion: {
        Args: { _promotion_id: string }
        Returns: undefined
      }
      assign_zone_scope: {
        Args: {
          _notes?: string
          _role: Database["public"]["Enums"]["app_role"]
          _scope_id: string
          _scope_type: string
          _user_id: string
        }
        Returns: string
      }
      cancel_business_ownership_transfer: {
        Args: { _transfer_id: string }
        Returns: undefined
      }
      cart_add_item: {
        Args: {
          p_client_request_id?: string
          p_product_id: string
          p_quantity?: number
        }
        Returns: string
      }
      cart_ensure: { Args: never; Returns: string }
      cart_remove_item: { Args: { p_item_id: string }; Returns: undefined }
      cart_update_qty: {
        Args: { p_item_id: string; p_quantity: number }
        Returns: undefined
      }
      cc_accept_proposal: { Args: { _proposal_id: string }; Returns: Json }
      cc_case_assign: {
        Args: { _case_id: string; _concierge_user_id: string; _reason?: string }
        Returns: string
      }
      cc_case_create_from_plan: {
        Args: { _items?: Json; _summary: string; _travel_plan_id?: string }
        Returns: string
      }
      cc_case_evaluate: {
        Args: {
          _case_id: string
          _comment?: string
          _nps?: number
          _payload?: Json
          _rating: number
        }
        Returns: string
      }
      cc_case_set_status: {
        Args: { _case_id: string; _reason?: string; _status: string }
        Returns: undefined
      }
      cc_create_proposal: {
        Args: {
          _case_id: string
          _items: Json
          _summary?: string
          _supersedes_proposal_id?: string
          _terms?: string
          _valid_until?: string
        }
        Returns: string
      }
      cc_quote_request: {
        Args: {
          _business_id: string
          _request_id: string
          _valid_for_hours?: number
        }
        Returns: string
      }
      cc_quote_submit: {
        Args: {
          _currency?: string
          _notes?: string
          _payload?: Json
          _quote_id: string
          _terms?: string
          _total_amount_cents: number
        }
        Returns: undefined
      }
      cc_reject_proposal: {
        Args: { _proposal_id: string; _reason?: string }
        Returns: undefined
      }
      cc_send_proposal: { Args: { _proposal_id: string }; Returns: undefined }
      cc_timeline_append: {
        Args: {
          _case_id: string
          _event_type: string
          _payload?: Json
          _severity?: string
          _summary?: string
        }
        Returns: string
      }
      check_traveler_handle_available: {
        Args: { _handle: string }
        Returns: Json
      }
      claim_business: {
        Args: { _business_id: string; _notes?: string }
        Returns: string
      }
      concierge_alux_context_for_case: {
        Args: { _case_id: string }
        Returns: Json
      }
      concierge_alux_log_suggestion: {
        Args: { _capability: string; _case_id: string; _meta?: Json }
        Returns: string
      }
      concierge_assert_can_create_for: {
        Args: { _traveler: string }
        Returns: undefined
      }
      concierge_assignments_list_for_case: {
        Args: { _case_id: string }
        Returns: Json[]
      }
      concierge_can_view_case: {
        Args: { _case_id: string; _user_id: string }
        Returns: boolean
      }
      concierge_case_assign: {
        Args: { _case_id: string; _concierge_user_id: string; _reason?: string }
        Returns: string
      }
      concierge_case_create: {
        Args: { _source?: string; _summary?: string; _traveler_user_id: string }
        Returns: string
      }
      concierge_case_file_v1: { Args: { _case_id: string }; Returns: Json }
      concierge_case_from_marketplace_product: {
        Args: {
          _notes?: string
          _product_id: string
          _summary: string
          _traveler_user_id: string
        }
        Returns: string
      }
      concierge_case_from_travel_plan: {
        Args: {
          _items?: Json
          _summary: string
          _travel_plan_id?: string
          _traveler_user_id: string
        }
        Returns: string
      }
      concierge_case_get: { Args: { _case_id: string }; Returns: Json }
      concierge_case_list_for_role: {
        Args: {
          _assigned_concierge_user_id?: string
          _limit?: number
          _min_idle_minutes?: number
          _priority?: string[]
          _scope?: string
          _sla_status?: string[]
          _sort?: string
        }
        Returns: Json[]
      }
      concierge_case_proposals_list: {
        Args: { _case_id: string }
        Returns: Json[]
      }
      concierge_case_quotes_list: {
        Args: { _case_id: string }
        Returns: Json[]
      }
      concierge_case_reassign: {
        Args: {
          _case_id: string
          _new_concierge_user_id: string
          _reason?: string
        }
        Returns: string
      }
      concierge_case_release: {
        Args: { _case_id: string; _reason?: string }
        Returns: undefined
      }
      concierge_case_set_priority: {
        Args: {
          _case_id: string
          _priority: string
          _reason?: string
          _source?: string
        }
        Returns: undefined
      }
      concierge_case_set_status: {
        Args: { _case_id: string; _next_status: string; _reason?: string }
        Returns: undefined
      }
      concierge_case_set_target_response: {
        Args: {
          _case_id: string
          _reason?: string
          _target_response_at: string
        }
        Returns: undefined
      }
      concierge_case_timeline_append: {
        Args: {
          _case_id: string
          _event_type: string
          _payload?: Json
          _severity: string
          _summary: string
        }
        Returns: string
      }
      concierge_case_touch_activity: {
        Args: { _case_id: string }
        Returns: undefined
      }
      concierge_is_internal: { Args: { _user_id: string }; Returns: boolean }
      concierge_my_workload: { Args: never; Returns: Json }
      concierge_proposal_accept: {
        Args: { _proposal_id: string }
        Returns: Json
      }
      concierge_proposal_create: {
        Args: {
          _case_id: string
          _items: Json
          _summary?: string
          _supersedes_proposal_id?: string
          _terms?: string
          _valid_until?: string
        }
        Returns: string
      }
      concierge_proposal_expire_due: { Args: never; Returns: number }
      concierge_proposal_get: { Args: { _proposal_id: string }; Returns: Json }
      concierge_proposal_reject: {
        Args: { _proposal_id: string; _reason?: string }
        Returns: undefined
      }
      concierge_proposal_send: {
        Args: { _proposal_id: string }
        Returns: undefined
      }
      concierge_proposal_supersede: {
        Args: {
          _new_items: Json
          _proposal_id: string
          _summary?: string
          _terms?: string
          _valid_until?: string
        }
        Returns: string
      }
      concierge_proposal_view: {
        Args: { _proposal_id: string }
        Returns: undefined
      }
      concierge_proposal_withdraw: {
        Args: { _proposal_id: string; _reason?: string }
        Returns: undefined
      }
      concierge_quote_expire_due: { Args: never; Returns: number }
      concierge_quote_request: {
        Args: {
          _business_id: string
          _request_id: string
          _valid_for_hours?: number
        }
        Returns: string
      }
      concierge_quote_submit: {
        Args: {
          _currency?: string
          _notes?: string
          _payload?: Json
          _quote_id: string
          _terms?: string
          _total_amount_cents: number
        }
        Returns: undefined
      }
      concierge_quote_withdraw: {
        Args: { _quote_id: string; _reason?: string }
        Returns: undefined
      }
      concierge_quotes_list_for_business: {
        Args: { _business_id: string; _limit?: number; _scope?: string }
        Returns: Json[]
      }
      concierge_workload_for_lead: { Args: never; Returns: Json[] }
      create_business_product: {
        Args: {
          _business_id: string
          _capacity?: number
          _description?: string
          _duration_minutes?: number
          _name: string
          _price_amount?: number
          _price_currency?: string
          _product_type: Database["public"]["Enums"]["product_type"]
          _slug: string
          _tagline?: string
        }
        Returns: string
      }
      create_business_product_faq: {
        Args: {
          _answer: string
          _position?: number
          _product_id: string
          _publish?: boolean
          _question: string
        }
        Returns: string
      }
      create_business_promotion: {
        Args: {
          _business_id: string
          _description?: string
          _discount_percent?: number
          _ends_at?: string
          _product_id?: string
          _slug: string
          _starts_at?: string
          _terms?: string
          _title: string
        }
        Returns: string
      }
      create_owned_business:
        | {
            Args: {
              _description?: string
              _destination_id: string
              _display_name: string
              _primary_category_id?: string
              _tagline?: string
            }
            Returns: string
          }
        | {
            Args: {
              _address_line1?: string
              _address_line2?: string
              _description?: string
              _destination_id: string
              _display_name: string
              _email?: string
              _phone?: string
              _postal_code?: string
              _primary_category_id?: string
              _tagline?: string
              _verification_document_url?: string
              _website?: string
              _whatsapp?: string
            }
            Returns: string
          }
      delete_business_product_faq: {
        Args: { _faq_id: string }
        Returns: undefined
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      eb_acquire_edit_lock: {
        Args: { _composition_id: string; _force?: boolean }
        Returns: Json
      }
      eb_archive_composition: { Args: { _id: string }; Returns: undefined }
      eb_cache_invalidate: {
        Args: { _page_id: string; _reason?: string }
        Returns: number
      }
      eb_cancel_scheduled_publish: {
        Args: { _id: string; _notes?: string }
        Returns: undefined
      }
      eb_comment_create: {
        Args: { _block_id: string; _body: string; _composition_id: string }
        Returns: string
      }
      eb_comment_reopen: { Args: { _comment_id: string }; Returns: undefined }
      eb_comment_resolve: { Args: { _comment_id: string }; Returns: undefined }
      eb_create_composition: {
        Args: {
          _description?: string
          _page_type?: string
          _slug: string
          _title: string
        }
        Returns: string
      }
      eb_create_revision: {
        Args: { _id: string; _notes?: string }
        Returns: string
      }
      eb_delete_composition: { Args: { _id: string }; Returns: undefined }
      eb_deprecate_block: {
        Args: { _reason?: string; _type: string }
        Returns: undefined
      }
      eb_duplicate_composition: {
        Args: { _id: string; _new_slug: string; _new_title?: string }
        Returns: string
      }
      eb_get_published_by_slug: {
        Args: { _slug: string; _variant_key?: string }
        Returns: {
          description: string
          id: string
          page_type: string
          published_at: string
          revision_id: string
          revision_number: number
          slug: string
          snapshot: Json
          title: string
          variant_key: string
        }[]
      }
      eb_get_published_home: {
        Args: { _variant_key?: string }
        Returns: {
          description: string
          id: string
          page_type: string
          published_at: string
          revision_id: string
          revision_number: number
          slug: string
          snapshot: Json
          title: string
          variant_key: string
        }[]
      }
      eb_heartbeat_edit_lock: {
        Args: { _composition_id: string }
        Returns: Json
      }
      eb_list_block_library: {
        Args: never
        Returns: {
          capabilities: Json
          category: Database["public"]["Enums"]["block_category"]
          constraints: Json
          current_version: string
          data_sources: Json
          description: string
          display_name: string
          i18n: Json
          id: string
          is_deprecated: boolean
          responsive: Json
          type: string
          updated_at: string
        }[]
      }
      eb_lock_is_active: { Args: { lock: Json }; Returns: boolean }
      eb_mark_composition_as_template: {
        Args: {
          _id: string
          _is_template: boolean
          _template_of_kind?: Database["public"]["Enums"]["eb_page_kind"]
        }
        Returns: undefined
      }
      eb_process_scheduled_publishes: {
        Args: never
        Returns: {
          composition_id: string
          revision_id: string
        }[]
      }
      eb_publish_composition: {
        Args: { _id: string; _notes?: string }
        Returns: string
      }
      eb_r2_authz: {
        Args: { _id: string; _need_delete?: boolean }
        Returns: undefined
      }
      eb_register_block: {
        Args: {
          _capabilities?: Json
          _category: Database["public"]["Enums"]["block_category"]
          _constraints?: Json
          _data_sources?: Json
          _description: string
          _display_name: string
          _i18n?: Json
          _responsive?: Json
          _schema: Json
          _type: string
          _version: string
        }
        Returns: string
      }
      eb_release_edit_lock: { Args: { _composition_id: string }; Returns: Json }
      eb_rename_composition: {
        Args: { _id: string; _new_title: string }
        Returns: undefined
      }
      eb_resolve_public_route: {
        Args: { _path: string }
        Returns: {
          composition_id: string
          http_status: number
          is_redirect: boolean
          resolved_kind: string
          target_path: string
        }[]
      }
      eb_restore_revision: {
        Args: { _id: string; _revision_id: string }
        Returns: undefined
      }
      eb_save_composition_draft: {
        Args: { _id: string; _tree: Json }
        Returns: undefined
      }
      eb_schedule_publish_composition: {
        Args: { _id: string; _notes?: string; _when: string }
        Returns: undefined
      }
      eb_set_workflow_state: {
        Args: { _composition_id: string; _next_state: string; _notes?: string }
        Returns: Json
      }
      eb_unarchive_composition: { Args: { _id: string }; Returns: undefined }
      eb_unpublish_composition: {
        Args: { _id: string; _notes?: string }
        Returns: undefined
      }
      eb_update_composition_slug: {
        Args: { _id: string; _new_slug: string }
        Returns: undefined
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      expire_stale_coupons: { Args: never; Returns: undefined }
      expire_visibility_grants: { Args: never; Returns: number }
      founder_dashboard_kpis: { Args: never; Returns: Json }
      get_available_modes: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["profile_mode"][]
      }
      get_business_active_plan: {
        Args: { _business_id: string }
        Returns: {
          badge_variant: string
          base_price_mxn: number
          color_token: string
          cycle: string
          expires_at: string
          grant_id: string
          is_default: boolean
          levers: Json
          limits: Json
          plan_id: string
          plan_name: string
          plan_slug: string
          starts_at: string
        }[]
      }
      get_business_presence_report: {
        Args: { _business_id: string; _window_days?: number }
        Returns: {
          countries: Json
          series: Json
          top_sources: Json
          total_alux: number
          total_impressions: number
          total_map: number
          total_phone: number
          total_share: number
          total_web: number
          total_whatsapp: number
        }[]
      }
      get_coupons_needing_review_reminder: {
        Args: { hours_max: number; hours_min: number; reminder_number: number }
        Returns: {
          business_id: string
          business_name: string
          business_slug: string
          coupon_code: string
          coupon_id: string
          discount_percent: number
          promotion_title: string
          recipient_email: string
          redeemed_at: string
          traveler_first_name: string
          user_id: string
        }[]
      }
      get_public_traveler_profile: { Args: { _handle: string }; Returns: Json }
      get_review_stats: {
        Args: { _subject_id: string; _subject_kind: string }
        Returns: Json
      }
      get_visibility_notification_recipient: {
        Args: { _business_id: string }
        Returns: {
          business_name: string
          business_slug: string
          recipient_email: string
          recipient_name: string
        }[]
      }
      has_any_permission: {
        Args: { _keys: string[]; _user_id: string }
        Returns: boolean
      }
      has_business_access: {
        Args: {
          _business_id: string
          _min_role?: Database["public"]["Enums"]["business_user_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_permission: {
        Args: { _permission_key: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_zone_scope: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _scope_id: string
          _scope_type: string
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_concierge: { Args: { _user_id: string }; Returns: boolean }
      is_concierge_assigned: {
        Args: { _request_id: string; _user_id: string }
        Returns: boolean
      }
      is_editor_or_admin: { Args: { _user_id: string }; Returns: boolean }
      is_reserved_traveler_handle: {
        Args: { _handle: string }
        Returns: boolean
      }
      list_pending_business_requests: {
        Args: never
        Returns: {
          business_id: string
          business_name: string
          created_at: string
          destination_id: string
          kind: string
          notes: string
          ref_id: string
          requester_email: string
          requester_id: string
          requester_name: string
        }[]
      }
      list_visibility_grants_expiring: {
        Args: { _reminder: number }
        Returns: {
          business_id: string
          business_name: string
          business_slug: string
          expires_at: string
          grant_id: string
          plan_name: string
          recipient_email: string
          recipient_name: string
        }[]
      }
      list_visibility_grants_recently_expired: {
        Args: never
        Returns: {
          business_id: string
          business_name: string
          business_slug: string
          expires_at: string
          grant_id: string
          plan_name: string
          recipient_email: string
          recipient_name: string
        }[]
      }
      log_business_presence_audit: {
        Args: { _action: string; _business_id: string; _notes?: string }
        Returns: undefined
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      order_cancel: { Args: { p_order_id: string }; Returns: undefined }
      order_confirm: {
        Args: { p_client_request_id?: string; p_notes?: string }
        Returns: string
      }
      order_mark_paid: {
        Args: {
          p_event_id: string
          p_intent_id: string
          p_order_id: string
          p_provider: string
        }
        Returns: {
          cancelled_at: string | null
          client_request_id: string | null
          confirmed_at: string | null
          created_at: string
          currency: string
          id: string
          notes: string | null
          paid_at: string | null
          payment_intent_id: string | null
          payment_provider: string | null
          payment_status: string
          status: Database["public"]["Enums"]["order_status"]
          subtotal_amount: number
          total_amount: number
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      order_mark_payment_failed: {
        Args: {
          p_event_id: string
          p_intent_id: string
          p_order_id: string
          p_provider: string
          p_reason: string
        }
        Returns: {
          cancelled_at: string | null
          client_request_id: string | null
          confirmed_at: string | null
          created_at: string
          currency: string
          id: string
          notes: string | null
          paid_at: string | null
          payment_intent_id: string | null
          payment_provider: string | null
          payment_status: string
          status: Database["public"]["Enums"]["order_status"]
          subtotal_amount: number
          total_amount: number
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      preview_business_invitation: { Args: { _token: string }; Returns: Json }
      publish_business: {
        Args: { _approve: boolean; _business_id: string; _notes?: string }
        Returns: undefined
      }
      publish_business_product: { Args: { _product_id: string }; Returns: Json }
      purge_demo_seed: {
        Args: { _batch: string }
        Returns: {
          deleted: number
          entity: string
        }[]
      }
      raise_system_alert: {
        Args: {
          p_kind: string
          p_message: string
          p_payload: Json
          p_severity: Database["public"]["Enums"]["system_alert_severity"]
        }
        Returns: string
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      record_business_view_event: {
        Args: {
          _business_id: string
          _country_code?: string
          _event_type: string
          _referer?: string
          _session_hash?: string
          _source?: string
        }
        Returns: string
      }
      record_search_metric: {
        Args: {
          p_category_slug: string
          p_destination_slug: string
          p_duration_ms: number
          p_q: string
          p_result_count: number
          p_user_id: string
        }
        Returns: undefined
      }
      register_business_media: {
        Args: {
          _alt_text?: string
          _bucket: string
          _business_id: string
          _caption?: string
          _height?: number
          _mime: string
          _path: string
          _role: string
          _size_bytes: number
          _sort_order?: number
          _width?: number
        }
        Returns: Json
      }
      reject_business_ownership_transfer: {
        Args: { _notes?: string; _transfer_id: string }
        Returns: undefined
      }
      related_get_collection: {
        Args: {
          p_context?: Json
          p_entity_id: string
          p_entity_type: Database["public"]["Enums"]["related_entity_kind"]
          p_limit?: number
          p_surface: string
        }
        Returns: Json
      }
      related_recommend_v1: {
        Args: {
          p_context?: Json
          p_entity_id: string
          p_entity_type: Database["public"]["Enums"]["related_entity_kind"]
          p_limit?: number
          p_surface: string
        }
        Returns: Json
      }
      remove_business_media: {
        Args: { _business_media_id: string }
        Returns: undefined
      }
      reorder_business_product_faqs: {
        Args: { _ordered_ids: string[]; _product_id: string }
        Returns: undefined
      }
      request_business_ownership_transfer: {
        Args: { _business_id: string; _notes?: string; _to_user_id: string }
        Returns: string
      }
      request_business_review: {
        Args: { _business_id: string; _notes?: string }
        Returns: undefined
      }
      request_product_review: {
        Args: { _notes?: string; _product_id: string }
        Returns: undefined
      }
      request_promotion_review: {
        Args: { _notes?: string; _promotion_id: string }
        Returns: undefined
      }
      revoke_zone_scope: { Args: { _scope_id: string }; Returns: boolean }
      search_marketplace: {
        Args: {
          p_category_slug?: string
          p_destination_slug?: string
          p_limit?: number
          p_offset?: number
          p_price_max?: number
          p_price_min?: number
          p_q?: string
        }
        Returns: {
          business_id: string
          business_name: string
          business_slug: string
          category_slug: string
          destination_slug: string
          price_amount: number
          price_currency: string
          product_id: string
          product_name: string
          product_slug: string
          product_tagline: string
          product_type: string
          total_count: number
        }[]
      }
      set_active_mode: {
        Args: { _mode: Database["public"]["Enums"]["profile_mode"] }
        Returns: Database["public"]["Enums"]["profile_mode"]
      }
      set_business_response: {
        Args: { _response: string; _review_id: string }
        Returns: {
          business_response: string
          business_response_at: string
          id: string
        }[]
      }
      submit_business_for_review: {
        Args: { _business_id: string }
        Returns: undefined
      }
      transition_content_status: {
        Args: {
          _entity_id: string
          _entity_kind: Database["public"]["Enums"]["entity_kind"]
          _notes?: string
          _to_status: Database["public"]["Enums"]["content_status"]
        }
        Returns: undefined
      }
      travel_plan_build_snapshot: { Args: { _plan_id: string }; Returns: Json }
      travel_plan_ensure_active: { Args: never; Returns: string }
      travel_plan_get_shared: { Args: { _token: string }; Returns: Json }
      travel_plan_import_favorites: {
        Args: { _plan_id: string }
        Returns: number
      }
      travel_plan_is_concierge_reader: {
        Args: { _plan_id: string; _user_id: string }
        Returns: boolean
      }
      traveler_alux_context_for_user: { Args: never; Returns: Json }
      unc_activity_admin: {
        Args: { _limit?: number }
        Returns: {
          kind: string
          occurred_at: string
          ref: Json
          severity: string
          title: string
        }[]
      }
      unc_activity_business: {
        Args: { _business_id: string; _limit?: number }
        Returns: {
          kind: string
          occurred_at: string
          ref: Json
          severity: string
          title: string
        }[]
      }
      unc_activity_feed_for_alux: {
        Args: {
          _business_id?: string
          _limit?: number
          _scope: string
          _since?: string
        }
        Returns: {
          category: string
          event_id: string
          event_type: string
          occurred_at: string
          payload: Json
          read_state: string
          severity: string
          subject_id: string
          subject_type: string
          summary: string
        }[]
      }
      unc_activity_group_by_subject: {
        Args: {
          _business_id?: string
          _limit?: number
          _scope: string
          _since?: string
        }
        Returns: {
          event_count: number
          last_occurred_at: string
          last_severity: string
          last_summary: string
          subject_id: string
          subject_type: string
        }[]
      }
      unc_activity_summary_by_period: {
        Args: {
          _bucket?: string
          _business_id?: string
          _scope: string
          _since?: string
        }
        Returns: {
          bucket_start: string
          category: string
          event_count: number
          severity: string
        }[]
      }
      unc_activity_traveler: {
        Args: { _limit?: number }
        Returns: {
          kind: string
          occurred_at: string
          ref: Json
          severity: string
          title: string
        }[]
      }
      unc_count_my_unread: { Args: never; Returns: number }
      unc_list_my_deliveries: {
        Args: { _limit?: number; _only_unread?: boolean }
        Returns: {
          attempt_count: number
          audience: string
          category: Database["public"]["Enums"]["notification_category"]
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at: string
          delivered_at: string | null
          event_id: string
          event_type: string
          id: string
          last_error: string | null
          payload_ref: Json
          read_at: string | null
          recipient_user_id: string | null
          status: Database["public"]["Enums"]["notification_delivery_status"]
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "notification_deliveries"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      unc_list_my_preferences: {
        Args: never
        Returns: {
          category: Database["public"]["Enums"]["notification_category"]
          channel: Database["public"]["Enums"]["notification_channel"]
          consent_at: string
          enabled: boolean
          locked: boolean
        }[]
      }
      unc_mark_delivery_read: {
        Args: { _delivery_id: string }
        Returns: {
          attempt_count: number
          audience: string
          category: Database["public"]["Enums"]["notification_category"]
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at: string
          delivered_at: string | null
          event_id: string
          event_type: string
          id: string
          last_error: string | null
          payload_ref: Json
          read_at: string | null
          recipient_user_id: string | null
          status: Database["public"]["Enums"]["notification_delivery_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "notification_deliveries"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      unc_publish_email: {
        Args: {
          _audience: string
          _category: Database["public"]["Enums"]["notification_category"]
          _event_id: string
          _event_type: string
          _payload_ref?: Json
          _recipient_user_id: string
          _sender_identity?: string
          _template_key: string
        }
        Returns: {
          attempt_count: number
          audience: string
          category: Database["public"]["Enums"]["notification_category"]
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at: string
          delivered_at: string | null
          event_id: string
          event_type: string
          id: string
          last_error: string | null
          payload_ref: Json
          read_at: string | null
          recipient_user_id: string | null
          status: Database["public"]["Enums"]["notification_delivery_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "notification_deliveries"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      unc_publish_in_app: {
        Args: {
          _audience: string
          _category: Database["public"]["Enums"]["notification_category"]
          _event_id: string
          _event_type: string
          _payload_ref?: Json
          _recipient_user_id: string
        }
        Returns: {
          attempt_count: number
          audience: string
          category: Database["public"]["Enums"]["notification_category"]
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at: string
          delivered_at: string | null
          event_id: string
          event_type: string
          id: string
          last_error: string | null
          payload_ref: Json
          read_at: string | null
          recipient_user_id: string | null
          status: Database["public"]["Enums"]["notification_delivery_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "notification_deliveries"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      unc_publish_push: {
        Args: {
          _audience: string
          _category: Database["public"]["Enums"]["notification_category"]
          _event_id: string
          _event_type: string
          _payload_ref?: Json
          _recipient_user_id: string
          _template_key: string
        }
        Returns: {
          attempt_count: number
          audience: string
          category: Database["public"]["Enums"]["notification_category"]
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at: string
          delivered_at: string | null
          event_id: string
          event_type: string
          id: string
          last_error: string | null
          payload_ref: Json
          read_at: string | null
          recipient_user_id: string | null
          status: Database["public"]["Enums"]["notification_delivery_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "notification_deliveries"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      unc_publish_webhook: {
        Args: {
          _audience: string
          _category: Database["public"]["Enums"]["notification_category"]
          _endpoint_id: string
          _event_id: string
          _event_type: string
          _payload_ref?: Json
          _template_key: string
        }
        Returns: {
          attempt_count: number
          audience: string
          category: Database["public"]["Enums"]["notification_category"]
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at: string
          delivered_at: string | null
          event_id: string
          event_type: string
          id: string
          last_error: string | null
          payload_ref: Json
          read_at: string | null
          recipient_user_id: string | null
          status: Database["public"]["Enums"]["notification_delivery_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "notification_deliveries"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      unc_set_my_preference: {
        Args: {
          _category: Database["public"]["Enums"]["notification_category"]
          _channel: Database["public"]["Enums"]["notification_channel"]
          _consent?: boolean
          _enabled: boolean
        }
        Returns: {
          category: Database["public"]["Enums"]["notification_category"]
          channel: Database["public"]["Enums"]["notification_channel"]
          consent_at: string | null
          created_at: string
          enabled: boolean
          id: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "notification_preferences"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      unpublish_business_product: {
        Args: { _product_id: string }
        Returns: undefined
      }
      update_business_media_meta: {
        Args: {
          _alt_text?: string
          _business_media_id: string
          _caption?: string
          _sort_order?: number
        }
        Returns: undefined
      }
      update_business_product: {
        Args: {
          _capacity?: number
          _clear_price?: boolean
          _description?: string
          _duration_minutes?: number
          _name?: string
          _price_amount?: number
          _price_currency?: string
          _product_id: string
          _tagline?: string
        }
        Returns: undefined
      }
      update_business_product_faq: {
        Args: {
          _answer?: string
          _faq_id: string
          _publish?: boolean
          _question?: string
        }
        Returns: undefined
      }
      update_business_promotion: {
        Args: {
          _clear_dates?: boolean
          _clear_discount?: boolean
          _description?: string
          _discount_percent?: number
          _ends_at?: string
          _promotion_id: string
          _starts_at?: string
          _terms?: string
          _title?: string
        }
        Returns: undefined
      }
      user_zone_scopes_for: {
        Args: { _user_id: string }
        Returns: {
          created_at: string
          granted_by: string
          id: string
          notes: string
          role: Database["public"]["Enums"]["app_role"]
          scope_id: string
          scope_type: string
        }[]
      }
      withdraw_business_review: {
        Args: { _business_id: string; _notes?: string }
        Returns: undefined
      }
      withdraw_product_review: {
        Args: { _notes?: string; _product_id: string }
        Returns: undefined
      }
      withdraw_promotion_review: {
        Args: { _notes?: string; _promotion_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role:
        | "traveler"
        | "business_owner"
        | "concierge"
        | "editor"
        | "admin"
        | "super_admin"
        | "concierge_lead"
      block_category: "static" | "smart"
      block_version_status: "active" | "deprecated" | "retired"
      business_user_role: "owner" | "manager" | "editor" | "viewer"
      content_status:
        | "draft"
        | "in_review"
        | "approved"
        | "published"
        | "archived"
      eb_page_kind:
        | "landing"
        | "institutional"
        | "campaign"
        | "site_section"
        | "destination"
        | "business"
        | "product"
        | "event"
        | "wedding"
        | "promo"
        | "microsite"
        | "ai_generated"
        | "home"
        | "marketplace"
        | "experience"
        | "hotel"
        | "restaurant"
        | "route"
        | "alux"
        | "trip_builder"
        | "custom"
        | "region"
      entity_kind:
        | "country"
        | "state"
        | "tourism_region"
        | "destination"
        | "destination_zone"
        | "point_of_interest"
        | "business_category"
        | "business"
        | "product"
        | "media_asset"
        | "article"
        | "page"
        | "event"
        | "route"
        | "faq"
        | "banner"
        | "promotion"
        | "review"
        | "block"
        | "composition"
        | "revision"
      favorite_entity_kind: "business" | "product" | "promotion"
      hero_palette: "territorio" | "selva" | "cenote" | "atardecer"
      invitation_status: "pending" | "accepted" | "revoked" | "expired"
      locale_code: "es" | "en" | "fr" | "de" | "it" | "pt"
      media_kind: "image" | "video" | "document" | "audio"
      membership_status: "active" | "suspended" | "removed" | "pending"
      notification_category:
        | "transactional"
        | "operational"
        | "security"
        | "marketing"
      notification_channel: "in_app" | "email" | "push" | "webhook"
      notification_delivery_status:
        | "pending"
        | "sent"
        | "failed"
        | "skipped"
        | "dead_letter"
      order_event_type:
        | "created"
        | "item_added"
        | "item_removed"
        | "item_qty_updated"
        | "confirmed"
        | "cancelled"
        | "fulfilled"
        | "note_added"
        | "payment_initiated"
        | "payment_succeeded"
        | "payment_failed"
        | "payment_refunded"
      order_status: "cart" | "pending" | "confirmed" | "cancelled" | "fulfilled"
      ownership_transfer_status:
        | "pending"
        | "accepted"
        | "rejected"
        | "cancelled"
        | "expired"
      product_conversion_mode:
        | "informacion"
        | "arma_tu_viaje"
        | "solicitar_cotizacion"
        | "reservar_en_linea"
        | "whatsapp"
        | "telefono"
        | "sitio_externo"
      product_type:
        | "experiencia"
        | "hotel"
        | "restaurante"
        | "evento"
        | "tour"
        | "transporte"
        | "servicio"
        | "artesanal"
      product_visibility_level: "standard" | "destacado" | "premium"
      profile_mode: "traveler" | "business" | "concierge" | "staff"
      related_entity_kind: "business" | "product" | "destination" | "event"
      related_override_mode: "pin" | "hide"
      system_alert_severity: "info" | "warning" | "critical"
      system_alert_status: "open" | "acknowledged" | "resolved"
      travel_item_kind:
        | "destination"
        | "business"
        | "product"
        | "event"
        | "note"
      travel_plan_source: "web" | "import" | "concierge" | "alux"
      travel_plan_status:
        | "draft"
        | "active"
        | "shared_with_concierge"
        | "archived"
      traveler_coupon_channel: "qr" | "code"
      traveler_coupon_status: "active" | "redeemed" | "expired" | "revoked"
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
      app_role: [
        "traveler",
        "business_owner",
        "concierge",
        "editor",
        "admin",
        "super_admin",
        "concierge_lead",
      ],
      block_category: ["static", "smart"],
      block_version_status: ["active", "deprecated", "retired"],
      business_user_role: ["owner", "manager", "editor", "viewer"],
      content_status: [
        "draft",
        "in_review",
        "approved",
        "published",
        "archived",
      ],
      eb_page_kind: [
        "landing",
        "institutional",
        "campaign",
        "site_section",
        "destination",
        "business",
        "product",
        "event",
        "wedding",
        "promo",
        "microsite",
        "ai_generated",
        "home",
        "marketplace",
        "experience",
        "hotel",
        "restaurant",
        "route",
        "alux",
        "trip_builder",
        "custom",
        "region",
      ],
      entity_kind: [
        "country",
        "state",
        "tourism_region",
        "destination",
        "destination_zone",
        "point_of_interest",
        "business_category",
        "business",
        "product",
        "media_asset",
        "article",
        "page",
        "event",
        "route",
        "faq",
        "banner",
        "promotion",
        "review",
        "block",
        "composition",
        "revision",
      ],
      favorite_entity_kind: ["business", "product", "promotion"],
      hero_palette: ["territorio", "selva", "cenote", "atardecer"],
      invitation_status: ["pending", "accepted", "revoked", "expired"],
      locale_code: ["es", "en", "fr", "de", "it", "pt"],
      media_kind: ["image", "video", "document", "audio"],
      membership_status: ["active", "suspended", "removed", "pending"],
      notification_category: [
        "transactional",
        "operational",
        "security",
        "marketing",
      ],
      notification_channel: ["in_app", "email", "push", "webhook"],
      notification_delivery_status: [
        "pending",
        "sent",
        "failed",
        "skipped",
        "dead_letter",
      ],
      order_event_type: [
        "created",
        "item_added",
        "item_removed",
        "item_qty_updated",
        "confirmed",
        "cancelled",
        "fulfilled",
        "note_added",
        "payment_initiated",
        "payment_succeeded",
        "payment_failed",
        "payment_refunded",
      ],
      order_status: ["cart", "pending", "confirmed", "cancelled", "fulfilled"],
      ownership_transfer_status: [
        "pending",
        "accepted",
        "rejected",
        "cancelled",
        "expired",
      ],
      product_conversion_mode: [
        "informacion",
        "arma_tu_viaje",
        "solicitar_cotizacion",
        "reservar_en_linea",
        "whatsapp",
        "telefono",
        "sitio_externo",
      ],
      product_type: [
        "experiencia",
        "hotel",
        "restaurante",
        "evento",
        "tour",
        "transporte",
        "servicio",
        "artesanal",
      ],
      product_visibility_level: ["standard", "destacado", "premium"],
      profile_mode: ["traveler", "business", "concierge", "staff"],
      related_entity_kind: ["business", "product", "destination", "event"],
      related_override_mode: ["pin", "hide"],
      system_alert_severity: ["info", "warning", "critical"],
      system_alert_status: ["open", "acknowledged", "resolved"],
      travel_item_kind: ["destination", "business", "product", "event", "note"],
      travel_plan_source: ["web", "import", "concierge", "alux"],
      travel_plan_status: [
        "draft",
        "active",
        "shared_with_concierge",
        "archived",
      ],
      traveler_coupon_channel: ["qr", "code"],
      traveler_coupon_status: ["active", "redeemed", "expired", "revoked"],
    },
  },
} as const
