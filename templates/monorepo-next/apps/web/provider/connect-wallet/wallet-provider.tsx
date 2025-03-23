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
  // Thêm state để lưu trữ các endpoint và endpoint hiện tại
  const [currentEndpointIndex, setCurrentEndpointIndex] = useState(0);
  
  // Danh sách các public RPC endpoints
  const publicRPCs = useMemo(() => [
    "https://api-mainnet-beta.solflare.network", // Solflare RPC - hoạt động tốt với browser
    "https://solana-mainnet.g.alchemy.com/v2/demo", // Alchemy Demo endpoint - có CORS support tốt
    "https://rpc.ankr.com/solana", // Ankr's endpoint - cũng có CORS support
    "https://api.mainnet-beta.solana.com", // Solana Foundation (chỉ fallback)
  ], []);
  
  const defaultNetwork = useMemo(() => props.network || "mainnet-beta", [props.network]);
  
  // Endpoint được cung cấp sẽ được ưu tiên, nếu không sẽ sử dụng endpoint hiện tại từ danh sách
  const endpoint = useMemo(() => {
    if (props.endpoint) {
      return props.endpoint;
    }
    return publicRPCs[currentEndpointIndex];
  }, [props.endpoint, publicRPCs, currentEndpointIndex]);
  
  // Hàm để chuyển đổi sang endpoint tiếp theo khi gặp lỗi
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