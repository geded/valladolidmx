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
          business_id: string
          capacity: number | null
          cover_media_id: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          duration_minutes: number | null
          id: string
          metadata: Json
          name: string
          price_amount: number | null
          price_currency: string
          product_type: Database["public"]["Enums"]["product_type"]
          published_at: string | null
          slug: string
          status: Database["public"]["Enums"]["content_status"]
          tagline: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          business_id: string
          capacity?: number | null
          cover_media_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          metadata?: Json
          name: string
          price_amount?: number | null
          price_currency?: string
          product_type: Database["public"]["Enums"]["product_type"]
          published_at?: string | null
          slug: string
          status?: Database["public"]["Enums"]["content_status"]
          tagline?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          business_id?: string
          capacity?: number | null
          cover_media_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          metadata?: Json
          name?: string
          price_amount?: number | null
          price_currency?: string
          product_type?: Database["public"]["Enums"]["product_type"]
          published_at?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["content_status"]
          tagline?: string | null
          updated_at?: string
          updated_by?: string | null
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
      accept_business_invitation: { Args: { _token: string }; Returns: Json }
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
      preview_business_invitation: { Args: { _token: string }; Returns: Json }
      request_business_review: {
        Args: { _business_id: string; _notes?: string }
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
      withdraw_business_review: {
        Args: { _business_id: string; _notes?: string }
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
      hero_palette: "territorio" | "selva" | "cenote" | "atardecer"
      invitation_status: "pending" | "accepted" | "revoked" | "expired"
      locale_code: "es" | "en" | "fr" | "de" | "it" | "pt"
      media_kind: "image" | "video" | "document" | "audio"
      membership_status: "active" | "suspended" | "removed"
      product_type:
        | "experiencia"
        | "hotel"
        | "restaurante"
        | "evento"
        | "tour"
        | "transporte"
        | "servicio"
        | "artesanal"
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
      hero_palette: ["territorio", "selva", "cenote", "atardecer"],
      invitation_status: ["pending", "accepted", "revoked", "expired"],
      locale_code: ["es", "en", "fr", "de", "it", "pt"],
      media_kind: ["image", "video", "document", "audio"],
      membership_status: ["active", "suspended", "removed"],
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
    },
  },
} as const
