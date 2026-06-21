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

const SHARED_CITY_FEATURES_TAIL = [
  'Admin Access',
  'Intel Xeon CPU',
  '1Gbps Internet Speed',
  'Unlimited Bandwidth',
  'Renewable',
  '24x7 Live Chat Support',
];

const FOREX_FEATURES_TAIL = [
  'Admin Access',
  '2Gbps Internet Speed',
  'Unlimited Bandwidth',
  'Renewable',
  '24x7 Live Chat Support',
];

interface CityPlanTemplate {
  ramKey: string;
  ramLabel: string;
  priceUsdMonthly: number;
  ramFeature: string;
  ssdFeature: string;
  vCoresFeature?: string;
}

const CITY_PLAN_TEMPLATES: CityPlanTemplate[] = [
  {
    ramKey: '2gb',
    ramLabel: '2 GB Ram',
    priceUsdMonthly: 6.67,
    ramFeature: '2 GB RAM',
    ssdFeature: '40 GB SSD',
    vCoresFeature: '2 vCores',
  },
  {
    ramKey: '4gb',
    ramLabel: '4 GB RAM',
    priceUsdMonthly: 10,
    ramFeature: '4 GB RAM',
    ssdFeature: '80 GB SSD',
    vCoresFeature: '4 vCores',
  },
  {
    ramKey: '6gb',
    ramLabel: '6 GB RAM',
    priceUsdMonthly: 16.67,
    ramFeature: '6 GB RAM',
    ssdFeature: '100 GB SSD',
    vCoresFeature: '4 vCores',
  },
  {
    ramKey: '8gb',
    ramLabel: '8 GB Ram',
    priceUsdMonthly: 26.67,
    ramFeature: '8 GB RAM',
    ssdFeature: '100 GB SSD',
    vCoresFeature: '6 vCores',
  },
  {
    ramKey: '16gb',
    ramLabel: '16 GB Ram',
    priceUsdMonthly: 43.33,
    ramFeature: '16 GB RAM',
    ssdFeature: '100 GB SSD',
    vCoresFeature: '8 vCores',
  },
];

interface ForexPlanTemplate {
  ramKey: string;
  ramLabel: string;
  priceUsdMonthly: number;
  ramFeature: string;
  ssdFeature: string;
  vCoresFeature?: string;
}

const FOREX_PLAN_TEMPLATES: ForexPlanTemplate[] = [
  {
    ramKey: '4gb',
    ramLabel: '4 GB RAM',
    priceUsdMonthly: 16.67,
    ramFeature: '4 GB RAM',
    ssdFeature: '50 GB SSD',
  },
  {
    ramKey: '6gb',
    ramLabel: '6 GB RAM',
    priceUsdMonthly: 26.67,
    ramFeature: '6 GB RAM',
    ssdFeature: '100 GB SSD',
  },
  {
    ramKey: '8gb',
    ramLabel: '8 GB RAM',
    priceUsdMonthly: 37.33,
    ramFeature: '8 GB RAM',
    ssdFeature: '200 GB SSD',
  },
  {
    ramKey: '16gb',
    ramLabel: '16 GB RAM',
    priceUsdMonthly: 73.33,
    ramFeature: '16 GB RAM',
    ssdFeature: '200 GB SSD',
    vCoresFeature: '12 vCores',
  },
];

function buildCityPlanFeatures(template: CityPlanTemplate): string[] {
  return [
    template.ramFeature,
    template.ssdFeature,
    template.vCoresFeature!,
    ...SHARED_CITY_FEATURES_TAIL,
  ].filter(Boolean);
}

function buildForexPlanFeatures(template: ForexPlanTemplate): string[] {
  return [
    'Optimised for trading',
    'AMD Ryzen 7950X',
    'Gen4 NVMe',
    template.ramFeature,
    'Located in Frankfurt, Germany',
    template.ssdFeature,
    template.vCoresFeature,
    ...FOREX_FEATURES_TAIL,
  ].filter(Boolean) as string[];
}

