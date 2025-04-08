import React, { useState, useEffect, useContext } from 'react';
import './Swap.css';
import { useJupiterTrade } from '../../utils/swap/swap';
import { TOKENS } from '../../constants';
import { useWallet } from '@solana/wallet-adapter-react';
import { ModalContext } from '../../provider/connect-wallet/wallet-provider';

// Token icons
const TOKEN_ICONS = {
  SOL: '/tokens/solana-logo.svg',
  USDC: '/tokens/usdc-logo.svg',
  USDT: '/tokens/usdt-logo.svg',
  BONK: '/tokens/bonk-logo.svg'
};

const Swap = () => {
  const [tokenIn, setTokenIn] = useState('1');
  const [tokenInSymbol, setTokenInSymbol] = useState('SOL');
  const [tokenOut, setTokenOut] = useState('');
  const [tokenOutSymbol, setTokenOutSymbol] = useState('USDC');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [transactionSignature, setTransactionSignature] = useState('');
  const [showTokenListIn, setShowTokenListIn] = useState(false);
  const [showTokenListOut, setShowTokenListOut] = useState(false);
  const [currentStage, setCurrentStage] = useState('input'); // input, confirming, success, error
  const [exchangeRate, setExchangeRate] = useState('--');
  const [slippage, setSlippage] = useState(50); // 0.5% default (calculated in basis points)
  const [showSlippageSettings, setShowSlippageSettings] = useState(false);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [priceImpact, setPriceImpact] = useState<number | null>(null);
  // Add state to store value before calling API
  const [pendingTokenIn, setPendingTokenIn] = useState('1');
  const [needQuoteUpdate, setNeedQuoteUpdate] = useState(true);
  // Add balance states
  const [tokenInBalance, setTokenInBalance] = useState('--');
  const [tokenOutBalance, setTokenOutBalance] = useState('--');
  const [loadingBalance, setLoadingBalance] = useState(false);
  
  const { executeTrade, getQuote, getBalance } = useJupiterTrade();
  const { connected, publicKey } = useWallet();
  
  // Map token symbols to PublicKey
  const tokenMap = {
    SOL: TOKENS.SOL,
    USDC: TOKENS.USDC,
    USDT: TOKENS.USDT,
    BONK: TOKENS.BONK
  };

  // Token list to display
  const tokenList = [
    { symbol: 'SOL', name: 'Solana' },
    { symbol: 'USDC', name: 'USD Coin' },
    { symbol: 'USDT', name: 'Tether USD' },
    { symbol: 'BONK', name: 'Bonk' },
  ];

  // Store timeout ID
  const [inputTimeout, setInputTimeout] = useState<NodeJS.Timeout | null>(null);

  // Cleanup timeout when component unmounts
  useEffect(() => {
    return () => {
      if (inputTimeout) {
        clearTimeout(inputTimeout);
      }
    };
  }, [inputTimeout]);
  
  // Fetch balances when wallet connects or tokens change
  useEffect(() => {
    if (connected && publicKey) {
      fetchBalances();
    } else {
      setTokenInBalance('--');
      setTokenOutBalance('--');
    }
  }, [connected, publicKey, tokenInSymbol, tokenOutSymbol]);

  // Fetch quote when needed
  useEffect(() => {
    // Only call API when needQuoteUpdate = true
    if (needQuoteUpdate) {
      fetchQuote();
      // Reset needQuoteUpdate to avoid continuous API calls
      setNeedQuoteUpdate(false);
    }
  }, [needQuoteUpdate]);

  // Fetch token balances
  const fetchBalances = async () => {
    if (!connected || !publicKey) return;
    
    setLoadingBalance(true);
    console.log("fetchBalances: Started fetching balances");
    
    try {
      const inputMint = tokenMap[tokenInSymbol as keyof typeof tokenMap];
      const outputMint = tokenMap[tokenOutSymbol as keyof typeof tokenMap];
      
      console.log(`fetchBalances: Input token ${tokenInSymbol}, mint ${inputMint.toString()}`);
      console.log(`fetchBalances: Output token ${tokenOutSymbol}, mint ${outputMint.toString()}`);
      
      // Get input token balance
      console.log(`fetchBalances: Getting balance for ${tokenInSymbol}`);
      let inBalance = "0"; // Default to 0
      try {
        inBalance = await getBalance(inputMint);
        console.log(`fetchBalances: ${tokenInSymbol} balance = ${inBalance}`);
      } catch (err) {
        console.error(`Error getting ${tokenInSymbol} balance:`, err);
        inBalance = "0"; // Set to 0 on error
      }
      
      // For small SOL balances, ensure we show the value with enough decimal places
      if (tokenInSymbol === 'SOL' && parseFloat(inBalance) > 0) {
        // Always display SOL with 6 decimal places if it has value
        const formattedSol = parseFloat(inBalance).toFixed(6);
        console.log(`fetchBalances: Reformatted SOL balance: ${formattedSol}`);
        setTokenInBalance(formattedSol);
      } else {
        setTokenInBalance(inBalance);
      }
      
      // Get output token balance
      console.log(`fetchBalances: Getting balance for ${tokenOutSymbol}`);
      let outBalance = "0"; // Default to 0
      try {
        outBalance = await getBalance(outputMint);
        console.log(`fetchBalances: ${tokenOutSymbol} balance = ${outBalance}`);
      } catch (err) {
        console.error(`Error getting ${tokenOutSymbol} balance:`, err);
        outBalance = "0"; // Set to 0 on error
      }
      
      // For small SOL balances, ensure we show the value with enough decimal places
      if (tokenOutSymbol === 'SOL' && parseFloat(outBalance) > 0) {
        // Always display SOL with 6 decimal places if it has value
        const formattedSol = parseFloat(outBalance).toFixed(6);
        console.log(`fetchBalances: Reformatted SOL balance: ${formattedSol}`);
        setTokenOutBalance(formattedSol);
      } else {
        setTokenOutBalance(outBalance);
      }
      
    } catch (error) {
      console.error('Error fetching balances:', error);
      setTokenInBalance('0'); // Set to '0' instead of '--' on error
      setTokenOutBalance('0'); // Set to '0' instead of '--' on error
    } finally {
      setLoadingBalance(false);
      console.log("fetchBalances: Completed fetching balances");
    }
  };

  // Handle using max balance
  const handleUseMax = () => {
    if (tokenInBalance !== '--' && parseFloat(tokenInBalance) > 0) {
      setTokenIn(tokenInBalance);
      setPendingTokenIn(tokenInBalance);
      setNeedQuoteUpdate(true);
    }
  };

  // Call API to get quote
  const fetchQuote = async () => {
    if (!connected || !tokenIn || parseFloat(tokenIn) <= 0) {
      setTokenOut('');
      setExchangeRate('--');
      setPriceImpact(null);
      return;
    }

    const inputMint = tokenMap[tokenInSymbol as keyof typeof tokenMap];
    const outputMint = tokenMap[tokenOutSymbol as keyof typeof tokenMap];

    if (!inputMint || !outputMint || tokenInSymbol === tokenOutSymbol) {
      setTokenOut('');
      setExchangeRate('--');
      setPriceImpact(null);
      return;
    }

    try {
      setQuoteLoading(true);
      setError(''); // Reset error message
      const inputAmount = parseFloat(tokenIn);
      
      // Check if user has enough balance
      if (tokenInBalance !== '--' && parseFloat(tokenInBalance) < inputAmount) {
        // Allow very small differences for SOL (to account for transaction fees)
        if (tokenInSymbol === 'SOL' && (inputAmount - parseFloat(tokenInBalance) < 0.001)) {
          console.log(`Small difference in SOL balance detected, proceeding anyway`);
        } else {
          throw new Error(`Insufficient ${tokenInSymbol} balance`);
        }
      }
      
      console.log(`Getting quote: ${inputAmount} ${tokenInSymbol} -> ${tokenOutSymbol}`);
      console.log(`Input token: ${inputMint.toString()}`);
      console.log(`Output token: ${outputMint.toString()}`);
      
      // Limit token amounts based on type
      const maxAmounts = {
        'SOL': 5, // Max 5 SOL
        'USDC': 1000, // Max 1000 USDC 
        'USDT': 1000, // Max 1000 USDT
        'BONK': 10000000 // Max 10 million BONK
      };
      
      const maxAmount = maxAmounts[tokenInSymbol as keyof typeof maxAmounts] || 1;
      
      if (inputAmount > maxAmount) {
        throw new Error(`Amount too large. Maximum is ${maxAmount} ${tokenInSymbol}`);
      }
      
      const quoteResult = await getQuote(
        outputMint,
        inputAmount,
        inputMint,
        slippage
      );

      console.log(`Quote result:`, quoteResult);
      setTokenOut(quoteResult.outputAmount);
      setExchangeRate(quoteResult.exchangeRate.toFixed(6));
      setPriceImpact(quoteResult.priceImpactPct);
      
    } catch (err: any) {
      console.error('Error getting quote:', err);
      setTokenOut('');
      setExchangeRate('--');
      setPriceImpact(null);
      
      // Display user-friendly error
      let errorMessage = err.message || 'Could not get quote';
      
      // Handle specific error cases
      if (errorMessage.includes('400') || errorMessage.includes('Bad Request')) {
        errorMessage = 'Invalid token amount or insufficient liquidity';
      }
      
      setError(errorMessage);
    } finally {
      setQuoteLoading(false);
    }
  };

  // Handle input token change
  const handleTokenInChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setTokenIn(value);
    setPendingTokenIn(value);
    
    // Cancel old timeout if any
    if (inputTimeout) {
      clearTimeout(inputTimeout);
    }
    
    // Automatically update quote after user stops typing for 500ms
    if (value && parseFloat(value) > 0) {
      const newTimeout = setTimeout(() => {
        setNeedQuoteUpdate(true);
      }, 500);
      
      setInputTimeout(newTimeout);
    }
  };

  // Still keep blur to ensure update when focus out of input
  const handleTokenInBlur = () => {
    // Only call API if value actually changes and is valid
    if ((pendingTokenIn !== tokenIn || tokenIn !== '1') && pendingTokenIn && parseFloat(pendingTokenIn) > 0) {
      // Set tokenIn and trigger quote update
      setTokenIn(pendingTokenIn);
      setNeedQuoteUpdate(true);
    }
  };

  // Swap input and output token positions
  const handleSwapPositions = () => {
    setTokenInSymbol(tokenOutSymbol);
    setTokenOutSymbol(tokenInSymbol);
    // Reset token out value
    setTokenOut('');
    // Trigger quote update
    setNeedQuoteUpdate(true);
  };

  // Handle slippage change
  const handleSlippageChange = (value: number) => {
    setSlippage(value);
    // Trigger quote update
    setNeedQuoteUpdate(true);
  };

  // Handle token change
  const handleTokenChange = (isInput: boolean, symbol: string) => {
    if (isInput) {
      // If selected input token matches output token
      if (symbol === tokenOutSymbol) {
        // Swap tokens
        setTokenInSymbol(symbol);
        setTokenOutSymbol(tokenInSymbol);
      } else {
        setTokenInSymbol(symbol);
      }
    } else {
      // If selected output token matches input token
      if (symbol === tokenInSymbol) {
        // Swap tokens
        setTokenOutSymbol(symbol);
        setTokenInSymbol(tokenOutSymbol);
      } else {
        setTokenOutSymbol(symbol);
      }
    }
    // Reset token out value
    setTokenOut('');
    // Trigger quote update
    setNeedQuoteUpdate(true);
  };

  // Render token selector with token change handling
  const renderTokenSelector = (
    isInput: boolean, 
    currentToken: string, 
    showList: boolean, 
    toggleList: () => void
  ) => (
    <div className="token-selector">
      <div className="token-display" onClick={toggleList}>
        <div className="token-icon-container">
          <img 
            src={TOKEN_ICONS[currentToken as keyof typeof TOKEN_ICONS] || '/tokens/generic-token.svg'} 
            alt={currentToken} 
            className="token-icon" 
          />
        </div>
        <div className="token-symbol">{currentToken}</div>
        <div className="token-dropdown-icon">▼</div>
      </div>
      {showList && (
        <div className="token-dropdown">
          {tokenList.map(token => (
            <div 
              key={token.symbol} 
              className={`token-option ${currentToken === token.symbol ? 'selected' : ''}`}
              onClick={() => {
                handleTokenChange(isInput, token.symbol);
                toggleList();
              }}
            >
              <img 
                src={TOKEN_ICONS[token.symbol as keyof typeof TOKEN_ICONS] || '/tokens/generic-token.svg'} 
                alt={token.symbol} 
                className="token-list-icon" 
              />
              <div className="token-info">
                <div className="token-symbol-name">{token.symbol}</div>
                <div className="token-full-name">{token.name}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const handleSwap = async () => {
    if (!connected || !publicKey) {
      setError('Please connect your wallet before swapping');
      return;
    }

    setIsLoading(true);
    setError('');
    setTransactionSignature('');
    setCurrentStage('confirming');

    try {
      // Prevent swapping same token types
      if (tokenInSymbol === tokenOutSymbol) {
        throw new Error('Cannot swap same tokens');
      }

      // Get PublicKey for input and output tokens
      const inputMint = tokenMap[tokenInSymbol as keyof typeof tokenMap];
      const outputMint = tokenMap[tokenOutSymbol as keyof typeof tokenMap];

      if (!inputMint || !outputMint) {
        throw new Error('Token not supported');
      }

      // Convert input value to number
      const inputAmount = parseFloat(tokenIn);
      if (isNaN(inputAmount) || inputAmount <= 0) {
        throw new Error('Invalid token amount');
      }
      
      // Check if user has enough balance
      if (tokenInBalance !== '--' && parseFloat(tokenInBalance) < inputAmount) {
        throw new Error(`Insufficient ${tokenInSymbol} balance`);
      }

      console.log(`Executing swap ${inputAmount} ${tokenInSymbol} -> ${tokenOutSymbol}`);
      console.log(`Input token: ${inputMint.toString()}`);
      console.log(`Output token: ${outputMint.toString()}`);
      console.log(`Slippage: ${slippage / 100}%`);

      // Execute swap with selected slippage
      const signature = await executeTrade(
        outputMint,
        inputAmount,
        inputMint,
        slippage
      );

      console.log(`Transaction successful: ${signature}`);
      setTransactionSignature(signature);
      setCurrentStage('success');
      
      // Refresh balances after successful swap
      fetchBalances();
    } catch (err: any) {
      console.error('Error swapping:', err);
      
      // Display more detailed error
      let errorMessage = 'An error occurred while swapping tokens';
      if (err.message) {
        // Extract original error message if available
        if (err.message.includes('Swap failed:')) {
          errorMessage = err.message.replace('Swap failed: ', '');
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
      setCurrentStage('error');
    } finally {
      setIsLoading(false);
    }
  };

  // Render slippage menu
  const renderSlippageSettings = () => (
    <div className="slippage-container">
      <div className="slippage-header">
        <span>Slippage Tolerance</span>
        <button 
          className="slippage-close-button" 
          onClick={() => setShowSlippageSettings(false)}
        >
          ×
        </button>
      </div>
      <div className="slippage-options">
        <button 
          className={`slippage-option ${slippage === 10 ? 'active' : ''}`} 
          onClick={() => handleSlippageChange(10)}
        >
          0.1%
        </button>
        <button 
          className={`slippage-option ${slippage === 50 ? 'active' : ''}`} 
          onClick={() => handleSlippageChange(50)}
        >
          0.5%
        </button>
        <button 
          className={`slippage-option ${slippage === 100 ? 'active' : ''}`} 
          onClick={() => handleSlippageChange(100)}
        >
          1.0%
        </button>
        <button 
          className={`slippage-option ${slippage === 300 ? 'active' : ''}`} 
          onClick={() => handleSlippageChange(300)}
        >
          3.0%
        </button>
      </div>
      <div className="slippage-custom">
        <span>Custom:</span>
        <div className="slippage-input-container">
          <input 
            type="number" 
            value={slippage / 100} 
            onChange={(e) => handleSlippageChange(parseFloat(e.target.value) * 100)}
            min="0.1"
            max="10"
            step="0.1"
            className="slippage-input"
          />
          <span className="slippage-input-percent">%</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="swap-container">
      <div className="swap-card">
        <div className="swap-input-container">
          <div className="input-label-row">
            <label>You Pay</label>
            <div className="balance-display">
              Balance: <span className="balance-amount">{loadingBalance ? '...' : tokenInBalance}</span>
              {connected && tokenInBalance !== '--' && parseFloat(tokenInBalance) > 0 && (
                <button onClick={handleUseMax} className="max-button">MAX</button>
              )}
            </div>
          </div>
          <div className="input-container">
            <input 
              type="text" 
              value={tokenIn} 
              onChange={handleTokenInChange} 
              onBlur={handleTokenInBlur}
              placeholder="0.0" 
              className="swap-input"
              disabled={isLoading}
            />
            {renderTokenSelector(
              true, 
              tokenInSymbol, 
              showTokenListIn, 
              () => setShowTokenListIn(!showTokenListIn)
            )}
          </div>
        </div>

        <div className="swap-direction-container">
          <button className="swap-direction-button" onClick={handleSwapPositions} disabled={isLoading}>
            <svg viewBox="0 0 24 24" width="24px" height="24px" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 4L12 20M12 20L6 14M12 20L18 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        <div className="swap-input-container">
          <div className="input-label-row">
            <label>You Receive</label>
            <div className="balance-display">
              Balance: <span className="balance-amount">{loadingBalance ? '...' : tokenOutBalance}</span>
            </div>
          </div>
          <div className="input-container">
            <input 
              type="text" 
              value={quoteLoading ? "Calculating..." : tokenOut} 
              placeholder="0.0" 
              className="swap-input"
              readOnly
            />
            {renderTokenSelector(
              false, 
              tokenOutSymbol, 
              showTokenListOut, 
              () => setShowTokenListOut(!showTokenListOut)
            )}
            <button 
              className="refresh-quote-button-inline" 
              onClick={() => setNeedQuoteUpdate(true)}
              disabled={quoteLoading}
              title="Refresh Quote"
            >
              {quoteLoading ? "⏳" : "🔄"}
            </button>
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}
        
        {transactionSignature && (
          <div className="success-message">
            <div className="success-icon">✓</div>
            <div className="success-text">
              <span>Transaction Successful!</span>
              <a 
                href={`https://explorer.solana.com/tx/${transactionSignature}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="explorer-link"
              >
                View on Explorer
              </a>
            </div>
          </div>
        )}

        <button 
          onClick={handleSwap} 
          className={`swap-button ${isLoading ? 'loading' : ''} ${!connected ? 'not-connected' : ''}`}
          disabled={isLoading || !connected || tokenInSymbol === tokenOutSymbol || !tokenIn || parseFloat(tokenIn) <= 0 || (tokenInBalance !== '--' && parseFloat(tokenInBalance) < parseFloat(tokenIn) && !(tokenInSymbol === 'SOL' && (parseFloat(tokenIn) - parseFloat(tokenInBalance) < 0.001)))}
        >
          {!connected 
            ? 'Connect Wallet' 
            : isLoading 
              ? 'Processing...' 
              : tokenInSymbol === tokenOutSymbol 
                ? 'Cannot swap same tokens' 
                : tokenInBalance !== '--' && parseFloat(tokenInBalance) < parseFloat(tokenIn) && 
                  !(tokenInSymbol === 'SOL' && (parseFloat(tokenIn) - parseFloat(tokenInBalance) < 0.001))
                  ? `Insufficient ${tokenInSymbol} balance`
                  : `Swap ${tokenInSymbol} to ${tokenOutSymbol}`}
        </button>
      </div>

      <div className="swap-info">
        <div className="info-row">
          <span className="info-label">Rate</span>
          <span className="info-value">1 {tokenInSymbol} ≈ {exchangeRate} {tokenOutSymbol}</span>
        </div>
        <div className="info-row">
          <span className="info-label">Slippage</span>
          <div className="info-value-with-settings">
            <span className="info-value">{slippage / 100}%</span>
            <button className="settings-button" onClick={() => setShowSlippageSettings(!showSlippageSettings)}>
              ⚙️
            </button>
          </div>
        </div>
        {priceImpact !== null && (
          <div className="info-row">
            <span className="info-label">Price Impact</span>
            <span className={`info-value ${priceImpact > 3 ? 'high-impact' : priceImpact > 1 ? 'medium-impact' : ''}`}>
              {priceImpact.toFixed(2)}%
            </span>
          </div>
        )}
      </div>

      {showSlippageSettings && renderSlippageSettings()}
    </div>
  );
};

export default Swap;