import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { useModalLock } from '@/hooks/useModalLock';
import { StarRating, formatReviewRatingLabel } from '@/components/common/StarRating';
import { reviewService } from '@/services/review.service';

interface PurchaseReviewModalProps {
  open: boolean;
  onClose: () => void;
  orderId: string;
  productId: string;
  productTitle: string;
  onSubmitted?: () => void;
}

export function PurchaseReviewModal({
  open,
  onClose,
  orderId,
  productId,
  productTitle,
  onSubmitted,
}: PurchaseReviewModalProps) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  useModalLock(open, onClose);

  const submitReview = useMutation({
    mutationFn: () =>
      reviewService.submitReview({
        orderId,
        productId,
        rating,
        comment,
      }),
    onSuccess: () => {
      toast.success('Thanks for your review!');
      setRating(0);
      setComment('');
      onSubmitted?.();
      onClose();
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Could not submit review';
      if (message.toLowerCase().includes('duplicate') || message.toLowerCase().includes('unique')) {
        toast.message('You already reviewed this order.');
        onClose();
        return;
      }
      toast.error('Could not submit your review. Please try again.');
    },
  });

  const handleSubmit = () => {
    if (rating < 1) {
      toast.error('Please select a star rating');
      return;
    }
    submitReview.mutate();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/55"
        onClick={onClose}
        aria-label="Close review modal"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="purchase-review-title"
        className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-dm-surface"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="purchase-review-title" className="text-lg font-bold text-gray-900 dark:text-gray-100">
              Rate your purchase
            </h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{productTitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6 space-y-2 text-center">
          <StarRating value={rating} onChange={setRating} size="md" className="justify-center" />
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 min-h-[20px]">
            {rating > 0 ? formatReviewRatingLabel(rating) : 'Tap a star to rate'}
          </p>
        </div>

        <div className="mt-5">
          <label htmlFor="review-comment" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Comment (optional)
          </label>
          <textarea
            id="review-comment"
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            rows={4}
            maxLength={500}
            placeholder="Tell us about your experience..."
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#f26522]/30 dark:border-dm-border dark:bg-dm-product-row dark:text-gray-100"
          />
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-md border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-50 dark:border-dm-border dark:text-gray-100 dark:hover:bg-dm-product-row"
          >
            Maybe later
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitReview.isPending || rating < 1}
            className="flex-1 rounded-md bg-[#f26522] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#d94e0f] disabled:opacity-60"
          >
            {submitReview.isPending ? 'Submitting...' : 'Submit review'}
          </button>
        </div>
      </div>
    </div>
  );
}
