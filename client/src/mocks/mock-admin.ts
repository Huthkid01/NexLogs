import type { ActivityLog, AdminAnalyticsSnapshot, AdminStats, BlogPost, Category, Coupon, Order, Product, Profile, SupportTicket } from '@/types';
import { MOCK_CATEGORIES, MOCK_PRODUCTS, MOCK_USERS } from '@/mocks/demo-data';
import { getMockUserOrders } from '@/mocks/mock-orders';
import { getPlatformIconPath } from '@/lib/platform-icons';

const now = new Date().toISOString();

const extraUsers: Profile[] = [
  {
    id: 'mock-user-3',
    email: 'sarah@nexlogs.com',
    full_name: 'Sarah Johnson',
    avatar_url: null,
    role: 'user',
    is_suspended: false,
    created_at: '2026-06-10T09:15:00.000Z',
    updated_at: now,
  },
  {
    id: 'mock-user-4',
    email: 'michael@nexlogs.com',
    full_name: 'Michael James',
    avatar_url: null,
    role: 'user',
    is_suspended: true,
    created_at: '2026-06-08T10:25:00.000Z',
    updated_at: now,
  },
  {
    id: 'mock-user-5',
    email: 'amanda@nexlogs.com',
    full_name: 'Amanda Lee',
    avatar_url: null,
    role: 'user',
    is_suspended: false,
    created_at: '2026-06-05T12:10:00.000Z',
    updated_at: now,
  },
  {
    id: 'mock-user-6',
    email: 'support@nexlogs.com',
    full_name: 'Support Agent',
    avatar_url: null,
    role: 'admin',
    is_suspended: false,
    created_at: '2026-06-01T08:00:00.000Z',
    updated_at: now,
  },
];

const extraProducts: Product[] = [
  {
    id: 'admin-prod-13',
    title: 'DISCORD NITRO 1 YEAR ACCOUNT',
    slug: 'discord-nitro-1-year',
    description: 'Discord Nitro account with one year access and active billing history.',
    platform: 'instagram',
    price: 12.5,
    stock: 7,
    followers: null,
    following: null,
    account_age: '1 year',
    country: 'Global',
    niche: 'Discord',
    verified: false,
    featured: false,
    category_id: 'cat-instagram',
    is_active: false,
    sort_order: 12,
    created_at: '2026-06-12T07:30:00.000Z',
    updated_at: now,
    category: MOCK_CATEGORIES[0],
    product_images: [{ id: 'admin-img-13', product_id: 'admin-prod-13', image_url: getPlatformIconPath('instagram'), sort_order: 0, created_at: now }],
  },
  {
    id: 'admin-prod-14',
    title: 'SNAPCHAT USA VERIFIED ACCOUNT',
    slug: 'snapchat-usa-verified-account',
    description: 'Aged Snapchat profile with USA audience targeting and verified email.',
    platform: 'snapchat',
    price: 8.75,
    stock: 4,
    followers: 2400,
    following: 180,
    account_age: '2 years',
    country: 'United States',
    niche: 'Lifestyle',
    verified: true,
    featured: true,
    category_id: 'cat-facebook',
    is_active: true,
    sort_order: 13,
    created_at: '2026-06-09T11:00:00.000Z',
    updated_at: now,
    category: MOCK_CATEGORIES[1],
    product_images: [{ id: 'admin-img-14', product_id: 'admin-prod-14', image_url: getPlatformIconPath('snapchat'), sort_order: 0, created_at: now }],
  },
];

const extraCategories: Category[] = [
  {
    id: 'cat-discord',
    name: 'Discord',
    slug: 'discord',
    description: 'Discord accounts, Nitro access, and communities.',
    image_url: null,
    is_active: true,
    sort_order: 5,
    created_at: now,
    updated_at: now,
  },
  {
    id: 'cat-vpn',
    name: 'VPN',
    slug: 'vpn',
    description: 'Secure VPN tools and digital privacy subscriptions.',
    image_url: null,
    is_active: false,
    sort_order: 6,
    created_at: now,
    updated_at: now,
  },
];

