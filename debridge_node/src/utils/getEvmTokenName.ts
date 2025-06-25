import { abi as ERC20Abi } from './../assets/ERC20.json';
import { abi as DSTokenAbi } from './../assets/DSToken.json';
import Web3 from 'web3';
import { Logger } from '@nestjs/common';

const getDSTokenName = async (web3: Web3, tokenAddress: string): Promise<string> => {
  const contract = new web3.eth.Contract(DSTokenAbi as any, tokenAddress);
  const name: string = await contract.methods.name().call();
  const formattedName = Buffer.from(name.slice(2), 'hex')
    .toString('utf-8')
    // eslint-disable-next-line no-control-regex
    .replace(/\u0000/g, '');

  return formattedName;
};

export const getEvmTokenName = async (logger: Logger, web3: Web3, tokenAddress: string): Promise<string> => {
  const contract = new web3.eth.Contract(ERC20Abi as any, tokenAddress);
  try {
    return await contract.methods.name().call();
  } catch (e) {
    if (e.message === 'Returned error: execution reverted') {
      logger.warn(`${tokenAddress} has not name`);
      return '';
    }
    if (e.message.includes('NUMERIC_FAULT')) {
      logger.warn(`${tokenAddress} has name in bytes`);
      return await getDSTokenName(web3, tokenAddress);
    }

    throw e;
  }
};
