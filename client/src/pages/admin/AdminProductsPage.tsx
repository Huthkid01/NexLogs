import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Package2, Pencil, Plus, Trash2, X } from 'lucide-react';
import { DeleteConfirmModal } from '@/components/admin/DeleteConfirmModal';
import { AdminDualCurrencyPriceInput } from '@/components/admin/AdminDualCurrencyPriceInput';
import { ProductBuyerDetailsEditor } from '@/components/admin/ProductBuyerDetailsEditor';
import { AdminScrollTable, AdminScrollTableRow } from '@/components/admin/AdminScrollTable';
import { ProductIcon, ProductIconBySlug } from '@/components/common/ProductIcon';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { categoryService, productService } from '@/services';
import { supabase } from '@/lib/supabase';
import { applyRdpProductToCatalog, removeRdpProductFromCatalog } from '@/lib/rdp-live-catalog';
import { useSiteContent } from '@/hooks/useSiteContent';
import { getPlatformFromCategory, resolveCategoryIconUrl, resolveProductIconUrl } from '@/lib/platform-icons';
import { isRdpProduct, isRdpFormProduct } from '@/lib/rdp-utils';
import {
  buildTelegramPlaceholderInventory,
  getTelegramPendingDetailsMessage,
  isTelegramFormProduct,
  isTelegramPlaceholderInventory,
  isTelegramProduct,
  TELEGRAM_PRE_PURCHASE_INSTRUCTIONS,
} from '@/lib/telegram-utils';
import { countProductDetailLines, normalizeProductDetailsStorage } from '@/lib/product-details';
import {
  adminActionIconButtonClass,
  adminIconButtonClass,
  adminInputClass,
  adminMainCardClass,
  adminModalClass,
  adminModalOverlayClass,
  adminModalSectionClass,
  adminMutedTextClass,
  adminOutlineButtonClass,
  adminPageClass,
  adminPlatformIconWrapClass,
  adminStrongTextClass,
  adminSubtleTextClass,
} from '@/lib/admin-theme';
import { useTheme } from '@/hooks/useTheme';
import { cn, formatPrice } from '@/lib/utils';
import { toast } from 'sonner';
import type { PlatformType, Product } from '@/types';

const PLATFORM_OPTIONS: PlatformType[] = ['instagram', 'facebook', 'tiktok', 'x', 'youtube', 'snapchat'];

