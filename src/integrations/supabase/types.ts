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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
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
      hero_palette: "territorio" | "selva" | "cenote" | "atardecer"
      locale_code: "es" | "en" | "fr" | "de" | "it" | "pt"
      media_kind: "image" | "video" | "document" | "audio"
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
      ],
      hero_palette: ["territorio", "selva", "cenote", "atardecer"],
      locale_code: ["es", "en", "fr", "de", "it", "pt"],
      media_kind: ["image", "video", "document", "audio"],
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
