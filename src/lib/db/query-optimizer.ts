// ─── Prisma Query Optimization Helpers ───────────────────────
// Minimal select/include patterns to reduce DB payload

// ─── Tender Selects ─────────────────────────────────────────

/** Minimal tender fields for list views */
export const TENDER_LIST_SELECT = {
  id: true,
  title: true,
  institution: true,
  city: true,
  tenderType: true,
  status: true,
  deadline: true,
  publishDate: true,
  estimatedCost: true,
  source: true,
  ekapNo: true,
} as const;

/** Tender detail — includes relations */
export const TENDER_DETAIL_SELECT = {
  ...TENDER_LIST_SELECT,
  description: true,
  openingDate: true,
  cpvCodes: true,
  documents: {
    select: {
      id: true,
      fileName: true,
      fileType: true,
      fileSize: true,
      uploadedAt: true,
    },
  },
  bids: {
    select: {
      id: true,
      userId: true,
      amount: true,
      status: true,
      createdAt: true,
    },
  },
  result: {
    select: {
      id: true,
      winnerName: true,
      winnerAmount: true,
      announcedAt: true,
    },
  },
} as const;

// ─── Company Selects ────────────────────────────────────────

export const COMPANY_LIST_SELECT = {
  id: true,
  name: true,
  taxNumber: true,
  city: true,
  sector: true,
  vknVerified: true,
} as const;

export const COMPANY_DETAIL_SELECT = {
  ...COMPANY_LIST_SELECT,
  taxOffice: true,
  address: true,
  phone: true,
  email: true,
  website: true,
  description: true,
  foundedYear: true,
  employeeCount: true,
  capitalAmount: true,
  companyType: true,
} as const;

// ─── User Selects ───────────────────────────────────────────

export const USER_SAFE_SELECT = {
  id: true,
  name: true,
  email: true,
  image: true,
  role: true,
  plan: true,
  companyId: true,
  createdAt: true,
} as const;

// ─── Notification Selects ───────────────────────────────────

export const NOTIFICATION_SELECT = {
  id: true,
  type: true,
  title: true,
  message: true,
  isRead: true,
  link: true,
  createdAt: true,
} as const;

// ─── Pagination Helper ─────────────────────────────────────

export interface PaginationParams {
  page: number;
  limit: number;
}

export function getPaginationArgs(params: PaginationParams): {
  skip: number;
  take: number;
} {
  const page = Math.max(1, params.page);
  const limit = Math.min(100, Math.max(1, params.limit));
  return { skip: (page - 1) * limit, take: limit };
}

export function buildPagination(
  total: number,
  params: PaginationParams,
): {
  total: number;
  page: number;
  limit: number;
  pages: number;
  hasNext: boolean;
} {
  const pages = Math.ceil(total / params.limit);
  return {
    total,
    page: params.page,
    limit: params.limit,
    pages,
    hasNext: params.page < pages,
  };
}
