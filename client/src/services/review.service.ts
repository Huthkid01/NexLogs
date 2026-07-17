import { supabase } from '@/lib/supabase';
import type { Review } from '@/types';

export interface AdminReview extends Omit<Review, 'profile' | 'product'> {
  order?: {
    id: string;
    order_number: string;
    created_at: string;
  } | null;
  product?: {
    id: string;
    title: string;
    slug: string;
  } | null;
  profile?: {
    full_name: string;
    email: string;
  } | null;
}

export interface PublicReviewFomo {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  profile: { full_name: string } | null;
  product: { title: string } | null;
}

export const reviewService = {
  async getByOrderId(orderId: string): Promise<Review | null> {
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('order_id', orderId)
      .maybeSingle();

    if (error) throw error;
    return (data as Review | null) ?? null;
  },

  async getReviewsForOrders(orderIds: string[]): Promise<Record<string, Review>> {
    if (!orderIds.length) return {};

    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .in('order_id', orderIds);

    if (error) throw error;

    const map: Record<string, Review> = {};
    for (const row of data ?? []) {
      const review = row as Review;
      if (review.order_id) {
        map[review.order_id] = review;
      }
    }
    return map;
  },

  async getApprovedFomoReviews(): Promise<PublicReviewFomo[]> {
    const { data, error } = await supabase
      .from('reviews')
      .select(`
        id,
        rating,
        comment,
        created_at,
        profile:profiles(full_name),
        product:products(title)
      `)
      .eq('is_approved', true)
      .order('created_at', { ascending: false })
      .limit(12);

    if (error) throw error;

    return (data ?? []).map((row) => {
      const review = row as Omit<PublicReviewFomo, 'profile' | 'product'> & {
        profile?: PublicReviewFomo['profile'] | PublicReviewFomo['profile'][];
        product?: PublicReviewFomo['product'] | PublicReviewFomo['product'][];
      };

      return {
        ...review,
        profile: Array.isArray(review.profile) ? review.profile[0] ?? null : review.profile ?? null,
        product: Array.isArray(review.product) ? review.product[0] ?? null : review.product ?? null,
      };
    });
  },

  async submitReview(input: {
    orderId: string;
    productId: string;
    rating: number;
    comment?: string;
  }): Promise<Review> {
    const { data: session } = await supabase.auth.getSession();
    const userId = session.session?.user?.id;
    if (!userId) throw new Error('Not authenticated');

    const rating = Math.min(5, Math.max(1, Math.round(input.rating)));
    const comment = input.comment?.trim() || null;

    const { data, error } = await supabase
      .from('reviews')
      .insert({
        user_id: userId,
        product_id: input.productId,
        order_id: input.orderId,
        rating,
        comment,
        is_approved: false,
      } as never)
      .select()
      .single();

    if (error) throw error;
    return data as Review;
  },

  async getAllAdmin(): Promise<AdminReview[]> {
    const { data, error } = await supabase
      .from('reviews')
      .select(`
        *,
        profile:profiles(full_name, email),
        product:products(id, title, slug),
        order:orders(id, order_number, created_at)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data ?? []).map((row) => {
      const review = row as AdminReview & {
        profile?: AdminReview['profile'] | AdminReview['profile'][];
        product?: AdminReview['product'] | AdminReview['product'][];
        order?: AdminReview['order'] | AdminReview['order'][];
      };

      return {
        ...review,
        profile: Array.isArray(review.profile) ? review.profile[0] ?? null : review.profile ?? null,
        product: Array.isArray(review.product) ? review.product[0] ?? null : review.product ?? null,
        order: Array.isArray(review.order) ? review.order[0] ?? null : review.order ?? null,
      };
    });
  },

  async setApproved(reviewId: string, isApproved: boolean): Promise<void> {
    const { error } = await supabase
      .from('reviews')
      .update({ is_approved: isApproved } as never)
      .eq('id', reviewId);

    if (error) throw error;
  },

  async deleteReview(reviewId: string): Promise<void> {
    const { error } = await supabase.from('reviews').delete().eq('id', reviewId);
    if (error) throw error;
  },
};
