import { useQuery } from '@tanstack/react-query';
import { marksAPI } from '../services/api';

export const useMyAssignments = () => {
  return useQuery({
    queryKey: ['myAssignments'],
    queryFn: async () => {
      const response = await marksAPI.myAssignments();
      return response.data || [];
    },
  });
};

export const useStudentsForAssignment = (department?: string, batch?: string, section?: string) => {
  return useQuery({
    queryKey: ['students', department, batch, section],
    queryFn: async () => {
      const response = await marksAPI.students(department, batch, section);
      return response.data || [];
    },
    enabled: !!(department && batch && section),
  });
};