interface ProductFormState {
  title: string;
  slug: string;
  platform: PlatformType;
  category_id: string;
  price: string;
  stock: string;
  country: string;
  niche: string;
  account_age: string;
  followers: string;
  following: string;
  description: string;
  login_instructions: string;
  product_details: string;
  preview_url: string;
  featured: boolean;
  verified: boolean;
  is_active: boolean;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function createEmptyForm(categoryId = ''): ProductFormState {
  return {
    title: '',
    slug: '',
    platform: 'instagram',
    category_id: categoryId,
    price: '',
    stock: '',
    country: '',
    niche: '',
    account_age: '',
    followers: '',
    following: '',
    description: '',
    login_instructions: '',
    product_details: '',
    preview_url: '',
    featured: false,
    verified: false,
    is_active: true,
  };
}

function createFormFromProduct(product: Product): ProductFormState {
  const normalizedDetails = normalizeProductDetailsStorage(product.product_details);
  const isTelegram = isTelegramFormProduct({
    slug: product.slug,
    title: product.title,
    niche: product.niche,
    categorySlug: product.category?.slug,
  });

  return {
    title: product.title,
    slug: product.slug,
    platform: product.platform,
    category_id: product.category_id,
    price: String(product.price),
    stock: String(product.stock),
    country: product.country ?? '',
    niche: product.niche ?? '',
    account_age: product.account_age ?? '',
    followers: product.followers != null ? String(product.followers) : '',
    following: product.following != null ? String(product.following) : '',
    description: product.description,
    login_instructions: product.login_instructions ?? '',
    product_details:
      isTelegram && isTelegramPlaceholderInventory(normalizedDetails) ? '' : normalizedDetails,
    preview_url: product.preview_url ?? '',
    featured: product.featured,
    verified: product.verified,
    is_active: product.is_active,
  };
}

function productSkipsBuyerCopyLines(
  input: {
    slug?: string | null;
    title?: string | null;
    niche?: string | null;
    categorySlug?: string | null;
  },
  editingProduct?: Product | null,
) {
  if (isRdpFormProduct(input) || isTelegramFormProduct(input)) return true;
  if (!editingProduct) return false;
  return isRdpProduct(editingProduct) || isTelegramProduct(editingProduct);
}

function buildProductPayload(
  form: ProductFormState,
  categorySlug?: string | null,
  editingProduct?: Product | null,
) {
  const skipsBuyerCopyLines = productSkipsBuyerCopyLines(
    { slug: form.slug, title: form.title, niche: form.niche, categorySlug },
    editingProduct,
  );
  const isTelegram = isTelegramFormProduct({
    slug: form.slug,
    title: form.title,
    niche: form.niche,
    categorySlug,
  }) || Boolean(editingProduct && isTelegramProduct(editingProduct));
  const isRdp = isRdpFormProduct({ slug: form.slug, niche: form.niche, categorySlug })
    || Boolean(editingProduct && isRdpProduct(editingProduct));
  const detailLineCount = skipsBuyerCopyLines ? 0 : countProductDetailLines(form.product_details);
  const stockValue = isRdp || isTelegram || detailLineCount === 0 ? Number(form.stock) : detailLineCount;
  const productDetails = isTelegram
    ? stockValue > 0
      ? buildTelegramPlaceholderInventory(stockValue)
      : ''
    : normalizeProductDetailsStorage(form.product_details);

  return {
    title: form.title.trim(),
    slug: slugify(form.slug || form.title),
    platform: form.platform,
    category_id: form.category_id,
    price: Number(form.price),
    stock: stockValue,
    country: form.country.trim() || null,
    niche: form.niche.trim() || null,
    account_age: form.account_age.trim() || null,
    followers: form.followers ? Number(form.followers) : null,
    following: form.following ? Number(form.following) : null,
    description: form.description.trim(),
    login_instructions: form.login_instructions.trim() || null,
    product_details: productDetails,
    preview_url: form.preview_url.trim() || null,
    featured: form.featured,
    verified: form.verified,
    is_active: form.is_active,
  };
}

const PRODUCT_TABLE_GRID =
  'grid-cols-[minmax(240px,2fr)_minmax(120px,1fr)_minmax(100px,0.9fr)_minmax(100px,0.9fr)_100px]';

export default function AdminProductsPage() {
  const queryClient = useQueryClient();
  const { theme } = useTheme();
  const { content, setContent } = useSiteContent();
  const isDark = theme === 'dark';
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productPendingDelete, setProductPendingDelete] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductFormState>(() => createEmptyForm());

