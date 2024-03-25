import Avatar from "@mui/material/Avatar";
import Divider from "@mui/material/Divider";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemAvatar from "@mui/material/ListItemAvatar";
import ListItemText from "@mui/material/ListItemText";
import {Message, useMessageStore} from "../store.ts";
import TextField from "@mui/material/TextField";
import {useContext, useState} from "react";
import Button from "@mui/material/Button";
import {DataChannelContext} from "../hooks/useDataChannel.ts";


const MESSAGE_TYPES = {
    local: 'Local',
    remote: 'Remote'
}
const MESSAGE_AVATARS = {
    local: '/maskable-icon.png',
    remote: '/logo-inverted.png'
}

function ChatMessage(message: Message) {
    return (
        <ListItem alignItems="flex-start">
            <ListItemAvatar>
                <Avatar alt={`${MESSAGE_TYPES[message.type]} User`} src={MESSAGE_AVATARS[message.type]}/>
            </ListItemAvatar>
            <ListItemText
                primary={`${MESSAGE_TYPES[message.type]} User`}
                secondary={message.text}
            />
        </ListItem>
    )
}

export function ChatList() {
    const {dataChannel} = useContext(DataChannelContext)

    const messages = useMessageStore((state) => state.messages)
    const addMessage = useMessageStore((state) => state.addMessage)
    const [message, setMessage] = useState('')

    const isReady = dataChannel && dataChannel.readyState === 'open'
    return (
        <>
            <List sx={{width: '100%', maxWidth: 360}}>
                {messages.map((message, i) => {
                    return (
                        <div key={i}>
                            <ChatMessage {...message}/>
                            <Divider variant="inset" component="li"/>
                        </div>
                    )
                })}
            </List>
            <form>
                <TextField value={message} onChange={(e) => setMessage(e.target.value)}></TextField>
                <Button type="submit" variant="contained" color="success" onClick={(e) => {
                    e.preventDefault()
                    if (!isReady) return
                    const _msg = {text: message, type: 'remote', timestamp: Date.now()}
                    dataChannel?.send(JSON.stringify(_msg));
                    addMessage({..._msg, type: 'local'})
                    setMessage('')
                }}>Send</Button>
            </form>
            {/*<Button variant="contained" color="error" onClick={()=>{*/}
            {/*    dataChannel?.close()*/}
            {/*}}>Close</Button>*/}
        </>
    )
}
