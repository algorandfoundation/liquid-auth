import Card from '@mui/material/Card';
import { LiquidTransaction } from '@/store.ts';
import { CardHeader, Link } from '@mui/material';

export function TransactionCard({ txn }: { txn: LiquidTransaction }) {
  const isLive = txn.status === 'confirmed';
  let emoji;
  switch (txn.status) {
    case 'confirmed':
      emoji = '✅';
      break;
    case 'submitted':
      emoji = '🔵';
      break;
    case 'failed':
      emoji = '❌';
      break;
    default:
      emoji = '🟡';
  }
  return (
    <Card sx={{ flex: 1, margin: 1.25 }} raised>
      <CardHeader
        title={`${emoji} ${txn.txn.type} transaction: ${txn.status}`}
        subheader={
          isLive ? (
            <Link
              href={`https://testnet.explorer.perawallet.app/tx/${txn.txId}`}
              target="_blank"
            >
              {txn.txn.txID()}
            </Link>
          ) : (
            txn.txn.txID()
          )
        }
      ></CardHeader>
    </Card>
  );
}
