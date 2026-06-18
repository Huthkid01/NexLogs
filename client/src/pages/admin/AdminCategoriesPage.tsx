import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FolderKanban, Layers3, Pencil, Plus, Tag, Trash2, X } from 'lucide-react';
import { DeleteConfirmModal } from '@/components/admin/DeleteConfirmModal';
import { PlatformIcon } from '@/components/common/PlatformIcon';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { categoryService } from '@/services';
import { isMockMode } from '@/lib/mock-mode';
import { getCategoryIconPath, getPlatformFromCategory } from '@/lib/platform-icons';
import { toast } from 'sonner';
import type { Category } from '@/types';

interface CategoryFormState {
  name: string;
  slug: string;
  description: string;
  sort_order: string;
  is_active: boolean;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function createEmptyCategoryForm(sortOrder: number): CategoryFormState {
  return {
    name: '',
    slug: '',
    description: '',
    sort_order: String(sortOrder),
    is_active: true,
  };
}

function createFormFromCategory(category: Category): CategoryFormState {
  return {
    name: category.name,
    slug: category.slug,
    description: category.description ?? '',
    sort_order: String(category.sort_order),
    is_active: category.is_active,
  };
}

export default function AdminCategoriesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryPendingDelete, setCategoryPendingDelete] = useState<Category | null>(null);
  const [form, setForm] = useState<CategoryFormState>(() => createEmptyCategoryForm(1));

  const { data: categories, isLoading } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: categoryService.getAllAdmin,
  });

  const filteredCategories = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return categories ?? [];
    return (categories ?? []).filter((category) =>
      [category.name, category.slug, category.description ?? ''].join(' ').toLowerCase().includes(term)
    );
  }, [categories, search]);

  const saveCategory = useMutation({
    mutationFn: async ({ payload }: { payload: Partial<Category> }) => {
      const iconUrl = getCategoryIconPath({ name: payload.name, slug: payload.slug });
      const payloadWithIcon = { ...payload, image_url: iconUrl };

      if (isMockMode()) {
        if (editingCategory) return categoryService.update(editingCategory.id, payloadWithIcon as never);
        return categoryService.create(payloadWithIcon as never);
      }

      const saved = editingCategory
        ? await categoryService.update(editingCategory.id, payloadWithIcon)
        : await categoryService.create(payloadWithIcon);

      return saved;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      toast.success(editingCategory ? 'Category updated' : 'Category created');
      setIsModalOpen(false);
      setEditingCategory(null);
    },
  });

  const deleteCategory = useMutation({
    mutationFn: categoryService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      toast.success('Category deleted');
    },
  });

  if (isLoading) {
    return <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>;
  }

  const total = categories?.length ?? 0;
  const active = categories?.filter((category) => category.is_active).length ?? 0;

  const openCreateModal = () => {
    setEditingCategory(null);
    setForm(createEmptyCategoryForm((categories?.length ?? 0) + 1));
    setIsModalOpen(true);
  };

  const openEditModal = (category: Category) => {
    setEditingCategory(category);
    setForm(createFormFromCategory(category));
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (saveCategory.isPending) return;
    setIsModalOpen(false);
    setEditingCategory(null);
  };

  const submitCategory = (event: { preventDefault: () => void }) => {
    event.preventDefault();

    if (!form.name.trim()) {
      toast.error('Category name is required.');
      return;
    }

    saveCategory.mutate({
      payload: {
        name: form.name.trim(),
        slug: slugify(form.slug || form.name),
        description: form.description.trim() || null,
        sort_order: Number(form.sort_order || 0),
        is_active: form.is_active,
      },
    });
  };

  const categoryPlatform = getPlatformFromCategory(form.slug || form.name || '');

  return (
    <>
      <div className="space-y-6 text-slate-100">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <h1 className="admin-heading text-3xl font-semibold sm:text-4xl">Category management</h1>
            <p className="admin-muted text-sm">Create, edit, and delete categories from the same admin view.</p>
          </div>
          <Button className="w-full bg-[#f26522] hover:bg-[#d94e0f] sm:w-auto" onClick={openCreateModal}>
            <Plus className="h-4 w-4" />
            Add Category
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Card className="admin-panel rounded-2xl border-[#18263b] bg-[#0b1628] text-slate-100">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/15 text-blue-300">
                <FolderKanban className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Total Categories</p>
                <p className="text-2xl font-semibold text-slate-50">{total}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="admin-panel rounded-2xl border-[#18263b] bg-[#0b1628] text-slate-100">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300">
                <Layers3 className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Active Categories</p>
                <p className="text-2xl font-semibold text-slate-50">{active}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="admin-panel rounded-2xl border-[#18263b] bg-[#091427] text-slate-100">
          <CardContent className="space-y-5 p-6">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Organization</p>
                <p className="mt-2 text-2xl font-semibold text-slate-50">Marketplace categories</p>
                <p className="mt-1 text-sm text-slate-400">Keep category names, visibility, and sorting clean for the storefront.</p>
              </div>
              <div className="flex items-end">
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search categories"
                  className="admin-input border-[#22324a] bg-[#06101d] text-slate-100 placeholder:text-slate-500"
                />
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-[#18263b]">
              <div className="hidden grid-cols-[minmax(0,1.2fr)_minmax(0,1.5fr)_100px_120px_120px] gap-4 border-b border-[#18263b] bg-[#0c1830] px-5 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 md:grid">
                <span>Category</span>
                <span>Description</span>
                <span>Sort</span>
                <span>Status</span>
                <span>Actions</span>
              </div>

              <div className="divide-y divide-[#18263b] bg-[#07111f]">
                {filteredCategories.map((category) => (
                  <div
                    key={category.id}
                    className="grid gap-4 px-5 py-4 transition-colors hover:bg-[#0b1a30] md:grid-cols-[minmax(0,1.2fr)_minmax(0,1.5fr)_100px_120px_120px] md:items-center"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0d1d33] text-blue-300">
                          {getPlatformFromCategory(category.slug || category.name) ? (
                            <PlatformIcon platform={getPlatformFromCategory(category.slug || category.name)!} size="sm" className="h-8 w-8" />
                          ) : (
                            <Tag className="h-5 w-5" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-50">{category.name}</p>
                          <p className="mt-1 text-sm text-slate-400">/{category.slug}</p>
                        </div>
                      </div>
                    </div>

                    <p className="text-sm leading-6 text-slate-400">
                      {category.description || 'No category description added yet.'}
                    </p>

                    <p className="text-sm font-medium text-slate-200">{category.sort_order}</p>

                    <div>
                      <Badge
                        variant="outline"
                        className={category.is_active ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200' : 'border-slate-600 bg-slate-700/20 text-slate-300'}
                      >
                        {category.is_active ? 'Active' : 'Hidden'}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2 md:justify-end">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-9 w-9 rounded-xl border border-[#22324a] bg-[#0b1628] text-slate-200 hover:bg-[#10213a]"
                        onClick={() => openEditModal(category)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-9 w-9 rounded-xl border border-red-500/20 bg-red-500/10 text-red-200 hover:bg-red-500/20"
                        onClick={() => setCategoryPendingDelete(category)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                {!filteredCategories.length && (
                  <div className="px-5 py-12 text-center">
                    <FolderKanban className="mx-auto h-10 w-10 text-slate-600" />
                    <p className="mt-4 text-lg font-medium text-slate-200">No categories found</p>
                    <p className="mt-2 text-sm text-slate-500">Try another search or create a new category.</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#020817]/70 p-4 backdrop-blur-sm">
          <div className="admin-panel flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-[1.75rem] border-[#1f2e46] bg-[#081324] text-slate-100">
            <div className="flex items-start justify-between gap-4 border-b border-[#18263b] px-6 py-5">
              <div>
                <h2 className="admin-heading text-3xl font-semibold">{editingCategory ? 'Edit category' : 'Add category'}</h2>
                <p className="mt-1 text-sm text-slate-400">Control category names, visibility, and ordering from this modal.</p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#22324a] bg-[#0a1628] text-slate-400 hover:text-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={submitCategory} className="flex-1 overflow-y-auto">
              <div className="space-y-5 px-6 py-6">
                <section className="rounded-2xl border border-[#18263b] bg-[#06111f] p-5">
                  <h3 className="text-sm font-semibold text-slate-100">Category details</h3>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <label className="mb-2 block text-sm text-slate-400">Category icon</label>
                      <div className="rounded-2xl border border-[#22324a] bg-[#06101d] p-4">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#22324a] bg-[#081624] text-blue-300">
                            {categoryPlatform ? (
                              <PlatformIcon platform={categoryPlatform} size="md" className="h-11 w-11" />
                            ) : (
                              <Tag className="h-6 w-6" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-200">Social icon preview</p>
                            <p className="mt-1 text-sm text-slate-400">The matching social icon is saved automatically and shown on the website.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <label className="mb-2 block text-sm text-slate-400">Category name</label>
                      <Input
                        value={form.name}
                        onChange={(event) => setForm((current) => ({ ...current, name: event.target.value, slug: slugify(event.target.value) }))}
                        className="admin-input"
                        placeholder="Instagram"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm text-slate-400">Slug</label>
                      <Input
                        value={form.slug}
                        onChange={(event) => setForm((current) => ({ ...current, slug: slugify(event.target.value) }))}
                        className="admin-input"
                        placeholder="instagram"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm text-slate-400">Sort order</label>
                      <Input
                        type="number"
                        min="0"
                        value={form.sort_order}
                        onChange={(event) => setForm((current) => ({ ...current, sort_order: event.target.value }))}
                        className="admin-input"
                        placeholder="1"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="mb-2 block text-sm text-slate-400">Description</label>
                      <Textarea
                        value={form.description}
                        onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                        className="admin-textarea"
                        placeholder="Describe what products belong to this category."
                      />
                    </div>
                  </div>

                  <label className="mt-5 flex items-center gap-3 rounded-xl border border-[#18263b] bg-[#081624] px-4 py-3">
                    <input
                      type="checkbox"
                      checked={form.is_active}
                      onChange={(event) => setForm((current) => ({ ...current, is_active: event.target.checked }))}
                      className="h-4 w-4 rounded border-[#22324a] bg-[#06101d]"
                    />
                    <span className="text-sm text-slate-200">Show this category on the website</span>
                  </label>
                </section>
              </div>

              <div className="sticky bottom-0 flex flex-col-reverse gap-3 border-t border-[#18263b] bg-[#081324] px-6 py-4 sm:flex-row sm:items-center sm:justify-end">
                <Button type="button" variant="outline" className="border-[#22324a] bg-[#081624] text-slate-100 hover:bg-[#10213a]" onClick={closeModal}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-[#f26522] hover:bg-[#d94e0f]" loading={saveCategory.isPending}>
                  {editingCategory ? 'Update Category' : 'Create Category'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <DeleteConfirmModal
        open={!!categoryPendingDelete}
        title="Delete category"
        message={categoryPendingDelete ? `Are you sure you want to delete "${categoryPendingDelete.name}"?` : ''}
        confirmLabel="Yes"
        loading={deleteCategory.isPending}
        onClose={() => {
          if (!deleteCategory.isPending) setCategoryPendingDelete(null);
        }}
        onConfirm={() => {
          if (!categoryPendingDelete) return;
          deleteCategory.mutate(categoryPendingDelete.id, {
            onSuccess: () => setCategoryPendingDelete(null),
          });
        }}
      />
    </>
  );
}
