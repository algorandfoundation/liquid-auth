import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import ShareIcon from '@mui/icons-material/Share';
import LogoutIcon from '@mui/icons-material/Logout';
import { User } from './types.ts';
import ListItem from '@mui/material/ListItem';
import List from '@mui/material/List';
import { SignalClientContext } from '@/hooks/useSignalClient.ts';
import { useContext } from 'react';
import { useUserState } from '@/hooks';
export type ProfileCardProps = {
  socket: {
    isConnected: boolean;
    hasDataChannel: boolean;
  };
  session: {
    wallet?: string;
    connected?: boolean;
    active?: boolean;
    cookie: {
      expires: string | null;
      httpOnly: boolean;
      originalMaxAge: number | null;
      path: string;
      secure: boolean;
    };
  };
  user: User | null;
};
export function StatusCard({ session, user, socket }: ProfileCardProps) {
  const { refetch } = useUserState();
  const { client, setDataChannel } = useContext(SignalClientContext);
  return (
    <Card sx={{ maxWidth: 300, zIndex: 1000 }} raised>
      <CardContent>
        <List subheader="Session">
          <ListItem>
            <Typography variant="h6" color="text.secondary">
              Address:{' '}
              {session?.wallet
                ? `${session.wallet.substring(
                    0,
                    4,
                  )}...${session.wallet.substring(
                    session.wallet.length - 4,
                    session.wallet.length,
                  )}`
                : 'Anonymous'}
            </Typography>
          </ListItem>
        </List>
        <List subheader="Service">
          <ListItem>
            <Typography variant="h6" color="text.secondary">
              Connected: {socket.isConnected ? 'Yes' : 'No'}
            </Typography>
          </ListItem>
          <ListItem>
            <Typography variant="h6" color="text.secondary">
              DataChannel: {socket.hasDataChannel ? 'Yes' : 'No'}
            </Typography>
          </ListItem>
        </List>
      </CardContent>
      {user && (
        <CardActions disableSpacing>
          <IconButton
            aria-label="sign out"
            onClick={async () => {
              await fetch('/auth/logout');
              await refetch();
              client && client.close();
              setDataChannel(null);
            }}
          >
            <LogoutIcon />
          </IconButton>
          <IconButton aria-label="share">
            <ShareIcon />
          </IconButton>
        </CardActions>
      )}
    </Card>
  );
}
