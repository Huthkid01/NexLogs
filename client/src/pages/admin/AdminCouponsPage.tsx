import { useQuery } from '@tanstack/react-query';
import { Percent, Ticket } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { mockAdminService } from '@/mocks/mock-admin';

export default function AdminCouponsPage() {
  const { data: coupons, isLoading } = useQuery({
    queryKey: ['admin-coupons'],
    queryFn: mockAdminService.getCoupons,
  });

  if (isLoading) {
    return <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>;
  }

  const active = coupons?.filter((coupon) => coupon.active).length ?? 0;
  const totalUses = coupons?.reduce((sum, coupon) => sum + coupon.used_count, 0) ?? 0;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-xl sm:text-2xl font-bold">Coupons</h1>
        <p className="text-sm text-muted-foreground">Preview active promotions, usage, and discount structures.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <Ticket className="h-8 w-8 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Active Coupons</p>
              <p className="text-2xl font-bold">{active}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <Percent className="h-8 w-8 text-green-600" />
            <div>
              <p className="text-sm text-muted-foreground">Total Redemptions</p>
              <p className="text-2xl font-bold">{totalUses}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {coupons?.map((coupon) => (
          <Card key={coupon.id}>
            <CardContent className="p-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-2 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-base">{coupon.code}</p>
                  <Badge variant={coupon.active ? 'secondary' : 'destructive'}>
                    {coupon.active ? 'Active' : 'Expired'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {coupon.discount_type === 'percentage' ? `${coupon.discount}% off` : `$${coupon.discount} off`} with minimum purchase of ${coupon.min_purchase ?? 0}
                </p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Used</p>
                  <p className="font-semibold">{coupon.used_count}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Max Uses</p>
                  <p className="font-semibold">{coupon.max_uses ?? 'Unlimited'}</p>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <p className="text-muted-foreground">Expires</p>
                  <p className="font-semibold">{coupon.expiry_date ? new Date(coupon.expiry_date).toLocaleDateString() : 'No expiry'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
