export interface RdpLocation {
  id: string;
  label: string;
}

export interface RdpDuration {
  id: string;
  label: string;
  months: number;
}

export interface RdpPlan {
  id: string;
  locationId: string;
  title: string;
  ramLabel: string;
  priceUsdMonthly: number;
  productSlug: string;
  features: string[];
}

export interface RdpCatalog {
  pageTitle: string;
  pageSubtitle: string;
  locations: RdpLocation[];
  durations: RdpDuration[];
  plans: RdpPlan[];
}

const SHARED_FEATURES = [
  'Admin Access',
  'Intel Xeon CPU',
  '1Gbps Internet Speed',
  'Unlimited Bandwidth',
  'Renewable',
  '24x7 Live Chat Support',
];

function atlantaPlans(): RdpPlan[] {
  return [
    {
      id: 'atlanta-2gb',
      locationId: 'atlanta-usa',
      title: 'Atlanta Windows RDP',
      ramLabel: '2 GB Ram',
      priceUsdMonthly: 6.67,
      productSlug: 'atlanta-rdp-2gb',
      features: ['2 GB RAM', '40 GB SSD', '2 vCores', ...SHARED_FEATURES],
    },
    {
      id: 'atlanta-4gb',
      locationId: 'atlanta-usa',
      title: 'Atlanta Windows RDP',
      ramLabel: '4 GB RAM',
      priceUsdMonthly: 10,
      productSlug: 'atlanta-rdp-4gb',
      features: ['4 GB RAM', '80 GB SSD', '4 vCores', ...SHARED_FEATURES],
    },
    {
      id: 'atlanta-6gb',
      locationId: 'atlanta-usa',
      title: 'Atlanta Windows RDP',
      ramLabel: '6 GB RAM',
      priceUsdMonthly: 16.67,
      productSlug: 'atlanta-rdp-6gb',
      features: ['6 GB RAM', '100 GB SSD', '4 vCores', ...SHARED_FEATURES],
    },
    {
      id: 'atlanta-8gb',
      locationId: 'atlanta-usa',
      title: 'Atlanta Windows RDP',
      ramLabel: '8 GB Ram',
      priceUsdMonthly: 26.67,
      productSlug: 'atlanta-rdp-8gb',
      features: ['8 GB RAM', '100 GB SSD', '6 vCores', ...SHARED_FEATURES],
    },
    {
      id: 'atlanta-16gb',
      locationId: 'atlanta-usa',
      title: 'Atlanta Windows RDP',
      ramLabel: '16 GB Ram',
      priceUsdMonthly: 43.33,
      productSlug: 'atlanta-rdp-16gb',
      features: ['16 GB RAM', '100 GB SSD', '8 vCores', ...SHARED_FEATURES],
    },
  ];
}

export const DEFAULT_RDP_CATALOG: RdpCatalog = {
  pageTitle: 'Purchase RDP',
  pageSubtitle: 'Choose the perfect plan for your needs.',
  locations: [
    { id: 'forex-rdp', label: 'Forex RDP' },
    { id: 'miami-usa', label: 'Miami, USA' },
    { id: 'atlanta-usa', label: 'Atlanta, USA' },
    { id: 'la-usa', label: 'LA, USA' },
    { id: 'netherlands', label: 'Netherlands' },
    { id: 'germany', label: 'Germany' },
  ],
  durations: [
    { id: '1-month', label: '1 Month', months: 1 },
    { id: '3-months', label: '3 Months', months: 3 },
    { id: '6-months', label: '6 Months', months: 6 },
  ],
  plans: atlantaPlans(),
};

export function mergeRdpCatalog(catalog?: Partial<RdpCatalog> | null): RdpCatalog {
  return {
    pageTitle: catalog?.pageTitle ?? DEFAULT_RDP_CATALOG.pageTitle,
    pageSubtitle: catalog?.pageSubtitle ?? DEFAULT_RDP_CATALOG.pageSubtitle,
    locations: catalog?.locations?.length ? catalog.locations : DEFAULT_RDP_CATALOG.locations,
    durations: catalog?.durations?.length ? catalog.durations : DEFAULT_RDP_CATALOG.durations,
    plans: catalog?.plans?.length ? catalog.plans : DEFAULT_RDP_CATALOG.plans,
  };
}

export function getRdpProductSlug(plan: RdpPlan, duration: RdpDuration): string {
  return `${plan.productSlug}-${duration.months}-month`;
}

export function getPlanPriceUsd(plan: RdpPlan, duration: RdpDuration): number {
  return Math.round(plan.priceUsdMonthly * duration.months * 100) / 100;
}

export function getPlansForLocation(catalog: RdpCatalog, locationId: string): RdpPlan[] {
  return catalog.plans.filter((plan) => plan.locationId === locationId);
}
