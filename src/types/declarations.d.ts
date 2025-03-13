declare module 'class-variance-authority' {
  export const cva: any;
  export type VariantProps<T> = any;
}

declare module '@solana/wallet-adapter-react-ui' {
  export const WalletMultiButton: any;
  export const WalletModalProvider: any;
}

declare module '@solana/wallet-adapter-react' {
  export const useWallet: any;
  export const ConnectionProvider: any;
  export const WalletProvider: any;
  export type WalletContextState = any;
  export type ConnectionProviderProps = any;
}

declare module '@solana/wallet-adapter-base' {
  export const WalletAdapterNetwork: any;
  export type Adapter = any;
  export type WalletName = any;
}

declare module '@solana/wallet-adapter-wallets' {
  export const PhantomWalletAdapter: any;
}

declare module '@solana/web3.js' {
  export const clusterApiUrl: any;
  export const Connection: any;
}

declare module 'clsx' {
  export default function clsx(...inputs: any[]): string;
  export type ClassValue = any;
}

declare module 'tailwind-merge' {
  export const twMerge: any;
}

declare module 'clsx' {
  export const clsx: (...inputs: any[]) => string;
  export type ClassValue = any;
}


// Add path aliases
declare module '@onchainkit/source/*' {
  export * from '../source/*';
}