import {Alert, Snackbar, useMediaQuery, useTheme} from "@mui/material";
import {useContext} from "react";
import {SnackbarContext} from "../Contexts.tsx";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";

export function MessageSnackbar(){
    const theme = useTheme();
    const greaterThanMid = useMediaQuery(theme.breakpoints.up("md"));

    const {open, setOpen, message, setMessage} = useContext(SnackbarContext)

    const handleClose = () => {
        setOpen(false)
        setMessage('')
    }
    return (
        <Snackbar
            open={open}
            anchorOrigin={{ vertical: greaterThanMid ? 'top' : 'bottom', horizontal: "center" }}
            autoHideDuration={6000}
            onClose={handleClose}
            action={
            <IconButton
                size="small"
                aria-label="close"
                color="inherit"
                onClick={handleClose}
            >
                <CloseIcon fontSize="small" />
            </IconButton>}
        >
            <Alert
                onClose={handleClose}
                severity="success"
                variant="filled"
                sx={{ width: '100%' }}
            >
                {message}
            </Alert>
        </Snackbar>
    )
}
