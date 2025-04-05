import React, { useState, useEffect, useContext } from 'react';
import './Stake.css';
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection, PublicKey, Transaction, clusterApiUrl, VersionedTransaction } from '@solana/web3.js';
import { ModalContext } from '../../provider/connect-wallet/wallet-provider';

const Stake = () => {
  const [amountToStake, setAmountToStake] = useState('1');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [transactionSignature, setTransactionSignature] = useState('');
  const [solBalance, setSolBalance] = useState('--');
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [currentStage, setCurrentStage] = useState('input'); // input, confirming, success, error
  const [showManualConfirm, setShowManualConfirm] = useState(false); // Thêm state cho modal xác nhận thủ công

  const { connected, publicKey, signTransaction, signAllTransactions } = useWallet();
  const { endpoint } = useContext(ModalContext);
  const connection = new Connection(endpoint || clusterApiUrl('mainnet-beta'), 'confirmed');

  // Fetch SOL balance when wallet connects
  useEffect(() => {
    if (connected && publicKey) {
      fetchBalance();
    } else {
      setSolBalance('--');
    }
  }, [connected, publicKey]);

  // Fetch SOL balance
  const fetchBalance = async () => {
    if (!connected || !publicKey) return;
    
    setLoadingBalance(true);
    try {
      const balance = await connection.getBalance(publicKey);
      const solBalanceFormatted = (balance / 1_000_000_000).toFixed(6);
      setSolBalance(solBalanceFormatted);
      console.log(`fetchBalance: SOL balance = ${solBalanceFormatted}`);
    } catch (error) {
      console.error('Error fetching SOL balance:', error);
      setSolBalance('0');
    } finally {
      setLoadingBalance(false);
    }
  };

  // Handle input change
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setAmountToStake(value);
    }
  };

  // Handle using max balance
  const handleUseMax = () => {
    if (solBalance !== '--' && parseFloat(solBalance) > 0) {
      const maxAmount = Math.max(parseFloat(solBalance) - 0.01, 0).toFixed(6);
      setAmountToStake(maxAmount);
    }
  };

  // Stake SOL with Solayer
  const handleStake = async () => {
    if (!connected || !publicKey) {
      setError('Please connect your wallet first');
      return;
    }

    if (!amountToStake || parseFloat(amountToStake) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    // Kiểm tra số dư SOL, áp dụng cách làm từ component Swap
    const inputAmount = parseFloat(amountToStake);
    if (solBalance !== '--' && parseFloat(solBalance) < inputAmount) {
      // Cho phép chênh lệch rất nhỏ cho SOL (để tính toán phí giao dịch)
      if (inputAmount - parseFloat(solBalance) < 0.001) {
        console.log(`Small difference in SOL balance detected, proceeding anyway`);
      } else {
        setError('Insufficient SOL balance');
        return;
      }
    }

    setIsLoading(true);
    setError('');
    setCurrentStage('confirming');

    try {
      // Sử dụng API route nội bộ thay vì gọi trực tiếp đến Solayer API
      // để tránh lỗi CORS
      const response = await fetch(
        `/api/solayer/stake?amount=${parseFloat(amountToStake)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            account: publicKey.toBase58(),
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Staking request failed");
      }

      const data = await response.json();

      // Giải mã transaction từ base64
      const txBuffer = Buffer.from(data.transaction, "base64");
      
      // Tạo VersionedTransaction từ dữ liệu nhận được
      const tx = VersionedTransaction.deserialize(txBuffer);
      
      // Cập nhật blockhash mới nhất
      const { blockhash } = await connection.getLatestBlockhash();
      tx.message.recentBlockhash = blockhash;
      
      // Ký giao dịch bằng ví người dùng
      if (!signTransaction) {
        throw new Error("Wallet does not support signing transactions");
      }
      
      console.log("Signing transaction...");
      const signedTx = await signTransaction(tx);
      
      console.log("Sending transaction...");
      const signature = await connection.sendRawTransaction(signedTx.serialize());
      
      console.log("Transaction sent, signature:", signature);
      
      // Chờ xác nhận giao dịch
      const latestBlockhash = await connection.getLatestBlockhash();
      await connection.confirmTransaction({
        signature,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      });
      
      setTransactionSignature(signature);
      setCurrentStage('success');
      
      // Refresh balance after successful stake
      fetchBalance();
      
    } catch (error: any) {
      console.error('Staking error:', error);
      setError(`Staking failed: ${error.message}`);
      setCurrentStage('error');
    } finally {
      setIsLoading(false);
    }
  };

  // Render success view
  const renderSuccess = () => (
    <div className="stake-success">
      <div className="success-icon">✓</div>
      <h3>Staking Successful!</h3>
      <p>Your SOL has been staked successfully with Solayer.</p>
      {transactionSignature && (
        <a 
          href={`https://explorer.solana.com/tx/${transactionSignature}`} 
          target="_blank" 
          rel="noopener noreferrer"
          className="transaction-link"
        >
          View transaction
        </a>
      )}
      <button 
        className="stake-button back-button" 
        onClick={() => {
          setCurrentStage('input');
          setAmountToStake('1');
        }}
      >
        Stake more SOL
      </button>
    </div>
  );

  // Render error view
  const renderError = () => (
    <div className="stake-error">
      <div className="error-icon">✗</div>
      <h3>Staking Failed</h3>
      <p>{error || 'An error occurred while staking your SOL.'}</p>
      <button 
        className="stake-button back-button" 
        onClick={() => {
          setCurrentStage('input');
        }}
      >
        Try Again
      </button>
    </div>
  );

  // Render input form
  const renderInputForm = () => (
    <div className="stake-form">
      <div className="outer-input-label-row">
        <div className="left-label">Amount to Stake</div>
        <div className="balance-display">
          Balance: <span className="balance-amount">{loadingBalance ? '...' : solBalance}</span>
          {connected && solBalance !== '--' && parseFloat(solBalance) > 0 && (
            <button onClick={handleUseMax} className="max-button">MAX</button>
          )}
        </div>
      </div>
      
      <div className="input-container">
        <div className="amount-container">
          <input
            type="text"
            className="amount-input"
            value={amountToStake}
            onChange={handleAmountChange}
            placeholder="0"
            disabled={!connected || isLoading}
          />
          <div className="token-display">
            <img src="/tokens/solana-logo.svg" alt="SOL" className="token-icon" />
            <span>SOL</span>
          </div>
        </div>
      </div>

      <div className="stake-info">
        <div className="info-row">
          <span>Staking Platform</span>
          <span>Solayer</span>
        </div>
        <div className="info-row">
          <span>Reward Token</span>
          <span>sSOL</span>
        </div>
        <div className="info-row">
          <span>Estimated APY</span>
          <span>9.26%</span>
        </div>
      </div>

      <button 
        className="stake-button" 
        onClick={handleStake}
        disabled={
          !connected || 
          isLoading || 
          !amountToStake || 
          parseFloat(amountToStake) <= 0 || 
          (solBalance !== '--' && parseFloat(solBalance) < parseFloat(amountToStake) && !(parseFloat(amountToStake) - parseFloat(solBalance) < 0.001))
        }
      >
        {!connected 
          ? 'Connect Wallet' 
          : isLoading 
            ? 'Staking...' 
            : (solBalance !== '--' && parseFloat(solBalance) < parseFloat(amountToStake) && !(parseFloat(amountToStake) - parseFloat(solBalance) < 0.001))
              ? 'Insufficient SOL balance'
              : 'Stake SOL'
        }
      </button>

      {error && <div className="error-message">{error}</div>}
    </div>
  );

  // Render based on current stage
  const renderStageContent = () => {
    switch (currentStage) {
      case 'success':
        return renderSuccess();
      case 'error':
        return renderError();
      case 'confirming':
        return (
          <div className="confirming-container">
            <div className="loader"></div>
            <h3>Confirming Transaction</h3>
            <p>Please wait while your staking transaction is being processed...</p>
          </div>
        );
      default:
        return renderInputForm();
    }
  };

  return (
    <div className="stake-container">
      {renderStageContent()}
    </div>
  );
};

export default Stake;
