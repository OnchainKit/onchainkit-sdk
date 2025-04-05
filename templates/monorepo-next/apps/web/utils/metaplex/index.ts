import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { mplCore, create, fetchCollection } from '@metaplex-foundation/mpl-core';
import { generateSigner } from '@metaplex-foundation/umi';
import { PublicKey, Connection } from '@solana/web3.js';
import { 
  fromWeb3JsPublicKey, 
  toWeb3JsPublicKey 
} from '@metaplex-foundation/umi-web3js-adapters';
import { 
  walletAdapterIdentity
} from '@metaplex-foundation/umi-signer-wallet-adapters';

export const createMetaplexInstance = (endpoint: string) => {
  return createUmi(endpoint).use(mplCore());
};

export interface MintNFTResponse {
  mint: PublicKey;
  signature: string;
}

export interface CreateCollectionResponse {
  mint: PublicKey;
  signature: string;
}

export async function createCollection(
  connection: Connection,
  wallet: any,
  collectionData: {
    name: string;
    uri: string;
  }
): Promise<CreateCollectionResponse> {
  try {
    // Tạo instance UMI
    const umi = createUmi(connection.rpcEndpoint).use(mplCore());
    
    // Sử dụng wallet adapter thay vì keypair trực tiếp
    umi.use(walletAdapterIdentity(wallet));

    // Tạo signer mới cho Collection NFT
    const collectionMint = generateSigner(umi);

    // Tạo Collection NFT sử dụng API create
    const tx = create(umi, {
      asset: collectionMint,
      name: collectionData.name,
      uri: collectionData.uri,
    });

    const result = await tx.sendAndConfirm(umi);
    const signatureStr = typeof result.signature === 'string' 
      ? result.signature 
      : Buffer.from(result.signature).toString('base64');

    return {
      mint: toWeb3JsPublicKey(collectionMint.publicKey),
      signature: signatureStr,
    };
  } catch (error: any) {
    console.error("Create Collection error:", error);
    throw new Error(`Tạo Collection thất bại: ${error.message}`);
  }
}

export async function mintNFT(
  connection: Connection,
  wallet: any,
  collectionMint: PublicKey,
  metadata: {
    name: string;
    uri: string;
  },
  recipient?: PublicKey,
): Promise<MintNFTResponse> {
  try {
    // Tạo instance UMI
    const umi = createUmi(connection.rpcEndpoint).use(mplCore());
    
    // Sử dụng wallet adapter thay vì keypair trực tiếp
    umi.use(walletAdapterIdentity(wallet));

    // Chuyển đổi collection mint sang định dạng UMI
    const umiCollectionMint = fromWeb3JsPublicKey(collectionMint);

    // Lấy thông tin collection
    const collection = await fetchCollection(umi, umiCollectionMint);

    // Tạo signer mới cho NFT
    const assetSigner = generateSigner(umi);

    // Tạo NFT trong collection
    const tx = create(umi, {
      asset: assetSigner,
      collection: collection,
      name: metadata.name,
      uri: metadata.uri,
      owner: fromWeb3JsPublicKey(recipient || wallet.publicKey),
    });

    const result = await tx.sendAndConfirm(umi);
    const signatureStr = typeof result.signature === 'string' 
      ? result.signature 
      : Buffer.from(result.signature).toString('base64');

    return {
      mint: toWeb3JsPublicKey(assetSigner.publicKey),
      signature: signatureStr,
    };
  } catch (error: any) {
    console.error("Mint NFT error:", error);
    throw new Error(`Mint NFT thất bại: ${error.message}`);
  }
}

export async function getNFT(
  connection: Connection,
  assetId: string
) {
  try {
    // Sử dụng phương thức DAS RPC trực tiếp từ connection
    const response = await connection.getAccountInfo(new PublicKey(assetId));
    
    if (!response) {
      throw new Error('Không tìm thấy NFT');
    }
    
    return {
      address: assetId,
      data: response.data,
      lamports: response.lamports,
      owner: response.owner.toBase58()
    };
  } catch (error: any) {
    console.error("Get NFT error:", error);
    throw new Error(`Không thể lấy thông tin NFT: ${error.message}`);
  }
} 