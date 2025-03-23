'use client';

import { WalletProvider } from '../provider/connect-wallet/wallet-provider';
import dynamic from 'next/dynamic';
import "@solana/wallet-adapter-react-ui/styles.css";
import './page.css';
import SwapComponent from '../components/swap/Swap';

const ConnectWallet = dynamic(
  () => import('../components/connect-wallet/connect-wallet'),
  { ssr: false }
);

export default function Home() {
  return (
    <WalletProvider>
      <main className="main-container">
        <div className="connect-wallet-container">
          <ConnectWallet />
        </div>
        <div className="swap-container">
          <SwapComponent />
        </div>
      </main>
    </WalletProvider>
  );
}