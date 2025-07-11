import { IAction } from './IAction';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { SubmissionEntity } from '../../../../entities/SubmissionEntity';
import { ConfirmNewAssetEntity } from '../../../../entities/ConfirmNewAssetEntity';
import { SubmisionStatusEnum } from '../../../../enums/SubmisionStatusEnum';
import { UploadStatusEnum } from '../../../../enums/UploadStatusEnum';
import { SubmisionAssetsStatusEnum } from '../../../../enums/SubmisionAssetsStatusEnum';
import { abi as deBridgeGateAbi } from '../../../../assets/DeBridgeGate.json';
import { abi as ERC20Abi } from '../../../../assets/ERC20.json';
import { readFileSync } from 'fs';
import { Account } from 'web3-core';
import { Web3Service } from '../../../web3/services/Web3Service';
import { ChainConfigService } from '../../../chain/config/services/ChainConfigService';
import { EvmChainConfig } from '../../../chain/config/models/configs/EvmChainConfig';
import { BundlrStatusEnum } from '../../../../enums/BundlrStatusEnum';
import { SolanaEventsReaderService } from '../../../solana-events-reader/services/SolanaEventsReaderService';
import { SolanaGrpcClient, U256Converter } from '@debridge-finance/solana-grpc';
import { createSolanaPublicKey } from '../../../../utils/createSolanaPublicKey';
import { getEvmTokenName } from '../../../../utils/getEvmTokenName';
import { getEvmTokenSymbol } from '../../../../utils/getEvmTokenSymbol';

@Injectable()
export class CheckAssetsEventAction extends IAction {
  readonly #account: Account;
  readonly #solanaGrpcClient: SolanaGrpcClient;

  constructor(
    @InjectRepository(SubmissionEntity)
    private readonly submissionsRepository: Repository<SubmissionEntity>,
    @InjectRepository(ConfirmNewAssetEntity)
    private readonly confirmNewAssetEntityRepository: Repository<ConfirmNewAssetEntity>,
    private readonly web3Service: Web3Service,
    private readonly chainConfigService: ChainConfigService,
    private readonly solanaEventsReaderService: SolanaEventsReaderService,
  ) {
    super();
    this.#solanaGrpcClient = this.solanaEventsReaderService.getClient();
    this.logger = new Logger(CheckAssetsEventAction.name);
    this.#account = this.web3Service.web3().eth.accounts.decrypt(JSON.parse(readFileSync('./keystore.json', 'utf-8')), process.env.KEYSTORE_PASSWORD);
  }