const mockAuthors = [
  MOCK_USERS[1].profile,
  {
    id: 'mock-author-2',
    email: 'editor@nexlogs.com',
    full_name: 'Editorial Team',
    avatar_url: null,
    role: 'admin' as const,
    is_suspended: false,
    created_at: now,
    updated_at: now,
  },
];

let adminUsers: Profile[] = [...MOCK_USERS.map((user) => ({ ...user.profile })), ...extraUsers].sort(
  (a, b) => b.created_at.localeCompare(a.created_at)
);

let adminProducts: Product[] = [...MOCK_PRODUCTS.map((product) => ({ ...product })), ...extraProducts].sort(
  (a, b) => a.sort_order - b.sort_order || a.id.localeCompare(b.id),
);

const baseOrders = [
  ...getMockUserOrders('mock-user-demo'),
  ...getMockUserOrders('mock-user-admin'),
].slice(0, 10);

const adminOrders: Order[] = baseOrders.map((order, index) => {
  const statuses: Order['status'][] = ['pending', 'processing', 'completed', 'cancelled', 'refunded'];
  const payments: Order['payment_status'][] = ['pending', 'paid', 'paid', 'failed', 'refunded'];
  const profile = adminUsers[index % adminUsers.length];
  return {
    ...order,
    user_id: profile?.id ?? order.user_id,
    status: statuses[index % statuses.length],
    payment_status: payments[index % payments.length],
    total_amount: Number(order.total_amount) + index * 1.5,
    profile: profile ? { full_name: profile.full_name, email: profile.email } : null,
  };
});

let activityLogs: ActivityLog[] = [
  {
    id: 'log-1',
    user_id: adminUsers[0]?.id ?? null,
    action: 'signed_in',
    entity: 'auth',
    entity_id: null,
    metadata: { provider: 'email' },
    created_at: '2026-06-16T10:40:00.000Z',
    profile: adminUsers[0] ? { full_name: adminUsers[0].full_name, email: adminUsers[0].email } : null,
  },
  {
    id: 'log-2',
    user_id: adminUsers[1]?.id ?? null,
    action: 'cart_item_added',
    entity: 'cart',
    entity_id: null,
    metadata: { quantity: 1 },
    created_at: '2026-06-16T11:05:00.000Z',
    profile: adminUsers[1] ? { full_name: adminUsers[1].full_name, email: adminUsers[1].email } : null,
  },
  {
    id: 'log-3',
    user_id: adminUsers[2]?.id ?? null,
    action: 'order_created',
    entity: 'order',
    entity_id: adminOrders[0]?.id ?? null,
    metadata: { total_amount: Number(adminOrders[0]?.total_amount ?? 0) },
    created_at: '2026-06-16T11:20:00.000Z',
    profile: adminUsers[2] ? { full_name: adminUsers[2].full_name, email: adminUsers[2].email } : null,
  },
].sort((a, b) => b.created_at.localeCompare(a.created_at));

let adminCategories: Category[] = [...MOCK_CATEGORIES.map((category) => ({ ...category })), ...extraCategories];

