import Card from "@mui/material/Card";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import FavoriteIcon from '@mui/icons-material/Favorite';
import ShareIcon from '@mui/icons-material/Share';
import LogoutIcon from '@mui/icons-material/Logout';
import {User} from "./types.ts"
export type ProfileCardProps = {
    socket: {
        isConnected: boolean
    }
    session: {
        wallet?: string
        connected?: boolean
        active?: boolean
        cookie:{
            expires: string | null
            httpOnly: boolean
            originalMaxAge: number | null
            path: string
            secure: boolean
        }
    }
    user: User | null
}
export function StatusCard({session, user, socket}: ProfileCardProps){
    const {cookie, ...sessionData} = session
    return (
        <Card sx={{ maxWidth: 300, zIndex: 1000 }} raised>
            <CardContent>
                <Typography variant="h5" color="text.secondary">
                    Session
                </Typography>
                <pre>
                    {JSON.stringify(sessionData, null, 2)}
                </pre>
                <Typography variant="h5" color="text.secondary">
                    Signaling Service
                </Typography>
                <pre>
                    {JSON.stringify(socket, null, 2)}
                </pre>
                <Typography variant="h5" color="text.secondary">
                    Cookie
                </Typography>
                <pre>
                    {JSON.stringify(cookie, null, 2)}
                </pre>
            </CardContent>
            {user && <CardActions disableSpacing>
                <IconButton aria-label="sign out" onClick={()=>{
                    fetch('/auth/logout')
                }}>
                    <LogoutIcon/>
                </IconButton>
                <IconButton aria-label="share">
                    <ShareIcon />
                </IconButton>
            </CardActions>}
        </Card>
    )
}
