import { Injectable, Logger } from '@nestjs/common';
import { SubmissionEntity } from '../../../../entities/SubmissionEntity';
import { U256Converter } from '@debridge-finance/solana-grpc';
import { abi as deBridgeGateAbi } from '../../../../assets/DeBridgeGate.json';
import { ChainConfigService } from '../../../chain/config/services/ChainConfigService';
import { Web3Service } from '../../../web3/services/Web3Service';
import { EvmChainConfig } from '../../../chain/config/models/configs/EvmChainConfig';
import { SolanaEventsReaderService } from '../../../solana-events-reader/services/SolanaEventsReaderService';

@Injectable()
export class DebridgeValidationService {
  readonly #logger = new Logger(DebridgeValidationService.name);

  readonly #chainConfigService: ChainConfigService;
  readonly #web3Service: Web3Service;
  readonly #solanaEventsReaderService: SolanaEventsReaderService;

  constructor(chainConfigService: ChainConfigService, web3Service: Web3Service, solanaEventsReaderService: SolanaEventsReaderService) {
    this.#chainConfigService = chainConfigService;
    this.#web3Service = web3Service;
    this.#solanaEventsReaderService = solanaEventsReaderService;
  }

  /**
   * Checks if the chainTo in the submission is equal to the nativeChainId of the token
   * @param submission The submission entity to validate
   * @returns True if chainTo equals nativeChainId, false otherwise
   */
  async isReturnToNativeChain(submission: SubmissionEntity): Promise<boolean> {
    try {
      const nativeChainId = await this.#getNativeChainId(submission);

      // Compare chainTo with nativeChainId
      const isValid = submission.chainTo === nativeChainId;

      return isValid;
    } catch (error) {
      this.#logger.error(`Error validating return native chain for submission ${submission.submissionId}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Checks if the chainFrom in the submission is different from the nativeChainId of the token
   * @param submission The submission entity to validate
   * @returns True if chainFrom is different from nativeChainId, false otherwise
   */
  async isDeAssetTransfer(submission: SubmissionEntity): Promise<boolean> {
    try {
      const nativeChainId = await this.#getNativeChainId(submission);

      // Compare chainFrom with nativeChainId
      const isValid = submission.chainFrom !== nativeChainId;

      return isValid;
    } catch (error) {
      this.#logger.error(`Error validating DeAsset transfer for submission ${submission.submissionId}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Retrieves the native chain ID for a given submission
   * @param submission The submission entity
   * @returns The native chain ID of the token
   */
  async #getNativeChainId(submission: SubmissionEntity): Promise<number> {
    const chainFromConfig = this.#chainConfigService.get(submission.chainFrom);
    let nativeChainId: number;

    // Get nativeChainId based on the chain type (Solana or EVM)
    if (chainFromConfig.isSolana) {
      // For Solana chains
      const { response: bridgeInfo } = await this.#solanaEventsReaderService
        .getClient()
        .getBridgeInfoByBridgeId(Buffer.from(submission.debridgeId.slice(2), 'hex'));
      nativeChainId = parseInt(U256Converter.toBigInt(bridgeInfo.nativeChainId).toString());
    } else {
      // For EVM chains
      const evmChainConfig = chainFromConfig as EvmChainConfig;
      const web3 = await this.#web3Service.web3HttpProvider(evmChainConfig);
      const deBridgeGateInstance = new web3.eth.Contract(deBridgeGateAbi as any, evmChainConfig.debridgeAddr);
      const debridgeInfo = await deBridgeGateInstance.methods.getDebridge(submission.debridgeId).call();
      nativeChainId = Number(debridgeInfo.chainId.toString());
    }

    return nativeChainId;
  }
}