const adminBlogPosts: BlogPost[] = [
  {
    id: 'blog-1',
    title: 'Top Social Accounts to Stock This Month',
    slug: 'top-social-accounts-this-month',
    content: 'A quick admin editorial guide on what inventory categories are converting best.',
    excerpt: 'Inventory ideas and platform trends for this month.',
    featured_image: null,
    author_id: mockAuthors[0].id,
    published: true,
    published_at: '2026-06-14T09:00:00.000Z',
    created_at: '2026-06-13T16:20:00.000Z',
    updated_at: now,
    author: mockAuthors[0],
  },
  {
    id: 'blog-2',
    title: 'How To Price Premium Telegram Accounts',
    slug: 'how-to-price-premium-telegram-accounts',
    content: 'Internal pricing guidance for premium inventory and regional account quality.',
    excerpt: 'Pricing structure for premium Telegram stock.',
    featured_image: null,
    author_id: mockAuthors[1].id,
    published: false,
    published_at: null,
    created_at: '2026-06-10T11:45:00.000Z',
    updated_at: now,
    author: mockAuthors[1],
  },
  {
    id: 'blog-3',
    title: 'Preparing the Marketplace for Q3 Demand',
    slug: 'preparing-marketplace-for-q3-demand',
    content: 'Content roadmap and conversion planning for the next sales cycle.',
    excerpt: 'Operational prep for the next demand spike.',
    featured_image: null,
    author_id: mockAuthors[0].id,
    published: true,
    published_at: '2026-06-07T08:00:00.000Z',
    created_at: '2026-06-05T14:10:00.000Z',
    updated_at: now,
    author: mockAuthors[0],
  },
];

const adminCoupons: Coupon[] = [
  {
    id: 'coupon-1',
    code: 'WELCOME10',
    discount: 10,
    discount_type: 'percentage',
    min_purchase: 20,
    max_uses: 100,
    used_count: 34,
    expiry_date: '2026-07-31T00:00:00.000Z',
    active: true,
    created_at: '2026-06-01T00:00:00.000Z',
    updated_at: now,
  },
  {
    id: 'coupon-2',
    code: 'BULK25',
    discount: 25,
    discount_type: 'fixed',
    min_purchase: 150,
    max_uses: 40,
    used_count: 11,
    expiry_date: '2026-08-15T00:00:00.000Z',
    active: true,
    created_at: '2026-06-03T00:00:00.000Z',
    updated_at: now,
  },
  {
    id: 'coupon-3',
    code: 'SPRINGFLASH',
    discount: 15,
    discount_type: 'percentage',
    min_purchase: 50,
    max_uses: 75,
    used_count: 75,
    expiry_date: '2026-05-30T00:00:00.000Z',
    active: false,
    created_at: '2026-05-01T00:00:00.000Z',
    updated_at: now,
  },
];

const adminAnalytics: AdminAnalyticsSnapshot = {
  revenueByWeek: [
    { label: 'Week 1', value: 1240 },
    { label: 'Week 2', value: 1820 },
    { label: 'Week 3', value: 1560 },
    { label: 'Week 4', value: 2310 },
  ],
  platformBreakdown: [
    { label: 'Instagram', value: 28 },
    { label: 'Telegram', value: 24 },
    { label: 'Facebook', value: 18 },
    { label: 'TikTok', value: 16 },
    { label: 'X', value: 14 },
  ],
  topCountries: [
    { label: 'United States', value: 44 },
    { label: 'United Kingdom', value: 18 },
    { label: 'Canada', value: 14 },
    { label: 'Hong Kong', value: 9 },
  ],
  orderStatusBreakdown: [
    { label: 'Completed', value: 42 },
    { label: 'Processing', value: 12 },
    { label: 'Pending', value: 9 },
    { label: 'Refunded', value: 4 },
  ],
};

let supportTickets: SupportTicket[] = [
  {
    id: 'ticket-1',
    user_id: 'mock-user-demo',
    name: 'Demo Buyer',
    email: 'demo@nexlogs.com',
    subject: 'Login issue',
    description: 'I tried signing in and got an unexpected access error after using Google login.',
    status: 'open',
    source: 'login',
    page_url: '/login',
    error_message: 'The user has denied your application access.',
    browser_info: 'Chrome on macOS',
    admin_notes: null,
    created_at: '2026-06-17T05:22:00.000Z',
    updated_at: now,
  },
  {
    id: 'ticket-2',
    user_id: 'mock-user-3',
    name: 'Sarah Johnson',
    email: 'sarah@nexlogs.com',
    subject: 'Checkout details not visible',
    description: 'The product details were not clear after I completed my order.',
    status: 'in_progress',
    source: 'checkout',
    page_url: '/purchases',
    error_message: 'Missing buyer copy details',
    browser_info: 'Safari on macOS',
    admin_notes: 'Checking product_details fallback.',
    created_at: '2026-06-16T14:10:00.000Z',
    updated_at: now,
  },
];

