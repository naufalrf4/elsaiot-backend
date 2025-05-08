/**
 * Standard pagination metadata interface
 */
export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Generic paginated result interface for consistent response structure
 */
export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
}

/**
 * Common pagination query parameters
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
} 