import { create, StateCreator } from 'zustand';
import { createJSONStorage, persist, PersistOptions } from 'zustand/middleware';

export type Credential = {
  id: string,
  device: string,
}

export type Address = {
  name: string,
  credentials: Credential[]
}

export type Addresses = {
  [k: string]: Address
}

export type CredentialStore = {
  addresses: Addresses,
  update: (address: Address) => void,
  remove: (address: Address) => void,
}
type PersistCredentials = (
  config: StateCreator<CredentialStore>,
  options: PersistOptions<CredentialStore>
) => StateCreator<CredentialStore>

export const useCredentialStore = create<CredentialStore>(
  (persist as PersistCredentials)(
    (set, get) => ({
      addresses: {},
      update: (address) => set(() => ({ addresses: { ...get().addresses, [address.name]: address } })),
      remove: (address) => set(() => {
        const addresses = { ...get().addresses };
        delete addresses[address.name];
        return { addresses };
      }),
    }),
  { name: 'avicennia-credential-store', storage: createJSONStorage(() => localStorage) }
  ),
);
