import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const errorText = await res.clone().text();
    console.error('Error response:', errorText);
    
    try {
      const errorData = JSON.parse(errorText);
      
      if (errorData) {
        // Handle validation errors
        if (errorData.errors) {
          const errorMessage = errorData.errors
            .map((err: any) => `${err.field}: ${err.message}`)
            .join('\n');
          throw new Error(errorMessage);
        }
        
        // Handle unique constraint errors
        if (errorData.field) {
          throw new Error(`A user with this ${errorData.field} already exists`);
        }
        
        // Handle database errors with details
        if (errorData.error) {
          const details = errorData.details ? `\nDetails: ${JSON.stringify(errorData.details, null, 2)}` : '';
          throw new Error(`${errorData.error}${details}`);
        }
        
        // Handle generic error message with details
        if (errorData.message) {
          const details = errorData.details ? `\nDetails: ${JSON.stringify(errorData.details, null, 2)}` : '';
          throw new Error(`${errorData.message}${details}`);
        }
      }
    } catch (e) {
      // If JSON parsing fails, use the raw error text
      console.error('Failed to parse error response:', e);
      if (errorText) {
        // Try to parse the error text as a simple message
        try {
          const simpleError = JSON.parse(errorText);
          if (typeof simpleError === 'object' && simpleError.message) {
            throw new Error(simpleError.message);
          }
        } catch {
          // If parsing fails, use the raw error text
          throw new Error(errorText);
        }
      }
      throw new Error(res.statusText || `HTTP error! status: ${res.status}`);
    }
    
    // If no specific error message found, use status text or generic message
    throw new Error(res.statusText || `HTTP error! status: ${res.status}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
