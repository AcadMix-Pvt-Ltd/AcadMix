import { useQuery } from '@tanstack/react-query';
import { analyticsAPI } from '../services/api';

export const useLeaderboard = () => {
  return useQuery({
    queryKey: ['leaderboard'],
    queryFn: async () => {
      const response = await analyticsAPI.leaderboard();
      return response.data || [];
    },
  });
};
