import { useQuery } from '@tanstack/react-query';
import { analyticsAPI } from '../services/api';

export interface AdminDashboardData {
  total_students: number;
  total_faculty: number;
  total_courses: number;
  active_quizzes: number;
  recent_activity: any[];
  [key: string]: any;
}

export const useAdminDashboard = () => {
  return useQuery<AdminDashboardData>({
    queryKey: ['adminDashboard'],
    queryFn: async () => {
      const response = await analyticsAPI.adminDashboard();
      return response.data;
    },
  });
};

export const useStudentDashboard = () => {
  return useQuery({
    queryKey: ['studentDashboard'],
    queryFn: async () => {
      const response = await analyticsAPI.studentDashboard();
      return response.data;
    },
  });
};

export const useTeacherDashboard = () => {
  return useQuery({
    queryKey: ['teacherDashboard'],
    queryFn: async () => {
      const response = await analyticsAPI.teacherDashboard();
      return response.data;
    },
  });
};

export const useStudentAnalytics = (studentId?: string) => {
  return useQuery({
    queryKey: ['studentAnalytics', studentId],
    queryFn: async () => {
      const response = await analyticsAPI.student(studentId!);
      return response.data || response;
    },
    enabled: !!studentId,
  });
};

export const useClassResults = () => {
  return useQuery({
    queryKey: ['classResults'],
    queryFn: async () => {
      const response = await analyticsAPI.classResults();
      return response.data;
    },
  });
};
