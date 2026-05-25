import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { quizzesAPI, attemptsAPI } from '../services/api';

export const useAvailableQuizzes = () => {
  return useQuery({
    queryKey: ['availableQuizzes'],
    queryFn: async () => {
      const response = await quizzesAPI.list('published');
      return response.data || [];
    },
  });
};

export const useMyQuizzes = () => {
  return useQuery({
    queryKey: ['myQuizzes'],
    queryFn: async () => {
      const response = await quizzesAPI.myQuizzes();
      return response.data || [];
    },
  });
};

export const useTeacherQuizzes = () => {
  return useQuery({
    queryKey: ['teacherQuizzes'],
    queryFn: async () => {
      const response = await quizzesAPI.list();
      return response.data || [];
    },
  });
};

export const useLiveMonitor = (quizId: string) => {
  return useQuery({
    queryKey: ['liveMonitor', quizId],
    queryFn: async () => {
      const response = await quizzesAPI.liveMonitor(quizId);
      return response.data || [];
    },
    enabled: !!quizId,
    refetchInterval: 5000, // Poll every 5 seconds for live monitor
  });
};

export const useQuizAttempts = (quizId?: string) => {
  return useQuery({
    queryKey: ['attempts', quizId],
    queryFn: async () => {
      const response = await attemptsAPI.list(quizId);
      return response.data || [];
    },
  });
};

export const useQuizResult = (attemptId?: string, attemptData?: any) => {
  return useQuery({
    queryKey: ['quizResult', attemptId],
    queryFn: async () => {
      if (attemptData && attemptData.results) return attemptData;
      const response = await attemptsAPI.result(attemptId);
      return response.data;
    },
    enabled: !!attemptId,
    initialData: attemptData?.results ? attemptData : undefined,
  });
};
