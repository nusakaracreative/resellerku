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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      assets: {
        Row: {
          asset_type: Database["public"]["Enums"]["asset_type"]
          campaign_name: string | null
          copywriting: string | null
          created_at: string
          description: string | null
          id: string
          public_url: string | null
          published_at: string | null
          status: Database["public"]["Enums"]["asset_status"]
          storage_bucket: string | null
          storage_path: string | null
          tenant_id: string
          title: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          asset_type: Database["public"]["Enums"]["asset_type"]
          campaign_name?: string | null
          copywriting?: string | null
          created_at?: string
          description?: string | null
          id?: string
          public_url?: string | null
          published_at?: string | null
          status?: Database["public"]["Enums"]["asset_status"]
          storage_bucket?: string | null
          storage_path?: string | null
          tenant_id: string
          title: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          asset_type?: Database["public"]["Enums"]["asset_type"]
          campaign_name?: string | null
          copywriting?: string | null
          created_at?: string
          description?: string | null
          id?: string
          public_url?: string | null
          published_at?: string | null
          status?: Database["public"]["Enums"]["asset_status"]
          storage_bucket?: string | null
          storage_path?: string | null
          tenant_id?: string
          title?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          details: Json
          entity_id: string | null
          entity_type: string
          id: number
          tenant_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          entity_id?: string | null
          entity_type: string
          id?: never
          tenant_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          entity_id?: string | null
          entity_type?: string
          id?: never
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cart_items: {
        Row: {
          added_at: string
          cart_id: string
          id: string
          product_id: string
          quantity: number
          tenant_id: string
          updated_at: string
          variant_id: string | null
        }
        Insert: {
          added_at?: string
          cart_id: string
          id?: string
          product_id: string
          quantity: number
          tenant_id: string
          updated_at?: string
          variant_id?: string | null
        }
        Update: {
          added_at?: string
          cart_id?: string
          id?: string
          product_id?: string
          quantity?: number
          tenant_id?: string
          updated_at?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_tenant_id_cart_id_fkey"
            columns: ["tenant_id", "cart_id"]
            isOneToOne: false
            referencedRelation: "carts"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "cart_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_tenant_id_product_id_fkey"
            columns: ["tenant_id", "product_id"]
            isOneToOne: false
            referencedRelation: "owner_product_catalog"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "cart_items_tenant_id_product_id_fkey"
            columns: ["tenant_id", "product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "cart_items_tenant_id_product_id_fkey"
            columns: ["tenant_id", "product_id"]
            isOneToOne: false
            referencedRelation: "storefront_catalog_products"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "cart_items_tenant_id_product_id_variant_id_fkey"
            columns: ["tenant_id", "product_id", "variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["tenant_id", "product_id", "id"]
          },
          {
            foreignKeyName: "cart_items_tenant_id_product_id_variant_id_fkey"
            columns: ["tenant_id", "product_id", "variant_id"]
            isOneToOne: false
            referencedRelation: "storefront_catalog_variants"
            referencedColumns: ["tenant_id", "product_id", "id"]
          },
        ]
      }
      carts: {
        Row: {
          converted_order_id: string | null
          created_at: string
          currency_code: string
          customer_id: string
          id: string
          reseller_referral_code: string | null
          status: string
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          converted_order_id?: string | null
          created_at?: string
          currency_code?: string
          customer_id: string
          id?: string
          reseller_referral_code?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          converted_order_id?: string | null
          created_at?: string
          currency_code?: string
          customer_id?: string
          id?: string
          reseller_referral_code?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "carts_tenant_id_customer_id_fkey"
            columns: ["tenant_id", "customer_id"]
            isOneToOne: false
            referencedRelation: "storefront_customers"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "carts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "carts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      case_evidence: {
        Row: {
          caption: string | null
          created_at: string
          dispute_case_id: string | null
          file_name: string | null
          file_size_bytes: number | null
          id: string
          mime_type: string | null
          return_request_id: string | null
          storage_bucket: string
          storage_path: string
          tenant_id: string
          uploaded_by: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          dispute_case_id?: string | null
          file_name?: string | null
          file_size_bytes?: number | null
          id?: string
          mime_type?: string | null
          return_request_id?: string | null
          storage_bucket?: string
          storage_path: string
          tenant_id: string
          uploaded_by: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          dispute_case_id?: string | null
          file_name?: string | null
          file_size_bytes?: number | null
          id?: string
          mime_type?: string | null
          return_request_id?: string | null
          storage_bucket?: string
          storage_path?: string
          tenant_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_evidence_tenant_id_dispute_case_id_fkey"
            columns: ["tenant_id", "dispute_case_id"]
            isOneToOne: false
            referencedRelation: "dispute_cases"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "case_evidence_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_evidence_tenant_id_return_request_id_fkey"
            columns: ["tenant_id", "return_request_id"]
            isOneToOne: false
            referencedRelation: "return_requests"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "case_evidence_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_addresses: {
        Row: {
          address_line: string
          city_code: string | null
          city_name: string | null
          created_at: string
          customer_id: string
          delivery_notes: string | null
          district_code: string | null
          district_name: string | null
          id: string
          is_default: boolean
          label: string
          phone: string
          postal_code: string | null
          province_code: string | null
          province_name: string | null
          recipient_name: string
          subdistrict_name: string | null
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address_line: string
          city_code?: string | null
          city_name?: string | null
          created_at?: string
          customer_id: string
          delivery_notes?: string | null
          district_code?: string | null
          district_name?: string | null
          id?: string
          is_default?: boolean
          label?: string
          phone: string
          postal_code?: string | null
          province_code?: string | null
          province_name?: string | null
          recipient_name: string
          subdistrict_name?: string | null
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address_line?: string
          city_code?: string | null
          city_name?: string | null
          created_at?: string
          customer_id?: string
          delivery_notes?: string | null
          district_code?: string | null
          district_name?: string | null
          id?: string
          is_default?: boolean
          label?: string
          phone?: string
          postal_code?: string | null
          province_code?: string | null
          province_name?: string | null
          recipient_name?: string
          subdistrict_name?: string | null
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_addresses_tenant_id_customer_id_fkey"
            columns: ["tenant_id", "customer_id"]
            isOneToOne: false
            referencedRelation: "storefront_customers"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "customer_addresses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_addresses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      dispute_cases: {
        Row: {
          assigned_to: string | null
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decision: string | null
          decision_reason: string | null
          description: string
          id: string
          issue_type: string
          opened_by: string
          order_id: string
          response_deadline: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision?: string | null
          decision_reason?: string | null
          description: string
          id?: string
          issue_type: string
          opened_by: string
          order_id: string
          response_deadline?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision?: string | null
          decision_reason?: string | null
          description?: string
          id?: string
          issue_type?: string
          opened_by?: string
          order_id?: string
          response_deadline?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dispute_cases_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispute_cases_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispute_cases_opened_by_fkey"
            columns: ["opened_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispute_cases_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispute_cases_tenant_id_order_id_fkey"
            columns: ["tenant_id", "order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["tenant_id", "id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          metadata: Json
          movement_type: string
          order_id: string | null
          product_id: string
          quantity_delta: number
          reason: string | null
          reference_key: string | null
          tenant_id: string
          variant_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          metadata?: Json
          movement_type: string
          order_id?: string | null
          product_id: string
          quantity_delta: number
          reason?: string | null
          reference_key?: string | null
          tenant_id: string
          variant_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          metadata?: Json
          movement_type?: string
          order_id?: string | null
          product_id?: string
          quantity_delta?: number
          reason?: string | null
          reference_key?: string | null
          tenant_id?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_tenant_id_order_id_fkey"
            columns: ["tenant_id", "order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "inventory_movements_tenant_id_product_id_fkey"
            columns: ["tenant_id", "product_id"]
            isOneToOne: false
            referencedRelation: "owner_product_catalog"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "inventory_movements_tenant_id_product_id_fkey"
            columns: ["tenant_id", "product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "inventory_movements_tenant_id_product_id_fkey"
            columns: ["tenant_id", "product_id"]
            isOneToOne: false
            referencedRelation: "storefront_catalog_products"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "inventory_movements_tenant_id_product_id_variant_id_fkey"
            columns: ["tenant_id", "product_id", "variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["tenant_id", "product_id", "id"]
          },
          {
            foreignKeyName: "inventory_movements_tenant_id_product_id_variant_id_fkey"
            columns: ["tenant_id", "product_id", "variant_id"]
            isOneToOne: false
            referencedRelation: "storefront_catalog_variants"
            referencedColumns: ["tenant_id", "product_id", "id"]
          },
        ]
      }
      order_conversations: {
        Row: {
          created_at: string
          id: string
          last_message_at: string | null
          order_id: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          order_id: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          order_id?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_conversations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_conversations_tenant_id_order_id_fkey"
            columns: ["tenant_id", "order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["tenant_id", "id"]
          },
        ]
      }
      order_items: {
        Row: {
          commission_amount: number
          created_at: string
          id: string
          line_total: number
          order_id: string
          product_id: string | null
          product_name_snapshot: string
          quantity: number
          sku_snapshot: string | null
          tenant_id: string
          tier_snapshot: Database["public"]["Enums"]["reseller_tier"] | null
          unit_price: number
          variant_id: string | null
          variant_options_snapshot: Json
        }
        Insert: {
          commission_amount?: number
          created_at?: string
          id?: string
          line_total: number
          order_id: string
          product_id?: string | null
          product_name_snapshot: string
          quantity: number
          sku_snapshot?: string | null
          tenant_id: string
          tier_snapshot?: Database["public"]["Enums"]["reseller_tier"] | null
          unit_price: number
          variant_id?: string | null
          variant_options_snapshot?: Json
        }
        Update: {
          commission_amount?: number
          created_at?: string
          id?: string
          line_total?: number
          order_id?: string
          product_id?: string | null
          product_name_snapshot?: string
          quantity?: number
          sku_snapshot?: string | null
          tenant_id?: string
          tier_snapshot?: Database["public"]["Enums"]["reseller_tier"] | null
          unit_price?: number
          variant_id?: string | null
          variant_options_snapshot?: Json
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_tenant_fk"
            columns: ["tenant_id", "order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "order_items_product_tenant_fk"
            columns: ["tenant_id", "product_id"]
            isOneToOne: false
            referencedRelation: "owner_product_catalog"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "order_items_product_tenant_fk"
            columns: ["tenant_id", "product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "order_items_product_tenant_fk"
            columns: ["tenant_id", "product_id"]
            isOneToOne: false
            referencedRelation: "storefront_catalog_products"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "order_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variant_tenant_fk"
            columns: ["tenant_id", "product_id", "variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["tenant_id", "product_id", "id"]
          },
          {
            foreignKeyName: "order_items_variant_tenant_fk"
            columns: ["tenant_id", "product_id", "variant_id"]
            isOneToOne: false
            referencedRelation: "storefront_catalog_variants"
            referencedColumns: ["tenant_id", "product_id", "id"]
          },
        ]
      }
      order_messages: {
        Row: {
          attachment_bucket: string | null
          attachment_path: string | null
          body: string
          conversation_id: string
          created_at: string
          id: string
          read_at: string | null
          sender_id: string
          tenant_id: string
        }
        Insert: {
          attachment_bucket?: string | null
          attachment_path?: string | null
          body: string
          conversation_id: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id: string
          tenant_id: string
        }
        Update: {
          attachment_bucket?: string | null
          attachment_path?: string | null
          body?: string
          conversation_id?: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_messages_tenant_id_conversation_id_fkey"
            columns: ["tenant_id", "conversation_id"]
            isOneToOne: false
            referencedRelation: "order_conversations"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "order_messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          checkout_idempotency_key: string | null
          customer_address_id: string | null
          customer_id: string | null
          discount_amount: number
          fulfillment_type: Database["public"]["Enums"]["fulfillment_type"]
          id: string
          notes: string | null
          order_number: string
          payment_reference: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          placed_at: string
          receipt_object_path: string | null
          receipt_ocr_data: Json | null
          receipt_ocr_status: string
          receipt_verified_at: string | null
          receipt_verified_by: string | null
          recipient_name: string
          recipient_phone: string | null
          referral_code_id: string | null
          referral_code_snapshot: string | null
          reseller_id: string | null
          reseller_membership_id: string | null
          sales_channel: string
          sender_name: string | null
          shipping_address: Json
          shipping_cost: number
          shipping_rate_id: string | null
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          tenant_id: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          checkout_idempotency_key?: string | null
          customer_address_id?: string | null
          customer_id?: string | null
          discount_amount?: number
          fulfillment_type?: Database["public"]["Enums"]["fulfillment_type"]
          id?: string
          notes?: string | null
          order_number: string
          payment_reference?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          placed_at?: string
          receipt_object_path?: string | null
          receipt_ocr_data?: Json | null
          receipt_ocr_status?: string
          receipt_verified_at?: string | null
          receipt_verified_by?: string | null
          recipient_name: string
          recipient_phone?: string | null
          referral_code_id?: string | null
          referral_code_snapshot?: string | null
          reseller_id?: string | null
          reseller_membership_id?: string | null
          sales_channel?: string
          sender_name?: string | null
          shipping_address?: Json
          shipping_cost?: number
          shipping_rate_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          tenant_id: string
          total_amount?: number
          updated_at?: string
        }
        Update: {
          checkout_idempotency_key?: string | null
          customer_address_id?: string | null
          customer_id?: string | null
          discount_amount?: number
          fulfillment_type?: Database["public"]["Enums"]["fulfillment_type"]
          id?: string
          notes?: string | null
          order_number?: string
          payment_reference?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          placed_at?: string
          receipt_object_path?: string | null
          receipt_ocr_data?: Json | null
          receipt_ocr_status?: string
          receipt_verified_at?: string | null
          receipt_verified_by?: string | null
          recipient_name?: string
          recipient_phone?: string | null
          referral_code_id?: string | null
          referral_code_snapshot?: string | null
          reseller_id?: string | null
          reseller_membership_id?: string | null
          sales_channel?: string
          sender_name?: string | null
          shipping_address?: Json
          shipping_cost?: number
          shipping_rate_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          tenant_id?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_address_tenant_fk"
            columns: ["tenant_id", "customer_address_id"]
            isOneToOne: false
            referencedRelation: "customer_addresses"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_receipt_verified_by_fkey"
            columns: ["receipt_verified_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_referral_tenant_fk"
            columns: ["tenant_id", "referral_code_id"]
            isOneToOne: false
            referencedRelation: "reseller_referral_codes"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "orders_reseller_membership_fk"
            columns: ["tenant_id", "reseller_id"]
            isOneToOne: false
            referencedRelation: "tenant_memberships"
            referencedColumns: ["tenant_id", "user_id"]
          },
          {
            foreignKeyName: "orders_reseller_membership_id_tenant_fk"
            columns: ["tenant_id", "reseller_membership_id"]
            isOneToOne: false
            referencedRelation: "tenant_memberships"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "orders_reseller_membership_tenant_fk"
            columns: ["tenant_id", "reseller_id"]
            isOneToOne: false
            referencedRelation: "tenant_memberships"
            referencedColumns: ["tenant_id", "user_id"]
          },
          {
            foreignKeyName: "orders_shipping_rate_tenant_fk"
            columns: ["tenant_id", "shipping_rate_id"]
            isOneToOne: false
            referencedRelation: "shipping_rates"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_transactions: {
        Row: {
          amount: number
          checkout_url: string | null
          created_at: string
          currency_code: string
          expires_at: string | null
          id: string
          idempotency_key: string
          order_id: string
          paid_at: string | null
          payment_method: string
          provider_code: string
          provider_payload: Json
          provider_reference: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          checkout_url?: string | null
          created_at?: string
          currency_code?: string
          expires_at?: string | null
          id?: string
          idempotency_key: string
          order_id: string
          paid_at?: string | null
          payment_method: string
          provider_code: string
          provider_payload?: Json
          provider_reference?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          checkout_url?: string | null
          created_at?: string
          currency_code?: string
          expires_at?: string | null
          id?: string
          idempotency_key?: string
          order_id?: string
          paid_at?: string | null
          payment_method?: string
          provider_code?: string
          provider_payload?: Json
          provider_reference?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_tenant_id_order_id_fkey"
            columns: ["tenant_id", "order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["tenant_id", "id"]
          },
        ]
      }
      payment_webhook_events: {
        Row: {
          event_type: string
          id: string
          payload: Json
          processed_at: string | null
          processing_error: string | null
          provider_code: string
          provider_event_id: string
          received_at: string
          signature_valid: boolean
          tenant_id: string | null
        }
        Insert: {
          event_type: string
          id?: string
          payload: Json
          processed_at?: string | null
          processing_error?: string | null
          provider_code: string
          provider_event_id: string
          received_at?: string
          signature_valid?: boolean
          tenant_id?: string | null
        }
        Update: {
          event_type?: string
          id?: string
          payload?: Json
          processed_at?: string | null
          processing_error?: string | null
          provider_code?: string
          provider_event_id?: string
          received_at?: string
          signature_valid?: boolean
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_webhook_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payout_requests: {
        Row: {
          amount: number
          bank_account_name: string
          bank_account_number: string
          bank_name: string
          id: string
          paid_at: string | null
          rejection_reason: string | null
          requested_at: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["payout_status"]
          tenant_id: string
          transfer_reference: string | null
          user_id: string
          wallet_id: string
        }
        Insert: {
          amount: number
          bank_account_name: string
          bank_account_number: string
          bank_name: string
          id?: string
          paid_at?: string | null
          rejection_reason?: string | null
          requested_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["payout_status"]
          tenant_id: string
          transfer_reference?: string | null
          user_id: string
          wallet_id: string
        }
        Update: {
          amount?: number
          bank_account_name?: string
          bank_account_number?: string
          bank_name?: string
          id?: string
          paid_at?: string | null
          rejection_reason?: string | null
          requested_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["payout_status"]
          tenant_id?: string
          transfer_reference?: string | null
          user_id?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payout_requests_membership_fk"
            columns: ["tenant_id", "user_id"]
            isOneToOne: false
            referencedRelation: "tenant_memberships"
            referencedColumns: ["tenant_id", "user_id"]
          },
          {
            foreignKeyName: "payout_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payout_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payout_requests_wallet_owner_tenant_fk"
            columns: ["tenant_id", "wallet_id", "user_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["tenant_id", "id", "user_id"]
          },
        ]
      }
      product_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_path: string | null
          is_active: boolean
          is_published: boolean
          name: string
          parent_id: string | null
          slug: string
          sort_order: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_path?: string | null
          is_active?: boolean
          is_published?: boolean
          name: string
          parent_id?: string | null
          slug: string
          sort_order?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_path?: string | null
          is_active?: boolean
          is_published?: boolean
          name?: string
          parent_id?: string | null
          slug?: string
          sort_order?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_categories_tenant_id_parent_id_fkey"
            columns: ["tenant_id", "parent_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "product_categories_tenant_id_parent_id_fkey"
            columns: ["tenant_id", "parent_id"]
            isOneToOne: false
            referencedRelation: "storefront_catalog_categories"
            referencedColumns: ["tenant_id", "id"]
          },
        ]
      }
      product_category_links: {
        Row: {
          category_id: string
          created_at: string
          product_id: string
          tenant_id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          product_id: string
          tenant_id: string
        }
        Update: {
          category_id?: string
          created_at?: string
          product_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_category_links_tenant_id_category_id_fkey"
            columns: ["tenant_id", "category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "product_category_links_tenant_id_category_id_fkey"
            columns: ["tenant_id", "category_id"]
            isOneToOne: false
            referencedRelation: "storefront_catalog_categories"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "product_category_links_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_category_links_tenant_id_product_id_fkey"
            columns: ["tenant_id", "product_id"]
            isOneToOne: false
            referencedRelation: "owner_product_catalog"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "product_category_links_tenant_id_product_id_fkey"
            columns: ["tenant_id", "product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "product_category_links_tenant_id_product_id_fkey"
            columns: ["tenant_id", "product_id"]
            isOneToOne: false
            referencedRelation: "storefront_catalog_products"
            referencedColumns: ["tenant_id", "id"]
          },
        ]
      }
      product_costs: {
        Row: {
          base_cost: number
          currency_code: string
          id: string
          product_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          base_cost?: number
          currency_code?: string
          id?: string
          product_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          base_cost?: number
          currency_code?: string
          id?: string
          product_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_costs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_costs_tenant_id_product_id_fkey"
            columns: ["tenant_id", "product_id"]
            isOneToOne: true
            referencedRelation: "owner_product_catalog"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "product_costs_tenant_id_product_id_fkey"
            columns: ["tenant_id", "product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "product_costs_tenant_id_product_id_fkey"
            columns: ["tenant_id", "product_id"]
            isOneToOne: true
            referencedRelation: "storefront_catalog_products"
            referencedColumns: ["tenant_id", "id"]
          },
        ]
      }
      product_media: {
        Row: {
          alt_text: string | null
          caption: string | null
          created_at: string
          id: string
          is_cover: boolean
          is_published: boolean
          media_type: string
          product_id: string
          sort_order: number
          storage_bucket: string
          storage_path: string
          tenant_id: string
        }
        Insert: {
          alt_text?: string | null
          caption?: string | null
          created_at?: string
          id?: string
          is_cover?: boolean
          is_published?: boolean
          media_type: string
          product_id: string
          sort_order?: number
          storage_bucket?: string
          storage_path: string
          tenant_id: string
        }
        Update: {
          alt_text?: string | null
          caption?: string | null
          created_at?: string
          id?: string
          is_cover?: boolean
          is_published?: boolean
          media_type?: string
          product_id?: string
          sort_order?: number
          storage_bucket?: string
          storage_path?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_media_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_media_tenant_id_product_id_fkey"
            columns: ["tenant_id", "product_id"]
            isOneToOne: false
            referencedRelation: "owner_product_catalog"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "product_media_tenant_id_product_id_fkey"
            columns: ["tenant_id", "product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "product_media_tenant_id_product_id_fkey"
            columns: ["tenant_id", "product_id"]
            isOneToOne: false
            referencedRelation: "storefront_catalog_products"
            referencedColumns: ["tenant_id", "id"]
          },
        ]
      }
      product_review_media: {
        Row: {
          created_at: string
          id: string
          media_type: string
          review_id: string
          sort_order: number
          storage_bucket: string
          storage_path: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          media_type: string
          review_id: string
          sort_order?: number
          storage_bucket?: string
          storage_path: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          media_type?: string
          review_id?: string
          sort_order?: number
          storage_bucket?: string
          storage_path?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_review_media_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_review_media_tenant_id_review_id_fkey"
            columns: ["tenant_id", "review_id"]
            isOneToOne: false
            referencedRelation: "product_reviews"
            referencedColumns: ["tenant_id", "id"]
          },
        ]
      }
      product_reviews: {
        Row: {
          body: string | null
          created_at: string
          customer_id: string
          id: string
          is_verified_purchase: boolean
          order_id: string
          order_item_id: string
          owner_responded_at: string | null
          owner_response: string | null
          product_id: string
          published_at: string | null
          rating: number
          reviewer_display_name: string | null
          status: string
          tenant_id: string
          title: string | null
          updated_at: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          customer_id: string
          id?: string
          is_verified_purchase?: boolean
          order_id: string
          order_item_id: string
          owner_responded_at?: string | null
          owner_response?: string | null
          product_id: string
          published_at?: string | null
          rating: number
          reviewer_display_name?: string | null
          status?: string
          tenant_id: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          body?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          is_verified_purchase?: boolean
          order_id?: string
          order_item_id?: string
          owner_responded_at?: string | null
          owner_response?: string | null
          product_id?: string
          published_at?: string | null
          rating?: number
          reviewer_display_name?: string | null
          status?: string
          tenant_id?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_reviews_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_tenant_id_order_id_fkey"
            columns: ["tenant_id", "order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "product_reviews_tenant_id_product_id_fkey"
            columns: ["tenant_id", "product_id"]
            isOneToOne: false
            referencedRelation: "owner_product_catalog"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "product_reviews_tenant_id_product_id_fkey"
            columns: ["tenant_id", "product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "product_reviews_tenant_id_product_id_fkey"
            columns: ["tenant_id", "product_id"]
            isOneToOne: false
            referencedRelation: "storefront_catalog_products"
            referencedColumns: ["tenant_id", "id"]
          },
        ]
      }
      product_tier_prices: {
        Row: {
          commission_amount: number
          created_at: string
          id: string
          product_id: string
          selling_price: number
          tenant_id: string
          tier: Database["public"]["Enums"]["reseller_tier"]
          updated_at: string
        }
        Insert: {
          commission_amount?: number
          created_at?: string
          id?: string
          product_id: string
          selling_price: number
          tenant_id: string
          tier: Database["public"]["Enums"]["reseller_tier"]
          updated_at?: string
        }
        Update: {
          commission_amount?: number
          created_at?: string
          id?: string
          product_id?: string
          selling_price?: number
          tenant_id?: string
          tier?: Database["public"]["Enums"]["reseller_tier"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_tier_prices_product_tenant_fk"
            columns: ["tenant_id", "product_id"]
            isOneToOne: false
            referencedRelation: "owner_product_catalog"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "product_tier_prices_product_tenant_fk"
            columns: ["tenant_id", "product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "product_tier_prices_product_tenant_fk"
            columns: ["tenant_id", "product_id"]
            isOneToOne: false
            referencedRelation: "storefront_catalog_products"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "product_tier_prices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          barcode: string | null
          created_at: string
          id: string
          image_path: string | null
          is_active: boolean
          option_values: Json
          product_id: string
          reserved_quantity: number
          sku: string
          sort_order: number
          stock_quantity: number
          tenant_id: string
          updated_at: string
          weight_grams: number | null
        }
        Insert: {
          barcode?: string | null
          created_at?: string
          id?: string
          image_path?: string | null
          is_active?: boolean
          option_values?: Json
          product_id: string
          reserved_quantity?: number
          sku: string
          sort_order?: number
          stock_quantity?: number
          tenant_id: string
          updated_at?: string
          weight_grams?: number | null
        }
        Update: {
          barcode?: string | null
          created_at?: string
          id?: string
          image_path?: string | null
          is_active?: boolean
          option_values?: Json
          product_id?: string
          reserved_quantity?: number
          sku?: string
          sort_order?: number
          stock_quantity?: number
          tenant_id?: string
          updated_at?: string
          weight_grams?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_tenant_id_product_id_fkey"
            columns: ["tenant_id", "product_id"]
            isOneToOne: false
            referencedRelation: "owner_product_catalog"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "product_variants_tenant_id_product_id_fkey"
            columns: ["tenant_id", "product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "product_variants_tenant_id_product_id_fkey"
            columns: ["tenant_id", "product_id"]
            isOneToOne: false
            referencedRelation: "storefront_catalog_products"
            referencedColumns: ["tenant_id", "id"]
          },
        ]
      }
      products: {
        Row: {
          base_price: number
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          image_url: string | null
          is_demo_data: boolean
          name: string
          reserved_quantity: number
          sku: string | null
          status: Database["public"]["Enums"]["product_status"]
          stock_quantity: number
          tenant_id: string
          updated_at: string
          weight_grams: number
        }
        Insert: {
          base_price?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_demo_data?: boolean
          name: string
          reserved_quantity?: number
          sku?: string | null
          status?: Database["public"]["Enums"]["product_status"]
          stock_quantity?: number
          tenant_id: string
          updated_at?: string
          weight_grams?: number
        }
        Update: {
          base_price?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_demo_data?: boolean
          name?: string
          reserved_quantity?: number
          sku?: string | null
          status?: Database["public"]["Enums"]["product_status"]
          stock_quantity?: number
          tenant_id?: string
          updated_at?: string
          weight_grams?: number
        }
        Relationships: [
          {
            foreignKeyName: "products_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      promotion_categories: {
        Row: {
          category_id: string
          promotion_id: string
          tenant_id: string
        }
        Insert: {
          category_id: string
          promotion_id: string
          tenant_id: string
        }
        Update: {
          category_id?: string
          promotion_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promotion_categories_tenant_id_category_id_fkey"
            columns: ["tenant_id", "category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "promotion_categories_tenant_id_category_id_fkey"
            columns: ["tenant_id", "category_id"]
            isOneToOne: false
            referencedRelation: "storefront_catalog_categories"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "promotion_categories_tenant_id_promotion_id_fkey"
            columns: ["tenant_id", "promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["tenant_id", "id"]
          },
        ]
      }
      promotion_products: {
        Row: {
          product_id: string
          promotion_id: string
          tenant_id: string
        }
        Insert: {
          product_id: string
          promotion_id: string
          tenant_id: string
        }
        Update: {
          product_id?: string
          promotion_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promotion_products_tenant_id_product_id_fkey"
            columns: ["tenant_id", "product_id"]
            isOneToOne: false
            referencedRelation: "owner_product_catalog"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "promotion_products_tenant_id_product_id_fkey"
            columns: ["tenant_id", "product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "promotion_products_tenant_id_product_id_fkey"
            columns: ["tenant_id", "product_id"]
            isOneToOne: false
            referencedRelation: "storefront_catalog_products"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "promotion_products_tenant_id_promotion_id_fkey"
            columns: ["tenant_id", "promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["tenant_id", "id"]
          },
        ]
      }
      promotion_redemptions: {
        Row: {
          customer_id: string
          discount_amount: number
          id: string
          order_id: string | null
          promotion_id: string
          redeemed_at: string
          tenant_id: string
        }
        Insert: {
          customer_id: string
          discount_amount: number
          id?: string
          order_id?: string | null
          promotion_id: string
          redeemed_at?: string
          tenant_id: string
        }
        Update: {
          customer_id?: string
          discount_amount?: number
          id?: string
          order_id?: string | null
          promotion_id?: string
          redeemed_at?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promotion_redemptions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_redemptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_redemptions_tenant_id_promotion_id_fkey"
            columns: ["tenant_id", "promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["tenant_id", "id"]
          },
        ]
      }
      promotions: {
        Row: {
          code: string | null
          created_at: string
          description: string | null
          discount_type: string
          discount_value: number
          eligible_tiers: Database["public"]["Enums"]["reseller_tier"][] | null
          ends_at: string | null
          id: string
          is_active: boolean
          is_published: boolean
          is_stackable: boolean
          max_discount: number | null
          minimum_subtotal: number
          name: string
          scope: string
          starts_at: string | null
          tenant_id: string
          updated_at: string
          usage_count: number
          usage_limit_per_customer: number | null
          usage_limit_total: number | null
        }
        Insert: {
          code?: string | null
          created_at?: string
          description?: string | null
          discount_type: string
          discount_value?: number
          eligible_tiers?: Database["public"]["Enums"]["reseller_tier"][] | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          is_published?: boolean
          is_stackable?: boolean
          max_discount?: number | null
          minimum_subtotal?: number
          name: string
          scope?: string
          starts_at?: string | null
          tenant_id: string
          updated_at?: string
          usage_count?: number
          usage_limit_per_customer?: number | null
          usage_limit_total?: number | null
        }
        Update: {
          code?: string | null
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          eligible_tiers?: Database["public"]["Enums"]["reseller_tier"][] | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          is_published?: boolean
          is_stackable?: boolean
          max_discount?: number | null
          minimum_subtotal?: number
          name?: string
          scope?: string
          starts_at?: string | null
          tenant_id?: string
          updated_at?: string
          usage_count?: number
          usage_limit_per_customer?: number | null
          usage_limit_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "promotions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      reseller_referral_codes: {
        Row: {
          click_count: number
          code: string
          created_at: string
          ends_at: string | null
          id: string
          label: string | null
          reseller_id: string
          starts_at: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          click_count?: number
          code: string
          created_at?: string
          ends_at?: string | null
          id?: string
          label?: string | null
          reseller_id: string
          starts_at?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          click_count?: number
          code?: string
          created_at?: string
          ends_at?: string | null
          id?: string
          label?: string | null
          reseller_id?: string
          starts_at?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reseller_referral_codes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reseller_referral_codes_tenant_id_reseller_id_fkey"
            columns: ["tenant_id", "reseller_id"]
            isOneToOne: false
            referencedRelation: "tenant_memberships"
            referencedColumns: ["tenant_id", "user_id"]
          },
        ]
      }
      return_items: {
        Row: {
          condition_report: string | null
          created_at: string
          id: string
          order_item_id: string
          quantity: number
          return_request_id: string
          tenant_id: string
        }
        Insert: {
          condition_report?: string | null
          created_at?: string
          id?: string
          order_item_id: string
          quantity: number
          return_request_id: string
          tenant_id: string
        }
        Update: {
          condition_report?: string | null
          created_at?: string
          id?: string
          order_item_id?: string
          quantity?: number
          return_request_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "return_items_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_items_tenant_id_return_request_id_fkey"
            columns: ["tenant_id", "return_request_id"]
            isOneToOne: false
            referencedRelation: "return_requests"
            referencedColumns: ["tenant_id", "id"]
          },
        ]
      }
      return_requests: {
        Row: {
          created_at: string
          decision_deadline: string | null
          id: string
          order_id: string
          reason_code: string
          reason_detail: string | null
          refund_amount: number | null
          requested_at: string
          requested_by: string
          resolution_note: string | null
          resolution_type: string | null
          resolved_at: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          decision_deadline?: string | null
          id?: string
          order_id: string
          reason_code: string
          reason_detail?: string | null
          refund_amount?: number | null
          requested_at?: string
          requested_by: string
          resolution_note?: string | null
          resolution_type?: string | null
          resolved_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          decision_deadline?: string | null
          id?: string
          order_id?: string
          reason_code?: string
          reason_detail?: string | null
          refund_amount?: number | null
          requested_at?: string
          requested_by?: string
          resolution_note?: string | null
          resolution_type?: string | null
          resolved_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "return_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_requests_tenant_id_order_id_fkey"
            columns: ["tenant_id", "order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["tenant_id", "id"]
          },
        ]
      }
      seller_verifications: {
        Row: {
          business_name: string | null
          created_at: string
          evidence_bucket: string | null
          evidence_path: string | null
          expires_at: string | null
          id: string
          legal_name: string | null
          reviewed_by: string | null
          reviewer_notes: string | null
          status: string
          subject_type: string
          subject_user_id: string | null
          submitted_at: string | null
          tenant_id: string
          updated_at: string
          verification_type: string
          verified_at: string | null
        }
        Insert: {
          business_name?: string | null
          created_at?: string
          evidence_bucket?: string | null
          evidence_path?: string | null
          expires_at?: string | null
          id?: string
          legal_name?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          status?: string
          subject_type: string
          subject_user_id?: string | null
          submitted_at?: string | null
          tenant_id: string
          updated_at?: string
          verification_type: string
          verified_at?: string | null
        }
        Update: {
          business_name?: string | null
          created_at?: string
          evidence_bucket?: string | null
          evidence_path?: string | null
          expires_at?: string | null
          id?: string
          legal_name?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          status?: string
          subject_type?: string
          subject_user_id?: string | null
          submitted_at?: string | null
          tenant_id?: string
          updated_at?: string
          verification_type?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seller_verifications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_verifications_subject_user_id_fkey"
            columns: ["subject_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_verifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      shipment_events: {
        Row: {
          created_at: string
          description: string | null
          event_code: string
          event_label: string
          id: string
          location: string | null
          occurred_at: string
          provider_event_id: string | null
          raw_event: Json
          shipment_id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          event_code: string
          event_label: string
          id?: string
          location?: string | null
          occurred_at: string
          provider_event_id?: string | null
          raw_event?: Json
          shipment_id: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          event_code?: string
          event_label?: string
          id?: string
          location?: string | null
          occurred_at?: string
          provider_event_id?: string | null
          raw_event?: Json
          shipment_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipment_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_events_tenant_id_shipment_id_fkey"
            columns: ["tenant_id", "shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["tenant_id", "id"]
          },
        ]
      }
      shipments: {
        Row: {
          created_at: string
          delivered_at: string | null
          estimated_delivery_at: string | null
          id: string
          last_synced_at: string | null
          order_id: string
          provider_code: string | null
          service_code: string | null
          shipment_number: string
          shipped_at: string | null
          shipping_label_bucket: string | null
          shipping_label_path: string | null
          shipping_method_id: string | null
          status: string
          tenant_id: string
          tracking_number: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          delivered_at?: string | null
          estimated_delivery_at?: string | null
          id?: string
          last_synced_at?: string | null
          order_id: string
          provider_code?: string | null
          service_code?: string | null
          shipment_number: string
          shipped_at?: string | null
          shipping_label_bucket?: string | null
          shipping_label_path?: string | null
          shipping_method_id?: string | null
          status?: string
          tenant_id: string
          tracking_number?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          delivered_at?: string | null
          estimated_delivery_at?: string | null
          id?: string
          last_synced_at?: string | null
          order_id?: string
          provider_code?: string | null
          service_code?: string | null
          shipment_number?: string
          shipped_at?: string | null
          shipping_label_bucket?: string | null
          shipping_label_path?: string | null
          shipping_method_id?: string | null
          status?: string
          tenant_id?: string
          tracking_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_tenant_id_order_id_fkey"
            columns: ["tenant_id", "order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "shipments_tenant_id_shipping_method_id_fkey"
            columns: ["tenant_id", "shipping_method_id"]
            isOneToOne: false
            referencedRelation: "shipping_methods"
            referencedColumns: ["tenant_id", "id"]
          },
        ]
      }
      shipping_methods: {
        Row: {
          created_at: string
          description: string | null
          fulfillment_type: Database["public"]["Enums"]["fulfillment_type"]
          id: string
          is_active: boolean
          max_delivery_days: number | null
          min_delivery_days: number | null
          name: string
          provider_code: string
          service_code: string
          sort_order: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          fulfillment_type?: Database["public"]["Enums"]["fulfillment_type"]
          id?: string
          is_active?: boolean
          max_delivery_days?: number | null
          min_delivery_days?: number | null
          name: string
          provider_code?: string
          service_code: string
          sort_order?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          fulfillment_type?: Database["public"]["Enums"]["fulfillment_type"]
          id?: string
          is_active?: boolean
          max_delivery_days?: number | null
          min_delivery_days?: number | null
          name?: string
          provider_code?: string
          service_code?: string
          sort_order?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipping_methods_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_rates: {
        Row: {
          base_fee: number
          created_at: string
          fee_per_kg: number
          free_shipping_minimum: number | null
          id: string
          is_active: boolean
          maximum_fee: number | null
          minimum_fee: number
          shipping_method_id: string
          shipping_zone_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          base_fee?: number
          created_at?: string
          fee_per_kg?: number
          free_shipping_minimum?: number | null
          id?: string
          is_active?: boolean
          maximum_fee?: number | null
          minimum_fee?: number
          shipping_method_id: string
          shipping_zone_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          base_fee?: number
          created_at?: string
          fee_per_kg?: number
          free_shipping_minimum?: number | null
          id?: string
          is_active?: boolean
          maximum_fee?: number | null
          minimum_fee?: number
          shipping_method_id?: string
          shipping_zone_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipping_rates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipping_rates_tenant_id_shipping_method_id_fkey"
            columns: ["tenant_id", "shipping_method_id"]
            isOneToOne: false
            referencedRelation: "shipping_methods"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "shipping_rates_tenant_id_shipping_zone_id_fkey"
            columns: ["tenant_id", "shipping_zone_id"]
            isOneToOne: false
            referencedRelation: "shipping_zones"
            referencedColumns: ["tenant_id", "id"]
          },
        ]
      }
      shipping_zones: {
        Row: {
          city_codes: string[]
          created_at: string
          id: string
          is_active: boolean
          name: string
          postal_prefixes: string[]
          province_codes: string[]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          city_codes?: string[]
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          postal_prefixes?: string[]
          province_codes?: string[]
          tenant_id: string
          updated_at?: string
        }
        Update: {
          city_codes?: string[]
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          postal_prefixes?: string[]
          province_codes?: string[]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipping_zones_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      storefront_collection_products: {
        Row: {
          collection_id: string
          created_at: string
          product_id: string
          sort_order: number
          tenant_id: string
        }
        Insert: {
          collection_id: string
          created_at?: string
          product_id: string
          sort_order?: number
          tenant_id: string
        }
        Update: {
          collection_id?: string
          created_at?: string
          product_id?: string
          sort_order?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "storefront_collection_products_tenant_id_collection_id_fkey"
            columns: ["tenant_id", "collection_id"]
            isOneToOne: false
            referencedRelation: "storefront_catalog_collections"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "storefront_collection_products_tenant_id_collection_id_fkey"
            columns: ["tenant_id", "collection_id"]
            isOneToOne: false
            referencedRelation: "storefront_collections"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "storefront_collection_products_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "storefront_collection_products_tenant_id_product_id_fkey"
            columns: ["tenant_id", "product_id"]
            isOneToOne: false
            referencedRelation: "owner_product_catalog"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "storefront_collection_products_tenant_id_product_id_fkey"
            columns: ["tenant_id", "product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "storefront_collection_products_tenant_id_product_id_fkey"
            columns: ["tenant_id", "product_id"]
            isOneToOne: false
            referencedRelation: "storefront_catalog_products"
            referencedColumns: ["tenant_id", "id"]
          },
        ]
      }
      storefront_collections: {
        Row: {
          cover_path: string | null
          created_at: string
          description: string | null
          ends_at: string | null
          id: string
          is_published: boolean
          section_type: string
          slug: string
          sort_order: number
          starts_at: string | null
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          cover_path?: string | null
          created_at?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          is_published?: boolean
          section_type?: string
          slug: string
          sort_order?: number
          starts_at?: string | null
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          cover_path?: string | null
          created_at?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          is_published?: boolean
          section_type?: string
          slug?: string
          sort_order?: number
          starts_at?: string | null
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "storefront_collections_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      storefront_customers: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          marketing_consent_at: string | null
          phone: string | null
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          marketing_consent_at?: string | null
          phone?: string | null
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          marketing_consent_at?: string | null
          phone?: string | null
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "storefront_customers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "storefront_customers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      storefront_offers: {
        Row: {
          created_at: string
          currency_code: string
          effective_from: string | null
          effective_until: string | null
          id: string
          is_active: boolean
          product_id: string
          regular_price: number
          sale_price: number | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency_code?: string
          effective_from?: string | null
          effective_until?: string | null
          id?: string
          is_active?: boolean
          product_id: string
          regular_price: number
          sale_price?: number | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency_code?: string
          effective_from?: string | null
          effective_until?: string | null
          id?: string
          is_active?: boolean
          product_id?: string
          regular_price?: number
          sale_price?: number | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "storefront_offers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "storefront_offers_tenant_id_product_id_fkey"
            columns: ["tenant_id", "product_id"]
            isOneToOne: true
            referencedRelation: "owner_product_catalog"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "storefront_offers_tenant_id_product_id_fkey"
            columns: ["tenant_id", "product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "storefront_offers_tenant_id_product_id_fkey"
            columns: ["tenant_id", "product_id"]
            isOneToOne: true
            referencedRelation: "storefront_catalog_products"
            referencedColumns: ["tenant_id", "id"]
          },
        ]
      }
      storefront_settings: {
        Row: {
          announcement: string | null
          created_at: string
          display_name: string
          hero_body: string | null
          hero_cta_label: string | null
          hero_cta_url: string | null
          hero_image_path: string | null
          hero_title: string | null
          id: string
          logo_path: string | null
          privacy_policy: string | null
          public_slug: string
          published_at: string | null
          return_policy: string | null
          seo_description: string | null
          seo_title: string | null
          shipping_policy: string | null
          status: string
          support_email: string | null
          support_phone: string | null
          tagline: string | null
          tenant_id: string
          terms_of_service: string | null
          theme_config: Json
          updated_at: string
        }
        Insert: {
          announcement?: string | null
          created_at?: string
          display_name: string
          hero_body?: string | null
          hero_cta_label?: string | null
          hero_cta_url?: string | null
          hero_image_path?: string | null
          hero_title?: string | null
          id?: string
          logo_path?: string | null
          privacy_policy?: string | null
          public_slug: string
          published_at?: string | null
          return_policy?: string | null
          seo_description?: string | null
          seo_title?: string | null
          shipping_policy?: string | null
          status?: string
          support_email?: string | null
          support_phone?: string | null
          tagline?: string | null
          tenant_id: string
          terms_of_service?: string | null
          theme_config?: Json
          updated_at?: string
        }
        Update: {
          announcement?: string | null
          created_at?: string
          display_name?: string
          hero_body?: string | null
          hero_cta_label?: string | null
          hero_cta_url?: string | null
          hero_image_path?: string | null
          hero_title?: string | null
          id?: string
          logo_path?: string | null
          privacy_policy?: string | null
          public_slug?: string
          published_at?: string | null
          return_policy?: string | null
          seo_description?: string | null
          seo_title?: string | null
          shipping_policy?: string | null
          status?: string
          support_email?: string | null
          support_phone?: string | null
          tagline?: string | null
          tenant_id?: string
          terms_of_service?: string | null
          theme_config?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "storefront_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_memberships: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          joined_at: string
          reseller_tier: Database["public"]["Enums"]["reseller_tier"] | null
          role: Database["public"]["Enums"]["membership_role"]
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          joined_at?: string
          reseller_tier?: Database["public"]["Enums"]["reseller_tier"] | null
          role: Database["public"]["Enums"]["membership_role"]
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          joined_at?: string
          reseller_tier?: Database["public"]["Enums"]["reseller_tier"] | null
          role?: Database["public"]["Enums"]["membership_role"]
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_memberships_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          business_email: string | null
          business_phone: string | null
          created_at: string
          created_by: string
          currency_code: string
          id: string
          logo_url: string | null
          name: string
          slug: string
          timezone: string
          updated_at: string
        }
        Insert: {
          business_email?: string | null
          business_phone?: string | null
          created_at?: string
          created_by: string
          currency_code?: string
          id?: string
          logo_url?: string | null
          name: string
          slug: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          business_email?: string | null
          business_phone?: string | null
          created_at?: string
          created_by?: string
          currency_code?: string
          id?: string
          logo_url?: string | null
          name?: string
          slug?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenants_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          idempotency_key: string
          metadata: Json
          order_id: string | null
          posted_at: string | null
          status: Database["public"]["Enums"]["wallet_transaction_status"]
          tenant_id: string
          transaction_type: Database["public"]["Enums"]["wallet_transaction_type"]
          user_id: string
          wallet_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          idempotency_key: string
          metadata?: Json
          order_id?: string | null
          posted_at?: string | null
          status?: Database["public"]["Enums"]["wallet_transaction_status"]
          tenant_id: string
          transaction_type: Database["public"]["Enums"]["wallet_transaction_type"]
          user_id: string
          wallet_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          idempotency_key?: string
          metadata?: Json
          order_id?: string | null
          posted_at?: string | null
          status?: Database["public"]["Enums"]["wallet_transaction_status"]
          tenant_id?: string
          transaction_type?: Database["public"]["Enums"]["wallet_transaction_type"]
          user_id?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_order_tenant_fk"
            columns: ["tenant_id", "order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "wallet_transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_transactions_wallet_owner_tenant_fk"
            columns: ["tenant_id", "wallet_id", "user_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["tenant_id", "id", "user_id"]
          },
        ]
      }
      wallets: {
        Row: {
          available_balance: number
          id: string
          lifetime_earned: number
          locked_balance: number
          pending_balance: number
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          available_balance?: number
          id?: string
          lifetime_earned?: number
          locked_balance?: number
          pending_balance?: number
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          available_balance?: number
          id?: string
          lifetime_earned?: number
          locked_balance?: number
          pending_balance?: number
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallets_membership_fk"
            columns: ["tenant_id", "user_id"]
            isOneToOne: true
            referencedRelation: "tenant_memberships"
            referencedColumns: ["tenant_id", "user_id"]
          },
          {
            foreignKeyName: "wallets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      wishlist_items: {
        Row: {
          created_at: string
          id: string
          product_id: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlist_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wishlist_items_tenant_id_product_id_fkey"
            columns: ["tenant_id", "product_id"]
            isOneToOne: false
            referencedRelation: "owner_product_catalog"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "wishlist_items_tenant_id_product_id_fkey"
            columns: ["tenant_id", "product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "wishlist_items_tenant_id_product_id_fkey"
            columns: ["tenant_id", "product_id"]
            isOneToOne: false
            referencedRelation: "storefront_catalog_products"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "wishlist_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      owner_product_catalog: {
        Row: {
          available_quantity: number | null
          base_price: number | null
          created_at: string | null
          description: string | null
          id: string | null
          image_url: string | null
          is_demo_data: boolean | null
          name: string | null
          reserved_quantity: number | null
          sku: string | null
          status: Database["public"]["Enums"]["product_status"] | null
          stock_quantity: number | null
          tenant_id: string | null
          updated_at: string | null
          weight_grams: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      storefront_catalog_categories: {
        Row: {
          description: string | null
          id: string | null
          image_path: string | null
          name: string | null
          parent_id: string | null
          public_slug: string | null
          slug: string | null
          sort_order: number | null
          tenant_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_categories_tenant_id_parent_id_fkey"
            columns: ["tenant_id", "parent_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "product_categories_tenant_id_parent_id_fkey"
            columns: ["tenant_id", "parent_id"]
            isOneToOne: false
            referencedRelation: "storefront_catalog_categories"
            referencedColumns: ["tenant_id", "id"]
          },
        ]
      }
      storefront_catalog_collections: {
        Row: {
          cover_path: string | null
          description: string | null
          id: string | null
          public_slug: string | null
          section_type: string | null
          slug: string | null
          sort_order: number | null
          tenant_id: string | null
          title: string | null
        }
        Relationships: [
          {
            foreignKeyName: "storefront_collections_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      storefront_catalog_media: {
        Row: {
          alt_text: string | null
          caption: string | null
          id: string | null
          is_cover: boolean | null
          media_type: string | null
          product_id: string | null
          public_slug: string | null
          sort_order: number | null
          storage_bucket: string | null
          storage_path: string | null
          tenant_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_media_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_media_tenant_id_product_id_fkey"
            columns: ["tenant_id", "product_id"]
            isOneToOne: false
            referencedRelation: "owner_product_catalog"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "product_media_tenant_id_product_id_fkey"
            columns: ["tenant_id", "product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "product_media_tenant_id_product_id_fkey"
            columns: ["tenant_id", "product_id"]
            isOneToOne: false
            referencedRelation: "storefront_catalog_products"
            referencedColumns: ["tenant_id", "id"]
          },
        ]
      }
      storefront_catalog_products: {
        Row: {
          compare_at_price: number | null
          currency_code: string | null
          current_price: number | null
          description: string | null
          id: string | null
          image_url: string | null
          name: string | null
          offer_ends_at: string | null
          public_slug: string | null
          sku: string | null
          status: Database["public"]["Enums"]["product_status"] | null
          tenant_id: string | null
          weight_grams: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      storefront_catalog_variants: {
        Row: {
          available_quantity: number | null
          id: string | null
          image_path: string | null
          option_values: Json | null
          product_id: string | null
          public_slug: string | null
          sku: string | null
          tenant_id: string | null
          weight_grams: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_tenant_id_product_id_fkey"
            columns: ["tenant_id", "product_id"]
            isOneToOne: false
            referencedRelation: "owner_product_catalog"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "product_variants_tenant_id_product_id_fkey"
            columns: ["tenant_id", "product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "product_variants_tenant_id_product_id_fkey"
            columns: ["tenant_id", "product_id"]
            isOneToOne: false
            referencedRelation: "storefront_catalog_products"
            referencedColumns: ["tenant_id", "id"]
          },
        ]
      }
    }
    Functions: {
      checkout_storefront_cart: {
        Args: {
          p_address_id: string
          p_cart_id: string
          p_coupon_code?: string
          p_idempotency_key?: string
          p_public_slug: string
          p_referral_code?: string
          p_shipping_rate_id: string
        }
        Returns: {
          order_id: string
          order_number: string
          payment_status: string
          total_amount: number
        }[]
      }
    }
    Enums: {
      asset_status: "draft" | "published" | "archived"
      asset_type: "image" | "video" | "copywriting" | "document"
      fulfillment_type: "self" | "dropship"
      membership_role: "owner" | "reseller"
      order_status:
        | "awaiting_payment"
        | "payment_review"
        | "paid"
        | "processing"
        | "shipped"
        | "delivered"
        | "completed"
        | "cancelled"
        | "refunded"
      payment_status:
        | "unpaid"
        | "submitted"
        | "verified"
        | "rejected"
        | "refunded"
      payout_status:
        | "requested"
        | "approved"
        | "rejected"
        | "processing"
        | "paid"
        | "cancelled"
      product_status: "draft" | "active" | "archived"
      reseller_tier: "dropshipper" | "agen" | "distributor"
      wallet_transaction_status: "pending" | "posted" | "voided"
      wallet_transaction_type:
        | "commission_pending"
        | "commission_available"
        | "payout_hold"
        | "payout"
        | "adjustment"
        | "refund"
        | "reversal"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      asset_status: ["draft", "published", "archived"],
      asset_type: ["image", "video", "copywriting", "document"],
      fulfillment_type: ["self", "dropship"],
      membership_role: ["owner", "reseller"],
      order_status: [
        "awaiting_payment",
        "payment_review",
        "paid",
        "processing",
        "shipped",
        "delivered",
        "completed",
        "cancelled",
        "refunded",
      ],
      payment_status: [
        "unpaid",
        "submitted",
        "verified",
        "rejected",
        "refunded",
      ],
      payout_status: [
        "requested",
        "approved",
        "rejected",
        "processing",
        "paid",
        "cancelled",
      ],
      product_status: ["draft", "active", "archived"],
      reseller_tier: ["dropshipper", "agen", "distributor"],
      wallet_transaction_status: ["pending", "posted", "voided"],
      wallet_transaction_type: [
        "commission_pending",
        "commission_available",
        "payout_hold",
        "payout",
        "adjustment",
        "refund",
        "reversal",
      ],
    },
  },
} as const
