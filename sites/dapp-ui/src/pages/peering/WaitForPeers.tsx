import CardMedia from '@mui/material/CardMedia';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import { CircularProgress } from '@mui/material';
import { useEffect } from 'react';
import { useSocket } from '../../hooks/useSocket';
import { useNavigate } from 'react-router-dom';
import { usePeerConnection } from '../../hooks/usePeerConnection.ts';
import {
  useDataChannel,
  useDataChannelMessages,
} from '../../hooks/useDataChannel.ts';

export function WaitForPeersCard() {
  const navigate = useNavigate();
  const walletStr = window.localStorage.getItem('wallet');
  const wallet = walletStr ? JSON.parse(walletStr) : null;

  const { socket } = useSocket();
  // const address = useAddressQuery(wallet);
  const peerConnection = usePeerConnection((event) => {
    if (event.candidate) {
      console.log('Local Candidate', event.candidate.toJSON());
      const data = event.candidate.toJSON();
      // data.type = 'offerCandidate'
      socket.emit('answer-candidate', data);
    } else {
      console.log(event);
    }
  });
  const datachannel = useDataChannel('remote', peerConnection);
  useDataChannelMessages((event) => {
    console.log(event);
  });
  useEffect(() => {
    if (!datachannel) return;

    // datachannel.send('Hello World')
    navigate('/connected');
  }, [datachannel]);

  useEffect(() => {
    if (!peerConnection) return;
    async function handleDescription(sdp: string) {
      console.log('OFFER', sdp);
      await peerConnection?.setRemoteDescription({
        type: 'offer',
        sdp,
      } as RTCSessionDescriptionInit);
      const answer = await peerConnection?.createAnswer();
      await peerConnection?.setLocalDescription(answer);
      console.log('ANSWER', answer?.sdp);
      socket.emit('answer-description', answer?.sdp);
    }
    socket.on('call-description', handleDescription);
    return () => {
      socket.off('call-description', handleDescription);
    };
  }, [socket]);
  useEffect(() => {
    if (!peerConnection) return;
    async function handleCallCandidate(data: RTCIceCandidate) {
      console.log('Remote Candidate', data);
      // data.type = 'answerCandidate'
      console.log('Remote Candidate ICE', new RTCIceCandidate(data));
      await peerConnection!.addIceCandidate(new RTCIceCandidate(data));
    }
    socket.on('call-candidate', handleCallCandidate);
    return () => {
      socket.off('call-candidate', handleCallCandidate);
    };
  }, [socket]);
  return (
    <Card>
      <CardMedia
        sx={{
          height: {
            xs: 250,
            sm: 550,
            md: 600,
            lg: 600,
            xl: 600,
          },
        }}
        image="/hero-2.jpg                                                                                                                                                                        "
        title="Step 2: Wait for registration"
      />
      <CardContent>
        <Typography gutterBottom variant="h5" component="div">
          Waiting for Peer Connection (2 of 3)
        </Typography>
        <Typography variant="body1" color="text.secondary">
          <CircularProgress size={15} /> Waiting for Passkey registration for
          address:
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {' '}
          {wallet}
        </Typography>
      </CardContent>
    </Card>
  );
}
