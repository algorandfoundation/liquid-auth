import * as React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Modal from '@mui/material/Modal';
import { useState } from 'react';
import { Fade } from '@mui/material';
import CircularProgress from '@mui/material/CircularProgress';
import { useNavigate } from 'react-router-dom';
import { useSignalClient } from '@/hooks/useSignalClient.ts';
import { SignalClient } from '@algorandfoundation/liquid-client';
const style = {
  position: 'absolute' as const,
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  bgcolor: 'background.paper',
  background:
    'linear-gradient(to right, rgba(248,80,50,1) 0%, rgba(241,111,92,1) 50%, rgba(246,41,12,1) 51%, rgba(240,47,23,1) 71%, rgba(231,56,39,1) 100%)',
  border: '2px solid #000',
  boxShadow: 24,
};

/**
 * Connect Modal
 * @param color
 * @todo: Make into a component that can be used in providers
 */
export function ConnectModal({
  color,
}: {
  color?:
  | 'inherit'
  | 'primary'
  | 'secondary'
  | 'success'
  | 'error'
  | 'info'
  | 'warning';
}) {
  const { client, loading, dataChannel } = useSignalClient();
  const navigate = useNavigate();
  const [requestId] = useState(SignalClient.generateRequestId());

  const [open, setOpen] = React.useState(false);
  const [barcode, setBarcode] = React.useState('/qr-loading.png');

  const handleOpen = async () => {
    setBarcode('/qr-loading.png');
    client.once('data-channel', () => {
      navigate('/connected');
    });
    client
      .peer(requestId, 'offer', {
        iceServers: [
          {
            urls: [
              'stun:stun.l.google.com:19302',
              'stun:stun1.l.google.com:19302',
              'stun:stun2.l.google.com:19302',
            ],
          },
          {
            urls: [
              'turn:global.relay.metered.ca:80',
              'turn:global.relay.metered.ca:80?transport=tcp',
              'turn:global.relay.metered.ca:443',
              'turns:global.relay.metered.ca:443?transport=tcp',
            ],
            // default username and credential when the turn server doesn't
            // use auth, the client still requires a value
            username: import.meta.env.VITE_TURN_USERNAME || 'username',
            credential: import.meta.env.VITE_TURN_CREDENTIAL || 'credential',
          },
        ],
        iceCandidatePoolSize: 10,
      })
      .catch((e) => {
        console.error(e);
        client.close();
        setOpen(false);
      });
    setBarcode(await client.qrCode());
    setOpen(true);
  };
  const handleClose = () => setOpen(false);
  const hasDataChannel =
    (dataChannel && dataChannel?.readyState === 'open') || false;
  return (
    <div>
      <Button disabled={hasDataChannel} onClick={handleOpen} color={color}>
        Connect
      </Button>
      <Modal
        slotProps={{ backdrop: { sx: { bgcolor: 'rgba(0, 0, 0, 0.9)' } } }}
        open={open}
        onClose={handleClose}
        aria-labelledby="modal-modal-title"
        aria-describedby="modal-modal-description"
      >
        <a href={client.deepLink(requestId)}>
          <Box>
            <Fade in={open}>
              <Box sx={style}>
                <Box
                  sx={{
                    position: 'relative',
                  }}
                >
                  <Box
                    component="img"
                    src={barcode}
                    sx={{
                      maxHeight: '50vh',
                      maxWidth: '50vh',
                      height: {
                        xs: 250,
                        sm: 600,
                        md: 900,
                        lg: 1200,
                        xl: 1536,
                      },
                      width: {
                        xs: 250,
                        sm: 600,
                        md: 900,
                        lg: 1200,
                        xl: 1536,
                      },
                      position: 'absolute',
                      transform: 'translate(-50%, -50%)',
                      top: '50%',
                    }}
                  />
                  {loading && (
                    <Box
                      sx={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        height: '80px',
                        width: '80px',
                      }}
                    >    
                      <CircularProgress
                        size={80}
                      />
                    </Box>
                  )}
                </Box>
              </Box>
            </Fade>
          </Box>
        </a>
      </Modal>
    </div>
  );
}
