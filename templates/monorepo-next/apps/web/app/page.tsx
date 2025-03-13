'use client';

import { WalletProvider } from '../provider/wallet-provider';
import ConnectWallet from '../components/connect-wallet/connect-wallet';

export default function Home() {
  return (
    <>
        <WalletProvider>
        <main className="flex min-h-screen flex-col items-center justify-between p-24">
            <ConnectWallet />
        </main>
        </WalletProvider>
    </>
  );
}