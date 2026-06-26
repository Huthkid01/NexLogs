export type UserRole = 'user' | 'admin';
export type OrderStatus = 'pending' | 'processing' | 'completed' | 'cancelled' | 'refunded';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';
export type PlatformType = 'instagram' | 'facebook' | 'tiktok' | 'x' | 'youtube' | 'snapchat';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  role: UserRole;
  is_suspended: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  title: string;
  slug: string;
  description: string;
  product_details?: string | null;
  preview_url?: string | null;
  platform: PlatformType;
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
  sort_order: number;
  created_at: string;
  updated_at: string;
  category?: Category;
  product_images?: ProductImage[];
  reviews?: Review[];
}

export interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
  sort_order: number;
  created_at: string;
}

export interface Cart {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  cart_items?: CartItem[];
}

export interface CartItem {
  id: string;
  cart_id: string;
  product_id: string;
  quantity: number;
  created_at: string;
  product?: Product;
}

export interface Order {
  id: string;
  order_number: string;
  user_id: string;
  total_amount: number;
  discount_amount: number;
  status: OrderStatus;
  payment_status: PaymentStatus;
  coupon_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  order_items?: OrderItem[];
  profile?: Pick<Profile, 'full_name' | 'email'> | null;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  price: number;
  delivered_details?: string | null;
  created_at: string;
  product?: Product;
}

export interface Wishlist {
  id: string;
  user_id: string;
  product_id: string;
  created_at: string;
  product?: Product;
}

export interface Review {
  id: string;
  user_id: string;
  product_id: string;
  rating: number;
  comment: string | null;
  is_approved: boolean;
  created_at: string;
  updated_at: string;
  profile?: Profile;
}

export interface Coupon {
  id: string;
  code: string;
  discount: number;
  discount_type: 'percentage' | 'fixed';
  min_purchase: number | null;
  max_uses: number | null;
  used_count: number;
  expiry_date: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  read: boolean;
  link: string | null;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  user_id: string | null;
  action: string;
  entity: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  profile?: Pick<Profile, 'full_name' | 'email' | 'role'> | null;
}

export interface BlogPost {
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
  author?: Profile;
}

export interface Faq {
  id: string;
  question: string;
  answer: string;
  category: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface Testimonial {
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
}

export interface ProductFilters {
  search?: string;
  platform?: PlatformType;
  country?: string;
  verified?: boolean;
  minPrice?: number;
  maxPrice?: number;
  categoryId?: string;
  sort?: 'newest' | 'oldest' | 'price_asc' | 'price_desc' | 'popular';
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ProfileStats {
  balance: number;
  total_purchases: number;
  total_spent: number;
}

export interface Transaction {
  id: string;
  ref: string;
  created_at: string;
  updated_at: string;
  payment_method: string;
  amount: number;
  status: 'completed' | 'pending' | 'failed';
}

export interface ReferralStats {
  code: string;
  total_referrals: number;
  qualified_referrals: number;
  total_earnings: number;
}

export interface SupportTicket {
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
}

export interface AdminStats {
  totalUsers: number;
  totalOrders: number;
  totalRevenue: number;
  totalProducts: number;
  openTickets: number;
  recentOrders: Order[];
}

export interface AdminAnalyticsSnapshot {
  revenueByWeek: { label: string; value: number }[];
  platformBreakdown: { label: string; value: number }[];
  topCountries: { label: string; value: number }[];
  orderStatusBreakdown: { label: string; value: number }[];
}
