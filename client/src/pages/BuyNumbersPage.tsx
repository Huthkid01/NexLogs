import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Banknote,
  ChevronLeft,
  ChevronRight,
  Copy,
  Globe,
  Loader2,
  Package,
  RefreshCw,
  Search,
  Smartphone,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useFormatDisplayPrice } from '@/hooks/useFormatDisplayPrice';
import { useModalLock } from '@/hooks/useModalLock';
import { useWalletBalance } from '@/hooks/useWalletBalance';
import { cn } from '@/lib/utils';
import { matchesSmsCountrySearch } from '@/lib/sms-country-search';
import { calculateSmsChargeNgn } from '@/lib/sms-pricing';
import { getDisplaySmsVerificationCode, isValidSmsVerificationCode } from '@/lib/sms-verification-code';
import { getPurchaseErrorMessage, isInsufficientFundsError } from '@/lib/purchase-errors';
import {
  smsNumberService,
  type SmsNumberOrder,
  type SmsNumberProvider,
  type SmsPoolCountry,
  type SmsPoolPriceOptionRow,
  type SmsPoolService,
} from '@/services/sms-number.service';

const POPULAR_SERVICE_NAMES = [
  'kakaotalk',
  'naver',
  'tinder',
  'instagram',
  'telegram',
  'ebay',
  'viber',
  'facebook',
  'whatsapp',
  'tiktok',
  'snapchat',
  'google',
  'twitter',
  'discord',
  'microsoft',
  'apple',
];

const SERVICES_PER_PAGE = 8;
const COUNTRIES_DROPDOWN_LIMIT = 12;
const ACTIVE_SYNC_INTERVAL_MS = 5_000;

const SMS_NUMBER_PROVIDERS = [
  { id: 'service-1', label: 'Service 1', enabled: true },
  { id: 'service-2', label: 'Service 2', enabled: true },
] as const;

type SmsProviderId = (typeof SMS_NUMBER_PROVIDERS)[number]['id'];

function resolveSmsProvider(providerId?: SmsProviderId): SmsNumberProvider {
  return providerId === 'service-2' ? 'fivesim' : 'smspool';
}

function matchServiceName(serviceName: string, token: string) {
  return serviceName.toLowerCase().includes(token);
}

function sortServices(services: SmsPoolService[]) {
  return [...services].sort((a, b) => {
    const aIndex = POPULAR_SERVICE_NAMES.findIndex((name) => matchServiceName(a.name, name));
    const bIndex = POPULAR_SERVICE_NAMES.findIndex((name) => matchServiceName(b.name, name));
    const aRank = aIndex === -1 ? 999 : aIndex;
    const bRank = bIndex === -1 ? 999 : bIndex;
    if (aRank !== bRank) return aRank - bRank;
    return a.name.localeCompare(b.name);
  });
}

function formatCountryCodeLabel(code?: string) {
  if (!code) return null;
  if (code === '[object Object]' || code.includes('[object')) return null;
  return code;
}

function formatServiceLabel(name: string) {
  const primary = name.split('/')[0]?.trim() ?? name;
  return primary.split('(')[0]?.trim() ?? primary;
}

