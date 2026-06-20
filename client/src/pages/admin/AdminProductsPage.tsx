import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Package2, Pencil, Plus, Trash2, X } from 'lucide-react';
import { DeleteConfirmModal } from '@/components/admin/DeleteConfirmModal';
import { PlatformIcon } from '@/components/common/PlatformIcon';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { categoryService, productService } from '@/services';
import { isMockMode } from '@/lib/mock-mode';
import { supabase } from '@/lib/supabase';
import { getPlatformIconPath } from '@/lib/platform-icons';
import { countProductDetailLines } from '@/lib/product-details';
import { formatPrice } from '@/lib/utils';
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
  product_details: string;
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
    product_details: '',
    featured: false,
    verified: false,
    is_active: true,
  };
}

function createFormFromProduct(product: Product): ProductFormState {
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
    product_details: product.product_details ?? '',
    featured: product.featured,
    verified: product.verified,
    is_active: product.is_active,
  };
}

function buildProductPayload(form: ProductFormState) {
  const detailLineCount = countProductDetailLines(form.product_details);
  const stockValue = detailLineCount > 0 ? detailLineCount : Number(form.stock);

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
    product_details: form.product_details.trim(),
    featured: form.featured,
    verified: form.verified,
    is_active: form.is_active,
  };
}

