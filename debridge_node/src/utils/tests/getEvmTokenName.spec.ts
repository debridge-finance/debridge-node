import { getEvmTokenName } from '../getEvmTokenName';
import Web3 from 'web3';
import * as console from 'node:console';
import { Logger } from '@nestjs/common';

const logger = console as unknown as Logger;

describe('getEvmTokenSymbol()', () => {
  it('returns name for normal token', async () => {
    const web3 = new Web3('https://rpc.payload.de');
    const name = await getEvmTokenName(logger, web3, '0xdac17f958d2ee523a2206206994597c13d831ec7');
    expect(name).toBe('Tether USD');
  });

  it('returns name for DS token', async () => {
    const web3 = new Web3('https://rpc.payload.de');
    const name = await getEvmTokenName(logger, web3, '0x8e0E57DCb1ce8d9091dF38ec1BfC3b224529754A');
    expect(name).toBe('Moon Tropica');
  });

  it('returns name "" for tokens without name', async () => {
    const web3 = new Web3('https://rpc.payload.de');
    const name = await getEvmTokenName(logger, web3, '0xeF4fB24aD0916217251F553c0596F8Edc630EB66');
    expect(name).toBe('');
  });

  it('throw error if web3 connection is failed', async () => {
    const web3 = new Web3('https://rpc.payload.de1');
    await expect(getEvmTokenName(logger, web3, '0xeF4fB24aD0916217251F553c0596F8Edc630EB66')).rejects.toThrowError(Error);
  });
});
