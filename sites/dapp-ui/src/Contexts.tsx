import {createContext} from "react";

export const ColorModeContext = createContext({toggle: () => {}});

export const StateContext = createContext({state: 'start', setState: (_: string) => {}});

export const SnackbarContext = createContext({
    open: false, setOpen: (_: boolean) => {},
    message: '', setMessage: (_: string) => {}
});