  const { data: products, isLoading } = useQuery({
    queryKey: ['admin-products'],
    queryFn: productService.getAllAdmin,
  });

  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: categoryService.getAllAdmin,
  });

  const selectedCategory = categories?.find((category) => category.id === form.category_id);
  const isRdpForm = isRdpFormProduct({
    slug: form.slug,
    niche: form.niche,
    categorySlug: selectedCategory?.slug,
  });
  const isTelegramForm = isTelegramFormProduct({
    slug: form.slug,
    title: form.title,
    niche: form.niche,
    categorySlug: selectedCategory?.slug,
  }) || Boolean(editingProduct && isTelegramProduct(editingProduct));
  const skipsBuyerCopyLines = productSkipsBuyerCopyLines(
    {
      slug: form.slug,
      title: form.title,
      niche: form.niche,
      categorySlug: selectedCategory?.slug,
    },
    editingProduct,
  );
  const detailLineCount = skipsBuyerCopyLines ? 0 : countProductDetailLines(form.product_details);
  const productIconUrl =
    resolveCategoryIconUrl(selectedCategory) ||
    resolveProductIconUrl({ slug: form.slug, platform: form.platform, category: selectedCategory });

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return products ?? [];

    return (products ?? []).filter((product) => {
      const categoryName = product.category?.name ?? '';
      return [product.title, product.slug, product.platform, categoryName]
        .join(' ')
        .toLowerCase()
        .includes(term);
    });
  }, [products, search]);

  const saveProduct = useMutation({
    mutationFn: async ({ payload }: { payload: ReturnType<typeof buildProductPayload> }) => {
      const selectedCategory = categories?.find((category) => category.id === payload.category_id);
      const iconUrl =
        resolveCategoryIconUrl(selectedCategory) ||
        resolveProductIconUrl({
          slug: payload.slug,
          platform: payload.platform,
          category: selectedCategory,
        });

      const saved = editingProduct
        ? await productService.update(editingProduct.id, payload)
        : await productService.create(payload);

      if (iconUrl) {
        await supabase.from('product_images').delete().eq('product_id', saved.id).eq('sort_order', 0);
        const { error } = await supabase.from('product_images').insert({ product_id: saved.id, image_url: iconUrl, sort_order: 0 } as never);
        if (error) throw error;
      }

      return saved;
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['home-products'] });
      queryClient.invalidateQueries({ queryKey: ['featured-products'] });
      queryClient.invalidateQueries({ queryKey: ['rdp-products'] });
      if (isRdpProduct(saved)) {
        setContent({
          ...content,
          rdp: applyRdpProductToCatalog(content.rdp, saved),
        });
      }
      toast.success(editingProduct ? 'Product updated' : 'Product created');
      setIsModalOpen(false);
      setEditingProduct(null);
    },
  });

  const deleteProduct = useMutation({
    mutationFn: (product: Product) => productService.delete(product.id),
    onSuccess: (result, product) => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['home-products'] });
      queryClient.invalidateQueries({ queryKey: ['featured-products'] });
      queryClient.invalidateQueries({ queryKey: ['rdp-products'] });
      if (isRdpProduct(product)) {
        const remaining = (products ?? []).filter((entry) => entry.id !== product.id);
        setContent({
          ...content,
          rdp: removeRdpProductFromCatalog(content.rdp, product.slug, remaining),
        });
      }
      toast.success(result.archived ? 'Product archived (it has past orders)' : 'Product deleted');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Could not delete product');
    },
  });

  const openCreateModal = () => {
    setEditingProduct(null);
    setForm(createEmptyForm(categories?.[0]?.id ?? ''));
    setIsModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setForm(createFormFromProduct(product));
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (saveProduct.isPending) return;
    setIsModalOpen(false);
    setEditingProduct(null);
  };

  const submitProduct = (event: { preventDefault: () => void }) => {
    event.preventDefault();

    if (!form.title.trim() || !form.category_id || !form.price || !form.description.trim()) {
      toast.error('Fill in the required product fields first.');
      return;
    }

    if (!skipsBuyerCopyLines && detailLineCount === 0) {
      toast.error('Fill in the required product details first. Add at least one buyer copy line.');
      return;
    }

    saveProduct.mutate({
      payload: buildProductPayload(form, selectedCategory?.slug, editingProduct),
    });
  };

  if (isLoading || categoriesLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
    );
  }

  return (
    <>
      <div className={cn('space-y-6', adminPageClass(isDark))}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <h1 className="admin-heading text-3xl font-semibold sm:text-4xl">Product management</h1>
            <p className="admin-muted text-sm">Add new products, edit listing details, and keep your catalog organized from one screen.</p>
          </div>
          <Button className="w-full bg-[#f26522] hover:bg-[#d94e0f] sm:w-auto" onClick={openCreateModal}>
            <Plus className="h-4 w-4" />
            Add Product
          </Button>
        </div>

        <Card className={adminMainCardClass(isDark)}>
          <CardContent className="space-y-5 p-6">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
              <div>
                <p className={cn('text-xs font-semibold uppercase tracking-[0.18em]', adminSubtleTextClass(isDark))}>Catalog</p>
                <p className={cn('mt-2 text-2xl font-semibold', adminStrongTextClass(isDark))}>{filteredProducts.length}</p>
                <p className={cn('mt-1 text-sm', adminMutedTextClass(isDark))}>Products currently visible in this admin list.</p>
              </div>
              <div className="flex items-end">
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by title, slug, platform, or category"
                  className={adminInputClass(isDark)}
                />
              </div>
            </div>

            <AdminScrollTable
              columns={['Product', 'Category', 'Price', 'Status', 'Actions']}
              gridClassName={PRODUCT_TABLE_GRID}
              minWidthClassName="min-w-[52rem]"
              emptyState={
                !filteredProducts.length ? (
                  <div className="px-5 py-12 text-center">
                    <Package2 className={cn('mx-auto h-10 w-10', isDark ? 'text-slate-600' : 'text-slate-400')} />
                    <p className={cn('mt-4 text-lg font-medium', adminStrongTextClass(isDark))}>No products found</p>
                    <p className={cn('mt-2 text-sm', adminMutedTextClass(isDark))}>Try a different search or add a new product.</p>
                  </div>
                ) : null
              }
            >
              {filteredProducts.map((product) => (
                <AdminScrollTableRow key={product.id} gridClassName={PRODUCT_TABLE_GRID}>
                  <div className="flex min-w-[240px] items-start gap-4">
                    <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center', adminPlatformIconWrapClass(isDark))}>
                      <ProductIcon product={product} size="md" className="h-7 w-7" />
                    </div>
                    <div className="min-w-0">
                      <p className={cn('font-medium', adminStrongTextClass(isDark))}>{product.title}</p>
                      <p className={cn('mt-1 text-sm', adminMutedTextClass(isDark))}>{product.slug}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge variant="outline" className={isDark ? 'border-[#26354c] bg-[#0d1b2d] text-slate-200' : 'border-slate-200 bg-slate-50 text-slate-700'}>
                          {isRdpProduct(product) ? 'RDP' : product.platform}
                        </Badge>
                        {product.featured && (
                          <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-200">
                            Featured
                          </Badge>
                        )}
                        {product.verified && (
                          <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-200">
                            Verified
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="min-w-[120px]">
                    <p className={cn('text-sm font-medium', isDark ? 'text-slate-200' : 'text-slate-700')}>{product.category?.name ?? 'Unassigned'}</p>
                    <p className={cn('mt-1 text-xs', adminSubtleTextClass(isDark))}>Stock: {product.stock}</p>
                  </div>

                  <div className="min-w-[100px] whitespace-nowrap">
                    <p className={cn('font-medium', adminStrongTextClass(isDark))}>{formatPrice(product.price)}</p>
                    <p className={cn('mt-1 text-xs', adminSubtleTextClass(isDark))}>{product.country ?? 'Global'}</p>
                  </div>

                  <div className="min-w-[100px]">
                    <Badge
                      variant="outline"
                      className={product.is_active ? 'border-primary/30 bg-primary/10 text-orange-200' : isDark ? 'border-slate-600 bg-slate-700/20 text-slate-300' : 'border-slate-200 bg-slate-100 text-slate-600'}
                    >
                      {product.is_active ? 'Active' : 'Draft'}
                    </Badge>
                  </div>

                  <div className="flex min-w-[100px] items-center justify-end gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      className={cn(adminActionIconButtonClass(isDark), 'h-9 w-9')}
                      onClick={() => openEditModal(product)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-9 w-9 rounded-xl border border-red-500/20 bg-red-500/10 text-red-200 hover:bg-red-500/20"
                      onClick={() => setProductPendingDelete(product)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </AdminScrollTableRow>
              ))}
            </AdminScrollTable>
          </CardContent>
        </Card>
      </div>

      {isModalOpen && (
        <div className={adminModalOverlayClass(isDark)}>
          <div className={cn(adminModalClass(isDark), 'max-h-[85vh] overflow-y-auto')}>
            <div className={cn('flex items-start justify-between gap-4 border-b px-6 py-5', isDark ? 'border-[#18263b]' : 'border-slate-200')}>
              <div>
                <h2 className="admin-heading text-3xl font-semibold">{editingProduct ? 'Edit product' : 'Add product'}</h2>
                <p className={cn('mt-1 text-sm', adminMutedTextClass(isDark))}>Manage title, pricing, platform, and listing details from this modal.</p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className={adminIconButtonClass(isDark)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={submitProduct}>
              <div className="space-y-5 px-6 py-6">
                <section className={adminModalSectionClass(isDark)}>
                  <h3 className={cn('text-sm font-semibold', adminStrongTextClass(isDark))}>Basic information</h3>
                  <div className="mt-4">
                    <label className={cn('mb-2 block text-sm', adminMutedTextClass(isDark))}>Product icon</label>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <div className={cn(
                        'flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border',
                        isDark ? 'border-[#22324a] bg-[#06101d]' : 'border-slate-200 bg-slate-50',
                      )}>
                        {productIconUrl ? (
                          <img src={productIconUrl} alt="" className="h-10 w-10 object-contain" />
                        ) : (
                          <ProductIconBySlug
                            slug={form.slug}
                            platform={form.platform}
                            category={selectedCategory}
                            size="md"
                            className="h-10 w-10"
                          />
                        )}
                      </div>
                      <div className={cn(
                        'rounded-2xl border px-4 py-3 text-sm',
                        isDark ? 'border-[#22324a] bg-[#06101d] text-slate-300' : 'border-slate-200 bg-white text-slate-600',
                      )}>
                        {selectedCategory
                          ? selectedCategory.image_url
                            ? 'Uses the custom icon uploaded for this category.'
                            : `Uses the default ${selectedCategory.name} category icon.`
                          : 'Select a category to preview its icon.'}
                      </div>
                    </div>
                    <p className={cn('mt-2 text-xs', adminSubtleTextClass(isDark))}>
                      The product icon follows the selected category. Platform is synced automatically.
                    </p>
                  </div>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <label className={cn('mb-2 block text-sm', adminMutedTextClass(isDark))}>Product title</label>
                      <Input
                        value={form.title}
                        onChange={(event) => setForm((current) => ({ ...current, title: event.target.value, slug: slugify(event.target.value) }))}
                        className="admin-input"
                        placeholder="Premium TikTok Creator Account"
                      />
                    </div>
                    <div>
                      <label className={cn('mb-2 block text-sm', adminMutedTextClass(isDark))}>Slug</label>
                      <Input
                        value={form.slug}
                        onChange={(event) => setForm((current) => ({ ...current, slug: slugify(event.target.value) }))}
                        className="admin-input"
                        placeholder="premium-tiktok-creator-account"
                      />
                    </div>
                    <div>
                      <label className={cn('mb-2 block text-sm', adminMutedTextClass(isDark))}>Category</label>
                      <select
                        value={form.category_id}
                        onChange={(event) => {
                          const categoryId = event.target.value;
                          const category = categories?.find((item) => item.id === categoryId);
                          const isTelegramCategory = category?.slug === 'telegram';
                          const nextPlatform = category
                            ? getPlatformFromCategory(category.slug || category.name)
                            : null;

                          setForm((current) => ({
                            ...current,
                            category_id: categoryId,
                            platform: isTelegramCategory ? 'snapchat' : (nextPlatform ?? current.platform),
                            niche: isTelegramCategory ? 'Telegram' : current.niche,
                            login_instructions:
                              isTelegramCategory && !current.login_instructions.trim()
                                ? TELEGRAM_PRE_PURCHASE_INSTRUCTIONS
                                : current.login_instructions,
                            stock: isTelegramCategory && !current.stock.trim() ? '100' : current.stock,
                            product_details: isTelegramCategory ? '' : current.product_details,
                          }));
                        }}
                        className="admin-select"
                      >
                        <option value="">Select category</option>
                        {categories?.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                      {selectedCategory ? (
                        <p className={cn('mt-2 text-xs', adminSubtleTextClass(isDark))}>
                          {selectedCategory.name} icon will be used on this product.
                        </p>
                      ) : null}
                    </div>
                    <div>
                      <label className={cn('mb-2 block text-sm', adminMutedTextClass(isDark))}>Platform</label>
                      <select
                        value={form.platform}
                        onChange={(event) => setForm((current) => ({ ...current, platform: event.target.value as PlatformType }))}
                        className="admin-select"
                      >
                        {PLATFORM_OPTIONS.map((platform) => (
                          <option key={platform} value={platform}>
                            {platform}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <AdminDualCurrencyPriceInput
                        ngnAmount={Number(form.price) || 0}
                        onNgnChange={(price) => setForm((current) => ({ ...current, price: String(price) }))}
                        label="Price (NGN)"
                        isDark={isDark}
                      />
                    </div>
                    <div>
                      <label className={cn('mb-2 block text-sm', adminMutedTextClass(isDark))}>Stock</label>
                      <Input
                        type="number"
                        min="0"
                        value={isTelegramForm || detailLineCount === 0 ? form.stock : String(detailLineCount)}
                        onChange={(event) => setForm((current) => ({ ...current, stock: event.target.value }))}
                        className="admin-input"
                        placeholder={isTelegramForm ? '100' : '12'}
                        readOnly={!isTelegramForm && detailLineCount > 0}
                      />
                      {isTelegramForm ? (
                        <p className={cn('mt-2 text-xs', adminSubtleTextClass(isDark))}>
                          Available units for sale. Account details are pasted in Admin → Orders after each purchase.
                        </p>
                      ) : detailLineCount > 0 ? (
                        <p className={cn('mt-2 text-xs', adminSubtleTextClass(isDark))}>
                          Stock is synced to the number of buyer copy lines.
                        </p>
                      ) : null}
                    </div>
                    <div className="md:col-span-2">
                      <label className={cn('mb-2 block text-sm', adminMutedTextClass(isDark))}>Description</label>
                      <Textarea
                        value={form.description}
                        onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                        className="admin-textarea"
                        placeholder="Short summary shown in the marketplace list (e.g. account type, follower range)."
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className={cn('mb-2 block text-sm', adminMutedTextClass(isDark))}>
                        {isTelegramForm ? 'How to receive your order' : 'Login instructions'}
                      </label>
                      <Textarea
                        value={form.login_instructions}
                        onChange={(event) => setForm((current) => ({ ...current, login_instructions: event.target.value }))}
                        className="admin-textarea min-h-[140px]"
                        placeholder={'Step-by-step guide buyers see before purchase.\n\nExample:\n1. Open twitter.com/login\n2. Enter the email and password from your order\n3. Complete any verification prompt'}
                      />
                      <p className={cn('mt-2 text-xs', adminSubtleTextClass(isDark))}>
                        Shown when a customer clicks the product row. Use the short description above to tease this (e.g. &quot;Instructions on how to login are in details&quot;).
                      </p>
                    </div>
                    <div className="md:col-span-2">
                      <label className={cn('mb-2 block text-sm', adminMutedTextClass(isDark))}>Preview profile link</label>
                      <Input
                        type="url"
                        value={form.preview_url}
                        onChange={(event) => setForm((current) => ({ ...current, preview_url: event.target.value }))}
                        className="admin-input"
                        placeholder="https://instagram.com/username"
                      />
                      <p className={cn('mt-2 text-xs', adminSubtleTextClass(isDark))}>
                        Optional. Buyers see a Preview button only when this link is set.
                      </p>
                    </div>
                    <div className="md:col-span-2">
                      {isRdpForm ? (
                        <div className={cn(
                          'rounded-2xl border px-4 py-3 text-sm',
                          isDark ? 'border-[#22324a] bg-[#06101d] text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-600',
                        )}>
                          RDP products use manual fulfillment. After a buyer purchases, paste their credentials in Admin → Orders. Buyer copy lines are not required.
                        </div>
                      ) : isTelegramForm ? (
                        <div className="space-y-3">
                          <div className={cn(
                            'rounded-2xl border px-4 py-3 text-sm',
                            isDark ? 'border-[#22324a] bg-[#06101d] text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-600',
                          )}>
                            Telegram orders are fulfilled on Telegram support, not in Admin → Orders. Buyers see instructions to copy their Order ID from My Purchases and contact support using the floating Telegram button. Set stock above.
                          </div>
                          <div className={cn(
                            'rounded-xl border px-4 py-3 text-sm whitespace-pre-wrap',
                            isDark ? 'border-[#22324a] bg-[#06101d] text-slate-200' : 'border-slate-200 bg-white text-slate-700',
                          )}>
                            <p className={cn('text-xs font-semibold uppercase tracking-wide mb-2', adminSubtleTextClass(isDark))}>
                              What buyer sees in Product Details
                            </p>
                            {getTelegramPendingDetailsMessage()}
                          </div>
                        </div>
                      ) : (
                        <ProductBuyerDetailsEditor
                          key={editingProduct?.id ?? 'new-product'}
                          value={form.product_details}
                          onChange={(product_details, lineCount) => {
                            setForm((current) => ({
                              ...current,
                              product_details,
                              stock: lineCount > 0 ? String(lineCount) : current.stock,
                            }));
                          }}
                          isDark={isDark}
                        />
                      )}
                    </div>
                  </div>
                </section>

                <section className={adminModalSectionClass(isDark)}>
                  <h3 className={cn('text-sm font-semibold', adminStrongTextClass(isDark))}>Additional details</h3>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div>
                      <label className={cn('mb-2 block text-sm', adminMutedTextClass(isDark))}>Country</label>
                      <Input
                        value={form.country}
                        onChange={(event) => setForm((current) => ({ ...current, country: event.target.value }))}
                        className="admin-input"
                        placeholder="United States"
                      />
                    </div>
                    <div>
                      <label className={cn('mb-2 block text-sm', adminMutedTextClass(isDark))}>Niche</label>
                      <Input
                        value={form.niche}
                        onChange={(event) => setForm((current) => ({ ...current, niche: event.target.value }))}
                        className="admin-input"
                        placeholder="Business"
                      />
                    </div>
                    <div>
                      <label className={cn('mb-2 block text-sm', adminMutedTextClass(isDark))}>Account age</label>
                      <Input
                        value={form.account_age}
                        onChange={(event) => setForm((current) => ({ ...current, account_age: event.target.value }))}
                        className="admin-input"
                        placeholder="2 years"
                      />
                    </div>
                    <div>
                      <label className={cn('mb-2 block text-sm', adminMutedTextClass(isDark))}>Followers</label>
                      <Input
                        type="number"
                        min="0"
                        value={form.followers}
                        onChange={(event) => setForm((current) => ({ ...current, followers: event.target.value }))}
                        className="admin-input"
                        placeholder="5200"
                      />
                    </div>
                    <div>
                      <label className={cn('mb-2 block text-sm', adminMutedTextClass(isDark))}>Following</label>
                      <Input
                        type="number"
                        min="0"
                        value={form.following}
                        onChange={(event) => setForm((current) => ({ ...current, following: event.target.value }))}
                        className="admin-input"
                        placeholder="280"
                      />
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    {[
                      { key: 'featured', label: 'Featured listing' },
                      { key: 'verified', label: 'Verified account' },
                      { key: 'is_active', label: 'Visible on site' },
                    ].map((option) => (
                      <label key={option.key} className={cn(
                        'flex items-center gap-3 rounded-xl border px-4 py-3',
                        isDark ? 'border-[#18263b] bg-[#081624]' : 'border-slate-200 bg-white',
                      )}>
                        <input
                          type="checkbox"
                          checked={form[option.key as keyof ProductFormState] as boolean}
                          onChange={(event) => setForm((current) => ({ ...current, [option.key]: event.target.checked }))}
                          className={cn('h-4 w-4 rounded', isDark ? 'border-[#22324a] bg-[#06101d]' : 'border-slate-300 bg-white')}
                        />
                        <span className={cn('text-sm', isDark ? 'text-slate-200' : 'text-slate-700')}>{option.label}</span>
                      </label>
                    ))}
                  </div>
                </section>
              </div>

              <div className={cn(
                'flex flex-col-reverse gap-3 border-t px-6 py-4 sm:flex-row sm:items-center sm:justify-end',
                isDark ? 'border-[#18263b]' : 'border-slate-200',
              )}>
                <Button type="button" variant="outline" className={adminOutlineButtonClass(isDark)} onClick={closeModal}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-[#f26522] hover:bg-[#d94e0f]" loading={saveProduct.isPending}>
                  {editingProduct ? 'Update Product' : 'Create Product'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <DeleteConfirmModal
        open={!!productPendingDelete}
        title="Delete product"
        message={productPendingDelete ? `Are you sure you want to delete "${productPendingDelete.title}"?` : ''}
        confirmLabel="Yes"
        loading={deleteProduct.isPending}
        onClose={() => {
          if (!deleteProduct.isPending) setProductPendingDelete(null);
        }}
        onConfirm={() => {
          if (!productPendingDelete) return;
          deleteProduct.mutate(productPendingDelete, {
            onSuccess: () => setProductPendingDelete(null),
          });
        }}
      />
    </>
  );
}
