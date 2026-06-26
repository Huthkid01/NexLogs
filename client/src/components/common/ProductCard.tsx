import { Link } from 'react-router-dom';
import { Heart, ShoppingCart, MapPin, Users, BadgeCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ProductIcon } from '@/components/common/ProductIcon';
import { useFormatDisplayPrice } from '@/hooks/useFormatDisplayPrice';
import { formatNumber } from '@/lib/utils';
import { PLATFORMS } from '@/constants';
import type { Product } from '@/types';

interface ProductCardProps {
  product: Product;
  onAddToCart?: (product: Product) => void;
  onToggleWishlist?: (product: Product) => void;
  isInWishlist?: boolean;
}

export function ProductCard({ product, onAddToCart, onToggleWishlist, isInWishlist }: ProductCardProps) {
  const platform = PLATFORMS.find((p) => p.value === product.platform);
  const { formatProductPrice } = useFormatDisplayPrice();

  return (
    <div className="group overflow-hidden rounded-xl border border-gray-200 bg-white hover:border-[#f26522]/50 transition-all duration-300 hover:shadow-md">
      <Link to="/marketplace">
        <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100">
          <div className="flex h-full w-full items-center justify-center">
            <ProductIcon product={product} className="h-24 w-24 transition-transform duration-500 group-hover:scale-105" />
          </div>
          <div className="absolute top-3 left-3 flex gap-2">
            {product.verified && (
              <Badge className="bg-[#f26522] text-white border-0 gap-1">
                <BadgeCheck className="h-3 w-3" /> Verified
              </Badge>
            )}
            {product.featured && (
              <Badge className="bg-[#f26522] text-white border-0">Featured</Badge>
            )}
          </div>
          {platform && (
            <div className={`absolute top-3 right-3 px-2 py-1 rounded-full text-xs font-medium bg-gradient-to-r ${platform.color} text-white`}>
              {platform.label}
            </div>
          )}
        </div>
      </Link>
      <div className="p-4 space-y-3">
        <Link to="/marketplace">
          <h3 className="font-semibold line-clamp-1 text-gray-900 group-hover:text-[#f26522] transition-colors">{product.title}</h3>
        </Link>
        <div className="flex items-center gap-3 text-sm text-gray-500">
          {product.followers && (
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {formatNumber(product.followers)}
            </span>
          )}
          {product.country && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {product.country}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between pt-1">
          <span className="text-xl font-bold text-[#f26522]">{formatProductPrice(product.price)}</span>
          <div className="flex gap-2">
            {onToggleWishlist && (
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => { e.preventDefault(); onToggleWishlist(product); }}
                className={isInWishlist ? 'text-red-500' : 'text-gray-400'}
              >
                <Heart className={`h-4 w-4 ${isInWishlist ? 'fill-current' : ''}`} />
              </Button>
            )}
            {onAddToCart && (
              <Button
                size="sm"
                className="bg-[#f26522] hover:bg-[#d94e0f] text-white"
                onClick={(e) => { e.preventDefault(); onAddToCart(product); }}
              >
                <ShoppingCart className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