export default function AdminProductsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productPendingDelete, setProductPendingDelete] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductFormState>(() => createEmptyForm());
  const detailLineCount = countProductDetailLines(form.product_details);

  const { data: products, isLoading } = useQuery({
    queryKey: ['admin-products'],
    queryFn: productService.getAllAdmin,
  });

  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: categoryService.getAllAdmin,
  });

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
      const iconUrl = getPlatformIconPath(payload.platform);

      if (isMockMode()) {
        const payloadWithImage = iconUrl
          ? {
            ...payload,
            product_images: [{
              id: `img-${Date.now()}`,
              product_id: editingProduct?.id ?? `prod-${Date.now()}`,
              image_url: iconUrl,
              sort_order: 0,
              created_at: new Date().toISOString(),
            }],
          }
          : payload;

        if (editingProduct) return productService.update(editingProduct.id, payloadWithImage as never);
        return productService.create(payloadWithImage as never);
      }

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      toast.success(editingProduct ? 'Product updated' : 'Product created');
      setIsModalOpen(false);
      setEditingProduct(null);
    },
  });

  const deleteProduct = useMutation({
    mutationFn: productService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      toast.success('Product deleted');
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

    if (!form.title.trim() || !form.category_id || !form.price || !form.description.trim() || detailLineCount === 0) {
      toast.error('Fill in the required product details first. Add at least one buyer copy line.');
      return;
    }

    saveProduct.mutate({ payload: buildProductPayload(form) });
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
      <div className="space-y-6 text-slate-100">
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

        <Card className="admin-panel rounded-2xl border-[#18263b] bg-[#091427] text-slate-100">
          <CardContent className="space-y-5 p-6">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Catalog</p>
                <p className="mt-2 text-2xl font-semibold text-slate-50">{filteredProducts.length}</p>
                <p className="mt-1 text-sm text-slate-400">Products currently visible in this admin list.</p>
              </div>
              <div className="flex items-end">
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by title, slug, platform, or category"
                  className="admin-input border-[#22324a] bg-[#06101d] text-slate-100 placeholder:text-slate-500"
                />
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-[#18263b]">
              <div className="hidden grid-cols-[minmax(0,2fr)_1fr_0.9fr_0.9fr_120px] gap-4 border-b border-[#18263b] bg-[#0c1830] px-5 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 md:grid">
                <span>Product</span>
                <span>Category</span>
                <span>Price</span>
                <span>Status</span>
                <span>Actions</span>
              </div>

              <div className="divide-y divide-[#18263b] bg-[#07111f]">
                {filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    className="grid gap-4 px-5 py-4 transition-colors hover:bg-[#0b1a30] md:grid-cols-[minmax(0,2fr)_1fr_0.9fr_0.9fr_120px] md:items-center"
                  >
                    <div className="flex min-w-0 items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#0d1d33] text-slate-100">
                        <PlatformIcon platform={product.platform} size="md" className="h-7 w-7" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-50">{product.title}</p>
                        <p className="mt-1 text-sm text-slate-400">{product.slug}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Badge variant="outline" className="border-[#26354c] bg-[#0d1b2d] text-slate-200">
                            {product.platform}
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

                    <div>
                      <p className="text-sm font-medium text-slate-200">{product.category?.name ?? 'Unassigned'}</p>
                      <p className="mt-1 text-xs text-slate-500">Stock: {product.stock}</p>
                    </div>

                    <div>
                      <p className="font-medium text-slate-50">{formatPrice(product.price)}</p>
                      <p className="mt-1 text-xs text-slate-500">{product.country ?? 'Global'}</p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Badge
                        variant="outline"
                        className={product.is_active ? 'border-blue-500/30 bg-blue-500/10 text-blue-200' : 'border-slate-600 bg-slate-700/20 text-slate-300'}
                      >
                        {product.is_active ? 'Active' : 'Draft'}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2 md:justify-end">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-9 w-9 rounded-xl border border-[#22324a] bg-[#0b1628] text-slate-200 hover:bg-[#10213a]"
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
                  </div>
                ))}

                {!filteredProducts.length && (
                  <div className="px-5 py-12 text-center">
                    <Package2 className="mx-auto h-10 w-10 text-slate-600" />
                    <p className="mt-4 text-lg font-medium text-slate-200">No products found</p>
                    <p className="mt-2 text-sm text-slate-500">Try a different search or add a new product.</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#020817]/70 p-4 backdrop-blur-sm">
          <div className="admin-panel w-full max-w-4xl rounded-[1.75rem] border-[#1f2e46] bg-[#081324] text-slate-100">
            <div className="flex items-start justify-between gap-4 border-b border-[#18263b] px-6 py-5">
              <div>
                <h2 className="admin-heading text-3xl font-semibold">{editingProduct ? 'Edit product' : 'Add product'}</h2>
                <p className="mt-1 text-sm text-slate-400">Manage title, pricing, platform, and listing details from this modal.</p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#22324a] bg-[#0a1628] text-slate-400 hover:text-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={submitProduct} className="max-h-[85vh] overflow-y-auto">
              <div className="space-y-5 px-6 py-6">
                <section className="rounded-2xl border border-[#18263b] bg-[#06111f] p-5">
                  <h3 className="text-sm font-semibold text-slate-100">Basic information</h3>
                  <div className="mt-4">
                    <label className="mb-2 block text-sm text-slate-400">Product icon</label>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-[#22324a] bg-[#06101d]">
                        <PlatformIcon platform={form.platform} size="md" className="h-10 w-10" />
                      </div>
                      <div className="rounded-2xl border border-[#22324a] bg-[#06101d] px-4 py-3 text-sm text-slate-300">
                        The product uses the selected platform icon automatically.
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">This icon shows in admin and across the website instead of a full image.</p>
                  </div>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <label className="mb-2 block text-sm text-slate-400">Product title</label>
                      <Input
                        value={form.title}
                        onChange={(event) => setForm((current) => ({ ...current, title: event.target.value, slug: slugify(event.target.value) }))}
                        className="admin-input"
                        placeholder="Premium TikTok Creator Account"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm text-slate-400">Slug</label>
                      <Input
                        value={form.slug}
                        onChange={(event) => setForm((current) => ({ ...current, slug: slugify(event.target.value) }))}
                        className="admin-input"
                        placeholder="premium-tiktok-creator-account"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm text-slate-400">Category</label>
                      <select
                        value={form.category_id}
                        onChange={(event) => setForm((current) => ({ ...current, category_id: event.target.value }))}
                        className="admin-select"
                      >
                        <option value="">Select category</option>
                        {categories?.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-2 block text-sm text-slate-400">Platform</label>
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
                    <div>
                      <label className="mb-2 block text-sm text-slate-400">Price</label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.price}
                        onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))}
                        className="admin-input"
                        placeholder="25"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm text-slate-400">Stock</label>
                      <Input
                        type="number"
                        min="0"
                        value={detailLineCount > 0 ? String(detailLineCount) : form.stock}
                        onChange={(event) => setForm((current) => ({ ...current, stock: event.target.value }))}
                        className="admin-input"
                        placeholder="12"
                        readOnly={detailLineCount > 0}
                      />
                      {detailLineCount > 0 ? (
                        <p className="mt-2 text-xs text-slate-500">
                          Stock is synced to the number of buyer copy lines.
                        </p>
                      ) : null}
                    </div>
                    <div className="md:col-span-2">
                      <label className="mb-2 block text-sm text-slate-400">Description</label>
                      <Textarea
                        value={form.description}
                        onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                        className="admin-textarea"
                        placeholder="Describe the account quality, history, audience, and important details."
                      />
                    </div>
                    <div className="md:col-span-2">
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <label className="block text-sm text-slate-400">
                          Product details for buyer copy
                        </label>
                        <span className="rounded-full border border-[#1f3550] bg-[#0a1628] px-3 py-1 text-xs text-slate-300">
                          {detailLineCount} {detailLineCount === 1 ? 'line' : 'lines'}
                        </span>
                      </div>
                      <Textarea
                        value={form.product_details}
                        onChange={(event) => {
                          const product_details = event.target.value;
                          const lineCount = countProductDetailLines(product_details);
                          setForm((current) => ({
                            ...current,
                            product_details,
                            stock: lineCount > 0 ? String(lineCount) : current.stock,
                          }));
                        }}
                        className="admin-textarea min-h-[280px] font-mono text-sm leading-6"
                        placeholder={'username:password:email:email-password:2fa\nusername2:password2:email2:email-password2:2fa\nusername3:password3:email3:email-password3:2fa'}
                      />
                      <p className="mt-2 text-xs text-slate-500">
                        Paste one account per line. Each line is delivered to one buyer and removed from stock after purchase.
                      </p>
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-[#18263b] bg-[#06111f] p-5">
                  <h3 className="text-sm font-semibold text-slate-100">Additional details</h3>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm text-slate-400">Country</label>
                      <Input
                        value={form.country}
                        onChange={(event) => setForm((current) => ({ ...current, country: event.target.value }))}
                        className="admin-input"
                        placeholder="United States"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm text-slate-400">Niche</label>
                      <Input
                        value={form.niche}
                        onChange={(event) => setForm((current) => ({ ...current, niche: event.target.value }))}
                        className="admin-input"
                        placeholder="Business"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm text-slate-400">Account age</label>
                      <Input
                        value={form.account_age}
                        onChange={(event) => setForm((current) => ({ ...current, account_age: event.target.value }))}
                        className="admin-input"
                        placeholder="2 years"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm text-slate-400">Followers</label>
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
                      <label className="mb-2 block text-sm text-slate-400">Following</label>
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
                      <label key={option.key} className="flex items-center gap-3 rounded-xl border border-[#18263b] bg-[#081624] px-4 py-3">
                        <input
                          type="checkbox"
                          checked={form[option.key as keyof ProductFormState] as boolean}
                          onChange={(event) => setForm((current) => ({ ...current, [option.key]: event.target.checked }))}
                          className="h-4 w-4 rounded border-[#22324a] bg-[#06101d]"
                        />
                        <span className="text-sm text-slate-200">{option.label}</span>
                      </label>
                    ))}
                  </div>
                </section>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-[#18263b] px-6 py-4 sm:flex-row sm:items-center sm:justify-end">
                <Button type="button" variant="outline" className="border-[#22324a] bg-[#081624] text-slate-100 hover:bg-[#10213a]" onClick={closeModal}>
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
          deleteProduct.mutate(productPendingDelete.id, {
            onSuccess: () => setProductPendingDelete(null),
          });
        }}
      />
    </>
  );
}
