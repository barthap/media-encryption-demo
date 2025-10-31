import * as React from 'react';


type AppState =
  | { state: 'not_picked' }
  | { state: 'image_selected', uri: string }
  | { state: 'image_uploaded', uri: string };

const initialAppState: AppState = { state: 'not_picked' };

interface CtxVal {
  appState: AppState,
  setAppState: (newState: AppState) => void
}

const AppCtx = React.createContext<CtxVal>({ appState: initialAppState, setAppState: () => { } });

export function useAppContext() {
  return React.useContext(AppCtx);
}

export default function AppContext({ children }: React.PropsWithChildren) {
  const [appState, setAppState] = React.useState<AppState>(initialAppState);

  return <AppCtx.Provider value={{ appState, setAppState }}>{children}</AppCtx.Provider>
}
