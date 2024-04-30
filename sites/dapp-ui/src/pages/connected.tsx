import { useDataChannel } from '@/hooks/useDataChannel.ts';
import { useEffect, useState } from 'react';
import Button from '@mui/material/Button';
import {
  Transaction,
  encodeUnsignedTransaction,
  waitForConfirmation,
  makePaymentTxnWithSuggestedParamsFromObject,
} from 'algosdk';
import { toBase64URL, fromBase64Url } from '@liquid/core/encoding';
import { useAlgod } from '@/hooks/useAlgod.ts';
import { useAccountInfo } from '@/hooks/useAccountInfo.ts';
import FormControl from '@mui/material/FormControl';
import { Box, CircularProgress, Input, Slider } from '@mui/material';
import Typography from '@mui/material/Typography';
import { useAddressStore, useMessageStore } from '../store.ts';
import { useNavigate } from 'react-router-dom';

export function ConnectedPage() {
  const navigate = useNavigate();
  const algod = useAlgod();
  const wallet = useAddressStore((state) => state.address);
  const [txn, setTxn] = useState<Transaction | null>(null);
  // const datachannel = useDataChannel('remote', peerConnection);
  const accountInfo = useAccountInfo(wallet, 3000);
  const [from, setFrom] = useState<string>(wallet);
  const [to, setTo] = useState<string>(wallet);
  const [amount, setAmount] = useState<number>(0);

  const [isWaitingForSignature, setIsWaitingForSignature] = useState(false);
  const [isWaitingForConfirmation, setIsWaitingForConfirmation] =
    useState(false);
  const addMessage = useMessageStore((state) => state.addMessage);
  const messages = useMessageStore((state) => state.messages);
  // Receive response
  const datachannel = useDataChannel((event) => {
    console.log(event.data);
    addMessage({
      type: 'remote',
      data: JSON.parse(event.data),
      timestamp: Date.now(),
    });
    if (!txn) return;
    async function handleMessage() {
      if (!txn) return;
      const message = JSON.parse(event.data);
      if (message.type === 'credential') localStorage['credId'] = message.id;
      if (message.type !== 'transaction-signature') return;

      if (txn.txID() !== message.txId) throw new Error('Invalid txId');

      const sig = fromBase64Url(message.sig);
      const signedTxn = txn.attachSignature(wallet, sig);

      setIsWaitingForSignature(false);
      setIsWaitingForConfirmation(true);
      const { txId } = await algod.sendRawTransaction(signedTxn).do();
      await waitForConfirmation(algod, txId, 4);
      setIsWaitingForConfirmation(false);
    }
    handleMessage();
  });

  // Send Transaction
  useEffect(() => {
    if (
      !txn ||
      !datachannel ||
      isWaitingForSignature ||
      isWaitingForConfirmation
    )
      return;
    const txnMessage = {
      type: 'transaction',
      txn: toBase64URL(encodeUnsignedTransaction(txn)),
    };
    addMessage({ type: 'local', data: txnMessage, timestamp: Date.now() });
    datachannel?.send(JSON.stringify(txnMessage));
    setIsWaitingForSignature(true);
  }, [txn, datachannel, isWaitingForSignature]);

  useEffect(() => {
    if (!datachannel || wallet === '') navigate('/');
  }, [datachannel, wallet]);

  if (accountInfo.data && accountInfo.data.amount === 0) {
    return (
      <Box>
        <h1>Account has no funds</h1>
        <h2>{accountInfo.data.address}</h2>
        <pre>{JSON.stringify(accountInfo.data, null, 2)}</pre>
      </Box>
    );
  }
  if (isWaitingForSignature || isWaitingForConfirmation) {
    return (
      <Box>
        <h1>
          Waiting for {isWaitingForConfirmation ? 'Confirmation' : 'Signature'}
        </h1>
        <CircularProgress size={40} />
      </Box>
    );
  }
  return (
    <Box sx={{ overflow: 'hidden' }}>
      <Box component="form" sx={{ display: 'flex', flexDirection: 'column' }}>
        <Typography variant="h4">Send Payment Transaction</Typography>
        <FormControl sx={{ margin: 2 }}>
          <Typography gutterBottom>From</Typography>
          <Input
            id="from"
            aria-label="send from address"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </FormControl>
        <FormControl sx={{ margin: 2 }}>
          <Typography gutterBottom>To</Typography>
          <Input
            id="to"
            aria-label="send to address"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </FormControl>
        <Box sx={{ margin: 2 }}>
          <Typography gutterBottom sx={{ margin: '0px 0px 1em' }}>
            Amount (in microalgos)
          </Typography>
          <Slider
            valueLabelDisplay="on"
            defaultValue={30}
            max={accountInfo?.data?.amount || 0}
            aria-label="Amount"
            value={amount}
            onChange={(_, value) => setAmount(value as number)}
          />
        </Box>
      </Box>

      <Button
        sx={{ float: 'right' }}
        variant="contained"
        disabled={!datachannel || accountInfo.isLoading}
        onClick={async () => {
          const suggestedParams = await algod.getTransactionParams().do();
          setTxn(
            makePaymentTxnWithSuggestedParamsFromObject({
              from,
              suggestedParams,
              to,
              amount,
            }),
          );
        }}
      >
        Send Transaction
      </Button>
      <Typography variant="h6" sx={{ marginTop: '20px' }}>
        Messages
      </Typography>
      {messages.map((message, i) => (
        <Box key={i} sx={{ maxWidth: 852, overflow: 'auto' }}>
          <pre>{JSON.stringify(message, null, 2)}</pre>
        </Box>
      ))}
    </Box>
  );
}
