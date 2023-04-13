import { SolanaEvent, TransformService } from '../TransformService';
import { ChainConfigService } from '../../../config/services/ChainConfigService';
import { SubmissionEntity } from '../../../../../entities/SubmissionEntity';

describe('TransformService', () => {
  let transformService: TransformService;
  //const configServiceMock = {};
  const chainConfigServiceMock = {
    getSolanaChainId: jest.fn(() => 1),
  };

  beforeEach(() => {
    transformService = new TransformService(chainConfigServiceMock as unknown as ChainConfigService);
    //transformService = new TransformService(configServiceMock as ConfigService, chainConfigServiceMock as unknown as ChainConfigService);
  });

  describe('generateSubmissionFromSolanaEvent', () => {
    it('should generate submission from Solana event', () => {
      const solanaEvent = {
        submissionId: 123,
        transactionHash: 'abc',
        chainToId: 2,
        receiver: 'xyz',
        amount: 100,
        bridgeId: 456,
        nonce: 789,
        slotNumber: 10,
        decimalDenominator: 1,
      } as unknown as SolanaEvent;
      const submission = transformService.generateSubmissionFromSolanaEvent(solanaEvent);
      expect(submission).toBeInstanceOf(SubmissionEntity);
      expect(submission.submissionId).toBe(solanaEvent.submissionId);
      expect(submission.txHash).toBe(solanaEvent.transactionHash);
      expect(submission.chainFrom).toBe(1);
      expect(submission.chainTo).toBe(solanaEvent.chainToId);
      expect(submission.receiverAddr).toBe(solanaEvent.receiver);
      expect(submission.amount).toBe(solanaEvent.amount);
      expect(submission.rawEvent).toBe(JSON.stringify(solanaEvent));
      expect(submission.debridgeId).toBe(solanaEvent.bridgeId);
      expect(submission.nonce).toBe(solanaEvent.nonce);
      expect(submission.blockNumber).toBe(solanaEvent.slotNumber);
      expect(submission.status).toBe(1);
      expect(submission.ipfsStatus).toBe(1);
      expect(submission.apiStatus).toBe(1);
      expect(submission.decimalDenominator).toBe(solanaEvent.decimalDenominator);
      expect(submission.assetsStatus).toBe(1);
      expect(submission.bundlrStatus).toBe(1);
    });
  });

  describe('generateSubmissionFromSentEvent', () => {
    it('should generate submission from sent event', () => {
      const sendEvent = {
        returnValues: {
          submissionId: 123,
          chainIdFrom: 1,
          chainIdTo: 2,
          debridgeId: 456,
          receiver: 'xyz',
          amount: 100,
          nonce: '789',
        },
        transactionHash: 'abc',
        blockNumber: 10,
      };
      const submission = transformService.generateSubmissionFromSentEvent(sendEvent);
      //expect(submission).toBeInstanceOf(SubmissionEntity);
      expect(submission.submissionId).toBe(sendEvent.returnValues.submissionId);
      expect(submission.txHash).toBe(sendEvent.transactionHash);
      expect(submission.chainFrom).toBe(sendEvent.returnValues.chainIdFrom);
      expect(submission.chainTo).toBe(sendEvent.returnValues.chainIdTo);
      expect(submission.debridgeId).toBe(sendEvent.returnValues.debridgeId);
      expect(submission.receiverAddr).toBe(sendEvent.returnValues.receiver);
      expect(submission.amount).toBe(sendEvent.returnValues.amount);
      expect(submission.status).toBe(1);
      expect(submission.ipfsStatus).toBe(1);
      expect(submission.apiStatus).toBe(1);
      expect(submission.assetsStatus).toBe(1);
      expect(submission.bundlrStatus).toBe(1);
      expect(submission.rawEvent).toBe(JSON.stringify(sendEvent));
    });
  });
});
