import * as React from "react";
import type { ComponentPropsWithoutRef } from "react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useWallet } from "@solana/wallet-adapter-react";

interface ConnectWalletProps extends Omit<ComponentPropsWithoutRef<"button">, "onError"> {
  onSuccess?: (publicKey: string) => void;
  onError?: (error: Error) => void;
  className?: string;
}

export default function ConnectWallet({ 
  className,
  onSuccess,
  onError,
  ...props 
}: ConnectWalletProps) {
  const wallet = useWallet();

  React.useEffect(() => {
    if (wallet.connected && wallet.publicKey) {
      onSuccess?.(wallet.publicKey.toString());
    }
  }, [wallet.connected, wallet.publicKey, onSuccess]);

  return (
    <WalletMultiButton 
      {...props}
      className={className}
    />
  );
}
