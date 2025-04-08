'use client';

import { WalletProvider } from '../provider/connect-wallet/wallet-provider';
import dynamic from 'next/dynamic';
import { useState } from 'react';
import "@solana/wallet-adapter-react-ui/styles.css";
import './page.css';
import SwapComponent from '../components/swap/Swap';
import StakeComponent from '../components/stake/Stake';

const ConnectWallet = dynamic(
  () => import('../components/connect-wallet/connect-wallet'),
  { ssr: false }
);

const MintNFT = dynamic(
  () => import('../components/nft').then((mod) => mod.MintNFT),
  { ssr: false }
);

const GetNFT = dynamic(
  () => import('../components/nft').then((mod) => mod.GetNFT),
  { ssr: false }
);

const CreateCollection = dynamic(
  () => import('../components/nft').then((mod) => mod.CreateCollection),
  { ssr: false }
);

export default function Home() {
  const [collectionMint, setCollectionMint] = useState('');

  const handleCollectionCreated = (mintAddress: string) => {
    setCollectionMint(mintAddress);
  };

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
          <div className="create-collection-wrapper">
            <CreateCollection />
          </div>
          <div className="mint-nft-wrapper">
            <MintNFT collectionMint={collectionMint} />
          </div>
          <div className="get-nft-wrapper">
            <GetNFT />
          </div>
        </div>
      </main>
    </WalletProvider>
  );
}