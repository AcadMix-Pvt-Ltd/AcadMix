import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

/**
 * useApiQuery — React Query wrapper for AcadMix API calls.
 * 
 * Provides automatic caching, background refetching, and loading states.
 * Replaces manual useState + useEffect patterns in dashboards.
 * 
 * Usage:
 *   const { data, isLoading, error } = useApiQuery('student-dashboard', '/dashboards/student');
 *   
 *   // With options:
 *   const { data } = useApiQuery('attendance', '/attendance/my', {
 *     staleTime: 60_000,      // 1 minute before refetch
 *     enabled: !!user?.id,    // Only fetch when user exists
 *   });
 */
export function useApiQuery(key: string | string[], endpoint: string, options: Record<string, any> = {}) {
  const { staleTime = 30_000, enabled = true, ...rest } = options;

  return useQuery({
    queryKey: Array.isArray(key) ? key : [key],
    queryFn: async () => {
      const { data } = await api.get(endpoint);
      return data?.data ?? data;  // Unwrap envelope if present
    },
    staleTime,
    enabled,
    ...rest,
  });
}


/**
 * useApiMutation — React Query mutation wrapper for POST/PUT/DELETE.
 * 
 * Usage:
 *   const mutation = useApiMutation('/marks/submit', {
 *     invalidateKeys: ['marks', 'dashboard'],
 *   });
 *
 *   mutation.mutate({ assignment_id: 'abc', marks: [...] });
 */
export function useApiMutation(endpoint: string, options: Record<string, any> = {}) {
  const queryClient = useQueryClient();
  const { method = 'post', invalidateKeys = [], onSuccess, ...rest } = options;

  return useMutation({
    mutationFn: async (payload: any) => {
      // @ts-ignore
      const { data } = await api[method](endpoint, payload);
      return data?.data ?? data;
    },
    onSuccess: (data: any, variables: any, context: any) => {
      // Invalidate related queries to trigger refetch
      invalidateKeys.forEach((key: string) => {
        queryClient.invalidateQueries({ queryKey: [key] });
      });
      onSuccess?.(data, variables, context);
    },
    ...rest,
  });
}

export default useApiQuery;
