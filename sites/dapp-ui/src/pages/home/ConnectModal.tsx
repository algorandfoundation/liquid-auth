import * as React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Modal from '@mui/material/Modal';
import {toBase64URL} from "@liquid/auth-client/encoding";
import { Message } from '@liquid/auth-client/connect';
import QRCodeStyling, {Options} from "qr-code-styling";
import { useContext, useEffect, useState } from 'react';
import {Fade} from "@mui/material";
import {useSocket} from '../../hooks/useSocket';
import {randomBytes, sign} from 'tweetnacl';
import {SnackbarContext, StateContext} from '../../Contexts';
import { useCredentialStore, Credential } from '../../store';
const style = {
    position: 'absolute' as const,
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    bgcolor: 'background.paper',
    background: "linear-gradient(to right, rgba(248,80,50,1) 0%, rgba(241,111,92,1) 50%, rgba(246,41,12,1) 51%, rgba(240,47,23,1) 71%, rgba(231,56,39,1) 100%)",
    border: '2px solid #000',
    boxShadow: 24,
};
export function ConnectModal({color}: {color?: 'inherit' | 'primary' | 'secondary' | 'success' | 'error' | 'info' | 'warning'}) {
    const snackbar = useContext(SnackbarContext)
    const {socket} = useSocket();

    const credentials = useCredentialStore((state)=> state.addresses);
    const save = useCredentialStore((state)=> state.update);
    const {state: step, setState} = useContext(StateContext)
    const [state] = useState({
        requestId: Math.random(),
        challenge: toBase64URL(randomBytes(sign.seedLength))
    })
    const qrOpts = {
        "width": 500,
        "height": 500,
        "data": "algorand://",
        "margin": 25,
        "imageOptions": {"hideBackgroundDots": true, "imageSize": 0.4, "margin": 15},
        "dotsOptions": {
            "type": "extra-rounded",
            "gradient": {
                "type": "radial",
                "rotation": 0,
                "colorStops": [{"offset": 0, "color": "#9966ff"}, {"offset": 1, "color": "#332257"}]
            }
        },
        "backgroundOptions": {"color": "#ffffff", "gradient": null},
        "image": "/logo.png",
        "cornersSquareOptions": {
            "type": "",
            "color": "#000000",
            "gradient": {
                "type": "linear",
                "rotation": 0,
                "colorStops": [{"offset": 0, "color": "#332257"}, {"offset": 1, "color": "#040908"}]
            }
        },
        "cornersDotOptions": {
            "type": "dot",
            "color": "#000000",
            "gradient": {
                "type": "linear",
                "rotation": 0,
                "colorStops": [{"offset": 0, "color": "#000000"}, {"offset": 1, "color": "#000000"}]
            }
        }
    }

    const [open, setOpen] = React.useState(false);
    const [barcode, setBarcode] = React.useState("/qr-loading.png")
    const handleOpen = () => {
        setBarcode("/qr-loading.png")
        if(socket.disconnected){
            console.warn('Socket is disconnected, attempting to reconnect')
            socket.connect()
        }

        socket.emit('link', { requestId: state.requestId }, async ({data}: {data: {credId?: string, requestId: string|number, wallet: string}}) => {
            console.log('On Link response');
            console.log(data)
            let newCredentials: Credential[] = []
            if(typeof credentials[data.wallet] !== 'undefined'){
                newCredentials = credentials[data.wallet].credentials
            }
            save({name: data.wallet, credentials: [...newCredentials]})
            window.localStorage.setItem('wallet', JSON.stringify(data.wallet));
            if(typeof data.credId !== 'undefined'){
                console.log(data.credId)
                window.localStorage.setItem('credId', data.credId);
                setState('registered')
                snackbar.setMessage('Connected with Credential')
                snackbar.setOpen(true)
            } else {
                snackbar.setMessage('Connected Public Key')
                snackbar.setOpen(true)
                setState('connected')
            }

        });

        const message = new Message(window.location.origin, state.challenge, state.requestId)

        // JSON encoding
        qrOpts.data = `${message}`
        console.log(qrOpts.data)
        const qrCode = new QRCodeStyling(qrOpts as unknown as Options)
        qrCode.getRawData("png").then((blob) => {
            if(!blob) throw TypeError('Could not get qrcode blob')
            setBarcode(URL.createObjectURL(blob))
            setOpen(true)
        })
        // message.toBarcode({color: {light: "#00000000"}}).then(setBarcode)
        setOpen(true)
    };
    const handleClose = () => setOpen(false);

    return (
        <div>
            <Button onClick={handleOpen} color={color}>Connect</Button>
            <Modal
                slotProps={{backdrop: {sx: {bgcolor: "rgba(0, 0, 0, 0.9)"}}}}
                open={open}
                onClose={handleClose}
                aria-labelledby="modal-modal-title"
                aria-describedby="modal-modal-description"
            >
                <Fade in={open}>
                <Box sx={style}>
                    <Box sx={{
                        position: "relative"
                    }}>
                        <Box component="img" src={barcode} sx={{
                            maxHeight: "50vh",
                            maxWidth: "50vh",
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
                            position: "absolute",
                            transform: 'translate(-50%, -50%)',
                            top: "50%",
                        }}/>
                    </Box>
                </Box>
                </Fade>
            </Modal>
        </div>
    );
}
