import Web3 from 'web3';
import * as console from 'node:console';
import { getEvmTokenSymbol } from '../getEvmTokenSymbol';
import { Logger } from '@nestjs/common';

const logger = console as unknown as Logger;

describe('getEvmTokenSymbol()', () => {
  it('returns symbol for normal token', async () => {
    const web3 = new Web3('https://rpc.payload.de');
    const name = await getEvmTokenSymbol(logger, web3, '0xdac17f958d2ee523a2206206994597c13d831ec7');
    expect(name).toBe('USDT');
  });

  it('returns symbol for DS token', async () => {
    const web3 = new Web3('https://rpc.payload.de');
    const name = await getEvmTokenSymbol(logger, web3, '0x8e0E57DCb1ce8d9091dF38ec1BfC3b224529754A');
    expect(name).toBe('CAH');
  });

  it('throw error if web3 connection is failed', async () => {
    const web3 = new Web3('https://rpc.payload.de1');
    await expect(getEvmTokenSymbol(logger, web3, '0xeF4fB24aD0916217251F553c0596F8Edc630EB66')).rejects.toThrowError(Error);
  });
});
