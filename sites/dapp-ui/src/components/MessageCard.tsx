import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import { Message } from '@/store.ts';
import { CardHeader } from '@mui/material';

export function MessageCard({ msg }: { msg: Message }) {
  let message;
  const isLocal = msg.type === 'local';
  switch (msg.data.type) {
    case 'credential':
      message = isLocal
        ? `🔑 Credential Sent: ${msg.data.id}`
        : `🔑 Credential Received: ${msg.data.id}`;
      break;
    case 'transaction':
      message = isLocal
        ? `🚚 Transaction Sent: ${msg.data.txId}`
        : `🚚 Transaction Received: ${msg.data.txId}`;
      break;
    case 'transaction-signature':
      message = isLocal
        ? `🔏 Signature Sent: ${msg.data.txId}`
        : `🔏 Signature Received: ${msg.data.txId}`;
      break;
    default:
      message = 'Unknown message';
  }
  return (
    <Card sx={{ flex: 1, margin: 1.25 }} raised>
      <CardHeader
        title={`Peer: ${msg.type}`}
        subheader={new Date(msg.timestamp).toLocaleString()}
      >
        <Typography variant="h5" color="text.secondary">
          Message
        </Typography>
      </CardHeader>
      <CardContent>
        <Typography variant="body1" color="text.secondary">
          {message}
        </Typography>
      </CardContent>
    </Card>
  );
}
