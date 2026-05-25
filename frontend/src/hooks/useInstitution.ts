import { useQuery } from '@tanstack/react-query';
import { departmentsAPI, sectionsAPI, rolesAPI } from '../services/api';

export const useDepartments = () => {
  return useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const response = await departmentsAPI.list();
      return Array.isArray(response) ? response : (response.data || []);
    },
  });
};

export const useSections = () => {
  return useQuery({
    queryKey: ['sections'],
    queryFn: async () => {
      const response = await sectionsAPI.list();
      return Array.isArray(response) ? response : (response.data || []);
    },
  });
};

export const useRoles = () => {
  return useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const response = await rolesAPI.list();
      return Array.isArray(response) ? response : (response.data || []);
    },
  });
};
