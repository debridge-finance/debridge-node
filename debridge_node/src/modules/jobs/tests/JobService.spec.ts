import { JobService } from '../JobService';

describe('JobService', () => {
  let jobService: JobService;
  let signAction: any;
  let uploadToApiAction: any;
  let checkAssetsEventAction: any;
  let statisticToApiAction: any;
  let uploadToBundlrAction: any;

  beforeEach(() => {
    // Create mock instances of the action classes
    signAction = { action: jest.fn() };
    uploadToApiAction = { action: jest.fn() };
    checkAssetsEventAction = { action: jest.fn() };
    statisticToApiAction = { action: jest.fn() };
    uploadToBundlrAction = { action: jest.fn() };

    // Instantiate the JobService class with the mock action classes
    jobService = new JobService(signAction, uploadToApiAction, checkAssetsEventAction, statisticToApiAction, uploadToBundlrAction);
  });

  describe('Sign()', () => {
    test('calls signAction.action()', async () => {
      await jobService.Sign();
      expect(signAction.action).toHaveBeenCalled();
    });
  });

  describe('UploadToApiAction()', () => {
    test('calls uploadToApiAction.action()', async () => {
      await jobService.UploadToApiAction();
      expect(uploadToApiAction.action).toHaveBeenCalled();
    });
  });

  describe('checkAssetsEvent()', () => {
    test('calls checkAssetsEventAction.action()', async () => {
      await jobService.checkAssetsEvent();
      expect(checkAssetsEventAction.action).toHaveBeenCalled();
    });
  });

  describe('UploadStatisticToApiAction()', () => {
    test('calls statisticToApiAction.action()', async () => {
      await jobService.UploadStatisticToApiAction();
      expect(statisticToApiAction.action).toHaveBeenCalled();
    });
  });

  describe('UploadToBundlr()', () => {
    test('calls uploadToBundlrAction.action()', async () => {
      await jobService.UploadToBundlr();
      expect(uploadToBundlrAction.action).toHaveBeenCalled();
    });
  });
});
