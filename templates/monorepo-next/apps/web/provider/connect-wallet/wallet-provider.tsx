import React, { useState, useMemo, createContext } from "react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import type { Adapter } from "@solana/wallet-adapter-base";
import {
  WalletProvider as SolanaWalletProvider,
  ConnectionProvider as SolanaConnectionProvider,
  ConnectionProviderProps,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-wallets";
import { clusterApiUrl, Connection } from "@solana/web3.js";
import "@solana/wallet-adapter-react-ui/styles.css";

// Create wrapper components
// @ts-ignore - Ignore React 19 compatibility error
const ConnectionProviderWrapper = (props: ConnectionProviderProps) => <SolanaConnectionProvider {...props} />;
// @ts-ignore - Ignore React 19 compatibility error
const WalletProviderWrapper = (props: WalletProviderProps) => <SolanaWalletProvider {...props} />;
// @ts-ignore - Ignore React 19 compatibility error
const ModalProviderWrapper = (props: ModalProviderProps) => <WalletModalProvider {...props} />;

interface WalletProviderProps {
  children: React.ReactNode;
  network?: typeof WalletAdapterNetwork;
  endpoint?: string;
  wallets?: Adapter[];
  autoConnect?: boolean;
}

interface ModalContextState {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export const ModalContext = createContext<ModalContextState>({
  isOpen: false,
  setIsOpen: () => null,
});

export const WalletProvider = ({ children, ...props }: WalletProviderProps) => {
  const endpoint = useMemo(() => props.endpoint || clusterApiUrl(props.network as "mainnet-beta" | "testnet" | "devnet" | undefined || "devnet"), [props.network, props.endpoint]);
  const wallets = useMemo(() => props.wallets || [new PhantomWalletAdapter()], [props.wallets]);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <ConnectionProviderWrapper endpoint={endpoint}>
      <WalletProviderWrapper wallets={wallets} autoConnect>
        <ModalProviderWrapper>
          <ModalContext.Provider value={{ isOpen, setIsOpen }}>
            {children}
          </ModalContext.Provider>
        </ModalProviderWrapper>
      </WalletProviderWrapper>
    </ConnectionProviderWrapper>
  );
}; 