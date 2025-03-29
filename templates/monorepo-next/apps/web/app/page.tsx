'use client';

import { WalletProvider } from '../provider/connect-wallet/wallet-provider';
import dynamic from 'next/dynamic';
import "@solana/wallet-adapter-react-ui/styles.css";
import './page.css';
import SwapComponent from '../components/swap/Swap';
import StakeComponent from '../components/stake/Stake';

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
        <div className="content-container">
          <div className="swap-wrapper">
            <SwapComponent />
          </div>
          <div className="stake-wrapper">
            <StakeComponent />
          </div>
        </div>
      </main>
    </WalletProvider>
  );
}