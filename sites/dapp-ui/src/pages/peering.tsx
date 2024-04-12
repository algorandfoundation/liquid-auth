import CardMedia from '@mui/material/CardMedia';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import { CircularProgress } from '@mui/material';
import { useEffect, useState } from 'react';
import { useSocket } from '@/hooks/useSocket';
import { useNavigate } from 'react-router-dom';
import { usePeerConnection } from '@/hooks/usePeerConnection';
import { useDataChannel, useDataChannelMessages } from '@/hooks/useDataChannel';
import { useMessageStore } from '@/store';

export function PeeringPage() {
  const navigate = useNavigate();
  const walletStr = window.localStorage.getItem('wallet');
  const addMessage = useMessageStore((state) => state.addMessage);
  const wallet = walletStr ? JSON.parse(walletStr) : null;
  const [credentialId, setCredentialId] = useState<string | null>(null);
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
    addMessage({
      type: 'remote',
      data: JSON.parse(event.data),
      timestamp: Date.now(),
    });
    const data = JSON.parse(event.data);
    if (data?.type === 'credential') {
      window.localStorage.setItem('credId', data.id);
      setCredentialId(data.id);
    }
  });

  // Once we have a valid credential, continue to the connected page
  useEffect(() => {
    if (!datachannel || !credentialId) return;

    // datachannel.send('Hello World')
    navigate('/connected');
  }, [datachannel, credentialId, navigate]);

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
          Waiting for Peer Confirmation (2 of 2)
        </Typography>
        <Typography variant="body1" color="text.secondary">
          <CircularProgress size={15} /> Waiting for message from peer for
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
