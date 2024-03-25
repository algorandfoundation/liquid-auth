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

interface PeerStore {
    candidates: RTCIceCandidateInit[];
    addCandidate: (candidate: RTCIceCandidateInit) => void;
    clearCandidates: () => void;
}
export const usePeerStore = create<PeerStore>((set) => ({
    candidates: [],
    addCandidate: (candidate: RTCIceCandidateInit) => set((state)=>({candidates: [...state.candidates, candidate]})),
    clearCandidates: () => set({candidates: []}),
}));

export type Message = {
    text: string;
    type: 'local' | 'remote';
    timestamp: number;
}

interface MessageStore {
    messages: Message[];
    addMessage: (message: Message) => void;
    clearMessages: () => void;

}
export const useMessageStore = create<MessageStore>((set) => ({
   messages: [],
    addMessage: (message: Message) => set((state)=>({messages: [...state.messages, message]})),
clearMessages: () => set({messages: []}),
}))