  async process() {
    this.logger.log(`Check assets event`);
    const submissions = await this.submissionsRepository.find({
      where: {
        assetsStatus: SubmisionAssetsStatusEnum.NEW,
      },
    });

    const newSubmitionIds = [];
    const assetsWasCreatedSubmitions = [];

    for (const submission of submissions) {
      if (!submission.debridgeId) {
        continue;
      }
      const confirmNewAction = await this.confirmNewAssetEntityRepository.findOne({
        where: {
          debridgeId: submission.debridgeId,
        },
      });
      if (!confirmNewAction) {
        try {
          this.logger.log(`Process debridgeId: ${submission.debridgeId}`);
          const chainFromConfig = this.chainConfigService.get(submission.chainFrom) as EvmChainConfig;
          let tokenName;
          let tokenSymbol;
          let tokenDecimals;
          let nativeChainId;
          let nativeTokenAddress;

          // if chainFrom is Solana
          if (chainFromConfig.isSolana) {
            const { response: bridgeInfo } = await this.#solanaGrpcClient.getBridgeInfoByBridgeId(Buffer.from(submission.debridgeId.slice(2), 'hex'));
            nativeChainId = parseInt(U256Converter.toBigInt(bridgeInfo.nativeChainId).toString());
            nativeTokenAddress = '0x' + Buffer.from(bridgeInfo.nativeTokenAddress).toString('hex');

            //if native chain for token is EVM network
            const nativeChainConfig = this.chainConfigService.get(nativeChainId);
            if (nativeChainConfig.isSolana) {
              const { response } = await this.#solanaGrpcClient.getTokenMetadata(createSolanaPublicKey(bridgeInfo.nativeTokenAddress));
              tokenName = response.name;
              tokenSymbol = response.symbol;
              tokenDecimals = response.decimals;
            }
            //if native chain for token is EVM network
            else {
              ({ tokenName, tokenSymbol, tokenDecimals } = await this.#getEvmTokenInfo(nativeChainId, nativeTokenAddress));
            }
            // if chainFrom is EVM
          } else {
            const web3 = await this.web3Service.web3HttpProvider(chainFromConfig);
            const deBridgeGateInstance = new web3.eth.Contract(deBridgeGateAbi as any, chainFromConfig.debridgeAddr);
            // struct DebridgeInfo {
            //   uint256 chainId; // native chain id
            //   uint256 maxAmount; // maximum amount to transfer
            //   uint256 balance; // total locked assets
            //   uint256 lockedInStrategies; // total locked assets in strategy (AAVE, Compound, etc)
            //   address tokenAddress; // asset address on the current chain
            //   uint16 minReservesBps; // minimal hot reserves in basis points (1/10000)
            //   bool exist;
            // }
            const debridgeInfo = await deBridgeGateInstance.methods.getDebridge(submission.debridgeId).call();
            this.logger.log(JSON.stringify(debridgeInfo));
            nativeChainId = debridgeInfo.chainId;

            // struct TokenInfo {
            //   uint256 nativeChainId;
            //   bytes nativeAddress;
            // }
            const nativeTokenInfo = await deBridgeGateInstance.methods.getNativeInfo(debridgeInfo.tokenAddress).call();
            this.logger.log(JSON.stringify(nativeTokenInfo));
            nativeTokenAddress = nativeTokenInfo.nativeAddress;
            //if native chain for token is Solana network
            if (this.chainConfigService.get(nativeChainId).isSolana) {
              const { response } = await this.#solanaGrpcClient.getTokenMetadata(createSolanaPublicKey(nativeTokenAddress));
              tokenName = response.name;
              tokenSymbol = response.symbol;
              tokenDecimals = response.decimals;
            }
            //if native chain for token is EVM network
            else {
              ({ tokenName, tokenSymbol, tokenDecimals } = await this.#getEvmTokenInfo(nativeTokenInfo.nativeChainId, nativeTokenInfo.nativeAddress));
            }
          }

          const prefix = 2;

          const nameKeccak = this.web3Service.web3().utils.soliditySha3Raw({ t: 'string', v: tokenName });
          const symbolKeccak = this.web3Service.web3().utils.soliditySha3Raw({ t: 'string', v: tokenSymbol });

          const deployId = this.web3Service
            .web3()
            .utils.soliditySha3Raw(
              { t: 'uint256', v: prefix },
              { t: 'bytes32', v: submission.debridgeId },
              { t: 'bytes32', v: nameKeccak },
              { t: 'bytes32', v: symbolKeccak },
              { t: 'uint8', v: tokenDecimals },
            );
          this.logger.log(`prefix: ${prefix}`);
          this.logger.log(`tokenName: ${tokenName}`);
          this.logger.log(`tokenSymbol: ${tokenSymbol}`);
          this.logger.log(`tokenDecimals: ${tokenDecimals}`);
          this.logger.log(`deployId: ${deployId}`);
          const signature = this.#account.sign(deployId).signature;
          this.logger.log(`signature: ${signature}`);
          this.logger.log(`signed ${deployId} ${signature}`);

          await this.confirmNewAssetEntityRepository.save({
            debridgeId: submission.debridgeId,
            submissionTxHash: submission.txHash,
            nativeChainId: nativeChainId,
            tokenAddress: nativeTokenAddress,
            name: tokenName,
            symbol: tokenSymbol,
            decimals: tokenDecimals,
            submissionChainFrom: submission.chainFrom,
            submissionChainTo: submission.chainTo,
            status: SubmisionStatusEnum.SIGNED,
            ipfsStatus: UploadStatusEnum.NEW,
            apiStatus: UploadStatusEnum.NEW,
            bundlrStatus: BundlrStatusEnum.NEW,
            signature: signature,
            deployId: deployId,
          } as ConfirmNewAssetEntity);
          newSubmitionIds.push(submission.submissionId);
        } catch (e) {
          this.logger.error(`Error processing ${submission.submissionId} ${e.message}`);
          this.logger.error(e);
        }
      } else {
        assetsWasCreatedSubmitions.push(submission.submissionId);
      }
    }

    if (newSubmitionIds.length > 0) {
      await this.submissionsRepository.update(
        {
          submissionId: In(newSubmitionIds),
        },
        {
          assetsStatus: SubmisionAssetsStatusEnum.ASSETS_CREATED,
        },
      );
    }
    if (assetsWasCreatedSubmitions.length > 0) {
      await this.submissionsRepository.update(
        {
          submissionId: In(assetsWasCreatedSubmitions),
        },
        {
          assetsStatus: SubmisionAssetsStatusEnum.ASSETS_ALREADY_CREATED,
        },
      );
    }
    this.logger.log(`Finish Check assets event`);
  }

  async #getEvmTokenInfo(chainId: number, tokenAddress: string) {
    const tokenChainDetail = this.chainConfigService.get(chainId) as EvmChainConfig;
    const tokenWeb3 = await this.web3Service.web3HttpProvider(tokenChainDetail);
    const nativeTokenInstance = new tokenWeb3.eth.Contract(ERC20Abi as any, tokenAddress);
    const [tokenDecimals, tokenName, tokenSymbol] = await Promise.all([
      nativeTokenInstance.methods.decimals().call(),
      getEvmTokenName(this.logger, tokenWeb3, tokenAddress),
      getEvmTokenSymbol(this.logger, tokenWeb3, tokenAddress),
    ]);
    return { tokenName, tokenSymbol, tokenDecimals };
  }
}
