import { useQuery } from '@tanstack/react-query';

export function useUserState() {
  return useQuery({
    refetchInterval: 3000,
    queryKey: ['auth-session'],
    queryFn: () =>
      fetch('/auth/session').then(async (res) => {
        const state = await res.json();
        const wallet = window.localStorage.getItem('wallet');
        if (wallet && typeof state?.user?.wallet === 'undefined') {
          window.localStorage.removeItem('wallet');
        }
        return state;
      }),
  });
}
