import { useQuery } from '@tanstack/react-query';
import { useAlgod } from './useAlgod.ts';

export function useAccountInfo(
  address: string | null,
  refetchInterval?: number,
) {
  const algod = useAlgod();
  return useQuery({
    refetchInterval,
    queryKey: ['accountInfo', address],
    queryFn: async () => {
      if (!algod || !address) return;
      return await algod.accountInformation(address).do();
    },
    enabled: !!algod && !!address,
  });
}
