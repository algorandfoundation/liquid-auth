import CardMedia from "@mui/material/CardMedia";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import CardActions from "@mui/material/CardActions";
import Card from '@mui/material/Card';
import {ConnectModal} from "./ConnectModal";
import {useEffect} from "react";
import {useSocket} from "../../hooks/useSocket.ts";
import {usePeerConnection} from "../../hooks/usePeerConnection.ts";
import Button from "@mui/material/Button";
export function GetStartedCard(){
    const {socket} = useSocket();
    const peerConnection = usePeerConnection((event)=>{
        if(event.candidate){
            console.log('candidate', event.candidate.toJSON())
            socket.emit('ice-candidate-offer', event.candidate.toJSON(), (data)=>{
                console.log('sent ice-candidate-offer', data)
            })
        } else {
            console.log('Finished gathering candidates.')
        }
    });
    useEffect(() => {

    }, []);
    useEffect(() => {
        console.log('GetStartedCard mounted');
        async function letsGo(){
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);
        }
        letsGo()
        const onHello = (data: unknown) => {console.log(data)}
        socket.on('hello', onHello)
        socket.emit('hello', {hello: 'world'})
        return () => {
            console.log('GetStartedCard unmounted');
            socket.off('hello', onHello);
        }
    },[])
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
                }
              }}
                image={`/hero-1.webp`}
                title="Step 1: Connect Wallet"
            />
            <CardContent>
                <Typography gutterBottom variant="h5" component="div">
                    Get Started (1 of 3)
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    Start by connecting a valid wallet, this is the first step in a three step process. The connecting
                    wallet receives the current website URL from the QR Code and submits a verification request to the service.
                </Typography>
            </CardContent>
            <CardActions>
                <ConnectModal color="secondary"/>
                <Button>Set Wallet</Button>
            </CardActions>
        </Card>
    )
}
