import type { WalletContextState } from '@solana/wallet-adapter-react';
import { WalletName } from '@solana/wallet-adapter-base';

export type WalletAdapter = WalletContextState;

interface ConnectWalletOptions {
  onSuccess?: (publicKey: string) => void;
  onError?: (error: Error) => void;
}

export async function connectWallet(
  wallet: WalletAdapter,
  options?: ConnectWalletOptions
) {
  try {
    if (!wallet.connected) {
      if (!wallet.connect) {
        throw new Error("Please install Phantom wallet");
      }

      if (!wallet.wallet) {
        // Show modal through wallet.select()
        wallet.select('phantom' as WalletName);
        return;
      }
      
      await wallet.connect();
      
      if (wallet.publicKey && options?.onSuccess) {
        options.onSuccess(wallet.publicKey.toString());
      }
    }
  } catch (error) {
    console.error("Error connecting wallet:", error);
    if (options?.onError) {
      options.onError(error as Error);
    }
  }
}

export async function disconnectWallet(
  wallet: WalletAdapter,
  options?: Pick<ConnectWalletOptions, 'onError'>
) {
  try {
    if (wallet.connected) {
      await wallet.disconnect();
    }
  } catch (error) {
    console.error("Error disconnecting wallet:", error);
    if (options?.onError) {
      options.onError(error as Error);
    }
  }
}
