'use client';

import { useState, useContext, useEffect } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { getNFT } from '../../../utils/metaplex';
import { ModalContext } from '../../../provider/connect-wallet/wallet-provider';
import './get-nft.css';

export default function GetNFT() {
  const { connection } = useConnection();
  const { connected, publicKey } = useWallet();
  const { endpoint, switchToNextEndpoint } = useContext(ModalContext);
  
  const [nftAddress, setNftAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [nftData, setNftData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [ownedNfts, setOwnedNfts] = useState<any[]>([]);
  const [isLoadingOwned, setIsLoadingOwned] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Load user's NFT list when wallet is connected
  useEffect(() => {
    if (connected && publicKey) {
      fetchOwnedNFTs();
    } else {
      setOwnedNfts([]);
    }
  }, [connected, publicKey]);

  const fetchOwnedNFTs = async () => {
    if (!publicKey) return;
    
    try {
      setIsLoadingOwned(true);
      
      // Make API call or use Metaplex library to get the list of NFTs
      // Example: const nfts = await getOwnedNFTs(publicKey);
      // setOwnedNfts(nfts);
      
    } catch (err) {
      console.error("Error loading NFTs:", err);
    } finally {
      setIsLoadingOwned(false);
    }
  };

  const handleFetchNFT = async () => {
    if (!nftAddress || !nftAddress.trim()) {
      setError('Please enter NFT address');
      return;
    }

    let validAddress = true;
    try {
      // Validate address
      new PublicKey(nftAddress);
    } catch (err) {
      setError('Invalid NFT address');
      validAddress = false;
      return;
    }

    if (!validAddress) return;

    try {
      setIsLoading(true);
      setError(null);
      setNftData(null);

      const data = await getNFT(connection, nftAddress);
      setNftData(data);
    } catch (err: any) {
      console.error("Get NFT error:", err);
      setError(err.message);
      
      // If query fails due to connection error, try switching to another endpoint
      if (err.message.includes('failed to fetch') || 
          err.message.includes('timeout') || 
          err.message.includes('429') ||
          err.message.includes('503')) {
        switchToNextEndpoint();
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  const viewInExplorer = () => {
    if (nftData?.address) {
      window.open(`https://solscan.io/token/${nftData.address}`, '_blank');
    }
  };

  const selectOwnedNft = (mint: string) => {
    setNftAddress(mint);
    handleFetchNFT();
  };

  // Avoid hydration error
  if (!mounted) {
    return null;
  }

  return (
    <div className="get-nft-container">
      <div className="get-nft-header">
        <h2>View NFT Information</h2>
        <p className="get-nft-description">Lookup and display information of NFTs on Solana</p>
      </div>

      {connected && publicKey && (
        <div className="wallet-status">
          <span className="wallet-address">
            {publicKey.toString().slice(0, 4)}...{publicKey.toString().slice(-4)}
          </span>
          <span className="network-badge">
            {endpoint ? endpoint.split('//')[1].split('.')[0] : 'mainnet'}
          </span>
        </div>
      )}

      {!connected ? (
        <div className="wallet-connect-container">
          <WalletMultiButton />
          <p className="input-help">Connect wallet to view your NFTs</p>
        </div>
      ) : (
        <>
          <div className="input-section">
            <div className="input-group">
              <div className="input-label">
                <label htmlFor="nftAddress">NFT Address</label>
              </div>
              <div className="input-container">
                <input
                  id="nftAddress"
                  className="nft-input"
                  type="text"
                  value={nftAddress}
                  onChange={(e) => setNftAddress(e.target.value)}
                  placeholder="Enter NFT address (mint address)"
                  disabled={isLoading}
                />
                <button
                  onClick={handleFetchNFT}
                  disabled={isLoading}
                  className={`search-button ${isLoading ? 'loading' : ''}`}
                >
                  {isLoading ? '' : 'Search'}
                </button>
              </div>
              <p className="input-help">Enter the mint address of the NFT to view detailed information</p>
            </div>
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {nftData && (
            <div className="nft-display">
              <div className="nft-card-header">
                <div className="nft-card-title">NFT Information</div>
                <button 
                  onClick={viewInExplorer}
                  className="explorer-button"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  View on Explorer
                </button>
              </div>
              <div className="nft-card-body">
                <div className="nft-image-container">
                  <div className="nft-image-placeholder">
                    {nftData.data ? 'NFT Data Available' : 'No image available'}
                  </div>
                </div>
                
                <div>
                  <div className="nft-info-row">
                    <span className="nft-info-label">Address</span>
                    <span className="nft-info-value">{nftData.address}</span>
                  </div>
                  <div className="nft-info-row">
                    <span className="nft-info-label">Owner</span>
                    <span className="nft-info-value">{nftData.owner}</span>
                  </div>
                  <div className="nft-info-row">
                    <span className="nft-info-label">SOL</span>
                    <span className="nft-info-value">{nftData.lamports / 1000000000} SOL</span>
                  </div>
                  <div className="nft-info-row">
                    <span className="nft-info-label">Data size</span>
                    <span className="nft-info-value">{nftData.data?.length || 0} bytes</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* User's NFTs */}
          <div className="owned-nft-section">
            <div className="owned-nft-title">Your NFTs</div>
            
            {isLoadingOwned ? (
              <div className="loader">
                <div className="loader-spinner"></div>
                <div className="loader-text">Loading NFTs...</div>
              </div>
            ) : ownedNfts.length > 0 ? (
              <div className="owned-nft-grid">
                {ownedNfts.map((nft, index) => (
                  <div 
                    key={index} 
                    className="owned-nft-item"
                    onClick={() => selectOwnedNft(nft.mint)}
                  >
                    <img src={nft.image} alt={nft.name} className="owned-nft-image" />
                    <div className="owned-nft-info">
                      <div className="owned-nft-name">{nft.name}</div>
                      <div className="owned-nft-mint">{nft.mint}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                No NFTs found in your wallet
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
} 