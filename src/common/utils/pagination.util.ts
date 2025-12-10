import { PaginatedResponse } from '../interfaces/pagination-response.interface';

export class PaginationUtil {
  static buildPaginatedResponse<T>(
    data: T[],
    page: number,
    limit: number,
    total: number,
  ): PaginatedResponse<T> {
    const pages = Math.ceil(total / limit);
    const hasNextPage = page < pages;
    const hasPreviousPage = page > 1;

    return {
      data,
      page,
      limit,
      total,
      pages,
      hasNextPage,
      hasPreviousPage,
    };
  }
  static calculateSkip(page: number, limit: number): number {
    return (page - 1) * limit;
  }

  static validatePaginationParams(
    page: number = 1,
    limit: number = 10,
  ): { page: number; limit: number } {
    const validatedPage = Math.max(1, page);
    const validatedLimit = Math.max(1, Math.min(100, limit));

    return {
      page: validatedPage,
      limit: validatedLimit,
    };
  }
}
