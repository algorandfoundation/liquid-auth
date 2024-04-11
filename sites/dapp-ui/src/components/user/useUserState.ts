import { useQuery } from '@tanstack/react-query';

export function useUserState() {
  return useQuery({
    refetchInterval: 3000,
    queryKey: ['auth-session'],
    queryFn: () => fetch('/auth/session').then((res) => res.json()),
  });
}
