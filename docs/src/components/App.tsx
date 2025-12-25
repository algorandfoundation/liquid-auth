import { AlgodContext } from "../hooks/useAlgod";
import { Algodv2 } from "algosdk";
import { QrCode } from "./QrCode.tsx";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

const algod = new Algodv2(
  import.meta.env.VITE_ALGOD_TOKEN || '',
  import.meta.env.VITE_ALGOD_SERVER || 'https://testnet-api.algonode.cloud',
  import.meta.env.VITE_ALGOD_PORT || 443,
);
const queryClient = new QueryClient();
export function App(){
  return (
    <AlgodContext.Provider value={{ algod }}>
      <QueryClientProvider client={queryClient}>
        <QrCode/>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </AlgodContext.Provider>
  )
}