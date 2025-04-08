import React, { useState, useMemo, createContext, useCallback } from "react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import type { Adapter } from "@solana/wallet-adapter-base";
import {
  WalletProvider as SolanaWalletProvider,
  ConnectionProvider as SolanaConnectionProvider,
  ConnectionProviderProps,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-wallets";
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
  endpoint?: string;
  switchToNextEndpoint: () => void;
  availableEndpoints: string[];
  currentEndpointIndex: number;
}

export const ModalContext = createContext<ModalContextState>({
  isOpen: false,
  setIsOpen: () => null,
  endpoint: undefined,
  switchToNextEndpoint: () => null,
  availableEndpoints: [],
  currentEndpointIndex: 0,
});

export const WalletProvider = ({ children, ...props }: WalletProviderProps) => {
  // Add state to store endpoints and current endpoint
  const [currentEndpointIndex, setCurrentEndpointIndex] = useState(0);
  
  // List of public RPC endpoints
  const publicRPCs = useMemo(() => [
    "https://solana-mainnet.g.alchemy.com/v2/fc0topeseIhDXBFfSMhpvcfyqDB8hXyn",
  ], []);
  
  const defaultNetwork = useMemo(() => props.network || "mainnet-beta", [props.network]);
  
  // Provided endpoint will be prioritized, otherwise use the current endpoint from the list
  const endpoint = useMemo(() => {
    if (props.endpoint) {
      return props.endpoint;
    }
    return publicRPCs[currentEndpointIndex];
  }, [props.endpoint, publicRPCs, currentEndpointIndex]);
  
  // Function to switch to the next endpoint when an error occurs
  const switchToNextEndpoint = useCallback(() => {
    setCurrentEndpointIndex((prevIndex) => {
      const nextIndex = (prevIndex + 1) % publicRPCs.length;
      console.log(`Switching RPC endpoint from ${publicRPCs[prevIndex]} to ${publicRPCs[nextIndex]}`);
      return nextIndex;
    });
  }, [publicRPCs]);
  
  const wallets = useMemo(() => props.wallets || [new PhantomWalletAdapter()], [props.wallets]);
  const [isOpen, setIsOpen] = useState(false);
  
  console.log(`Using Solana endpoint: ${endpoint} (${currentEndpointIndex + 1}/${publicRPCs.length})`);

  return (
    <ConnectionProviderWrapper endpoint={endpoint}>
      <WalletProviderWrapper wallets={wallets} autoConnect>
        <ModalProviderWrapper>
          <ModalContext.Provider value={{ 
            isOpen, 
            setIsOpen, 
            endpoint,
            switchToNextEndpoint,
            availableEndpoints: publicRPCs,
            currentEndpointIndex
          }}>
            {children}
          </ModalContext.Provider>
        </ModalProviderWrapper>
      </WalletProviderWrapper>
    </ConnectionProviderWrapper>
  );
};