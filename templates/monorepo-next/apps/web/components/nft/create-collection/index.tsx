'use client';

import { useState, useEffect, useContext } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { ModalContext } from '../../../provider/connect-wallet/wallet-provider';
import { createNft } from '@metaplex-foundation/mpl-token-metadata'
import { percentAmount } from '@metaplex-foundation/umi';

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

  // Chỉ render sau khi component được mount trên client
  useEffect(() => {
    setMounted(true);
  }, []);

  const validateURI = (uri: string) => {
    try {
      // Kiểm tra xem URI có định dạng URL hợp lệ không
      new URL(uri);
      return true;
    } catch (e) {
      return false;
    }
  };

  const handleCreateCollection = async () => {
    if (!connected || !publicKey || !wallet) {
      setError('Vui lòng kết nối ví');
      return;
    }

    if (!name || !uri) {
      setError('Vui lòng nhập tên và URI metadata');
      return;
    }

    if (!validateURI(uri)) {
      setError('URI không hợp lệ. Vui lòng nhập URI đầy đủ bao gồm https://');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Tạo wallet adapter cho kí giao dịch
      const walletAdapter = {
        publicKey: publicKey,
        signTransaction,
        signAllTransactions
      };

      // Import thư viện Metaplex không đồng bộ
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

      // Tạo UMI instance với tất cả modules cần thiết
      const umi = createUmi(connection.rpcEndpoint)
        .use(walletAdapterIdentity(walletAdapter))
        .use(mplTokenMetadata());
      
      // Tạo signer cho collection mint
      const collectionMint = generateSigner(umi);
      
      // Tạo collection NFT
      const result = await createNft(umi, {
        mint: collectionMint,
        name,
        uri,
        sellerFeeBasisPoints: percentAmount(5.5), // 5.5%
        isCollection: true,
      }).sendAndConfirm(umi);
      
      // Chuyển đổi signature sang định dạng string
      const signatureStr = typeof result.signature === 'string' 
        ? result.signature 
        : Buffer.from(result.signature).toString('base64');
      
      // Chuyển đổi mint address sang string
      const mintAddressStr = collectionMint.publicKey.toString();
      
      // Lưu kết quả
      setResult({
        mint: mintAddressStr,
        signature: signatureStr
      });
      
      // Gọi callback nếu có
      if (onCollectionCreated) {
        onCollectionCreated(mintAddressStr);
      }
      
      setName('');
      setUri('');
    } catch (err: any) {
      console.error("Create Collection error:", err);
      setError(err.message);
      
      // Nếu giao dịch thất bại do lỗi kết nối, thử chuyển sang endpoint khác
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

  // Xóa lỗi khi thay đổi đầu vào
  useEffect(() => {
    if (error) setError(null);
  }, [name, uri]);

  const viewExplorer = () => {
    if (result?.signature) {
      window.open(`https://solscan.io/tx/${result.signature}`, '_blank');
    }
  };

  const viewCollection = () => {
    if (result?.mint) {
      window.open(`https://solscan.io/token/${result.mint}`, '_blank');
    }
  };

  // Tránh lỗi hydration
  if (!mounted) {
    return <div className="p-4 border rounded-lg shadow-sm w-full max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-4">Tạo Collection</h2>
      <p>Đang tải...</p>
    </div>;
  }

  return (
    <div className="p-4 border rounded-lg shadow-sm w-full max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-4">Tạo Collection</h2>
      
      {!connected && (
        <div className="mb-4">
          <p className="mb-2 text-sm">Kết nối ví để tiếp tục</p>
          <WalletMultiButton />
        </div>
      )}
      
      {connected && publicKey && (
        <>
          <div className="mb-4 p-2 bg-gray-50 rounded text-sm flex items-center justify-between">
            <div className="overflow-hidden text-ellipsis">
              Ví: {publicKey.toString().slice(0, 6)}...{publicKey.toString().slice(-4)}
            </div>
            <div className="text-xs text-gray-500">
              {endpoint ? endpoint.split('//')[1].split('.')[0] : 'mainnet'}
            </div>
          </div>
          
          <form onSubmit={(e) => { e.preventDefault(); handleCreateCollection(); }} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-1">
                Tên Collection
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="My NFT Collection"
                required
              />
            </div>
            
            <div>
              <label htmlFor="uri" className="block text-sm font-medium mb-1">
                URI Metadata
              </label>
              <input
                id="uri"
                type="text"
                value={uri}
                onChange={(e) => setUri(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="https://example.com/my-collection.json"
                required
              />
              <p className="mt-1 text-xs text-gray-500">Metadata phải tuân theo chuẩn Metaplex</p>
            </div>
            
            <button
              type="submit"
              disabled={isLoading || !connected}
              className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
            >
              {isLoading ? 'Đang tạo...' : 'Tạo Collection'}
            </button>
          </form>
        </>
      )}
      
      {error && (
        <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">
          {error}
        </div>
      )}
      
      {result && (
        <div className="mt-4 p-3 bg-green-50 text-green-700 rounded-md text-sm">
          <p className="font-medium">Collection đã được tạo thành công!</p>
          <p className="break-all mt-1 text-xs">Collection Mint: {result.mint}</p>
          <div className="mt-2 flex space-x-2">
            <button
              onClick={viewCollection}
              className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
            >
              Xem Collection
            </button>
            <button
              onClick={viewExplorer}
              className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
            >
              Xem giao dịch
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 