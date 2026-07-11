import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageSquareQuote, Star, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { StarRating } from '@/components/common/StarRating';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';
import { reviewService } from '@/services/review.service';

export default function AdminReviewsPage() {
  const queryClient = useQueryClient();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const { data: reviews, isLoading } = useQuery({
    queryKey: ['admin-reviews'],
    queryFn: reviewService.getAllAdmin,
  });

  const averageRating = useMemo(() => {
    if (!reviews?.length) return 0;
    const total = reviews.reduce((sum, review) => sum + review.rating, 0);
    return Math.round((total / reviews.length) * 10) / 10;
  }, [reviews]);

  const updateApproval = useMutation({
    mutationFn: ({ id, isApproved }: { id: string; isApproved: boolean }) =>
      reviewService.setApproved(id, isApproved),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });
      toast.success('Review updated');
    },
    onError: () => toast.error('Failed to update review'),
  });

  const deleteReview = useMutation({
    mutationFn: (id: string) => reviewService.deleteReview(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });
      toast.success('Review deleted');
    },
    onError: () => toast.error('Failed to delete review'),
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-28 rounded-2xl" />
        ))}
      </div>
    );
  }

  const pendingCount = reviews?.filter((review) => !review.is_approved).length ?? 0;

  return (
    <div className={cn('space-y-6', isDark ? 'text-slate-100' : 'text-slate-900')}>
      <div className="space-y-2">
        <h1 className="admin-heading text-3xl font-semibold sm:text-4xl">Customer reviews</h1>
        <p className={cn('text-sm', isDark ? 'text-slate-400' : 'text-slate-600')}>
          See star ratings and comments from buyers after they purchase products.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className={cn(isDark ? 'border-[#18263b] bg-[#0b1628]' : 'border-slate-200 bg-white')}>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/15 text-amber-300">
              <Star className="h-6 w-6" />
            </div>
            <div>
              <p className={cn('text-sm', isDark ? 'text-slate-400' : 'text-slate-500')}>Average rating</p>
              <p className="text-2xl font-semibold">{averageRating || '—'}</p>
            </div>
          </CardContent>
        </Card>
        <Card className={cn(isDark ? 'border-[#18263b] bg-[#0b1628]' : 'border-slate-200 bg-white')}>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/15 text-blue-300">
              <MessageSquareQuote className="h-6 w-6" />
            </div>
            <div>
              <p className={cn('text-sm', isDark ? 'text-slate-400' : 'text-slate-500')}>Total reviews</p>
              <p className="text-2xl font-semibold">{reviews?.length ?? 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card className={cn(isDark ? 'border-[#18263b] bg-[#0b1628]' : 'border-slate-200 bg-white')}>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500/15 text-orange-300">
              <Star className="h-6 w-6" />
            </div>
            <div>
              <p className={cn('text-sm', isDark ? 'text-slate-400' : 'text-slate-500')}>Pending approval</p>
              <p className="text-2xl font-semibold">{pendingCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {reviews?.length ? (
          reviews.map((review) => (
            <Card
              key={review.id}
              className={cn(isDark ? 'border-[#18263b] bg-[#0a1527]' : 'border-slate-200 bg-white')}
            >
              <CardContent className="space-y-4 p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <StarRating value={review.rating} size="sm" />
                      <Badge variant={review.is_approved ? 'success' : 'warning'}>
                        {review.is_approved ? 'Approved' : 'Pending'}
                      </Badge>
                    </div>
                    <div>
                      <p className="font-semibold">{review.product?.title ?? 'Unknown product'}</p>
                      <p className={cn('text-sm mt-1', isDark ? 'text-slate-400' : 'text-slate-600')}>
                        {review.profile?.full_name || 'Customer'} · {review.profile?.email}
                      </p>
                      {review.order?.order_number ? (
                        <p className={cn('text-xs mt-1', isDark ? 'text-slate-500' : 'text-slate-500')}>
                          Order {review.order.order_number} · {new Date(review.created_at).toLocaleString()}
                        </p>
                      ) : (
                        <p className={cn('text-xs mt-1', isDark ? 'text-slate-500' : 'text-slate-500')}>
                          {new Date(review.created_at).toLocaleString()}
                        </p>
                      )}
                    </div>
                    {review.comment ? (
                      <p className={cn('text-sm leading-relaxed rounded-lg px-3 py-2', isDark ? 'bg-[#0f1b2e] text-slate-300' : 'bg-slate-50 text-slate-700')}>
                        {review.comment}
                      </p>
                    ) : (
                      <p className={cn('text-sm italic', isDark ? 'text-slate-500' : 'text-slate-500')}>No written comment.</p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 shrink-0">
                    {!review.is_approved ? (
                      <Button
                        type="button"
                        size="sm"
                        className="bg-[#f26522] hover:bg-[#d94e0f]"
                        disabled={updateApproval.isPending}
                        onClick={() => updateApproval.mutate({ id: review.id, isApproved: true })}
                      >
                        Approve
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={updateApproval.isPending}
                        onClick={() => updateApproval.mutate({ id: review.id, isApproved: false })}
                      >
                        Unapprove
                      </Button>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className={cn(isDark ? 'border-red-500/30 text-red-300 hover:bg-red-500/10' : 'border-red-200 text-red-700 hover:bg-red-50')}
                      disabled={deleteReview.isPending}
                      onClick={() => deleteReview.mutate(review.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className={cn(isDark ? 'border-[#18263b] bg-[#0a1527]' : 'border-slate-200 bg-white')}>
            <CardContent className="p-10 text-center">
              <p className={cn('text-sm', isDark ? 'text-slate-400' : 'text-slate-600')}>No customer reviews yet.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
