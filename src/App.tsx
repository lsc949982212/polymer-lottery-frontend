import { useEffect, useState } from "react";
import { message, Button } from 'antd';
import Web3 from 'web3';
import BigNumber from 'bignumber.js';
import { ABI, OP_PORT_ADDRESS, BASE_PORT_ADDRESS, OP_BASE_LOTTERY_POOL_ADDRESS } from "./config";
import './App.css';


function App() {

  const [metamaskConnected, setMetamaskConnected] = useState<boolean>(false);
  const [chainId, setChainId] = useState<string>('');
  const [account, setAccount] = useState<string>('');
  const [opBalance, setOpBalance] = useState<any>(0);
  const [baseBalance, setBaseBalance] = useState<any>(0);
  const [opLotteryPoolBalance, setOpLotteryPoolBalance] = useState<any>(0);
  const [baseLotteryPoolBalance, setBaseLotteryPoolBalance] = useState<any>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [symbol, setSymbol] = useState<string>('');

  useEffect(() => {
    const fetchData = async () => {
      if (typeof (window as any).ethereum !== 'undefined') {
        if ((window as any).ethereum.isConnected()) {
          const accounts = await (window as any).ethereum.request({ method: 'eth_accounts' })
          if (accounts && accounts.length > 0) {
            setAccount(accounts[0]);
            setMetamaskConnected(true);
            getBalances(accounts[0]);
          }

        }
      }
    };
    fetchData();
    setTimeout(getChainId, 100);
  }, [])
  const connectWallet = async () => {
    try {
      if (isLoading) return;
      await (window as any).ethereum.enable();
      const accounts = await new Web3((window as any).ethereum).eth.getAccounts();
      const chainId = await (window as any).ethereum.request({ method: 'eth_chainId' });
      setChainId(chainId);
      (window as any).ethereum.on('chainChanged', (chainId: string) => {
        console.log('chainChanged', chainId);
        setChainId(chainId);
      });
      setAccount(accounts[0])
      setMetamaskConnected(true);
      getBalances(accounts[0]);
    } catch (error) {
      console.error('connect wallet error', error);
    }
  }
  const getChainId = async () => {
    if (typeof (window as any).ethereum !== 'undefined') {
      if ((window as any).ethereum.isConnected()) {
        const chainId = await (window as any).ethereum.request({ method: 'eth_chainId' });
        setChainId(chainId);
        (window as any).ethereum.on('chainChanged', (chainId: string) => {
          console.log('chain id', chainId);
          setChainId(chainId);
        });
      }
    }
  };

  const getBalances = async (account: string, isQuery?: boolean) => {
    try {
      const contract = new (new Web3('https://sepolia.optimism.io')).eth.Contract(ABI, OP_PORT_ADDRESS);
      console.log('account', account)
      const balance = await contract.methods.balanceOf(
        account,
      ).call();

      const lotteryPoolBalance = await contract.methods.balanceOf(
        OP_BASE_LOTTERY_POOL_ADDRESS,
      ).call();
      const symbol: any = await contract.methods.symbol().call();
      console.log('balance', balance)
      setSymbol(symbol);
      let bigNumber = new BigNumber(Number(balance));
      let result = bigNumber.dividedBy('1e18');

      if (isQuery) {
        const n = Number(result.toString()) - Number(opBalance);
        console.log('=====', n)
        if (n > 0) {
          message.success(`Congratulations on winning ${n} ${symbol}`)
        } else {
          message.warning('Please try harder');
        }

      }
      setOpBalance(result.toString());
      let b = new BigNumber(Number(lotteryPoolBalance));
      let r = b.dividedBy('1e18');
      setOpLotteryPoolBalance(r.toString())
    } catch (error) {
      console.error(error);
    }
    try {
      const contract = new (new Web3('https://sepolia.base.org')).eth.Contract(ABI, BASE_PORT_ADDRESS);
      const balance = await contract.methods.balanceOf(
        account,
      ).call();
      const lotteryPoolBalance = await contract.methods.balanceOf(
        OP_BASE_LOTTERY_POOL_ADDRESS,
      ).call();
      let bigNumber = new BigNumber(Number(balance));
      let result = bigNumber.dividedBy('1e18');
      setBaseBalance(result.toString());
      let b = new BigNumber(Number(lotteryPoolBalance));
      let r = b.dividedBy('1e18');
      setBaseLotteryPoolBalance(r.toString());
    } catch (error) {
      console.error(error);
    }


  }

  const scratchLottery = async () => {
    try {
      if (isLoading) return;
      if (chainId !== '0xaa37dc') {
        await (window as any).ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0xaa37dc' }],
        });
      }
      const web3 = new Web3((window as any).ethereum);
      await (window as any).ethereum.enable();
      const accounts = await web3.eth.getAccounts();
      const myAccount = accounts[0];
      const contract = new web3.eth.Contract(ABI, OP_PORT_ADDRESS);
      const channel = web3.utils.padRight(web3.utils.asciiToHex("channel-10"), 64);
      setIsLoading(true);
      const res = await contract.methods.scratchLottery(
        BASE_PORT_ADDRESS,
        channel,
      ).send({ from: myAccount });
      console.log('-----', res)
      setTimeout(() => {
        setIsLoading(false);
        getBalances(myAccount, true)
      }, 36000)

    } catch (error) {
      setIsLoading(false);
      message.error(`scratch failed, ${(error as any).message}`);
      console.error(error);
    }
  }

  useEffect(() => {
    const listenToLotteryScratchedEvent = async () => {
      try {
        const contract = new (new Web3('https://sepolia.optimism.io')).eth.Contract(ABI, OP_PORT_ADDRESS);
        console.log('start listen events')
        contract.events.LotteryScratched({})
          .on('data', (event: any) => {
            console.log('Lottery Scratched:', event.returnValues.amount);
            // Handle the event data here
          })
        /* .on('error', (error: any) => {
          console.error('Error listening to LotteryScratched event:', error);
        }); */
      } catch (error) {
        console.error('Error setting up event listener:', error);
      }
    };

    if (account) setTimeout(listenToLotteryScratchedEvent, 200);
  }, [account]);

  return (
    <div className="body">
      <div className='header'>
        {metamaskConnected ?
          (<span className='header-top'>
            <img src='https://owlto.finance/assets/Metamask-f899f9fb.png' alt='ethereum' className='header-top-image' />
            {account && (`${account.substring(0, 6)}...${account.substring(account.length - 4)}`)}</span>) :
          (<Button type='primary' loading={isLoading} onClick={connectWallet}>
            Connect Wallet
          </Button>)}

      </div>
      <div className='content'>
        <div className='content-body'>
          <div className='content-body-content'>
            <span>
              optimism lottery pool balance: {opLotteryPoolBalance} {symbol}
            </span>
            <span>
              base lottery pool balance: {baseLotteryPoolBalance} {symbol}
            </span>
            <span>
              optimism balance: {opBalance} {symbol}
            </span>
            <span>
              base balance: {baseBalance} {symbol}
            </span>
          </div>
          <Button type='primary' style={{ width: '100%' }} loading={isLoading} onClick={metamaskConnected ? scratchLottery : connectWallet}>
            {metamaskConnected ? 'Scratch Lottery' : 'Connect Wallet'}
          </Button>

        </div>
      </div>
    </div>
  );
}

export default App;

