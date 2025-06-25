import { abi as ERC20Abi } from './../assets/ERC20.json';
import { abi as DSTokenAbi } from './../assets/DSToken.json';
import Web3 from 'web3';
import { Logger } from '@nestjs/common';

const getDSTokenSymbol = async (web3: Web3, tokenAddress: string): Promise<string> => {
  const contract = new web3.eth.Contract(DSTokenAbi as any, tokenAddress);
  const symbol: string = await contract.methods.symbol().call();
  const formattedSymbol = web3.utils.hexToUtf8(symbol);

  return formattedSymbol;
};

export const getEvmTokenSymbol = async (logger: Logger, web3: Web3, tokenAddress: string): Promise<string> => {
  const contract = new web3.eth.Contract(ERC20Abi as any, tokenAddress);
  try {
    return await contract.methods.symbol().call();
  } catch (e) {
    if (e.message.includes('NUMERIC_FAULT')) {
      logger.warn(`${tokenAddress} has symbol in bytes`);
      return await getDSTokenSymbol(web3, tokenAddress);
    }

    throw e;
  }
};
