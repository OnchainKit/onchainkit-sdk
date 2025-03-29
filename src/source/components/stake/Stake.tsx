import React, { useState, useEffect } from 'react';
import './Stake.css';
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection, clusterApiUrl } from '@solana/web3.js';

const Stake = () => {
  const [amountToStake, setAmountToStake] = useState('1');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [transactionSignature, setTransactionSignature] = useState('');
  const [solBalance, setSolBalance] = useState('--');
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [currentStage, setCurrentStage] = useState('input'); // input, confirming, success, error

  const { connected, publicKey, signTransaction, signAllTransactions } = useWallet();
  const connection = new Connection(clusterApiUrl('mainnet-beta'), 'confirmed');

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
      // Leave small amount for transaction fees
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

    if (parseFloat(solBalance) < parseFloat(amountToStake)) {
      setError('Insufficient SOL balance');
      return;
    }

    setIsLoading(true);
    setError('');
    setCurrentStage('confirming');

    try {
      const response = await fetch(
        `https://app.solayer.org/api/action/restake/ssol?amount=${parseFloat(amountToStake)}`,
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

      // Deserialize and prepare transaction
      const txBuffer = Buffer.from(data.transaction, "base64");
      const tx = window.solana.uiMethods.deserializeTransaction(txBuffer);

      // Sign transaction
      const signedTx = await window.solana.signTransaction(tx);
      
      // Send transaction
      const signature = await connection.sendRawTransaction(signedTx.serialize());
      
      // Wait for confirmation
      await connection.confirmTransaction(signature, 'confirmed');
      
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
      <div className="stake-header">
        <h2>Stake SOL with Solayer</h2>
        <p className="stake-description">
          Stake your SOL tokens to earn yield through Solayer's liquid staking protocol
        </p>
      </div>

      <div className="input-container">
        <div className="amount-container">
          <input
            type="text"
            className="amount-input"
            value={amountToStake}
            onChange={handleAmountChange}
            placeholder="0"
            disabled={!connected}
          />
          <div className="token-display">
            <img src="/tokens/solana-logo.svg" alt="SOL" className="token-icon" />
            <span>SOL</span>
          </div>
        </div>

        <div className="balance-info">
          <span>Balance: {loadingBalance ? 'Loading...' : solBalance} SOL</span>
          <button 
            className="max-button" 
            onClick={handleUseMax}
            disabled={!connected || solBalance === '--' || parseFloat(solBalance) <= 0}
          >
            MAX
          </button>
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
        disabled={!connected || isLoading || !amountToStake || parseFloat(amountToStake) <= 0 || parseFloat(solBalance) < parseFloat(amountToStake)}
      >
        {isLoading ? 'Staking...' : 'Stake SOL'}
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
