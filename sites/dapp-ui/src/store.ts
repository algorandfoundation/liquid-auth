import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Transaction } from 'algosdk';

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

export type TransactionSignaturePayload = {
  type: 'transaction-signature';
  txId: string;
  sig: string;
};
export type TransactionPayload = {
  type: 'transaction';
  txId: string;
  txn: string;
};
// {
//   "address": "PNNMCGV3XLEDFEGR7IHSGY5HHGAQQ4OC7H75SPGQUFVTNWV45JVXPRJULY",
//   "device": "Pixel 8 Pro",
//   "origin": "https://catfish-pro-wolf.ngrok-free.app",
//   "id": "AdoMGSqp-ni0udT2e5RafkSJo2Czs0s-Ekr5wB06PIpXIhlG-qfdCyN_riM_enKwZnwQXwrFp3e9IB0VNLg6swM",
//   "prevCounter": 2,
//   "type": "credential"
// }
export type CredentialPayload = {
  type: 'credential';
  id: string;
  address: string;
  device?: string;
  origin: string;
  prevCounter: number;
};

export type MessagePayload = {
  type: 'transaction' | 'credential' | 'transaction-signature';
  // data: TransactionSignature | ;
};
export type Message = {
  data:
    | TransactionPayload
    | TransactionSignaturePayload
    | CredentialPayload
    | string;
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

export type LiquidTransaction = {
  txn: Transaction;
  txId: string;
  sig?: string;
  status: 'created' | 'sent' | 'signed' | 'submitted' | 'confirmed' | 'failed';
};

interface TransactionStore {
  transactions: LiquidTransaction[];
  addTransaction: (txn: LiquidTransaction) => void;
  updateTransaction: (
    txId: string,
    status: LiquidTransaction['status'],
  ) => void;
  clearTransactions: () => void;
}

export const useTransactionStore = create<TransactionStore>((set) => ({
  transactions: [],
  addTransaction: (txn: LiquidTransaction) =>
    set((state) => ({ transactions: [...state.transactions, txn] })),
  updateTransaction: (txId: string, status: LiquidTransaction['status']) =>
    set((state) => ({
      transactions: state.transactions.map((txn) => {
        if (txn.txId === txId) {
          return { ...txn, status };
        }
        return txn;
      }),
    })),
  clearTransactions: () => set({ transactions: [] }),
}));
