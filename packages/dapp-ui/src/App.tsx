import * as React from 'react';

import {GetStartedCard} from "./pages/home/GetStarted";
import { useContext } from 'react';
import { StateContext } from './Contexts';
import { WaitForRegistrationCard } from './pages/dashboard/WaitForRegistration';
import { RegisteredCard } from './pages/dashboard/Registered';
import { useSession } from './hooks/useSession';
import Layout from './Layout';
export default function App({hasSession}: {hasSession: boolean}) {

    const session = useSession();
    const {state} = useContext(StateContext)

    // Authentication Steps
    const STATES = {
        'start': GetStartedCard,
        'connected': WaitForRegistrationCard,
        'registered': RegisteredCard
    }
    const Content = STATES[state]

    return (
      <Layout hasSession={hasSession}>
        <Content/>
      </Layout>
    );
}
