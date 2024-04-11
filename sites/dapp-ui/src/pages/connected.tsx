import {
  useDataChannel,
  useDataChannelMessages,
} from '../hooks/useDataChannel.ts';
import { PeerConnectionContext } from '../hooks/usePeerConnection.ts';
import { useContext, useEffect, useState } from 'react';
import Button from '@mui/material/Button';
import algosdk from 'algosdk';
import { toBase64URL, fromBase64Url } from '@liquid/core/encoding';

const algodClient = new algosdk.Algodv2(
  '',
  'https://testnet-api.algonode.cloud',
  443,
);

export default function ConnectedPage() {
  const walletStr = window.localStorage.getItem('wallet');
  const wallet = walletStr ? JSON.parse(walletStr) : null;
  const [txn, setTxn] = useState<algosdk.Transaction | null>(null);
  const { peerConnection } = useContext(PeerConnectionContext);
  const datachannel = useDataChannel('remote', peerConnection);

  // Receive response
  useDataChannelMessages((event) => {
    if (!txn) return;
    async function handleMessage() {
      if (!txn) return;
      console.log(event);
      const sig = fromBase64Url(event.data);
      const signedTxn = txn.attachSignature(wallet, sig);

      const { txId } = await algodClient.sendRawTransaction(signedTxn).do();
      const result = await algosdk.waitForConfirmation(algodClient, txId, 4);
      console.log(result);
    }
    handleMessage();
  });

  // Send Transaction
  useEffect(() => {
    if (!txn || !datachannel) return;
    datachannel?.send(toBase64URL(txn.bytesToSign()));
  }, [txn, datachannel]);
  return (
    <div>
      Connected
      <Button
        variant="contained"
        onClick={async () => {
          console.log(datachannel);

          const suggestedParams = await algodClient.getTransactionParams().do();
          setTxn(
            algosdk.makePaymentTxnWithSuggestedParamsFromObject({
              from: wallet,
              suggestedParams,
              to: wallet,
              amount: 0,
            }),
          );
        }}
      >
        Send Transaction
      </Button>
    </div>
  );
}
