import { getPlanPriceUsd, getRdpProductSlug, type RdpCatalog, type RdpDuration, type RdpPlan } from '@/lib/rdp-catalog';
import { RDP_ICON_PATH } from '@/lib/platform-icons';
import { categoryService, productService } from '@/services';
import { supabase } from '@/lib/supabase';

const RDP_PLATFORM = 'x' as const;
const RDP_NICHE = 'RDP';
const RDP_STOCK = 99999;

async function getOrCreateRdpCategoryId(): Promise<string> {
  const categories = await categoryService.getAllAdmin();
  const existing = categories.find((category) => category.slug === 'rdp');
  if (existing) return existing.id;

  const created = await categoryService.create({
    name: 'RDP',
    slug: 'rdp',
    description: 'Remote Desktop Plans',
    is_active: true,
    sort_order: 9999,
  });
  return created.id;
}

async function findRdpProductBySlug(slug: string) {
  const products = await productService.getAllAdmin();
  return products.find((product) => product.slug === slug) ?? null;
}

async function syncRdpProductImage(productId: string) {
  await supabase.from('product_images').delete().eq('product_id', productId).eq('sort_order', 0);
  const { error } = await supabase.from('product_images').insert({
    product_id: productId,
    image_url: RDP_ICON_PATH,
    sort_order: 0,
  } as never);
  if (error) throw error;
}

export async function syncRdpCatalogProducts(catalog: RdpCatalog): Promise<void> {
  const categoryId = await getOrCreateRdpCategoryId();

  for (const plan of catalog.plans) {
    for (const duration of catalog.durations) {
      const slug = getRdpProductSlug(plan, duration);
      const price = getPlanPriceUsd(plan, duration);
      const title = `${plan.title} (${plan.ramLabel}) - ${duration.label}`;
      const description = `${plan.title} (${plan.ramLabel})\n\n${plan.features.join('\n')}`;

      const existing = await findRdpProductBySlug(slug);
      if (existing) {
        await productService.update(existing.id, {
          title,
          price,
          description,
          stock: RDP_STOCK,
          niche: RDP_NICHE,
          is_active: true,
          featured: false,
        });
        await syncRdpProductImage(existing.id);
        continue;
      }

      const created = await productService.create({
        title,
        slug,
        description,
        platform: RDP_PLATFORM,
        price,
        stock: RDP_STOCK,
        category_id: categoryId,
        niche: RDP_NICHE,
        is_active: true,
        featured: false,
      });
      await syncRdpProductImage(created.id);
    }
  }
}

export async function syncRdpPlanProduct(
  catalog: RdpCatalog,
  plan: RdpPlan,
  duration: RdpDuration,
): Promise<void> {
  await syncRdpCatalogProducts({
    ...catalog,
    plans: [plan],
    durations: [duration],
  });
}
