import type { PaginatedResponse, ProfileStats, ReferralStats, Transaction } from '@/types';
import { getMockBalance } from '@/mocks/mock-auth';

const MOCK_TRANSACTIONS: Transaction[] = [
  { id: 'tx-1', ref: 'DA1E73K72RID3RU', created_at: '2026-06-15T07:39:29.000Z', updated_at: '2026-06-15T07:39:29.000Z', payment_method: 'card', amount: 19.25, status: 'completed' },
  { id: 'tx-2', ref: 'SRS9S6J3689763B', created_at: '2026-06-15T07:37:58.000Z', updated_at: '2026-06-15T07:37:58.000Z', payment_method: 'card', amount: 19.25, status: 'completed' },
  { id: 'tx-3', ref: 'DAJTV66EK5U9PP0', created_at: '2026-06-14T16:22:28.000Z', updated_at: '2026-06-14T16:22:28.000Z', payment_method: 'card', amount: 3.63, status: 'completed' },
  { id: 'tx-4', ref: '0L9FAH2VFNITEG9', created_at: '2026-06-14T16:22:28.000Z', updated_at: '2026-06-14T16:22:28.000Z', payment_method: 'card', amount: 6.44, status: 'completed' },
  { id: 'tx-5', ref: '59DH44F12ZJEGUF', created_at: '2026-06-14T16:17:04.000Z', updated_at: '2026-06-14T16:17:04.000Z', payment_method: 'card', amount: 5.21, status: 'completed' },
  { id: 'tx-6', ref: 'K8M2N4P6Q1R3S5T7', created_at: '2026-06-13T14:10:12.000Z', updated_at: '2026-06-13T14:10:12.000Z', payment_method: 'card', amount: 12.5, status: 'completed' },
  { id: 'tx-7', ref: 'A1B2C3D4E5F6G7H8', created_at: '2026-06-12T11:05:44.000Z', updated_at: '2026-06-12T11:05:44.000Z', payment_method: 'card', amount: 8.99, status: 'completed' },
  { id: 'tx-8', ref: 'Z9Y8X7W6V5U4T3S2', created_at: '2026-06-11T09:30:00.000Z', updated_at: '2026-06-11T09:30:00.000Z', payment_method: 'card', amount: 4.5, status: 'completed' },
  { id: 'tx-9', ref: 'M3N5P7R9T1V3X5Z7', created_at: '2026-06-10T16:45:22.000Z', updated_at: '2026-06-10T16:45:22.000Z', payment_method: 'card', amount: 15.75, status: 'completed' },
  { id: 'tx-10', ref: 'H2J4L6N8P0R2T4V6', created_at: '2026-06-09T13:20:18.000Z', updated_at: '2026-06-09T13:20:18.000Z', payment_method: 'card', amount: 7.25, status: 'completed' },
  { id: 'tx-11', ref: 'Q1W3E5R7T9Y1U3I5', created_at: '2026-06-08T10:15:30.000Z', updated_at: '2026-06-08T10:15:30.000Z', payment_method: 'card', amount: 11.0, status: 'completed' },
  { id: 'tx-12', ref: 'F4G6H8J0K2L4M6N8', created_at: '2026-06-07T08:50:45.000Z', updated_at: '2026-06-07T08:50:45.000Z', payment_method: 'card', amount: 6.8, status: 'completed' },
  { id: 'tx-13', ref: 'P2O4I6U8Y0T2R4E6', created_at: '2026-06-06T17:33:11.000Z', updated_at: '2026-06-06T17:33:11.000Z', payment_method: 'card', amount: 9.99, status: 'completed' },
  { id: 'tx-14', ref: 'S5D7F9G1H3J5K7L9', created_at: '2026-06-05T15:22:07.000Z', updated_at: '2026-06-05T15:22:07.000Z', payment_method: 'card', amount: 3.15, status: 'completed' },
  { id: 'tx-15', ref: 'X8C0V2B4N6M8Q0W2', created_at: '2026-06-04T12:11:55.000Z', updated_at: '2026-06-04T12:11:55.000Z', payment_method: 'card', amount: 14.4, status: 'completed' },
  { id: 'tx-16', ref: 'E4R6T8Y0U2I4O6P8', created_at: '2026-06-03T09:40:33.000Z', updated_at: '2026-06-03T09:40:33.000Z', payment_method: 'card', amount: 5.55, status: 'completed' },
  { id: 'tx-17', ref: 'A7S9D1F3G5H7J9K1', created_at: '2026-06-02T18:25:19.000Z', updated_at: '2026-06-02T18:25:19.000Z', payment_method: 'card', amount: 10.2, status: 'completed' },
  { id: 'tx-18', ref: 'L3Z5X7C9V1B3N5M7', created_at: '2026-06-01T14:18:42.000Z', updated_at: '2026-06-01T14:18:42.000Z', payment_method: 'card', amount: 2.89, status: 'completed' },
  { id: 'tx-19', ref: 'W6Q8E0R2T4Y6U8I0', created_at: '2026-05-31T11:07:28.000Z', updated_at: '2026-05-31T11:07:28.000Z', payment_method: 'card', amount: 18.75, status: 'completed' },
  { id: 'tx-20', ref: 'O9P1A3S5D7F9G1H3', created_at: '2026-05-30T08:55:14.000Z', updated_at: '2026-05-30T08:55:14.000Z', payment_method: 'card', amount: 4.0, status: 'completed' },
  { id: 'tx-21', ref: 'J5K7L9M1N3P5R7T9', created_at: '2026-05-29T16:42:50.000Z', updated_at: '2026-05-29T16:42:50.000Z', payment_method: 'card', amount: 7.8, status: 'completed' },
  { id: 'tx-22', ref: 'V2B4N6M8Q0W2E4R6', created_at: '2026-05-28T13:30:36.000Z', updated_at: '2026-05-28T13:30:36.000Z', payment_method: 'card', amount: 6.1, status: 'completed' },
  { id: 'tx-23', ref: 'T8Y0U2I4O6P8A0S2', created_at: '2026-05-27T10:18:22.000Z', updated_at: '2026-05-27T10:18:22.000Z', payment_method: 'card', amount: 9.45, status: 'completed' },
  { id: 'tx-24', ref: 'D4F6G8H0J2K4L6N8', created_at: '2026-05-26T07:06:08.000Z', updated_at: '2026-05-26T07:06:08.000Z', payment_method: 'card', amount: 3.75, status: 'completed' },
  { id: 'tx-25', ref: 'C1X3Z5B7N9M1Q3W5', created_at: '2026-05-25T19:54:55.000Z', updated_at: '2026-05-25T19:54:55.000Z', payment_method: 'card', amount: 12.0, status: 'completed' },
];

const MOCK_REFERRAL: ReferralStats = {
  code: '320794C3',
  total_referrals: 0,
  qualified_referrals: 0,
  total_earnings: 0,
};

export const mockProfileService = {
  async getStats(userId: string): Promise<ProfileStats> {
    return {
      balance: getMockBalance(userId),
      total_purchases: 20,
      total_spent: 102.48,
    };
  },

  async getTransactions(userId: string, page = 1, limit = 5): Promise<PaginatedResponse<Transaction>> {
    void userId;
    const total = MOCK_TRANSACTIONS.length;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const data = MOCK_TRANSACTIONS.slice(start, start + limit);

    return { data, total, page, limit, totalPages };
  },

  async getReferralStats(userId: string): Promise<ReferralStats> {
    void userId;
    return MOCK_REFERRAL;
  },
};
