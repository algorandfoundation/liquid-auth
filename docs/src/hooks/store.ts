import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { RequestMessage, ResponseMessage } from "@algorandfoundation/algo-models/provider";

interface AddressState {
  address: string;
  setAddress: (address: string) => void;
}

export const useAddressStore = create<
  AddressState,
  [['zustand/persist', AddressState]]
>(
  persist(
    (set) => ({
      address: '',
      setAddress: (address: string) => set({ address }),
    }),
    {
      name: 'address-storage', // name of the item in the storage (must be unique)
    },
  ),
);

export type MessageState = {
  status: 'created' | 'sent' | 'received' | 'signed' | 'submitted' | 'confirmed' | 'failed';
  message: RequestMessage | ResponseMessage
}
export interface ARC27MessageStore {
    messages: MessageState[];
    addMessage: (state: MessageState) => void;
    updateMessage: (id: string, status: MessageState['status']) => void;
    clearMessages: () => void;
}

export const useARC27MessageStore = create<ARC27MessageStore>((set) => ({
    messages: [],
    addMessage: (msg: MessageState) =>  set((state) => ({ messages: [...state.messages, msg] })),
    updateMessage: (id: string, status: MessageState['status']) =>
        set((state) => ({
            messages: state.messages.map((msg) => {
                if (msg.message.id === id) {
                    return { ...msg, status };
                }
                return msg;
            }),
        }),
    ),
    clearMessages: () => set({ messages: [] }),
}));
