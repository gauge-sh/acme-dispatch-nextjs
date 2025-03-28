export const DEFAULT_PER_PAGE = 20;
export const MAX_PER_PAGE = 100;

export interface PageParams {
  page: number;
  perPage: number;
}

export interface Page<T> {
  items: T[];
  page: number;
  perPage: number;
  total: number;
}

export function pageSlice(params: PageParams): { skip: number; take: number } {
  return { skip: (params.page - 1) * params.perPage, take: params.perPage };
}
