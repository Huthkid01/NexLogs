import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FolderKanban, Layers3, Pencil, Plus, Tag, Trash2, X } from 'lucide-react';
import { DeleteConfirmModal } from '@/components/admin/DeleteConfirmModal';
import { AdminScrollTable, AdminScrollTableRow } from '@/components/admin/AdminScrollTable';
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
  adminStatCardClass,
  adminStrongTextClass,
  adminSubtleTextClass,
} from '@/lib/admin-theme';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';
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

const CATEGORY_TABLE_GRID =
  'grid-cols-[minmax(180px,1.2fr)_minmax(220px,1.5fr)_80px_100px_100px]';

export default function AdminCategoriesPage() {
  const queryClient = useQueryClient();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
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
      <div className={cn('space-y-6', adminPageClass(isDark))}>
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
          <Card className={adminStatCardClass(isDark)}>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/15 text-blue-300">
                <FolderKanban className="h-6 w-6" />
              </div>
              <div>
                <p className={cn('text-sm', adminMutedTextClass(isDark))}>Total Categories</p>
                <p className={cn('text-2xl font-semibold', adminStrongTextClass(isDark))}>{total}</p>
              </div>
            </CardContent>
          </Card>
          <Card className={adminStatCardClass(isDark)}>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300">
                <Layers3 className="h-6 w-6" />
              </div>
              <div>
                <p className={cn('text-sm', adminMutedTextClass(isDark))}>Active Categories</p>
                <p className={cn('text-2xl font-semibold', adminStrongTextClass(isDark))}>{active}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className={adminMainCardClass(isDark)}>
          <CardContent className="space-y-5 p-6">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div>
                <p className={cn('text-xs font-semibold uppercase tracking-[0.18em]', adminSubtleTextClass(isDark))}>Organization</p>
                <p className={cn('mt-2 text-2xl font-semibold', adminStrongTextClass(isDark))}>Marketplace categories</p>
                <p className={cn('mt-1 text-sm', adminMutedTextClass(isDark))}>Keep category names, visibility, and sorting clean for the storefront.</p>
              </div>
              <div className="flex items-end">
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search categories"
                  className={adminInputClass(isDark)}
                />
              </div>
            </div>

            <AdminScrollTable
              columns={['Category', 'Description', 'Sort', 'Status', 'Actions']}
              gridClassName={CATEGORY_TABLE_GRID}
              minWidthClassName="min-w-[48rem]"
              emptyState={
                !filteredCategories.length ? (
                  <div className="px-5 py-12 text-center">
                    <FolderKanban className={cn('mx-auto h-10 w-10', isDark ? 'text-slate-600' : 'text-slate-400')} />
                    <p className={cn('mt-4 text-lg font-medium', adminStrongTextClass(isDark))}>No categories found</p>
                    <p className={cn('mt-2 text-sm', adminMutedTextClass(isDark))}>Try another search or create a new category.</p>
                  </div>
                ) : null
              }
            >
              {filteredCategories.map((category) => (
                <AdminScrollTableRow key={category.id} gridClassName={CATEGORY_TABLE_GRID}>
                  <div className="min-w-[180px]">
                    <div className="flex items-center gap-3">
                      <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center', adminPlatformIconWrapClass(isDark), 'text-blue-300')}>
                        {getPlatformFromCategory(category.slug || category.name) ? (
                          <PlatformIcon platform={getPlatformFromCategory(category.slug || category.name)!} size="sm" className="h-8 w-8" />
                        ) : (
                          <Tag className="h-5 w-5" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className={cn('font-medium', adminStrongTextClass(isDark))}>{category.name}</p>
                        <p className={cn('mt-1 text-sm', adminMutedTextClass(isDark))}>/{category.slug}</p>
                      </div>
                    </div>
                  </div>

                  <p className={cn('min-w-[220px] text-sm leading-6', adminMutedTextClass(isDark))}>
                    {category.description || 'No category description added yet.'}
                  </p>

                  <p className={cn('min-w-[80px] text-sm font-medium', isDark ? 'text-slate-200' : 'text-slate-700')}>{category.sort_order}</p>

                  <div className="min-w-[100px]">
                    <Badge
                      variant="outline"
                      className={category.is_active ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200' : 'border-slate-600 bg-slate-700/20 text-slate-300'}
                    >
                      {category.is_active ? 'Active' : 'Hidden'}
                    </Badge>
                  </div>

                  <div className="flex min-w-[100px] items-center justify-end gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      className={cn(adminActionIconButtonClass(isDark), 'h-9 w-9')}
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
                </AdminScrollTableRow>
              ))}
            </AdminScrollTable>
          </CardContent>
        </Card>
      </div>

      {isModalOpen && (
        <div className={adminModalOverlayClass(isDark)}>
          <div className={cn(adminModalClass(isDark), 'flex max-h-[90vh] flex-col overflow-hidden')}>
            <div className={cn('flex items-start justify-between gap-4 border-b px-6 py-5', isDark ? 'border-[#18263b]' : 'border-slate-200')}>
              <div>
                <h2 className="admin-heading text-3xl font-semibold">{editingCategory ? 'Edit category' : 'Add category'}</h2>
                <p className={cn('mt-1 text-sm', adminMutedTextClass(isDark))}>Control category names, visibility, and ordering from this modal.</p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className={adminIconButtonClass(isDark)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={submitCategory} className="flex-1 overflow-y-auto">
              <div className="space-y-5 px-6 py-6">
                <section className={adminModalSectionClass(isDark)}>
                  <h3 className={cn('text-sm font-semibold', adminStrongTextClass(isDark))}>Category details</h3>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <label className={cn('mb-2 block text-sm', adminMutedTextClass(isDark))}>Category icon</label>
                      <div className={cn('rounded-2xl border p-4', isDark ? 'border-[#22324a] bg-[#06101d]' : 'border-slate-200 bg-white')}>
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                          <div className={cn(
                            'flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border text-blue-300',
                            isDark ? 'border-[#22324a] bg-[#081624]' : 'border-slate-200 bg-slate-50',
                          )}>
                            {categoryPlatform ? (
                              <PlatformIcon platform={categoryPlatform} size="md" className="h-11 w-11" />
                            ) : (
                              <Tag className="h-6 w-6" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className={cn('text-sm font-medium', isDark ? 'text-slate-200' : 'text-slate-800')}>Social icon preview</p>
                            <p className={cn('mt-1 text-sm', adminMutedTextClass(isDark))}>The matching social icon is saved automatically and shown on the website.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <label className={cn('mb-2 block text-sm', adminMutedTextClass(isDark))}>Category name</label>
                      <Input
                        value={form.name}
                        onChange={(event) => setForm((current) => ({ ...current, name: event.target.value, slug: slugify(event.target.value) }))}
                        className="admin-input"
                        placeholder="Instagram"
                      />
                    </div>
                    <div>
                      <label className={cn('mb-2 block text-sm', adminMutedTextClass(isDark))}>Slug</label>
                      <Input
                        value={form.slug}
                        onChange={(event) => setForm((current) => ({ ...current, slug: slugify(event.target.value) }))}
                        className="admin-input"
                        placeholder="instagram"
                      />
                    </div>
                    <div>
                      <label className={cn('mb-2 block text-sm', adminMutedTextClass(isDark))}>Sort order</label>
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
                      <label className={cn('mb-2 block text-sm', adminMutedTextClass(isDark))}>Description</label>
                      <Textarea
                        value={form.description}
                        onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                        className="admin-textarea"
                        placeholder="Describe what products belong to this category."
                      />
                    </div>
                  </div>

                  <label className={cn(
                    'mt-5 flex items-center gap-3 rounded-xl border px-4 py-3',
                    isDark ? 'border-[#18263b] bg-[#081624]' : 'border-slate-200 bg-white',
                  )}>
                    <input
                      type="checkbox"
                      checked={form.is_active}
                      onChange={(event) => setForm((current) => ({ ...current, is_active: event.target.checked }))}
                      className={cn('h-4 w-4 rounded', isDark ? 'border-[#22324a] bg-[#06101d]' : 'border-slate-300 bg-white')}
                    />
                    <span className={cn('text-sm', isDark ? 'text-slate-200' : 'text-slate-700')}>Show this category on the website</span>
                  </label>
                </section>
              </div>

              <div className={cn(
                'sticky bottom-0 flex flex-col-reverse gap-3 border-t px-6 py-4 sm:flex-row sm:items-center sm:justify-end',
                isDark ? 'border-[#18263b] bg-[#081324]' : 'border-slate-200 bg-white',
              )}>
                <Button type="button" variant="outline" className={adminOutlineButtonClass(isDark)} onClick={closeModal}>
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
