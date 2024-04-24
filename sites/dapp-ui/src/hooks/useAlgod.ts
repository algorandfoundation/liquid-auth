import { createContext, useContext } from 'react';
import { Algodv2 } from 'algosdk';

type AlgodState = { algod: Algodv2 | null };
export const AlgodContext = createContext({
  algod: null,
} as AlgodState);

export function useAlgod() {
  const { algod } = useContext(AlgodContext);
  if (!algod)
    throw new Error(
      'Algod not found, make sure it is provided in the context.',
    );
  return algod;
}
