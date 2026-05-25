import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersAPI } from '../services/api';

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  college_id: string;
  department?: string;
  is_active?: boolean;
  [key: string]: any;
}

export const useUsersList = (role?: string) => {
  return useQuery<User[]>({
    queryKey: ['users', role],
    queryFn: async () => {
      const response = await usersAPI.list(role);
      // Depending on API response structure, we might need to return response.data or response
      // Usually axios responses have .data, and our interceptor unwraps it
      return Array.isArray(response) ? response : (response.data || []);
    },
  });
};

export const useUser = (id: string) => {
  return useQuery<User>({
    queryKey: ['users', id],
    queryFn: async () => {
      const response = await usersAPI.get(id);
      return response.data || response;
    },
    enabled: !!id,
  });
};

export const useCreateUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<User>) => {
      const response = await usersAPI.create(data);
      return response.data || response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
};

export const useUpdateUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<User> }) => {
      const response = await usersAPI.update(id, data);
      return response.data || response;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['users', variables.id] });
    },
  });
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await usersAPI.delete(id);
      return response.data || response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
};
