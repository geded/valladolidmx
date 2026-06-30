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
          from_user_id: string
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
          from_user_id: string
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
          from_user_id?: string
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
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          cover_media_id: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          destination_id: string
          display_name: string
          id: string
          legal_name: string | null
          logo_media_id: string | null
          metadata: Json
          primary_category_id: string | null
          published_at: string | null
          slug: string
          status: Database["public"]["Enums"]["content_status"]
          tagline: string | null
          updated_at: string
          updated_by: string | null
          verified: boolean
        }
        Insert: {
          cover_media_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          destination_id: string
          display_name: string
          id?: string
          legal_name?: string | null
          logo_media_id?: string | null
          metadata?: Json
          primary_category_id?: string | null
          published_at?: string | null
          slug: string
          status?: Database["public"]["Enums"]["content_status"]
          tagline?: string | null
          updated_at?: string
          updated_by?: string | null
          verified?: boolean
        }
        Update: {
          cover_media_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          destination_id?: string
          display_name?: string
          id?: string
          legal_name?: string | null
          logo_media_id?: string | null
          metadata?: Json
          primary_category_id?: string | null
          published_at?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["content_status"]
          tagline?: string | null
          updated_at?: string
          updated_by?: string | null
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
      destination_zones: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          destination_id: string
          id: string
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
          description?: string | null
          destination_id: string
          id?: string
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
          description?: string | null
          destination_id?: string
          id?: string
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
          description: string | null
          hero_media_id: string | null
          hero_palette: Database["public"]["Enums"]["hero_palette"]
          highlights: string[]
          id: string
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
          description?: string | null
          hero_media_id?: string | null
          hero_palette?: Database["public"]["Enums"]["hero_palette"]
          highlights?: string[]
          id?: string
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
          description?: string | null
          hero_media_id?: string | null
          hero_palette?: Database["public"]["Enums"]["hero_palette"]
          highlights?: string[]
          id?: string
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
          destination_id: string | null
          ends_at: string | null
          external_url: string | null
          id: string
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
          destination_id?: string | null
          ends_at?: string | null
          external_url?: string | null
          id?: string
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
          destination_id?: string | null
          ends_at?: string | null
          external_url?: string | null
          id?: string
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
          duration_seconds: number | null
          height: number | null
          id: string
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
          duration_seconds?: number | null
          height?: number | null
          id?: string
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
          duration_seconds?: number | null
          height?: number | null
          id?: string
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
      points_of_interest: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          destination_id: string
          destination_zone_id: string | null
          id: string
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
          description?: string | null
          destination_id: string
          destination_zone_id?: string | null
          id?: string
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
          description?: string | null
          destination_id?: string
          destination_zone_id?: string | null
          id?: string
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
          description: string | null
          duration_minutes: number | null
          eligible_for_ems_campaigns: boolean
          generates_commission: boolean
          id: string
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
          description?: string | null
          duration_minutes?: number | null
          eligible_for_ems_campaigns?: boolean
          generates_commission?: boolean
          id?: string
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
          description?: string | null
          duration_minutes?: number | null
          eligible_for_ems_campaigns?: boolean
          generates_commission?: boolean
          id?: string
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
      reviews: {
        Row: {
          author_display_name: string | null
          author_user_id: string | null
          body: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          id: string
          language: Database["public"]["Enums"]["locale_code"]
          metadata: Json
          published_at: string | null
          rating: number
          status: Database["public"]["Enums"]["content_status"]
          subject_id: string
          subject_kind: Database["public"]["Enums"]["entity_kind"]
          title: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          author_display_name?: string | null
          author_user_id?: string | null
          body?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          language?: Database["public"]["Enums"]["locale_code"]
          metadata?: Json
          published_at?: string | null
          rating: number
          status?: Database["public"]["Enums"]["content_status"]
          subject_id: string
          subject_kind: Database["public"]["Enums"]["entity_kind"]
          title?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          author_display_name?: string | null
          author_user_id?: string | null
          body?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          language?: Database["public"]["Enums"]["locale_code"]
          metadata?: Json
          published_at?: string | null
          rating?: number
          status?: Database["public"]["Enums"]["content_status"]
          subject_id?: string
          subject_kind?: Database["public"]["Enums"]["entity_kind"]
          title?: string | null
          updated_at?: string
          updated_by?: string | null
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
          accessibility_needs: string | null
          budget_range: string | null
          created_at: string
          dietary_restrictions: string | null
          id: string
          interests: Json
          preferred_destinations: Json
          preferred_language: string | null
          travel_style: string | null
          trip_context: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          accessibility_needs?: string | null
          budget_range?: string | null
          created_at?: string
          dietary_restrictions?: string | null
          id?: string
          interests?: Json
          preferred_destinations?: Json
          preferred_language?: string | null
          travel_style?: string | null
          trip_context?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          accessibility_needs?: string | null
          budget_range?: string | null
          created_at?: string
          dietary_restrictions?: string | null
          id?: string
          interests?: Json
          preferred_destinations?: Json
          preferred_language?: string | null
          travel_style?: string | null
          trip_context?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          scope_id: string | null
          scope_type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          scope_id?: string | null
          scope_type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          scope_id?: string | null
          scope_type?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
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
      archive_business_product: {
        Args: { _product_id: string }
        Returns: undefined
      }
      archive_business_promotion: {
        Args: { _promotion_id: string }
        Returns: undefined
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
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      has_business_access: {
        Args: {
          _business_id: string
          _min_role?: Database["public"]["Enums"]["business_user_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
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
      remove_business_media: {
        Args: { _business_media_id: string }
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
      transition_content_status: {
        Args: {
          _entity_id: string
          _entity_kind: Database["public"]["Enums"]["entity_kind"]
          _notes?: string
          _to_status: Database["public"]["Enums"]["content_status"]
        }
        Returns: undefined
      }
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
      business_user_role: "owner" | "manager" | "editor" | "viewer"
      content_status:
        | "draft"
        | "in_review"
        | "approved"
        | "published"
        | "archived"
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
      favorite_entity_kind: "business" | "product" | "promotion"
      hero_palette: "territorio" | "selva" | "cenote" | "atardecer"
      invitation_status: "pending" | "accepted" | "revoked" | "expired"
      locale_code: "es" | "en" | "fr" | "de" | "it" | "pt"
      media_kind: "image" | "video" | "document" | "audio"
      membership_status: "active" | "suspended" | "removed"
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
      system_alert_severity: "info" | "warning" | "critical"
      system_alert_status: "open" | "acknowledged" | "resolved"
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
      ],
      business_user_role: ["owner", "manager", "editor", "viewer"],
      content_status: [
        "draft",
        "in_review",
        "approved",
        "published",
        "archived",
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
      ],
      favorite_entity_kind: ["business", "product", "promotion"],
      hero_palette: ["territorio", "selva", "cenote", "atardecer"],
      invitation_status: ["pending", "accepted", "revoked", "expired"],
      locale_code: ["es", "en", "fr", "de", "it", "pt"],
      media_kind: ["image", "video", "document", "audio"],
      membership_status: ["active", "suspended", "removed"],
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
      system_alert_severity: ["info", "warning", "critical"],
      system_alert_status: ["open", "acknowledged", "resolved"],
    },
  },
} as const
