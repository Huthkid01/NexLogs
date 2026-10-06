/**
 * Guest community promo is permanently disabled.
 * Announcements now show only after login via useLoginAnnouncement.
 */
export function useCommunityPromo() {
  return {
    open: false,
    dismiss: () => undefined,
    markJoined: () => undefined,
  };
}