function buildCityPlans(
  locationId: string,
  slugPrefix: string,
  title: string,
  excludeRamKeys: string[] = [],
): RdpPlan[] {
  return CITY_PLAN_TEMPLATES.filter((template) => !excludeRamKeys.includes(template.ramKey)).map((template) => ({
    id: `${slugPrefix}-${template.ramKey}`,
    locationId,
    title,
    ramLabel: template.ramLabel,
    priceUsdMonthly: template.priceUsdMonthly,
    productSlug: `${slugPrefix}-rdp-${template.ramKey}`,
    features: buildCityPlanFeatures(template),
  }));
}

function buildForexPlans(): RdpPlan[] {
  return FOREX_PLAN_TEMPLATES.map((template) => ({
    id: `forex-${template.ramKey}`,
    locationId: 'forex-rdp',
    title: 'Forex Windows RDP',
    ramLabel: template.ramLabel,
    priceUsdMonthly: template.priceUsdMonthly,
    productSlug: `forex-rdp-${template.ramKey}`,
    features: buildForexPlanFeatures(template),
  }));
}

export const DEFAULT_RDP_LOCATIONS: RdpLocation[] = [
  { id: 'forex-rdp', label: 'Forex RDP' },
  { id: 'miami-usa', label: 'Miami, USA' },
  { id: 'atlanta-usa', label: 'Atlanta, USA' },
  { id: 'la-usa', label: 'LA, USA' },
  { id: 'netherlands', label: 'Netherlands' },
  { id: 'germany', label: 'Germany' },
];

const DEPRECATED_PLAN_IDS = new Set(['netherlands-2gb', 'germany-2gb']);

export const DEFAULT_RDP_CATALOG: RdpCatalog = {
  pageTitle: 'Purchase RDP',
  pageSubtitle: 'Choose the perfect plan for your needs.',
  locations: DEFAULT_RDP_LOCATIONS,
  durations: [{ id: '1-month', label: '1 Month', months: 1 }],
  plans: [
    ...buildForexPlans(),
    ...buildCityPlans('miami-usa', 'miami', 'Miami Windows RDP'),
    ...buildCityPlans('atlanta-usa', 'atlanta', 'Atlanta Windows RDP'),
    ...buildCityPlans('la-usa', 'la', 'LA Windows RDP'),
    ...buildCityPlans('netherlands', 'netherlands', 'Netherlands Windows RDP', ['2gb']),
    ...buildCityPlans('germany', 'germany', 'Germany Windows RDP', ['2gb']),
  ],
};

export function mergeRdpCatalog(catalog?: Partial<RdpCatalog> | null): RdpCatalog {
  const defaults = DEFAULT_RDP_CATALOG;

  if (!catalog?.plans?.length) {
    return defaults;
  }

  const savedPlans = catalog.plans.filter((plan) => !DEPRECATED_PLAN_IDS.has(plan.id));
  const savedPlanIds = new Set(savedPlans.map((plan) => plan.id));
  const savedLocationIds = new Set((catalog.locations ?? []).map((location) => location.id));
  const missingPlans = defaults.plans.filter((plan) => !savedPlanIds.has(plan.id));
  const missingLocations = defaults.locations.filter((location) => !savedLocationIds.has(location.id));

  return {
    pageTitle: catalog.pageTitle ?? defaults.pageTitle,
    pageSubtitle: catalog.pageSubtitle ?? defaults.pageSubtitle,
    locations: catalog.locations?.length
      ? [...catalog.locations, ...missingLocations]
      : defaults.locations,
    durations: defaults.durations,
    plans: [...savedPlans, ...missingPlans],
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

export function getLocationLabel(catalog: RdpCatalog, locationId: string): string {
  return catalog.locations.find((location) => location.id === locationId)?.label ?? locationId;
}