export const mockAdminService = {
  async getStats(): Promise<AdminStats> {
    const totalRevenue = adminOrders.reduce((sum, order) => sum + Number(order.total_amount), 0);
    return {
      totalUsers: adminUsers.length,
      totalOrders: adminOrders.length,
      totalRevenue,
      totalProducts: adminProducts.length,
      openTickets: supportTickets.filter((ticket) => ticket.status !== 'resolved').length,
      recentOrders: [...adminOrders].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 5),
    };
  },

  async getUsers(): Promise<Profile[]> {
    return [...adminUsers];
  },

  async updateUser(id: string, updates: Partial<Profile>): Promise<Profile> {
    const index = adminUsers.findIndex((user) => user.id === id);
    if (index < 0) throw new Error('User not found');
    adminUsers[index] = { ...adminUsers[index], ...updates, updated_at: new Date().toISOString() };
    return adminUsers[index];
  },

  async getActivityLogs(): Promise<ActivityLog[]> {
    return [...activityLogs];
  },

  async createActivityLog(log: Partial<ActivityLog>) {
    const userProfile = log.user_id ? adminUsers.find((user) => user.id === log.user_id) : null;
    const created: ActivityLog = {
      id: log.id ?? `log-${crypto.randomUUID()}`,
      user_id: log.user_id ?? null,
      action: log.action ?? 'activity',
      entity: log.entity ?? null,
      entity_id: log.entity_id ?? null,
      metadata: (log.metadata as ActivityLog['metadata']) ?? null,
      created_at: log.created_at ?? new Date().toISOString(),
      profile: userProfile ? { full_name: userProfile.full_name, email: userProfile.email } : null,
    };
    activityLogs = [created, ...activityLogs].sort((a, b) => b.created_at.localeCompare(a.created_at));
    return created;
  },

  async deleteUser(id: string) {
    adminUsers = adminUsers.filter((user) => user.id !== id);
  },

  async getProducts(): Promise<Product[]> {
    return [...adminProducts].sort(
      (a, b) => a.sort_order - b.sort_order || a.id.localeCompare(b.id),
    );
  },

  async createProduct(product: Partial<Product>): Promise<Product> {
    const now = new Date().toISOString();
    const category = adminCategories.find((item) => item.id === product.category_id);
    const nextSortOrder = adminProducts.reduce(
      (min, item) => Math.min(min, item.sort_order),
      adminProducts[0]?.sort_order ?? 1,
    ) - 1;
    const created: Product = {
      id: product.id ?? `product-${crypto.randomUUID()}`,
      title: product.title ?? 'Untitled Product',
      slug: product.slug ?? `product-${Date.now()}`,
      description: product.description ?? '',
      product_details: product.product_details ?? '',
      platform: product.platform ?? 'instagram',
      price: Number(product.price ?? 0),
      stock: Number(product.stock ?? 0),
      followers: product.followers ?? null,
      following: product.following ?? null,
      account_age: product.account_age ?? null,
      country: product.country ?? null,
      niche: product.niche ?? null,
      verified: Boolean(product.verified),
      featured: Boolean(product.featured),
      category_id: product.category_id ?? adminCategories[0]?.id ?? '',
      is_active: product.is_active ?? true,
      sort_order: nextSortOrder,
      created_at: now,
      updated_at: now,
      category,
      product_images: product.product_images ?? [],
    };

    adminProducts = [...adminProducts, created];
    return created;
  },

  async updateProduct(id: string, updates: Partial<Product>): Promise<Product> {
    const index = adminProducts.findIndex((product) => product.id === id);
    if (index < 0) throw new Error('Product not found');

    const categoryId = updates.category_id ?? adminProducts[index].category_id;
    const category = adminCategories.find((item) => item.id === categoryId);
    const { sort_order: _ignored, ...safeUpdates } = updates;

    adminProducts[index] = {
      ...adminProducts[index],
      ...safeUpdates,
      category_id: categoryId,
      category,
      sort_order: adminProducts[index].sort_order,
      updated_at: new Date().toISOString(),
    };
    return adminProducts[index];
  },

  async deleteProduct(id: string) {
    adminProducts = adminProducts.filter((product) => product.id !== id);
  },

  async getOrders(): Promise<Order[]> {
    return [...adminOrders].sort((a, b) => b.created_at.localeCompare(a.created_at));
  },

  async updateOrderStatus(id: string, status: string): Promise<Order> {
    const index = adminOrders.findIndex((order) => order.id === id);
    if (index < 0) throw new Error('Order not found');
    adminOrders[index] = {
      ...adminOrders[index],
      status: status as Order['status'],
      updated_at: new Date().toISOString(),
    };
    return adminOrders[index];
  },

  async getCategories(): Promise<Category[]> {
    return [...adminCategories];
  },

  async createCategory(category: Partial<Category>): Promise<Category> {
    const now = new Date().toISOString();
    const created: Category = {
      id: category.id ?? `category-${crypto.randomUUID()}`,
      name: category.name ?? 'Untitled Category',
      slug: category.slug ?? `category-${Date.now()}`,
      description: category.description ?? null,
      image_url: category.image_url ?? null,
      is_active: category.is_active ?? true,
      sort_order: Number(category.sort_order ?? adminCategories.length + 1),
      created_at: now,
      updated_at: now,
    };

    adminCategories = [...adminCategories, created].sort((a, b) => a.sort_order - b.sort_order);
    return created;
  },

  async updateCategory(id: string, updates: Partial<Category>): Promise<Category> {
    const index = adminCategories.findIndex((category) => category.id === id);
    if (index < 0) throw new Error('Category not found');

    const updatedCategory = {
      ...adminCategories[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    adminCategories[index] = updatedCategory;

    adminProducts = adminProducts.map((product) => (
      product.category_id === id ? { ...product, category: updatedCategory } : product
    ));

    adminCategories = [...adminCategories].sort((a, b) => a.sort_order - b.sort_order);
    return updatedCategory;
  },

  async deleteCategory(id: string) {
    adminCategories = adminCategories.filter((category) => category.id !== id);
    adminProducts = adminProducts.map((product) => (
      product.category_id === id ? { ...product, category: undefined } : product
    ));
  },

  async getBlogPosts(): Promise<BlogPost[]> {
    return [...adminBlogPosts];
  },

  async getCoupons(): Promise<Coupon[]> {
    return [...adminCoupons];
  },

  async getAnalytics(): Promise<AdminAnalyticsSnapshot> {
    return adminAnalytics;
  },

  async createSupportTicket(input: Partial<SupportTicket>): Promise<SupportTicket> {
    const created: SupportTicket = {
      id: `ticket-${crypto.randomUUID()}`,
      user_id: input.user_id ?? null,
      name: input.name ?? null,
      email: input.email ?? 'support@nexlogs.com',
      subject: input.subject ?? 'New error report',
      description: input.description ?? '',
      status: input.status ?? 'open',
      source: input.source ?? 'website_error',
      page_url: input.page_url ?? null,
      error_message: input.error_message ?? null,
      browser_info: input.browser_info ?? null,
      admin_notes: input.admin_notes ?? null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    supportTickets = [created, ...supportTickets];
    return created;
  },

  async getSupportTickets(): Promise<SupportTicket[]> {
    return [...supportTickets].sort((a, b) => b.created_at.localeCompare(a.created_at));
  },

  async updateSupportTicket(id: string, updates: Partial<SupportTicket>): Promise<SupportTicket> {
    const index = supportTickets.findIndex((ticket) => ticket.id === id);
    if (index < 0) throw new Error('Support ticket not found');
    supportTickets[index] = {
      ...supportTickets[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    return supportTickets[index];
  },
};
