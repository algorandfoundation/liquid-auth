import CardMedia from '@mui/material/CardMedia';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import CardActions from '@mui/material/CardActions';
import Card from '@mui/material/Card';
import Button from '@mui/material/Button';

import { ConnectModal } from '@/components/ConnectModal';
import { assertion } from '@algorandfoundation/liquid-client';
import { useState } from 'react';

export function HomePage() {
  const credId = window.localStorage.getItem('credId');
  const [showLogin, setShowLogin] = useState(
    typeof credId === 'string' || false,
  );
  return (
    <Card>
      <CardMedia
        // height="750"
        // width="750"
        sx={{
          height: {
            xs: 250,
            sm: 550,
            md: 600,
            lg: 600,
            xl: 600,
          },
        }}
        image={`/hero-1.webp`}
        title="Step 1: Connect Wallet"
      />
      <CardContent>
        <Typography gutterBottom variant="h5" component="div">
          Get Started
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Start by connecting a valid wallet, the connecting wallet receives the
          current website URL from the QR Code and submits a verification
          request to the service. Once the service validates the request, both
          clients will negotiate a P2P channel to exchange messages.
        </Typography>
      </CardContent>
      <CardActions>
        <ConnectModal color="secondary" />
        {showLogin && credId && (
          <Button
            onClick={async () => {
              await assertion(window.origin, credId);
              setShowLogin(false);
            }}
          >
            Login
          </Button>
        )}
      </CardActions>
    </Card>
  );
}