function formatOrderDate(value: string) {
  return new Date(value).toLocaleString(undefined, {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatReservedTime(value: string) {
  const date = new Date(value);
  const pad = (part: number) => String(part).padStart(2, '0');

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function formatReservedNumber(phone: string) {
  return phone.replace(/^\+/, '');
}

function getCopyablePhoneNumber(phone: string) {
  const trimmed = phone.trim();
  if (!trimmed) return '';
  return trimmed.startsWith('+') ? trimmed : `+${trimmed}`;
}

function showReservedActions(order: SmsNumberOrder) {
  return order.status === 'active'
    || (order.status === 'completed' && !isValidSmsVerificationCode(order.verification_code));
}

function formatHistoryCode(order: SmsNumberOrder) {
  const code = getDisplaySmsVerificationCode(order);
  if (code) {
    return {
      text: code,
      className: 'font-bold text-green-600 dark:text-green-400',
    };
  }

  if (order.status === 'cancelled' || order.status === 'refunded') {
    return {
      text: 'Cancelled',
      className: 'font-medium text-red-600 dark:text-red-400',
    };
  }

  if (order.status === 'expired') {
    return {
      text: 'Expired',
      className: 'text-gray-500 dark:text-gray-400',
    };
  }

  if (order.status === 'active') {
    return {
      text: 'Waiting...',
      className: 'text-gray-400',
    };
  }

  return {
    text: '—',
    className: 'text-gray-400',
  };
}

async function copyText(value: string, label: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  } catch {
    toast.error(`Could not copy ${label.toLowerCase()}`);
  }
}

function isOrderPastExpiry(order: SmsNumberOrder) {
  if (!order.expires_at) return false;
  return new Date(order.expires_at).getTime() <= Date.now();
}

function useExpiryCountdown(expiresAt: string | null, enabled: boolean) {
  const [remaining, setRemaining] = useState('');

  useEffect(() => {
    if (!enabled || !expiresAt) {
      setRemaining('');
      return;
    }

    const tick = () => {
      const ms = new Date(expiresAt).getTime() - Date.now();
      if (ms <= 0) {
        setRemaining('');
        return;
      }
      const minutes = Math.floor(ms / 60_000);
      const seconds = Math.floor((ms % 60_000) / 1000);
      setRemaining(`${minutes}:${String(seconds).padStart(2, '0')}`);
    };

    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [enabled, expiresAt]);

  return remaining;
}

function ReservedExpiryCountdown({
  expiresAt,
  active,
  className,
}: {
  expiresAt: string | null;
  active: boolean;
  className?: string;
}) {
  const remaining = useExpiryCountdown(expiresAt, active);
  if (!active || !expiresAt || !remaining) return null;

  return (
    <p className={cn('whitespace-nowrap', className)}>
      <span className="mr-2">⏳</span>
      <strong>Expires in:</strong> {remaining}
    </p>
  );
}

function shouldShowReservedOrder(
  order: SmsNumberOrder,
  dismissedIds: Set<string>,
  pinnedIds: Set<string>,
) {
  if (dismissedIds.has(order.id)) return false;
  if (isOrderPastExpiry(order)) return false;
  if (order.status === 'expired' || order.status === 'cancelled' || order.status === 'refunded') {
    return false;
  }
  if (pinnedIds.has(order.id)) {
    return order.status === 'active'
      || (order.status === 'completed' && Boolean(getDisplaySmsVerificationCode(order)));
  }
  if (order.status === 'active') return true;
  if (order.status === 'completed' && Boolean(getDisplaySmsVerificationCode(order))) return true;
  return false;
}

function mergeReservedOrders(
  current: SmsNumberOrder[],
  incoming: SmsNumberOrder[],
  dismissedIds: Set<string>,
  pinnedIds: Set<string>,
) {
  const merged = new Map(current.map((order) => [order.id, order]));

  for (const order of incoming) {
    const existing = merged.get(order.id);
    merged.set(order.id, existing ? { ...existing, ...order } : order);
  }

  return Array.from(merged.values())
    .filter((order) => shouldShowReservedOrder(order, dismissedIds, pinnedIds))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

const RESERVED_ORDERS_STORAGE_PREFIX = 'sms-reserved-orders';

function reservedOrdersStorageKey(userId: string, providerId: SmsProviderId) {
  return `${RESERVED_ORDERS_STORAGE_PREFIX}:${providerId}:${userId}`;
}

function isPersistableReservedOrder(order: SmsNumberOrder) {
  if (isOrderPastExpiry(order)) return false;
  return order.status === 'active'
    || (order.status === 'completed' && isValidSmsVerificationCode(order.verification_code));
}

function loadReservedOrdersFromStorage(userId: string, providerId: SmsProviderId): SmsNumberOrder[] {
  try {
    const raw = sessionStorage.getItem(reservedOrdersStorageKey(userId, providerId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SmsNumberOrder[];
    return Array.isArray(parsed) ? parsed.filter(isPersistableReservedOrder) : [];
  } catch {
    return [];
  }
}

function saveReservedOrdersToStorage(userId: string, providerId: SmsProviderId, orders: SmsNumberOrder[]) {
  const persistable = orders.filter(isPersistableReservedOrder);
  if (persistable.length === 0) {
    sessionStorage.removeItem(reservedOrdersStorageKey(userId, providerId));
    return;
  }
  sessionStorage.setItem(reservedOrdersStorageKey(userId, providerId), JSON.stringify(persistable));
}

function pinReservedOrder(pinnedIds: Set<string>, order: SmsNumberOrder) {
  if (isPersistableReservedOrder(order)) {
    pinnedIds.add(order.id);
  }
}

interface SmsOrderSummaryContext {
  priceOption: SmsPoolPriceOptionRow;
  country: SmsPoolCountry;
  service: SmsPoolService;
}

const WAITING_FOR_CODE_STORAGE_PREFIX = 'sms-waiting-code';
const ORDER_SUMMARY_CONTEXT_STORAGE_PREFIX = 'sms-order-summary-context';

function waitingForCodeStorageKey(userId: string, providerId: SmsProviderId) {
  return `${WAITING_FOR_CODE_STORAGE_PREFIX}:${providerId}:${userId}`;
}

function orderSummaryContextStorageKey(userId: string, providerId: SmsProviderId) {
  return `${ORDER_SUMMARY_CONTEXT_STORAGE_PREFIX}:${providerId}:${userId}`;
}

function loadWaitingForCodeFromStorage(userId: string, providerId: SmsProviderId) {
  try {
    const raw = sessionStorage.getItem(waitingForCodeStorageKey(userId, providerId));
    if (!raw) return new Set<string>();
    const parsed = JSON.parse(raw) as string[];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set<string>();
  }
}

function saveWaitingForCodeToStorage(userId: string, providerId: SmsProviderId, orderIds: Set<string>) {
  if (orderIds.size === 0) {
    sessionStorage.removeItem(waitingForCodeStorageKey(userId, providerId));
    return;
  }
  sessionStorage.setItem(waitingForCodeStorageKey(userId, providerId), JSON.stringify([...orderIds]));
}

function loadOrderSummaryContextFromStorage(userId: string, providerId: SmsProviderId): SmsOrderSummaryContext | null {
  try {
    const raw = sessionStorage.getItem(orderSummaryContextStorageKey(userId, providerId));
    if (!raw) return null;
    return JSON.parse(raw) as SmsOrderSummaryContext;
  } catch {
    return null;
  }
}

function saveOrderSummaryContextToStorage(
  userId: string,
  providerId: SmsProviderId,
  context: SmsOrderSummaryContext | null,
) {
  if (!context) {
    sessionStorage.removeItem(orderSummaryContextStorageKey(userId, providerId));
    return;
  }
  sessionStorage.setItem(orderSummaryContextStorageKey(userId, providerId), JSON.stringify(context));
}

function restoreOrderSummarySelection(
  context: SmsOrderSummaryContext,
  setters: {
    setSelectedCountry: (country: SmsPoolCountry) => void;
    setCountrySearch: (value: string) => void;
    setSelectedService: (service: SmsPoolService) => void;
    setSelectedPriceOption: (option: SmsPoolPriceOptionRow) => void;
  },
) {
  setters.setSelectedCountry(context.country);
  setters.setCountrySearch(context.country.name);
  setters.setSelectedService(context.service);
  setters.setSelectedPriceOption(context.priceOption);
}

function isAvailabilityErrorMessage(message: string) {
  const normalized = message.toLowerCase();
  return normalized.includes('no number')
    || normalized.includes('not available')
    || normalized.includes('out of stock')
    || normalized.includes('try another');
}

export default function BuyNumbersPage() {
  const navigate = useNavigate();
  const { providerId } = useParams<{ providerId?: SmsProviderId }>();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { formatDisplayAmount } = useFormatDisplayPrice();
  const { data: walletStats, isLoading: walletLoading } = useWalletBalance(user?.id);
  const countryDropdownRef = useRef<HTMLDivElement>(null);

  const activeProvider = SMS_NUMBER_PROVIDERS.find((provider) => provider.id === providerId);
  const isBuyFlow = providerId === 'service-1' || providerId === 'service-2';
  const smsProvider = resolveSmsProvider(providerId);

  const [selectedCountry, setSelectedCountry] = useState<SmsPoolCountry | null>(null);
  const [countrySearch, setCountrySearch] = useState('');
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<SmsPoolService | null>(null);
  const [serviceSearch, setServiceSearch] = useState('');
  const [servicePage, setServicePage] = useState(1);
  const [activeOrders, setActiveOrders] = useState<SmsNumberOrder[]>([]);
  const [selectedPriceOption, setSelectedPriceOption] = useState<SmsPoolPriceOptionRow | null>(null);
  const [orderingPool, setOrderingPool] = useState<string | null>(null);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const [banningOrderId, setBanningOrderId] = useState<string | null>(null);
  const [fetchingCodeOrderId, setFetchingCodeOrderId] = useState<string | null>(null);
  const [resendingOrderId, setResendingOrderId] = useState<string | null>(null);
  const [waitingForCodeOrderIds, setWaitingForCodeOrderIds] = useState<Set<string>>(new Set());
  const [orderSummaryContext, setOrderSummaryContext] = useState<SmsOrderSummaryContext | null>(null);
  const [noNumbersModalOpen, setNoNumbersModalOpen] = useState(false);
  const [expiryCountdownTick, setExpiryCountdownTick] = useState(0);
  const dismissedOrderIdsRef = useRef<Set<string>>(new Set());
  const pinnedOrderIdsRef = useRef<Set<string>>(new Set());
  const notifiedExpiryOrderIdsRef = useRef<Set<string>>(new Set());
  const notifiedCompletedOrderIdsRef = useRef<Set<string>>(new Set());
  const syncErrorNotifiedRef = useRef(false);
  const reservedSectionRef = useRef<HTMLDivElement>(null);

  const { data: catalog, isLoading: catalogLoading, error: catalogError, refetch: refetchCatalog } = useQuery({
    queryKey: ['sms-catalog', smsProvider],
    queryFn: () => smsNumberService.getCatalog(smsProvider),
    enabled: isBuyFlow,
    staleTime: 5 * 60_000,
  });

  const { data: history, isLoading: historyLoading, error: historyError, refetch: refetchHistory } = useQuery({
    queryKey: ['sms-number-history', user?.id, smsProvider],
    queryFn: () => smsNumberService.getHistory(smsProvider),
    enabled: Boolean(user?.id && isBuyFlow),
  });

  const {
    data: priceOptions,
    isFetching: pricesLoading,
    isError: pricesError,
    error: pricesErrorMessage,
    refetch: refetchPrices,
  } = useQuery({
    queryKey: ['sms-country-service-pools', smsProvider, selectedCountry?.id, selectedService?.id],
    queryFn: () => smsNumberService.getCountryServicePools(
      selectedCountry!.id,
      selectedService!.id,
      smsProvider,
    ),
    enabled: Boolean(isBuyFlow && selectedCountry?.id && selectedService?.id),
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!providerId) return;

    if (!isBuyFlow) {
      toast.message('This service is not available yet.');
      navigate('/buy-numbers', { replace: true });
    }
  }, [isBuyFlow, navigate, providerId]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!countryDropdownRef.current?.contains(event.target as Node)) {
        setCountryDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  const countries = useMemo(() => {
    const rows = catalog?.countries ?? [];
    return [...rows].sort((a, b) => a.name.localeCompare(b.name));
  }, [catalog?.countries]);

  const filteredCountries = useMemo(() => {
    const query = countrySearch.trim();
    if (!query) return countries;
    return countries.filter((country) => matchesSmsCountrySearch(country, query));
  }, [countries, countrySearch]);

  const countrySuggestions = filteredCountries.slice(0, COUNTRIES_DROPDOWN_LIMIT);

  const services = useMemo(
    () => sortServices(catalog?.services ?? []),
    [catalog?.services],
  );

  const filteredServices = useMemo(() => {
    const query = serviceSearch.trim().toLowerCase();
    if (!query) return services;
    return services.filter((service) => service.name.toLowerCase().includes(query));
  }, [serviceSearch, services]);

  const servicePageCount = Math.max(1, Math.ceil(filteredServices.length / SERVICES_PER_PAGE));
  const pagedServices = filteredServices.slice(
    (servicePage - 1) * SERVICES_PER_PAGE,
    servicePage * SERVICES_PER_PAGE,
  );

  const historyOrdersWithCode = useMemo(
    () => (history?.orders ?? []).filter((order) => isValidSmsVerificationCode(order.verification_code)),
    [history?.orders],
  );

  useEffect(() => {
    setServicePage(1);
  }, [serviceSearch, selectedCountry?.id]);

  // Hydrate reserved orders + codes from sessionStorage immediately on refresh.
  useEffect(() => {
    setSelectedCountry(null);
    setCountrySearch('');
    setSelectedService(null);
    setSelectedPriceOption(null);
    setServiceSearch('');
    setServicePage(1);
    setActiveOrders([]);
    setWaitingForCodeOrderIds(new Set());
    setOrderSummaryContext(null);
    dismissedOrderIdsRef.current.clear();
    pinnedOrderIdsRef.current.clear();
    notifiedExpiryOrderIdsRef.current.clear();
    notifiedCompletedOrderIdsRef.current.clear();
  }, [providerId]);

  useEffect(() => {
    if (!user?.id || !providerId || !isBuyFlow) return;

    const stored = loadReservedOrdersFromStorage(user.id, providerId);
    const storedWaiting = loadWaitingForCodeFromStorage(user.id, providerId);
    const storedSummaryContext = loadOrderSummaryContextFromStorage(user.id, providerId);

    if (storedWaiting.size > 0) {
      for (const order of stored) {
        if (isValidSmsVerificationCode(order.verification_code)) {
          storedWaiting.delete(order.id);
        }
      }
      setWaitingForCodeOrderIds(storedWaiting);
    }

    if (storedSummaryContext) {
      setOrderSummaryContext(storedSummaryContext);
      setSelectedCountry(storedSummaryContext.country);
      setCountrySearch(storedSummaryContext.country.name);
      setSelectedService(storedSummaryContext.service);
      if (stored.length === 0) {
        setSelectedPriceOption(storedSummaryContext.priceOption);
      }
    }

    if (stored.length === 0) return;

    for (const order of stored) {
      pinReservedOrder(pinnedOrderIdsRef.current, order);
    }

    setActiveOrders((current) => mergeReservedOrders(
      current,
      stored,
      dismissedOrderIdsRef.current,
      pinnedOrderIdsRef.current,
    ));
  }, [isBuyFlow, providerId, user?.id]);

  // Keep sessionStorage in sync with useState so refresh always restores the card + code.
  useEffect(() => {
    if (!user?.id || !providerId || !isBuyFlow) return;
    saveReservedOrdersToStorage(user.id, providerId, activeOrders);
    saveWaitingForCodeToStorage(user.id, providerId, waitingForCodeOrderIds);
    saveOrderSummaryContextToStorage(user.id, providerId, orderSummaryContext);
  }, [activeOrders, isBuyFlow, orderSummaryContext, providerId, user?.id, waitingForCodeOrderIds]);

  useEffect(() => {
    const fromHistory = (history?.orders ?? []).filter(
      (order) => !dismissedOrderIdsRef.current.has(order.id)
        && isPersistableReservedOrder(order),
    );

    for (const order of fromHistory) {
      pinReservedOrder(pinnedOrderIdsRef.current, order);
    }

    setActiveOrders((current) => mergeReservedOrders(
      current,
      fromHistory,
      dismissedOrderIdsRef.current,
      pinnedOrderIdsRef.current,
    ));
  }, [history?.orders]);

  // Restore reserved numbers after refresh (loaded from server, not local state).
  useEffect(() => {
    if (!user?.id || !isBuyFlow) return;

    void smsNumberService.syncActiveOrders(smsProvider).then((result) => {
      const restorable = result.orders.filter(
        (order) => !dismissedOrderIdsRef.current.has(order.id)
          && isPersistableReservedOrder(order),
      );

      for (const order of restorable) {
        pinReservedOrder(pinnedOrderIdsRef.current, order);
      }

      if (restorable.length === 0) return;

      setActiveOrders((current) => mergeReservedOrders(
        current,
        restorable,
        dismissedOrderIdsRef.current,
        pinnedOrderIdsRef.current,
      ));
    }).catch(() => undefined);
  }, [isBuyFlow, smsProvider, user?.id]);

  const hasReservedOrders = activeOrders.length > 0;

  const visibleReservedOrders = useMemo(
    () => activeOrders.filter((order) => !isOrderPastExpiry(order)),
    // expiryCountdownTick forces re-filter as reserved numbers expire.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tick is an intentional refresh signal
    [activeOrders, expiryCountdownTick],
  );

  const removeExpiredReservedOrder = useCallback((order: SmsNumberOrder) => {
    if (dismissedOrderIdsRef.current.has(order.id)) return;

    dismissedOrderIdsRef.current.add(order.id);
    pinnedOrderIdsRef.current.delete(order.id);
    setWaitingForCodeOrderIds((current) => {
      if (!current.has(order.id)) return current;
      const next = new Set(current);
      next.delete(order.id);
      return next;
    });
    setActiveOrders((current) => current.filter((item) => item.id !== order.id));

    const hasCode = isValidSmsVerificationCode(order.verification_code);
    if (!hasCode && !notifiedExpiryOrderIdsRef.current.has(order.id)) {
      notifiedExpiryOrderIdsRef.current.add(order.id);
      void smsNumberService.syncActiveOrders(smsProvider).then((result) => {
        void refetchHistory();
        if (user?.id) {
          void queryClient.invalidateQueries({ queryKey: ['wallet-balance', user.id] });
        }
        const refunded = result.orders.some(
          (synced) => synced.id === order.id
            && (synced.status === 'expired' || synced.status === 'cancelled')
            && !isValidSmsVerificationCode(synced.verification_code),
        );
        if (refunded) {
          toast.message('Activation expired without a code. Your wallet has been refunded.');
        }
      }).catch(() => undefined);
      return;
    }

    if (hasCode) {
      void refetchHistory();
    }
  }, [queryClient, refetchHistory, smsProvider, user]);

  useEffect(() => {
    const needsTicker = activeOrders.some(
      (order) => order.expires_at && !isOrderPastExpiry(order),
    );
    if (!needsTicker) return;

    const interval = window.setInterval(() => {
      setExpiryCountdownTick((tick) => tick + 1);
    }, 1000);

    return () => window.clearInterval(interval);
  }, [activeOrders]);

  useEffect(() => {
    for (const order of activeOrders) {
      if (isOrderPastExpiry(order)) {
        removeExpiredReservedOrder(order);
      }
    }
  }, [activeOrders, expiryCountdownTick, removeExpiredReservedOrder]);

  useEffect(() => {
    if (!user || !hasReservedOrders) return;

    const syncActiveOrders = () => {
      void smsNumberService.syncActiveOrders(smsProvider).then((result) => {
        const refundedWithoutCode = result.orders.filter(
          (order) => (order.status === 'expired' || order.status === 'cancelled')
            && !isValidSmsVerificationCode(order.verification_code),
        );
        const completedWithCode = result.orders.filter(
          (order) => order.status === 'completed' && isValidSmsVerificationCode(order.verification_code),
        );

        const newlyRefunded = refundedWithoutCode.filter(
          (order) => !notifiedExpiryOrderIdsRef.current.has(order.id),
        );
        const newlyCompleted = completedWithCode.filter(
          (order) => !notifiedCompletedOrderIdsRef.current.has(order.id),
        );

        for (const order of refundedWithoutCode) {
          notifiedExpiryOrderIdsRef.current.add(order.id);
          pinnedOrderIdsRef.current.delete(order.id);
          dismissedOrderIdsRef.current.add(order.id);
          setWaitingForCodeOrderIds((current) => {
            const next = new Set(current);
            next.delete(order.id);
            return next;
          });
        }

        for (const order of completedWithCode) {
          notifiedCompletedOrderIdsRef.current.add(order.id);
          pinReservedOrder(pinnedOrderIdsRef.current, order);
          setWaitingForCodeOrderIds((current) => {
            const next = new Set(current);
            next.delete(order.id);
            return next;
          });
        }

        setActiveOrders((current) => mergeReservedOrders(
          current,
          result.orders,
          dismissedOrderIdsRef.current,
          pinnedOrderIdsRef.current,
        ));

        if (newlyRefunded.length > 0) {
          toast.message('Activation expired without a code. Your wallet has been refunded.');
          void refetchHistory();
          void queryClient.invalidateQueries({ queryKey: ['wallet-balance', user.id] });
        }

        if (newlyCompleted.length > 0) {
          toast.success(
            newlyCompleted.length === 1
              ? 'Verification code received'
              : `${newlyCompleted.length} verification codes received`,
          );
          void refetchHistory();
          void queryClient.invalidateQueries({ queryKey: ['wallet-balance', user.id] });
        }

        syncErrorNotifiedRef.current = false;
      }).catch(() => {
        if (!syncErrorNotifiedRef.current) {
          syncErrorNotifiedRef.current = true;
          toast.error('Could not sync your reserved number. Retrying automatically...');
        }
      });
    };

    syncActiveOrders();
    const interval = window.setInterval(syncActiveOrders, ACTIVE_SYNC_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [hasReservedOrders, isBuyFlow, queryClient, refetchHistory, smsProvider, user]);

  const balance = walletStats?.balance ?? 0;

  const hasNoNumbersAvailable = useMemo(() => {
    if (!selectedService || !selectedCountry || pricesLoading) return false;

    if (pricesError) {
      const message = pricesErrorMessage instanceof Error ? pricesErrorMessage.message : '';
      return isAvailabilityErrorMessage(message);
    }

    if (!priceOptions?.rows.length) return true;
    return priceOptions.rows.every((row) => row.stock === 0);
  }, [priceOptions, pricesError, pricesErrorMessage, pricesLoading, selectedCountry, selectedService]);

  useEffect(() => {
    setNoNumbersModalOpen(hasNoNumbersAvailable);
  }, [hasNoNumbersAvailable]);

  const closeNoNumbersModal = () => {
    setNoNumbersModalOpen(false);
    setSelectedPriceOption(null);
    setSelectedService(null);
  };

  useModalLock(noNumbersModalOpen, closeNoNumbersModal);

  const handleSelectProvider = (provider: (typeof SMS_NUMBER_PROVIDERS)[number]) => {
    if (!provider.enabled) {
      toast.message('This service is not available yet.');
      return;
    }

    navigate(`/buy-numbers/${provider.id}`);
  };

  const handleSelectCountry = (country: SmsPoolCountry) => {
    setSelectedCountry(country);
    setCountrySearch(country.name);
    setCountryDropdownOpen(false);
    setServiceSearch('');
    setServicePage(1);
    setSelectedService(null);
    setSelectedPriceOption(null);
  };

  const handleCountrySearchChange = (value: string) => {
    setCountrySearch(value);
    setCountryDropdownOpen(true);
    if (selectedCountry && value !== selectedCountry.name) {
      setSelectedCountry(null);
      setSelectedService(null);
      setSelectedPriceOption(null);
    }
  };

  const handleSelectPlatform = (service: SmsPoolService) => {
    setSelectedService(service);
    setSelectedPriceOption(null);
  };

  const handleBackToServices = () => {
    setSelectedService(null);
    setSelectedPriceOption(null);
    setOrderingPool(null);
  };

  const handleSelectPrice = (option: SmsPoolPriceOptionRow) => {
    if (option.stock === 0 || option.stock === null) return;
    setSelectedPriceOption(option);
  };

  const markWaitingForCode = (orderId: string) => {
    setWaitingForCodeOrderIds((current) => {
      const next = new Set(current);
      next.add(orderId);
      return next;
    });
  };

  const clearWaitingForCode = (orderId: string) => {
    setWaitingForCodeOrderIds((current) => {
      const next = new Set(current);
      next.delete(orderId);
      return next;
    });
  };

  const handleConfirmReserve = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (!selectedCountry || !selectedService || !selectedPriceOption) {
      toast.error('Select a country, service, and price first.');
      return;
    }

    const option = selectedPriceOption;

    if (walletLoading) {
      toast.message('Loading wallet balance...');
      return;
    }

    if (option.stock === 0 || option.stock === null) {
      toast.error('This price option is not available. Choose another.');
      return;
    }

    if (balance < option.charged_ngn) {
      toast.error('Insufficient wallet balance. Please add funds.');
      navigate('/add-funds');
      return;
    }

    setOrderingPool(option.pool);
    try {
      const pool = option.pool === 'default' ? undefined : option.pool;
      const result = await smsNumberService.orderNumber(
        selectedCountry.id,
        selectedService.id,
        pool,
        smsProvider,
      );
      pinnedOrderIdsRef.current.add(result.order.id);
      const summaryContext: SmsOrderSummaryContext = {
        priceOption: option,
        country: selectedCountry,
        service: selectedService,
      };
      setOrderSummaryContext(summaryContext);
      setActiveOrders((current) => mergeReservedOrders(
        current,
        [result.order],
        dismissedOrderIdsRef.current,
        pinnedOrderIdsRef.current,
      ));
      clearWaitingForCode(result.order.id);
      setSelectedPriceOption(null);
      toast.success('Number reserved successfully.');
      window.requestAnimationFrame(() => {
        reservedSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      void refetchHistory();
      await queryClient.invalidateQueries({ queryKey: ['wallet-balance', user.id] });
    } catch (error) {
      if (isInsufficientFundsError(error)) {
        toast.error('Insufficient wallet balance. Please add funds.');
        navigate('/add-funds');
        return;
      }
      toast.error(getPurchaseErrorMessage(error));
    } finally {
      setOrderingPool(null);
    }
  };

  const formatStockLabel = (stock: number | null) => {
    if (stock === null) return 'Checking availability...';
    return `${stock.toLocaleString('en-US')} available`;
  };

  const handleGetSmsCode = async (orderId: string) => {
    markWaitingForCode(orderId);
    setFetchingCodeOrderId(orderId);
    try {
      const result = await smsNumberService.syncActiveOrders(smsProvider);
      const updated = result.orders.find((order) => order.id === orderId)
        ?? (await smsNumberService.checkOrder(orderId, smsProvider)).order;

      setActiveOrders((current) => mergeReservedOrders(
        current,
        [updated],
        dismissedOrderIdsRef.current,
        pinnedOrderIdsRef.current,
      ));

      if (isValidSmsVerificationCode(updated.verification_code)) {
        pinReservedOrder(pinnedOrderIdsRef.current, updated);
        clearWaitingForCode(orderId);
        toast.success('Verification code received');
        await refetchHistory();
      }
    } catch (error) {
      clearWaitingForCode(orderId);
      toast.error(error instanceof Error ? error.message : 'Could not fetch SMS code.');
    } finally {
      setFetchingCodeOrderId(null);
    }
  };

  const handleResendCode = async (order: SmsNumberOrder) => {
    const resendChargeNgn = calculateSmsChargeNgn(Number(order.cost_usd), {
      usdNgnRate: catalog?.pricing?.usdNgnRate ?? 1500,
      markupPercent: catalog?.pricing?.markupPercent ?? 50,
    });

    if (walletLoading) {
      toast.message('Loading wallet balance...');
      return;
    }

    if (balance < resendChargeNgn) {
      toast.error('Insufficient wallet balance. Please add funds.');
      navigate('/add-funds');
      return;
    }

    setResendingOrderId(order.id);
    try {
      const result = await smsNumberService.resendOrder(order.id, smsProvider);

      setActiveOrders((current) => mergeReservedOrders(
        current,
        [result.order],
        dismissedOrderIdsRef.current,
        pinnedOrderIdsRef.current,
      ));
      markWaitingForCode(order.id);
      toast.success(result.message ?? 'Resend requested. Waiting for new code...');
      await refetchHistory();
      await queryClient.invalidateQueries({ queryKey: ['wallet-balance', user?.id] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not resend SMS.');
    } finally {
      setResendingOrderId(null);
    }
  };

  const handleCancel = async (orderId: string) => {
    if (cancellingOrderId) return;

    const cancelledOrder = activeOrders.find((order) => order.id === orderId);
    const summaryContext = orderSummaryContext
      ?? (providerId ? loadOrderSummaryContextFromStorage(user?.id ?? '', providerId) : null);

    dismissedOrderIdsRef.current.add(orderId);
    pinnedOrderIdsRef.current.delete(orderId);
    clearWaitingForCode(orderId);
    setActiveOrders((current) => current.filter((order) => order.id !== orderId));
    setCancellingOrderId(orderId);

    try {
      await smsNumberService.cancelOrder(orderId, smsProvider);
      if (summaryContext) {
        restoreOrderSummarySelection(summaryContext, {
          setSelectedCountry,
          setCountrySearch,
          setSelectedService,
          setSelectedPriceOption,
        });
        setOrderSummaryContext(summaryContext);
      }
      toast.success('Order cancelled and wallet refunded.');
      await refetchHistory();
      await queryClient.invalidateQueries({ queryKey: ['wallet-balance', user?.id] });
    } catch (error) {
      dismissedOrderIdsRef.current.delete(orderId);
      if (cancelledOrder) {
        pinnedOrderIdsRef.current.add(cancelledOrder.id);
        setActiveOrders((current) => mergeReservedOrders(
          current,
          [cancelledOrder],
          dismissedOrderIdsRef.current,
          pinnedOrderIdsRef.current,
        ));
      }
      const message = error instanceof Error ? error.message : 'Could not cancel order.';
      await refetchHistory();
      toast.error(message);
    } finally {
      setCancellingOrderId(null);
    }
  };

  const handleBanNumber = async (orderId: string) => {
    if (banningOrderId || smsProvider !== 'fivesim') return;

    const bannedOrder = activeOrders.find((order) => order.id === orderId);
    const summaryContext = orderSummaryContext
      ?? (providerId ? loadOrderSummaryContextFromStorage(user?.id ?? '', providerId) : null);

    dismissedOrderIdsRef.current.add(orderId);
    pinnedOrderIdsRef.current.delete(orderId);
    clearWaitingForCode(orderId);
    setActiveOrders((current) => current.filter((order) => order.id !== orderId));
    setBanningOrderId(orderId);

    try {
      await smsNumberService.banOrder(orderId, smsProvider);
      if (summaryContext) {
        restoreOrderSummarySelection(summaryContext, {
          setSelectedCountry,
          setCountrySearch,
          setSelectedService,
          setSelectedPriceOption,
        });
        setOrderSummaryContext(summaryContext);
      }
      toast.success('Number reported as already used. Your wallet was refunded.');
      await refetchHistory();
      await queryClient.invalidateQueries({ queryKey: ['wallet-balance', user?.id] });
    } catch (error) {
      dismissedOrderIdsRef.current.delete(orderId);
      if (bannedOrder) {
        pinnedOrderIdsRef.current.add(bannedOrder.id);
        setActiveOrders((current) => mergeReservedOrders(
          current,
          [bannedOrder],
          dismissedOrderIdsRef.current,
          pinnedOrderIdsRef.current,
        ));
      }
      const message = error instanceof Error ? error.message : 'Could not report this number.';
      await refetchHistory();
      toast.error(message);
    } finally {
      setBanningOrderId(null);
    }
  };

  if (!isBuyFlow) {
    return (
      <div className="bg-gray-50 dark:bg-dm-bg min-h-full">
        <div className="mx-auto flex min-h-[calc(100vh-12rem)] max-w-lg flex-col justify-center px-4 py-12 sm:px-6">
          <section className="w-full rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-dm-border dark:bg-dm-surface sm:p-8">
            <div className="text-center">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Select a service</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Choose a service to continue</p>
            </div>

            <div className="mt-6 space-y-3">
              {SMS_NUMBER_PROVIDERS.map((provider) => (
                <button
                  key={provider.id}
                  type="button"
                  onClick={() => handleSelectProvider(provider)}
                  disabled={!provider.enabled}
                  className={cn(
                    'w-full rounded-xl border px-4 py-5 text-base font-semibold transition-colors',
                    provider.enabled
                      ? 'border-gray-200 bg-gray-50 text-gray-800 hover:border-[#f26522] hover:bg-[#fff7f2] dark:border-dm-border dark:bg-dm-bg dark:text-gray-100 dark:hover:border-[#f26522]'
                      : 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400 dark:border-dm-border dark:bg-dm-bg/60 dark:text-gray-500',
                  )}
                >
                  {provider.label}
                </button>
              ))}
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#f3f4f6] dark:bg-dm-bg min-h-full">
      <div className="w-full px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        {catalogError && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
            Could not load SMS services.{' '}
            <button type="button" className="font-medium underline" onClick={() => void refetchCatalog()}>
              Try again
            </button>
          </div>
        )}

        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          SMS Verification ({activeProvider?.label ?? 'Service 1'})
        </h1>

        <div className="mt-6">
          <label className="mb-3 flex items-center gap-2 text-base font-bold text-gray-900 dark:text-gray-100">
            <Globe className="h-5 w-5 text-[#f26522]" />
            Select Country
          </label>

          <div ref={countryDropdownRef} className="relative">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                value={countrySearch}
                onChange={(event) => handleCountrySearchChange(event.target.value)}
                onFocus={() => setCountryDropdownOpen(true)}
                placeholder="Search countries..."
                className="h-12 rounded-lg border-gray-300 bg-white pl-11 text-base shadow-sm dark:border-dm-border dark:bg-dm-surface"
              />
            </div>

            {countryDropdownOpen && (
              <div className="absolute z-20 mt-2 max-h-72 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-dm-border dark:bg-dm-surface">
                {catalogLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-[#f26522]" />
                  </div>
                ) : countrySuggestions.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-gray-500">No countries match your search.</p>
                ) : (
                  countrySuggestions.map((country) => (
                    <button
                      key={country.id}
                      type="button"
                      onClick={() => handleSelectCountry(country)}
                      className={cn(
                        'flex w-full items-center justify-between px-4 py-3 text-left text-sm transition-colors hover:bg-gray-50 dark:hover:bg-dm-bg',
                        selectedCountry?.id === country.id && 'bg-[#fff7f2] dark:bg-[#f26522]/10',
                      )}
                    >
                      <span className="font-medium text-gray-900 dark:text-gray-100">{country.name}</span>
                      {formatCountryCodeLabel(country.code) && (
                        <span className="text-xs text-gray-500">{formatCountryCodeLabel(country.code)}</span>
                      )}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {selectedCountry && (
          <div className="mt-8">
            <label className="mb-3 flex items-center gap-2 text-base font-bold text-gray-900 dark:text-gray-100">
              <Smartphone className="h-5 w-5 text-[#f26522]" />
              Services
            </label>

            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                value={serviceSearch}
                onChange={(event) => setServiceSearch(event.target.value)}
                placeholder="Search services..."
                className="h-12 rounded-lg border-gray-300 bg-white pl-11 text-base shadow-sm dark:border-dm-border dark:bg-dm-surface"
              />
            </div>

            {catalogLoading ? (
              <div className="mt-8 flex justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-[#f26522]" />
              </div>
            ) : (
              <>
                <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                  {pagedServices.map((service) => {
                    const isSelected = selectedService?.id === service.id;
                    return (
                      <button
                        key={service.id}
                        type="button"
                        disabled={Boolean(orderingPool)}
                        onClick={() => handleSelectPlatform(service)}
                        className={cn(
                          'min-h-[4.5rem] rounded-lg border px-3 py-4 text-sm font-bold shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60',
                          isSelected
                            ? 'border-[#f26522] bg-[#f26522] text-white'
                            : 'border-gray-200 bg-white text-gray-900 hover:border-[#f26522] hover:bg-[#f26522] hover:text-white dark:border-dm-border dark:bg-dm-surface dark:text-gray-100 dark:hover:border-[#f26522] dark:hover:bg-[#f26522] dark:hover:text-white',
                        )}
                      >
                        {formatServiceLabel(service.name)}
                      </button>
                    );
                  })}
                </div>

                {filteredServices.length === 0 && (
                  <p className="mt-6 text-center text-sm text-gray-500">No services match your search.</p>
                )}

                {filteredServices.length > 0 && (
                  <div className="mt-6 flex items-center justify-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={servicePage <= 1}
                      onClick={() => setServicePage((page) => Math.max(1, page - 1))}
                      className="rounded-lg"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Prev
                    </Button>
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      Page {servicePage} of {servicePageCount}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={servicePage >= servicePageCount}
                      onClick={() => setServicePage((page) => Math.min(servicePageCount, page + 1))}
                      className="rounded-lg"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                {selectedService && (
                  <div className="mt-10 border-t border-gray-200 pt-8 dark:border-dm-border">
                    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <label className="flex items-center gap-2 text-base font-bold text-gray-900 dark:text-gray-100">
                        <Banknote className="h-5 w-5 text-[#f26522]" />
                        Select Price
                      </label>
                      <button
                        type="button"
                        onClick={handleBackToServices}
                        className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-[#f26522] dark:text-gray-300"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Back to Services
                      </button>
                    </div>

                    {pricesLoading ? (
                      <div className="flex justify-center py-10">
                        <Loader2 className="h-8 w-8 animate-spin text-[#f26522]" />
                      </div>
                    ) : pricesError ? (
                      isAvailabilityErrorMessage(
                        pricesErrorMessage instanceof Error ? pricesErrorMessage.message : '',
                      ) ? null : (
                      <div className="rounded-lg border border-dashed border-red-200 bg-red-50 px-4 py-8 text-center dark:border-red-900/40 dark:bg-red-950/20">
                        <p className="text-sm text-red-700 dark:text-red-300">
                          {pricesErrorMessage instanceof Error
                            ? pricesErrorMessage.message
                            : 'Could not load prices. Try again.'}
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="mt-4"
                          onClick={() => void refetchPrices()}
                        >
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Retry
                        </Button>
                      </div>
                      )
                    ) : !priceOptions?.rows.length || priceOptions.rows.every((row) => row.stock === 0) ? (
                      null
                    ) : (
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {priceOptions.rows.map((option) => {
                          const isSelected = selectedPriceOption?.pool === option.pool
                            && selectedPriceOption?.charged_ngn === option.charged_ngn;
                          const isOutOfStock = option.stock === 0 || option.stock === null;
                          return (
                            <button
                              key={`${option.pool}-${option.charged_ngn}`}
                              type="button"
                              disabled={Boolean(orderingPool) || isOutOfStock}
                              onClick={() => handleSelectPrice(option)}
                              className={cn(
                                'rounded-lg border px-5 py-5 text-left shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60',
                                isSelected
                                  ? 'border-[#f26522] bg-[#fff7f2] ring-1 ring-[#f26522] dark:bg-[#f26522]/10'
                                  : 'border-gray-200 bg-white hover:border-[#f26522]/60 dark:border-dm-border dark:bg-dm-surface',
                              )}
                            >
                              <div className="flex items-center gap-2 text-base font-bold text-gray-900 dark:text-gray-100">
                                <Banknote className="h-4 w-4 text-[#f26522]" />
                                {formatDisplayAmount(option.charged_ngn)}
                              </div>
                              <div className="mt-3 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                                <Package className="h-4 w-4 text-gray-400" />
                                {formatStockLabel(option.stock)}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {selectedPriceOption && (
                      <div className="mt-8 w-fit max-w-full rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-dm-border dark:bg-dm-surface">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">🧾 Order Summary</h3>
                        <div className="mt-4 space-y-2 text-base text-gray-800 dark:text-gray-200">
                          <p className="whitespace-nowrap">
                            <span className="mr-2">💰</span>
                            <strong>Price:</strong>{' '}
                            {formatDisplayAmount(selectedPriceOption.charged_ngn)}
                          </p>
                          <p className="whitespace-nowrap">
                            <span className="mr-2">📦</span>
                            <strong>Availability:</strong>{' '}
                            {selectedPriceOption.stock ?? '—'}
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={Boolean(orderingPool)}
                          onClick={() => void handleConfirmReserve()}
                          className="mt-5 rounded-lg bg-[#f26522] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#e05a1c] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {orderingPool === selectedPriceOption.pool ? (
                            <span className="inline-flex items-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Reserving...
                            </span>
                          ) : (
                            'Confirm & Reserve Number'
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {visibleReservedOrders.length > 0 && (
          <section ref={reservedSectionRef} id="reserved-numbers" className="mt-8 space-y-6">
            {visibleReservedOrders.map((activeOrder) => {
              const isCancelling = cancellingOrderId === activeOrder.id;
              const isBanning = banningOrderId === activeOrder.id;
              const isFetchingCode = fetchingCodeOrderId === activeOrder.id;
              const isResending = resendingOrderId === activeOrder.id;
              const displayCode = getDisplaySmsVerificationCode(activeOrder);
              const isWaitingForCode = waitingForCodeOrderIds.has(activeOrder.id) && !displayCode;
              const showActions = showReservedActions(activeOrder) && !displayCode;

              return (
                <div
                  key={activeOrder.id}
                  className="w-fit max-w-full rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-dm-border dark:bg-dm-surface"
                >
                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">☎️ Reserved Number</h3>

                  <div className="mt-4 space-y-2 text-base text-gray-800 dark:text-gray-200">
                    <p className="inline-flex flex-wrap items-center gap-2">
                      <span className="mr-0">📞</span>
                      <strong>Number:</strong>
                      <span className="font-medium">{formatReservedNumber(activeOrder.phone_number)}</span>
                      <button
                        type="button"
                        onClick={() => copyText(getCopyablePhoneNumber(activeOrder.phone_number), 'Number')}
                        aria-label="Copy number"
                        className="rounded p-0.5 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-dm-input"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </p>
                    <p className="whitespace-nowrap">
                      <span className="mr-2">💰</span>
                      <strong>Cost:</strong>{' '}
                      {formatDisplayAmount(Number(activeOrder.charged_ngn))}
                    </p>
                    <p className="whitespace-nowrap">
                      <span className="mr-2">⏱️</span>
                      <strong>Time:</strong> {formatReservedTime(activeOrder.created_at)}
                    </p>
                    {!isWaitingForCode && (
                      <ReservedExpiryCountdown
                        expiresAt={activeOrder.expires_at}
                        active={Boolean(activeOrder.expires_at) && !isOrderPastExpiry(activeOrder)}
                      />
                    )}
                  </div>

                  {displayCode ? (
                    <div className="mt-4 inline-flex flex-wrap items-center gap-3">
                      <p className="inline-flex items-center gap-2 text-base font-bold text-green-600 dark:text-green-400">
                        {displayCode}
                        <button
                          type="button"
                          onClick={() => copyText(displayCode, 'Code')}
                          aria-label="Copy code"
                          className="rounded p-0.5 text-green-700 hover:bg-green-100 dark:text-green-400 dark:hover:bg-green-900/30"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </p>
                      <button
                        type="button"
                        disabled={isResending}
                        onClick={() => void handleResendCode(activeOrder)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#f26522] bg-white px-3 py-1.5 text-sm font-semibold text-[#f26522] transition-colors hover:bg-[#fff7f2] disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#f26522] dark:bg-dm-surface dark:hover:bg-[#f26522]/10"
                      >
                        {isResending ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Resending...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="h-3.5 w-3.5" />
                            Resend
                          </>
                        )}
                      </button>
                    </div>
                  ) : isWaitingForCode ? (
                    <div className="mt-4 space-y-2">
                      <p className="text-base font-semibold text-[#f26522] dark:text-[#f26522]">
                        Waiting for Code...
                      </p>
                      <ReservedExpiryCountdown
                        expiresAt={activeOrder.expires_at}
                        active={Boolean(activeOrder.expires_at) && !isOrderPastExpiry(activeOrder)}
                        className="text-base font-semibold text-[#f26522] dark:text-[#f26522]"
                      />
                    </div>
                  ) : null}

                  {showActions && (
                    <div className="mt-5 flex flex-wrap gap-3">
                      {!isWaitingForCode && (
                        <button
                          type="button"
                          disabled={isFetchingCode || isCancelling || isBanning}
                          onClick={() => void handleGetSmsCode(activeOrder.id)}
                          className="rounded-lg bg-[#f26522] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#e05a1c] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isFetchingCode ? (
                            <span className="inline-flex items-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Checking...
                            </span>
                          ) : (
                            'Get SMS Code'
                          )}
                        </button>
                      )}
                      {smsProvider === 'fivesim' && isWaitingForCode && (
                        <button
                          type="button"
                          disabled={isBanning || isCancelling || isFetchingCode}
                          onClick={() => void handleBanNumber(activeOrder.id)}
                          className="rounded-lg border border-amber-500 bg-amber-50 px-5 py-2.5 text-sm font-semibold text-amber-800 transition-colors hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-amber-400 dark:bg-amber-950/30 dark:text-amber-200 dark:hover:bg-amber-950/50"
                        >
                          {isBanning ? (
                            <span className="inline-flex items-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Reporting...
                            </span>
                          ) : (
                            'Number Already Used'
                          )}
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={isCancelling || isBanning || isFetchingCode}
                        onClick={() => void handleCancel(activeOrder.id)}
                        className="rounded-lg bg-red-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isCancelling ? (
                          <span className="inline-flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Cancelling...
                          </span>
                        ) : (
                          'Cancel Activation'
                        )}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </section>
        )}

        <section className="mt-16">
          <div className="overflow-hidden rounded-lg border border-gray-300 bg-white shadow-sm dark:border-dm-border dark:bg-dm-surface">
            <div className="border-b border-gray-300 bg-white px-4 py-3 dark:border-dm-border dark:bg-dm-surface">
              <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">📜 History</span>
            </div>

            <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0 md:overflow-x-visible">
              <table className="w-full min-w-[720px] table-auto border-collapse border border-gray-300 text-center text-xs sm:text-sm md:min-w-0 md:table-fixed dark:border-dm-border">
                <colgroup className="hidden md:contents">
                  <col className="w-[15%]" />
                  <col className="w-[11%]" />
                  <col className="w-[11%]" />
                  <col className="w-[9%]" />
                  <col className="w-[11%]" />
                  <col className="w-[14%]" />
                  <col className="w-[29%]" />
                </colgroup>
                <thead>
                  <tr className="bg-gray-100 text-gray-800 dark:bg-dm-bg dark:text-gray-200">
                    <th className="border border-gray-300 px-2 py-2.5 font-semibold sm:px-3 sm:py-3 dark:border-dm-border">Phone</th>
                    <th className="border border-gray-300 px-2 py-2.5 font-semibold sm:px-3 sm:py-3 dark:border-dm-border">Service</th>
                    <th className="border border-gray-300 px-2 py-2.5 font-semibold sm:px-3 sm:py-3 dark:border-dm-border">Code</th>
                    <th className="border border-gray-300 px-2 py-2.5 font-semibold sm:px-3 sm:py-3 dark:border-dm-border">Cost</th>
                    <th className="border border-gray-300 px-2 py-2.5 font-semibold sm:px-3 sm:py-3 dark:border-dm-border">Provider</th>
                    <th className="border border-gray-300 px-2 py-2.5 font-semibold sm:px-3 sm:py-3 dark:border-dm-border">Country</th>
                    <th className="border border-gray-300 px-2 py-2.5 font-semibold sm:px-3 sm:py-3 dark:border-dm-border">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {historyLoading ? (
                    <tr>
                      <td colSpan={7} className="border border-gray-300 px-4 py-10 text-gray-500 dark:border-dm-border dark:text-gray-400">
                        <Loader2 className="mx-auto h-6 w-6 animate-spin text-[#f26522]" />
                      </td>
                    </tr>
                  ) : historyError ? (
                    <tr>
                      <td colSpan={7} className="border border-gray-300 px-4 py-10 text-gray-600 dark:border-dm-border dark:text-gray-300">
                        <p className="text-sm text-red-600 dark:text-red-400">
                          {historyError instanceof Error ? historyError.message : 'Could not load history.'}
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="mt-3"
                          onClick={() => void refetchHistory()}
                        >
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Retry
                        </Button>
                      </td>
                    </tr>
                  ) : !user ? (
                    <tr>
                      <td colSpan={7} className="border border-gray-300 px-4 py-10 text-gray-600 dark:border-dm-border dark:text-gray-300">
                        <Link to="/login" className="font-medium text-[#f26522] hover:underline">
                          Log in
                        </Link>{' '}
                        to view your SMS history.
                      </td>
                    </tr>
                  ) : !historyOrdersWithCode.length ? (
                    <tr>
                      <td colSpan={7} className="border border-gray-300 px-4 py-10 text-gray-600 dark:border-dm-border dark:text-gray-300">
                        No SMS activations yet.
                      </td>
                    </tr>
                  ) : (
                    historyOrdersWithCode.map((order) => {
                      const codeDisplay = formatHistoryCode(order);
                      return (
                      <tr
                        key={order.id}
                        className="text-gray-800 dark:text-gray-200"
                      >
                        <td className="whitespace-nowrap border border-gray-300 px-2 py-2.5 font-medium text-gray-900 sm:px-3 sm:py-3 md:whitespace-normal md:break-all dark:border-dm-border dark:text-gray-100">
                          {order.phone_number}
                        </td>
                        <td className="border border-gray-300 px-2 py-2.5 sm:px-3 sm:py-3 dark:border-dm-border">
                          {formatServiceLabel(order.service_name ?? order.service_id)}
                        </td>
                        <td className="border border-gray-300 px-2 py-2.5 sm:px-3 sm:py-3 dark:border-dm-border">
                          <span className={codeDisplay.className}>
                            {codeDisplay.text}
                          </span>
                        </td>
                        <td className="border border-gray-300 px-2 py-2.5 sm:px-3 sm:py-3 dark:border-dm-border">
                          {formatDisplayAmount(Number(order.charged_ngn))}
                        </td>
                        <td className="border border-gray-300 px-2 py-2.5 sm:px-3 sm:py-3 dark:border-dm-border">
                          {activeProvider?.label ?? 'Service 1'}
                        </td>
                        <td className="border border-gray-300 px-2 py-2.5 sm:px-3 sm:py-3 dark:border-dm-border">
                          {order.country_name ?? order.country_id}
                        </td>
                        <td className="whitespace-nowrap border border-gray-300 px-2 py-2.5 leading-tight text-gray-600 sm:px-3 sm:py-3 md:whitespace-normal dark:border-dm-border dark:text-gray-300">
                          {formatOrderDate(order.created_at)}
                        </td>
                      </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <p className="mt-6 text-center text-xs text-gray-500 dark:text-gray-400">
          Numbers are for legitimate verification only. Need help?{' '}
          <Link to="/support" className="text-[#f26522] hover:underline">Contact support</Link>
        </p>
      </div>

      {noNumbersModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
          <button
            type="button"
            className="absolute inset-0"
            onClick={closeNoNumbersModal}
            aria-label="Close error dialog"
          />

          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="no-numbers-error-title"
            className="relative z-10 w-full max-w-md rounded-xl bg-white px-6 py-8 text-center shadow-xl dark:bg-dm-surface"
          >
            <h2 id="no-numbers-error-title" className="text-xl font-bold text-red-600">
              ⚠️ Error
            </h2>
            <p className="mt-6 text-base leading-relaxed text-gray-800 dark:text-gray-200">
              ⚠️ No numbers available for this service right now. Please try another country or service.
            </p>
            <button
              type="button"
              onClick={closeNoNumbersModal}
              className="mt-8 rounded-lg bg-[#f26522] px-8 py-2.5 text-base font-semibold text-white transition-colors hover:bg-[#e05a1c]"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
