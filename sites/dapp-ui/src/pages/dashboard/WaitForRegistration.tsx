import CardMedia from "@mui/material/CardMedia";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Card from "@mui/material/Card";
import { CircularProgress } from '@mui/material';
import { useContext, useEffect } from 'react';
import {useSocket} from '../../hooks/useSocket';
import { StateContext } from '../../Contexts';
import { useCredentialStore } from '../../store';
import { useAddressQuery } from '../../hooks/useAddress';

export function WaitForRegistrationCard(){
  const credentials = useCredentialStore((state)=> state.addresses);
  const save = useCredentialStore((state)=> state.update);
  const {state: step, setState} = useContext(StateContext)
  const walletStr = window.localStorage.getItem('wallet');
  const wallet = walletStr ? JSON.parse(walletStr) : null;
  const {socket} = useSocket();
  const address = useAddressQuery(wallet);

  useEffect(() => {
    if(step !== 'connected'){
      return
    }

    socket.emit('wait', { wallet }, async ({data: {credId, device}}) => {
      console.log('Registration response', credId, device);
      save({name: wallet, credentials: [...credentials[wallet].credentials, {id: credId, device}]});
      window.localStorage.setItem('credId', credId);
      setState('registered')
    });
  }, [])
    return (
        <Card >
            <CardMedia
              sx={{ height: {
                  xs: 250,
                  sm: 550,
                  md: 600,
                  lg: 600,
                  xl: 600,
                }
              }}
                image="/hero-2.jpg                                                                                                                                                                        "
                title="Step 1: Connect Wallet"
            />
            <CardContent>
                <Typography gutterBottom variant="h5" component="div">
                    Connected (2 of 3)
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  <CircularProgress size={15}/> Waiting for Passkey registration for address:
                </Typography>
              {address.isLoading && <CircularProgress/>}
              {address.isFetched && <Typography variant="body2" color="text.secondary"> {address.data}</Typography>}
            </CardContent>
        </Card>
    )
}
