import { useDataChannel } from '@/hooks/useDataChannel.ts';
import { useEffect, useState } from 'react';
import Button from '@mui/material/Button';
import {
  encodeUnsignedTransaction,
  waitForConfirmation,
  makePaymentTxnWithSuggestedParamsFromObject,
} from 'algosdk';
import { toBase64URL, fromBase64Url } from '@algorandfoundation/liquid-client';
import { useAlgod } from '@/hooks/useAlgod.ts';
import { useAccountInfo } from '@/hooks/useAccountInfo.ts';
import FormControl from '@mui/material/FormControl';
import { Box, Input, Paper, Slider } from '@mui/material';
import Typography from '@mui/material/Typography';
import {
  useAddressStore,
  useMessageStore,
  useTransactionStore,
} from '../store.ts';
import { useNavigate } from 'react-router-dom';
import { MessageCard } from '@/components/MessageCard.tsx';
import { TransactionCard } from '@/components/TransactionCard.tsx';
import { EmptyAccountCard } from '@/components/EmptyAccountCard.tsx';

export function ConnectedPage() {
  const navigate = useNavigate();
  const algod = useAlgod();
  const wallet = useAddressStore((state) => state.address);

  const accountInfo = useAccountInfo(wallet, 3000);
  const [from, setFrom] = useState<string>(wallet);
  const [to, setTo] = useState<string>(wallet);
  const [amount, setAmount] = useState<number>(0);

  const addMessage = useMessageStore((state) => state.addMessage);
  const messages = useMessageStore((state) => state.messages);
  const addTransaction = useTransactionStore((state) => state.addTransaction);
  const updateTransaction = useTransactionStore(
    (state) => state.updateTransaction,
  );
  const transactions = useTransactionStore((state) => state.transactions);
  // Receive response
  const datachannel = useDataChannel((event) => {
    const message = JSON.parse(event.data);
    // TODO: Handle P2P using a previously known credential
    //if (message.type === 'credential') localStorage['credId'] = message.id;
    if (message.type !== 'transaction-signature') return;
    addMessage({
      type: 'remote',
      data: JSON.parse(event.data),
      timestamp: Date.now(),
    });
    async function handleMessage() {
      const message = JSON.parse(event.data);
      if (message.type === 'credential') localStorage['credId'] = message.id;
      if (message.type !== 'transaction-signature') return;
      const txn = transactions.find((txn) => txn.txId === message.txId);
      if (!txn) return;
      const sig = fromBase64Url(message.sig);
      const signedTxn = txn.txn.attachSignature(
        accountInfo.data?.['auth-addr']
          ? accountInfo.data?.['auth-addr']
          : wallet,
        sig,
      );
      updateTransaction(txn.txId, 'signed');
      const { txId } = await algod.sendRawTransaction(signedTxn).do();
      updateTransaction(txn.txId, 'submitted');
      await waitForConfirmation(algod, txId, 4);
      updateTransaction(txn.txId, 'confirmed');
    }
    handleMessage();
  });

  useEffect(() => {
    if (!datachannel || wallet === '') navigate('/');
  }, [datachannel, wallet, navigate]);

  if (accountInfo.data && accountInfo.data.amount === 0) {
    return <EmptyAccountCard address={wallet} />;
  }
  return (
    <>
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
          const txn = makePaymentTxnWithSuggestedParamsFromObject({
            from,
            suggestedParams,
            to,
            amount,
          });

          addTransaction({
            txn: txn,
            txId: txn.txID(),
            status: 'created',
          });

          const txnMessage = {
            type: 'transaction',
            txId: txn.txID(),
            txn: toBase64URL(encodeUnsignedTransaction(txn)),
          };
          addMessage({
            type: 'local',
            data: txnMessage,
            timestamp: Date.now(),
          });
          datachannel?.send(JSON.stringify(txnMessage));
          updateTransaction(txn.txID(), 'sent');
        }}
      >
        Send Transaction
      </Button>
      <Typography variant="h6" sx={{ marginTop: '20px' }}>
        Transactions
      </Typography>
      <Paper
        elevation={1}
        sx={{
          maxWidth: 852,
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {transactions.map((transaction, i) => (
          <TransactionCard txn={transaction} key={i} />
        ))}
      </Paper>
      <Typography variant="h6" sx={{ marginTop: '20px' }}>
        Messages
      </Typography>
      <Paper
        elevation={1}
        sx={{
          maxWidth: 852,
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {messages.map((message, i) => (
          <MessageCard msg={message} key={i} />
        ))}
      </Paper>
    </>
  );
}
