export interface ApiResponse<T> {
  data: T;
}

export interface ApiListResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
  };
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Array<{
      path: string;
      message: string;
    }>;
  };
}
