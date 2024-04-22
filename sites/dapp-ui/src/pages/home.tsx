import CardMedia from '@mui/material/CardMedia';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import CardActions from '@mui/material/CardActions';
import Card from '@mui/material/Card';
import Button from '@mui/material/Button';

import { ConnectModal } from '@/components/ConnectModal';
import { assertion } from '@liquid/auth-client/assertion';
import { useState } from "react";

export function HomePage() {
  const credId = window.localStorage.getItem('credId');
  const [showLogin, setShowLogin] = useState(typeof credId === 'string' || false);
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
          Get Started (1 of 2)
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Start by connecting a valid wallet, this is the first step in a three
          step process. The connecting wallet receives the current website URL
          from the QR Code and submits a verification request to the service.
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
