export const QUICK_TOUR_PENDING_KEY = 'nexlogs-pending-quick-tour';

export type QuickTourStep =
  | {
      id: string;
      placement: 'center';
      title: string;
      body: string;
    }
  | {
      id: string;
      placement: 'spotlight';
      target: string;
      title: string;
      body: string;
    }
  | {
      id: string;
      placement: 'demo';
      demoScreen: 'marketplace' | 'rdp' | 'buy-numbers-provider' | 'buy-numbers-flow';
      title: string;
      body: string;
    };

export const QUICK_TOUR_STEPS: QuickTourStep[] = [
  {
    id: 'welcome',
    placement: 'center',
    title: 'Welcome to Nexlogs',
    body:
      'This short tour shows where to find the marketplace, wallet, SMS verification, and help — so you can get started in under a minute.',
  },
  {
    id: 'menu',
    placement: 'spotlight',
    target: '[data-tour="main-menu"]',
    title: 'Main menu',
    body:
      'Tap the menu icon (☰) on the top left to open Marketplace, Buy Numbers for SMS Verification, Purchase RDP, My Purchases, FAQ, and Support.',
  },
  {
    id: 'wallet',
    placement: 'spotlight',
    target: '[data-tour="user-menu"]',
    title: 'Wallet & account',
    body:
      'Your wallet balance appears here. Open this menu to add funds, view your profile, switch theme, or sign out.',
  },
  {
    id: 'buy',
    placement: 'demo',
    demoScreen: 'marketplace',
    title: 'Marketplace',
    body:
      'Browse digital products from the home page or Marketplace. Use categories, search, and tap View Products to pick a variant — payment comes from your wallet.',
  },
  {
    id: 'rdp',
    placement: 'demo',
    demoScreen: 'rdp',
    title: 'Purchase RDP',
    body:
      'Open Purchase RDP from the menu or quick actions. Select a server location, choose a plan, and purchase — your RDP details appear in My Purchases.',
  },
  {
    id: 'numbers',
    placement: 'demo',
    demoScreen: 'buy-numbers-flow',
    title: 'Buy Numbers for SMS Verification',
    body:
      'Buy Numbers for SMS Verification offers Service 1 and Service 2. Pick country and app (e.g. WhatsApp), reserve a number, pay from your wallet, then wait for the code on the page.',
  },
  {
    id: 'help',
    placement: 'center',
    title: 'Need help?',
    body:
      'Open Need help? from the menu, visit the Support page, or email support@nexlogs.store if you get stuck.',
  },
];

function getStorageKey(userId: string) {
  return `nexlogs-quick-tour-v2-completed:${userId}`;
}

export function hasCompletedQuickTour(userId: string) {
  try {
    return localStorage.getItem(getStorageKey(userId)) === '1';
  } catch {
    return false;
  }
}

export function markQuickTourCompleted(userId: string) {
  try {
    localStorage.setItem(getStorageKey(userId), '1');
  } catch {
    // Ignore storage errors (private browsing, etc.).
  }
}

export function resetQuickTourForUser(userId: string) {
  try {
    localStorage.removeItem(getStorageKey(userId));
  } catch {
    // Ignore storage errors.
  }
}

export const QUICK_TOUR_OPEN_EVENT = 'nexlogs:quick-tour-open';

export function openQuickTourNow() {
  window.dispatchEvent(new Event(QUICK_TOUR_OPEN_EVENT));
}

export function queueQuickTourForUser(userId: string) {
  try {
    sessionStorage.setItem(QUICK_TOUR_PENDING_KEY, userId);
  } catch {
    // Ignore storage errors.
  }
}

export function consumePendingQuickTour(userId: string) {
  try {
    const pending = sessionStorage.getItem(QUICK_TOUR_PENDING_KEY);
    if (pending !== userId) return false;
    sessionStorage.removeItem(QUICK_TOUR_PENDING_KEY);
    return true;
  } catch {
    return false;
  }
}
