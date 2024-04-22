import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAddressStore = create(
  persist(
    (set) => ({
      address: '',
      setAddress: (address: string) => set({ address }),
    }),
    {
      name: 'address-storage', // name of the item in the storage (must be unique)
    },
  ),
)
export type Message = {
  data: unknown;
  type: 'local' | 'remote';
  timestamp: number;
};

interface MessageStore {
  messages: Message[];
  addMessage: (message: Message) => void;
  clearMessages: () => void;
}
export const useMessageStore = create<MessageStore>((set) => ({
  messages: [],
  addMessage: (message: Message) =>
    set((state) => ({ messages: [...state.messages, message] })),
  clearMessages: () => set({ messages: [] }),
}));
