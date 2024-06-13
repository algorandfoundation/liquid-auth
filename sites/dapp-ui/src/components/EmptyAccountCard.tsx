import Card from '@mui/material/Card';
import { CardHeader, Link } from '@mui/material';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';

export function EmptyAccountCard({ address }: { address: string }) {
  return (
    <Card sx={{ flex: 1, margin: 1.25 }} raised>
      <CardHeader
        title="Account Not Funded"
        subheader={
          <Link href="https://bank.testnet.algorand.network" target="_blank">
            Visit the faucet to fund your account.
          </Link>
        }
      ></CardHeader>
      <CardContent>
        <Typography>{address}</Typography>
      </CardContent>
    </Card>
  );
}
