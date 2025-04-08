'use client';

import { useState, useEffect, useContext } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { ModalContext } from '../../../provider/connect-wallet/wallet-provider';
import { createNft } from '@metaplex-foundation/mpl-token-metadata'
import { percentAmount } from '@metaplex-foundation/umi';
import { CheckCircleIcon, ExternalLinkIcon } from '@heroicons/react/solid';
import './create-collection.css';

interface CreateCollectionResult {
  mint: string;
  signature: string;
}

export default function CreateCollection({ onCollectionCreated }: { onCollectionCreated?: (collectionMint: string) => void }) {
  const { connection } = useConnection();
  const { publicKey, connected, wallet, signTransaction, signAllTransactions } = useWallet();
  const { switchToNextEndpoint, endpoint } = useContext(ModalContext);
  
  const [name, setName] = useState('');
  const [uri, setUri] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<CreateCollectionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [network, setNetwork] = useState(endpoint?.includes('devnet') ? 'devnet' : 'mainnet');

  // Only render after the component is mounted on the client
  useEffect(() => {
    setMounted(true);
  }, []);

  // Update network state when endpoint changes
  useEffect(() => {
    setNetwork(endpoint?.includes('devnet') ? 'devnet' : 'mainnet');
  }, [endpoint]);

  const validateURI = (uri: string) => {
    try {
      // Check if the URI is a valid URL
      new URL(uri);
      return true;
    } catch (e) {
      return false;
    }
  };

  const handleCreateCollection = async () => {
    if (!connected || !publicKey || !wallet) {
      setError('Please connect your wallet');
      return;
    }

    if (!name || !uri) {
      setError('Please enter a name and metadata URI');
      return;
    }

    if (!validateURI(uri)) {
      setError('Invalid URI. Please enter a full URI including https://');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Create wallet adapter for signing transactions
      const walletAdapter = {
        publicKey: publicKey,
        signTransaction,
        signAllTransactions
      };

      // Import Metaplex libraries asynchronously
      const [
        { createUmi },
        { walletAdapterIdentity },
        { mplTokenMetadata },
        { generateSigner }
      ] = await Promise.all([
        import('@metaplex-foundation/umi-bundle-defaults'),
        import('@metaplex-foundation/umi-signer-wallet-adapters'),
        import('@metaplex-foundation/mpl-token-metadata'),
        import('@metaplex-foundation/umi')
      ]);

      // Create UMI instance with all necessary modules
      const umi = createUmi(connection.rpcEndpoint)
        .use(walletAdapterIdentity(walletAdapter))
        .use(mplTokenMetadata());
      
      // Create signer for collection mint
      const collectionMint = generateSigner(umi);
      
      // Create collection NFT
      const result = await createNft(umi, {
        mint: collectionMint,
        name,
        uri,
        sellerFeeBasisPoints: percentAmount(5.5), // 5.5%
        isCollection: true,
      }).sendAndConfirm(umi);
      
      // Convert signature to string format
      const signatureStr = typeof result.signature === 'string' 
        ? result.signature 
        : Buffer.from(result.signature).toString('base64');
      
      // Convert mint address to string
      const mintAddressStr = collectionMint.publicKey.toString();
      
      // Save result
      setResult({
        mint: mintAddressStr,
        signature: signatureStr
      });
      
      // Call callback if provided
      if (onCollectionCreated) {
        onCollectionCreated(mintAddressStr);
      }
      
      setName('');
      setUri('');
    } catch (err: any) {
      console.error("Create Collection error:", err);
      setError(err.message);
      
      // If transaction fails due to connection error, try switching to another endpoint
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

  // Clear error when input changes
  useEffect(() => {
    if (error) setError(null);
  }, [name, uri]);

  const viewExplorer = () => {
    if (result?.signature) {
      const baseUrl = network === 'devnet' ? 'https://explorer.solana.com/tx/' : 'https://solscan.io/tx/';
      window.open(`${baseUrl}${result.signature}${network === 'devnet' ? '?cluster=devnet' : ''}`, '_blank');
    }
  };

  const viewCollection = () => {
    if (result?.mint) {
      const baseUrl = network === 'devnet' ? 'https://explorer.solana.com/address/' : 'https://solscan.io/token/';
      window.open(`${baseUrl}${result.mint}${network === 'devnet' ? '?cluster=devnet' : ''}`, '_blank');
    }
  };

  // Reset form
  const resetForm = () => {
    setName('');
    setUri('');
    setResult(null);
    setError(null);
  };

  // Avoid hydration error
  if (!mounted) {
    return <div className="create-collection-container">
      <div className="create-collection-header">
        <h2>Create Collection</h2>
        <p className="create-collection-description">Create a new NFT collection on Solana</p>
      </div>
      <div className="loader">
        <div className="loader-spinner"></div>
        <div className="loader-text">Loading...</div>
      </div>
    </div>;
  }

  return (
    <div className="create-collection-container">
      <div className="create-collection-header">
        <h2>Create Collection</h2>
        <p className="create-collection-description">Create a new NFT collection on Solana</p>
      </div>
      
      {connected && publicKey && (
        <div className="wallet-status">
          <span className="wallet-address">
            {publicKey.toString().slice(0, 4)}...{publicKey.toString().slice(-4)}
          </span>
          <span className="network-badge">
            {network}
          </span>
        </div>
      )}
      
      {!connected ? (
        <div className="wallet-connect-container">
          <WalletMultiButton />
          <p className="input-help">Connect wallet to create collection</p>
        </div>
      ) : result ? (
        <div className="success-message">
          <div className="success-heading">
            <CheckCircleIcon width={20} height={20} />
            <span>Collection created successfully!</span>
          </div>
          
          <div>
            <p>Collection Mint:</p>
            <div className="success-details">{result.mint}</div>
          </div>
          
          <div>
            <p>Transaction Signature:</p>
            <div className="success-details">{result.signature}</div>
          </div>
          
          <div className="action-buttons">
            <button 
              onClick={viewCollection}
              className="action-button view-collection-button"
            >
              <ExternalLinkIcon width={16} height={16} />
              View Collection
            </button>
            
            <button 
              onClick={viewExplorer}
              className="action-button view-tx-button"
            >
              <ExternalLinkIcon width={16} height={16} />
              View Transaction
            </button>
          </div>
          
          <button 
            onClick={resetForm}
            className="create-button"
            style={{ marginTop: '16px' }}
          >
            Create New Collection
          </button>
        </div>
      ) : (
        <>
          <div className="collection-card">
            <div className="input-group">
              <div className="input-label">
                <label htmlFor="collection-name">Collection Name</label>
              </div>
              <div className="input-container">
                <input
                  id="collection-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="collection-input"
                  placeholder="My Awesome Collection"
                  required
                />
              </div>
              <p className="input-help">Enter a name for your NFT collection</p>
            </div>
            
            <div className="input-group">
              <div className="input-label">
                <label htmlFor="metadata-uri">Metadata URI</label>
              </div>
              <div className="input-container">
                <input
                  id="metadata-uri"
                  type="text"
                  value={uri}
                  onChange={(e) => setUri(e.target.value)}
                  className="collection-input"
                  placeholder="https://example.com/my-collection.json"
                  required
                />
              </div>
              <p className="input-help">URI to JSON metadata following Metaplex standard</p>
            </div>
            
            <button
              onClick={handleCreateCollection}
              disabled={isLoading || !name || !uri}
              className={`create-button ${isLoading ? 'loading' : ''}`}
            >
              {isLoading ? 'Creating...' : 'Create Collection'}
            </button>
          </div>
        </>
      )}
      
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
    </div>
  );
} 