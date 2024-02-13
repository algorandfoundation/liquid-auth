import CardMedia from "@mui/material/CardMedia";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import CardActions from "@mui/material/CardActions";
import Card from '@mui/material/Card';
import {ConnectModal} from "./ConnectModal";
export function GetStartedCard(){
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
                image="/hero-1.jpg                                                                                                                                                                        "
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
            </CardActions>
        </Card>
    )
}
