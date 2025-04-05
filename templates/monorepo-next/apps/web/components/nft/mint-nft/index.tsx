'use client';

import { useState, useContext } from 'react';
import { PublicKey } from '@solana/web3.js';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { generateSigner } from '@metaplex-foundation/umi';
import { createNft } from '@metaplex-foundation/mpl-token-metadata';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import {
  WalletMultiButton,
} from '@solana/wallet-adapter-react-ui';
import { CheckCircleIcon, ExternalLinkIcon } from '@heroicons/react/solid';
import { walletAdapterIdentity } from '@metaplex-foundation/umi-signer-wallet-adapters';
import { mplTokenMetadata } from '@metaplex-foundation/mpl-token-metadata';
import './mint-nft.css';

// Declare module for heroicons
declare module '@heroicons/react/solid';

export interface MintNFTProps {
  collectionMint?: string;
  rpcUrl?: string;
}

export default function MintNFT({ collectionMint }: MintNFTProps) {
  const wallet = useWallet();
  const { publicKey, connected } = wallet;
  const { connection } = useConnection();
  
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [uri, setUri] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mintMessage, setMintMessage] = useState<{ type: 'success' | 'error'; message: string; signature?: string; nftAddress?: string } | null>(null);
  const [network, setNetwork] = useState('mainnet-beta');

  // Validate form
  const isFormValid = name.trim() !== '' && symbol.trim() !== '' && uri.trim() !== '';

  // Handle mint NFT
  const handleMintNFT = async () => {
    if (!publicKey) {
      setMintMessage({ type: 'error', message: 'Please connect your wallet!' });
      return;
    }

    if (!isFormValid) {
      setMintMessage({ type: 'error', message: 'Please fill in all the information!' });
      return;
    }

    setIsLoading(true);
    setMintMessage(null);

    try {
      console.log("Using endpoint:", connection.rpcEndpoint);
      
      // Create UMI instance with necessary plugins and use endpoint from connection
      const umi = createUmi(connection.rpcEndpoint)
        .use(walletAdapterIdentity(wallet))
        .use(mplTokenMetadata());

      // Create NFT
      const nftMint = generateSigner(umi);
      
      const mintConfig: any = {
        mint: nftMint,
        name,
        symbol,
        uri,
        sellerFeeBasisPoints: 500 as any,
      };
      
      // Add collection mint if provided
      if (collectionMint) {
        try {
          const collectionPubkey = new PublicKey(collectionMint);
          mintConfig.collection = { key: collectionPubkey, verified: false };
        } catch (err) {
          console.warn("Invalid collection mint:", err);
        }
      }
      
      const mintResult = await createNft(umi, mintConfig).sendAndConfirm(umi);

      // Display success message
      setMintMessage({
        type: 'success',
        message: 'NFT has been successfully created!',
        signature: mintResult.signature.toString(),
        nftAddress: nftMint.publicKey.toString(),
      });
    } catch (error) {
      console.error('Error creating NFT:', error);
      setMintMessage({
        type: 'error',
        message: `Error: ${error instanceof Error ? error.message : 'Unknown'}`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setName('');
    setSymbol('');
    setUri('');
    setMintMessage(null);
  };

  const handleViewExplorer = (signature: string) => {
    if (!signature) return;
    const explorerUrl = `https://explorer.solana.com/tx/${signature}?cluster=${network}`;
    window.open(explorerUrl, '_blank');
  };

  const handleViewNFT = (nftAddress: string) => {
    if (!nftAddress) return;
    const explorerUrl = `https://explorer.solana.com/address/${nftAddress}?cluster=${network}`;
    window.open(explorerUrl, '_blank');
  };

  return (
    <div className="mint-nft-container">
      <div className="mint-nft-header">
        <h2>Create NFT</h2>
        <p className="mint-nft-description">Create a new NFT on Solana</p>
      </div>

      {connected && publicKey && (
        <div className="wallet-status">
          <span className="wallet-address">
            {publicKey.toString().slice(0, 4)}...{publicKey.toString().slice(-4)}
          </span>
          <span className="network-badge">{network}</span>
        </div>
      )}

      {!connected ? (
        <div className="wallet-connect-container">
          <WalletMultiButton />
          <p className="input-help">Connect wallet to create NFT</p>
        </div>
      ) : (
        <>
          {mintMessage?.type === 'success' ? (
            <div className="success-message">
              <div className="success-heading">
                <CheckCircleIcon width={20} height={20} />
                <span>{mintMessage.message}</span>
              </div>
              
              {mintMessage.nftAddress && (
                <div>
                  <p>NFT Address:</p>
                  <div className="success-details">{mintMessage.nftAddress}</div>
                </div>
              )}
              
              {mintMessage.signature && (
                <div>
                  <p>Transaction Signature:</p>
                  <div className="success-details">{mintMessage.signature}</div>
                </div>
              )}
              
              <div className="action-buttons">
                {mintMessage.nftAddress && (
                  <button 
                    onClick={() => handleViewNFT(mintMessage.nftAddress as string)}
                    className="action-button view-nft-button"
                  >
                    <ExternalLinkIcon width={16} height={16} />
                    View NFT
                  </button>
                )}
                
                {mintMessage.signature && (
                  <button 
                    onClick={() => handleViewExplorer(mintMessage.signature as string)}
                    className="action-button view-tx-button"
                  >
                    <ExternalLinkIcon width={16} height={16} />
                    View Transaction
                  </button>
                )}
              </div>
              
              <button 
                onClick={resetForm}
                className="mint-button"
                style={{ marginTop: '16px' }}
              >
                Create New NFT
              </button>
            </div>
          ) : (
            <>
              <div className="nft-card">
                <form onSubmit={(e) => { e.preventDefault(); handleMintNFT(); }}>
                  <div className="input-group">
                    <div className="input-label">
                      <label htmlFor="name">NFT Name</label>
                    </div>
                    <div className="input-container">
                      <input
                        id="name"
                        className="mint-input"
                        type="text"
                        placeholder="Enter NFT name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        disabled={isLoading}
                      />
                    </div>
                    <p className="input-help">Display name of the NFT</p>
                  </div>
                  
                  <div className="input-group">
                    <div className="input-label">
                      <label htmlFor="symbol">Symbol</label>
                    </div>
                    <div className="input-container">
                      <input
                        id="symbol"
                        className="mint-input"
                        type="text"
                        placeholder="Enter symbol (e.g., BTC, ETH)"
                        value={symbol}
                        onChange={(e) => setSymbol(e.target.value)}
                        disabled={isLoading}
                      />
                    </div>
                    <p className="input-help">Short symbol for your NFT</p>
                  </div>
                  
                  <div className="input-group">
                    <div className="input-label">
                      <label htmlFor="uri">Metadata URI</label>
                    </div>
                    <div className="input-container">
                      <input
                        id="uri"
                        className="mint-input"
                        type="text"
                        placeholder="Enter metadata URI"
                        value={uri}
                        onChange={(e) => setUri(e.target.value)}
                        disabled={isLoading}
                      />
                    </div>
                    <p className="input-help">Link to the metadata of the NFT (JSON)</p>
                  </div>
                </form>
              </div>
              
              {collectionMint && (
                <div className="collection-display">
                  <div className="collection-title">Collection Mint</div>
                  <div className="collection-address">{collectionMint}</div>
                </div>
              )}
              
              <div className="nft-info">
                <div className="info-row">
                  <span className="info-label">Network</span>
                  <span className="info-value">{network}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Endpoint</span>
                  <span className="info-value" title={connection.rpcEndpoint}>
                    {connection.rpcEndpoint.slice(0, 20)}...
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-label">Seller Fee</span>
                  <span className="info-value">5%</span>
                </div>
                {publicKey && (
                  <div className="info-row">
                    <span className="info-label">Owner</span>
                    <span className="info-value">{publicKey.toString().slice(0, 4)}...{publicKey.toString().slice(-4)}</span>
                  </div>
                )}
              </div>
              
              <button
                className={`mint-button ${isLoading ? 'loading' : ''}`}
                onClick={handleMintNFT}
                disabled={!isFormValid || isLoading || !connected}
                type="button"
              >
                {isLoading ? ' ' : 'Create NFT'}
              </button>
              
              {mintMessage?.type === 'error' && (
                <div className="error-message">
                  {mintMessage.message}
                </div>
              )}
              
              {isLoading && (
                <div className="mint-loader">
                  <div className="loader-spinner"></div>
                  <div className="loader-text">Creating NFT...</div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
} 