interface ApiError {
  message: string;
  status: number;
  code?: string;
  errors?: Record<string, string[]>;
}

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string = process.env.NEXT_PUBLIC_API_URL || '/api') {
    this.baseURL = baseURL;
  }

  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('cladex_token');
  }

  private async request<T>(
    method: string,
    endpoint: string,
    data?: unknown,
    options?: RequestInit
  ): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options?.headers as Record<string, string>) || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config: RequestInit = {
      method,
      headers,
      ...options,
    };

    if (data && method !== 'GET') {
      config.body = JSON.stringify(data);
    }

    const url = `${this.baseURL}${endpoint}`;

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({
          message: 'An unexpected error occurred',
        }));

        const error: ApiError = {
          message: errorBody.message || errorBody.error || 'Request failed',
          status: response.status,
          code: errorBody.code,
          errors: errorBody.errors,
        };

        // Surface email verification gate with a clear message so callers
        // can show the right UI. Do not redirect — just propagate.
        if (response.status === 403 && errorBody.code === 'EMAIL_NOT_VERIFIED') {
          error.message =
            'Please verify your email before trading or creating agents. Check your inbox for the verification link.';
          throw error;
        }

        if (response.status === 401) {
          if (typeof window !== 'undefined') {
            localStorage.removeItem('cladex_token');
            localStorage.removeItem('cladex_user');
            window.location.href = '/login';
          }
        }

        throw error;
      }

      if (response.status === 204) {
        return {} as T;
      }

      return response.json();
    } catch (err) {
      if ((err as ApiError).status) {
        throw err;
      }
      throw {
        message: 'Network error. Please check your connection.',
        status: 0,
      } as ApiError;
    }
  }

  async get<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>('GET', endpoint, undefined, options);
  }

  async post<T>(endpoint: string, data?: unknown, options?: RequestInit): Promise<T> {
    return this.request<T>('POST', endpoint, data, options);
  }

  async patch<T>(endpoint: string, data?: unknown, options?: RequestInit): Promise<T> {
    return this.request<T>('PATCH', endpoint, data, options);
  }

  async delete<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>('DELETE', endpoint, undefined, options);
  }
}

export const api = new ApiClient();
export type { ApiError };
