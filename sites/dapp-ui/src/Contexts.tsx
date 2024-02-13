import {createContext} from "react";

export const ColorModeContext = createContext({toggle: () => {}});

export const StateContext = createContext({state: 'start', setState: (_: string) => {}});
