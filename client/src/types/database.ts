export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          avatar_url: string | null;
          role: 'user' | 'admin';
          is_suspended: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string;
          avatar_url?: string | null;
          role?: 'user' | 'admin';
          is_suspended?: boolean;
        };
        Update: {
          full_name?: string;
          avatar_url?: string | null;
          role?: 'user' | 'admin';
          is_suspended?: boolean;
        };
      };
      categories: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          image_url: string | null;
          is_active: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          name: string;
          slug: string;
          description?: string | null;
          image_url?: string | null;
          is_active?: boolean;
          sort_order?: number;
        };
        Update: {
          name?: string;
          slug?: string;
          description?: string | null;
          image_url?: string | null;
          is_active?: boolean;
          sort_order?: number;
        };
      };
      products: {
        Row: {
          id: string;
          title: string;
          slug: string;
          description: string;
          product_details: string | null;
          platform: 'instagram' | 'facebook' | 'tiktok' | 'x' | 'youtube' | 'snapchat';
          price: number;
          stock: number;
          followers: number | null;
          following: number | null;
          account_age: string | null;
          country: string | null;
          niche: string | null;
          verified: boolean;
          featured: boolean;
          category_id: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          title: string;
          slug: string;
          description: string;
          product_details?: string | null;
          platform: 'instagram' | 'facebook' | 'tiktok' | 'x' | 'youtube' | 'snapchat';
          price: number;
          stock?: number;
          followers?: number | null;
          following?: number | null;
          account_age?: string | null;
          country?: string | null;
          niche?: string | null;
          verified?: boolean;
          featured?: boolean;
          category_id: string;
          is_active?: boolean;
        };
        Update: {
          title?: string;
          slug?: string;
          description?: string;
          product_details?: string | null;
          platform?: 'instagram' | 'facebook' | 'tiktok' | 'x' | 'youtube' | 'snapchat';
          price?: number;
          stock?: number;
          followers?: number | null;
          following?: number | null;
          account_age?: string | null;
          country?: string | null;
          niche?: string | null;
          verified?: boolean;
          featured?: boolean;
          category_id?: string;
          is_active?: boolean;
        };
      };
      product_images: {
        Row: { id: string; product_id: string; image_url: string; sort_order: number; created_at: string };
        Insert: { product_id: string; image_url: string; sort_order?: number };
        Update: { image_url?: string; sort_order?: number };
      };
      carts: {
        Row: { id: string; user_id: string; created_at: string; updated_at: string };
        Insert: { user_id: string };
        Update: Record<string, never>;
      };
      cart_items: {
        Row: { id: string; cart_id: string; product_id: string; quantity: number; created_at: string };
        Insert: { cart_id: string; product_id: string; quantity?: number };
        Update: { quantity?: number };
      };
      orders: {
        Row: {
          id: string;
          order_number: string;
          user_id: string;
          total_amount: number;
          discount_amount: number;
          status: 'pending' | 'processing' | 'completed' | 'cancelled' | 'refunded';
          payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
          coupon_id: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          total_amount: number;
          discount_amount?: number;
          status?: 'pending' | 'processing' | 'completed' | 'cancelled' | 'refunded';
          payment_status?: 'pending' | 'paid' | 'failed' | 'refunded';
          coupon_id?: string | null;
          notes?: string | null;
        };
        Update: {
          total_amount?: number;
          discount_amount?: number;
          status?: 'pending' | 'processing' | 'completed' | 'cancelled' | 'refunded';
          payment_status?: 'pending' | 'paid' | 'failed' | 'refunded';
          coupon_id?: string | null;
          notes?: string | null;
        };
      };
      order_items: {
        Row: { id: string; order_id: string; product_id: string; quantity: number; price: number; created_at: string };
        Insert: { order_id: string; product_id: string; quantity?: number; price: number };
        Update: { quantity?: number; price?: number };
      };
      wishlists: {
        Row: { id: string; user_id: string; product_id: string; created_at: string };
        Insert: { user_id: string; product_id: string };
        Update: Record<string, never>;
      };
      reviews: {
        Row: {
          id: string;
          user_id: string;
          product_id: string;
          rating: number;
          comment: string | null;
          is_approved: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: { user_id: string; product_id: string; rating: number; comment?: string | null };
        Update: { rating?: number; comment?: string | null; is_approved?: boolean };
      };
      coupons: {
        Row: {
          id: string;
          code: string;
          discount: number;
          discount_type: string;
          min_purchase: number | null;
          max_uses: number | null;
          used_count: number;
          expiry_date: string | null;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          code: string;
          discount: number;
          discount_type?: string;
          min_purchase?: number | null;
          max_uses?: number | null;
          expiry_date?: string | null;
          active?: boolean;
        };
        Update: {
          code?: string;
          discount?: number;
          discount_type?: string;
          min_purchase?: number | null;
          max_uses?: number | null;
          expiry_date?: string | null;
          active?: boolean;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          message: string;
          read: boolean;
          link: string | null;
          created_at: string;
        };
        Insert: { user_id: string; title: string; message: string; read?: boolean; link?: string | null };
        Update: { read?: boolean };
      };
      activity_logs: {
        Row: {
          id: string;
          user_id: string | null;
          action: string;
          entity: string | null;
          entity_id: string | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          user_id?: string | null;
          action: string;
          entity?: string | null;
          entity_id?: string | null;
          metadata?: Json | null;
        };
        Update: Record<string, never>;
      };
      support_tickets: {
        Row: {
          id: string;
          user_id: string | null;
          name: string | null;
          email: string;
          subject: string;
          description: string;
          status: 'open' | 'in_progress' | 'resolved';
          source: 'website_error' | 'login' | 'checkout' | 'dashboard' | 'other';
          page_url: string | null;
          error_message: string | null;
          browser_info: string | null;
          admin_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id?: string | null;
          name?: string | null;
          email: string;
          subject: string;
          description: string;
          status?: 'open' | 'in_progress' | 'resolved';
          source?: 'website_error' | 'login' | 'checkout' | 'dashboard' | 'other';
          page_url?: string | null;
          error_message?: string | null;
          browser_info?: string | null;
          admin_notes?: string | null;
        };
        Update: {
          name?: string | null;
          email?: string;
          subject?: string;
          description?: string;
          status?: 'open' | 'in_progress' | 'resolved';
          source?: 'website_error' | 'login' | 'checkout' | 'dashboard' | 'other';
          page_url?: string | null;
          error_message?: string | null;
          browser_info?: string | null;
          admin_notes?: string | null;
        };
      };
      blog_posts: {
        Row: {
          id: string;
          title: string;
          slug: string;
          content: string;
          excerpt: string | null;
          featured_image: string | null;
          author_id: string;
          published: boolean;
          published_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          title: string;
          slug: string;
          content: string;
          excerpt?: string | null;
          featured_image?: string | null;
          author_id: string;
          published?: boolean;
          published_at?: string | null;
        };
        Update: {
          title?: string;
          slug?: string;
          content?: string;
          excerpt?: string | null;
          featured_image?: string | null;
          published?: boolean;
          published_at?: string | null;
        };
      };
      faqs: {
        Row: {
          id: string;
          question: string;
          answer: string;
          category: string | null;
          sort_order: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          question: string;
          answer: string;
          category?: string | null;
          sort_order?: number;
          is_active?: boolean;
        };
        Update: {
          question?: string;
          answer?: string;
          category?: string | null;
          sort_order?: number;
          is_active?: boolean;
        };
      };
      testimonials: {
        Row: {
          id: string;
          name: string;
          role: string | null;
          company: string | null;
          content: string;
          avatar_url: string | null;
          rating: number;
          is_active: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          name: string;
          role?: string | null;
          company?: string | null;
          content: string;
          avatar_url?: string | null;
          rating?: number;
          is_active?: boolean;
          sort_order?: number;
        };
        Update: {
          name?: string;
          role?: string | null;
          company?: string | null;
          content?: string;
          avatar_url?: string | null;
          rating?: number;
          is_active?: boolean;
          sort_order?: number;
        };
      };
    };
    Enums: {
      user_role: 'user' | 'admin';
      order_status: 'pending' | 'processing' | 'completed' | 'cancelled' | 'refunded';
      payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
      platform_type: 'instagram' | 'facebook' | 'tiktok' | 'x' | 'youtube' | 'snapchat';
      support_ticket_status: 'open' | 'in_progress' | 'resolved';
      support_ticket_source: 'website_error' | 'login' | 'checkout' | 'dashboard' | 'other';
    };
  };
}
