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
    // Create UMI instance
    const umi = createUmi(connection.rpcEndpoint).use(mplCore());
    
    // Use wallet adapter instead of direct keypair
    umi.use(walletAdapterIdentity(wallet));

    // Create a new signer for Collection NFT
    const collectionMint = generateSigner(umi);

    // Create Collection NFT using the create API
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
    throw new Error(`Create Collection failed: ${error.message}`);
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
    const umi = createUmi(connection.rpcEndpoint).use(mplCore());
    
    umi.use(walletAdapterIdentity(wallet));

    const umiCollectionMint = fromWeb3JsPublicKey(collectionMint);

    const collection = await fetchCollection(umi, umiCollectionMint);
    
    const assetSigner = generateSigner(umi);

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
    throw new Error(`Mint NFT failed: ${error.message}`);
  }
}

export async function getNFT(
  connection: Connection,
  assetId: string
) {
  try {
    const response = await connection.getAccountInfo(new PublicKey(assetId));
    
    if (!response) {
      throw new Error('NFT not found');
    }
    
    return {
      address: assetId,
      data: response.data,
      lamports: response.lamports,
      owner: response.owner.toBase58()
    };
  } catch (error: any) {
    console.error("Get NFT error:", error);
    throw new Error(`Unable to retrieve NFT information: ${error.message}`);
  }
}