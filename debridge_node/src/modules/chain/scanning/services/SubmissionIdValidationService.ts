import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { SubmissionEntity } from '../../../../entities/SubmissionEntity';
import { buildSubmissionId } from '../../../../utils/buildSubmissionId';
import { Web3Custom } from '../../../web3/services/Web3Service';
import { ChainConfig } from '../../config/models/configs/ChainConfig';
import { DebrdigeApiService } from '../../../external/debridge_api/services/DebrdigeApiService';
import { EvmChainConfig } from '../../config/models/configs/EvmChainConfig';
import { ChainScanningService } from './ChainScanningService';

type Status =
  | {
      status: true;
    }
  | {
      status: false;
    }
  | {
      status: false;
      calculatedSubmissionId: string;
    };

@Injectable()
export class SubmissionIdValidationService {
  private readonly logger = new Logger(SubmissionIdValidationService.name);
  private readonly attemptsByChainId = new Map<number, number>();

  constructor(
    private readonly debridgeApiService: DebrdigeApiService,
    @Inject(forwardRef(() => ChainScanningService))
    private readonly chainScanningService: ChainScanningService,
  ) {}

  validate(submission: SubmissionEntity): Status {
    try {
      if (this.oldSubmissions.includes(submission.submissionId)) {
        this.logger.log(`Submission ${submission.submissionId} is one of old`);
        this.attemptsByChainId.set(submission.chainFrom, 0);
        return {
          status: true,
        };
      }
      const calculatedSubmissionId = buildSubmissionId(submission);
      const status = submission.submissionId === calculatedSubmissionId;
      if (status) {
        this.attemptsByChainId.set(submission.chainFrom, 0);
      } else {
        const currentAttempt = Number(this.attemptsByChainId.get(submission.chainFrom) || 0);
        this.attemptsByChainId.set(submission.chainFrom, currentAttempt + 1);
      }

      this.logger.log(
        `SubmissionId validation for submission ${submission.submissionId} has status ${status}: calculatedSubmissionId: ${calculatedSubmissionId}`,
      );

      return {
        calculatedSubmissionId,
        status,
      };
    } catch (e) {
      this.logger.error(`Error in submission validation: ${e}`);
      this.logger.log(`Incorrect submission id: ${submission.submissionId}`);
      return {
        status: false,
      };
    }
  }

  async processValidationSubmissionIdError(
    web3: Web3Custom,
    chain: ChainConfig,
    submissionId: string,
    calculatedSubmissionId?: string,
  ): Promise<void> {
    this.logger.error(`incorrect submissionId: ${submissionId}, correctSubmissionId: ${calculatedSubmissionId}`);
    if (!chain.isSolana) {
      (chain as EvmChainConfig).providers.setProviderStatus(web3.chainProvider, false);
    }
    const attempts = Number(this.attemptsByChainId.get(chain.chainId) || 0);
    if (attempts > chain.maxAttemptsSubmissionIdCalculation) {
      this.chainScanningService.pause(chain.chainId);
      await this.debridgeApiService.notifyError(
        `Chain ${chain.chainId} scanning is stopped(incorrect submissionId: ${submissionId}, correctSubmissionId: ${calculatedSubmissionId})`,
      );
    } else {
      await this.debridgeApiService.notifyError(`incorrect submissionId: ${submissionId}, correctSubmissionId: ${calculatedSubmissionId}`);
    }
  }

  private readonly oldSubmissions: string[] = [
    '0xc9fd73921e482deeff3aeef6feace164b7b67bff35a57475b4ce6398fe17ce0d',
    '0xf0d57350a083419e03d5c78084bf228d2a966b2336fa0d0e5d071b608571e47b',
    '0x4ffa5caf098b4390b9c29381edb7c991fd9089a8f37448a5bf4aaa0bf187dc36',
    '0x0d6d50f0add1af62f24ad27207b292bd1f4c557c8b7d338f21b5c45b410f09b8',
    '0x8035c75cdda8d49cb2707d2a95ae392d8450446d99619ae4ee6ad39c3c0e8934',
    '0xfda4cff2b4e0884fb4d38bb8a3a8bfb7925dbe697d467ac137eeaf5812760317',
    '0x639638dd5d134b98720af81af65806608864d875b2ff25b971baf4b6c0b2c341',
    '0x7f83e82a0c22b7b5f49adc2a607c095c9bc6d111c35cf663e89eda71f87408a9',
    '0x4efe00b3f9636db797137e42958749d7e86ce96d498c639c747b407de961c6ef',
    '0xf93861ae18f2957b4e11fa98ee9f74f23b007ddfc49ff20de0b9eefc128f8653',
    '0x33e73e1fafb72b0f3deb5dd6132b057945779bb7ee4f1d6f3d037504ee7c4326',
    '0x458870c9a9b971c97924c0240317f44dedc26663e60d6ed8fb2722f70b3ee7eb',
    '0x9ccbed26a0621d8e251a2e25124f1487eb2ff0d98070db9b2e84bf1647ec9bd7',
    '0xcdd10bdab44dee6f5f1b739f8ecdccfe6cc4e7c8ea7974e056f8fcdc04c6e10e',
    '0xe6451ad3713e11f650c39c89febbc2c0b95706b5820e19cc484fbe0cb04eebbe',
    '0x9b4afe3b3d480e135124b90d627c55de2139a845fc7ee67e8a1091767c5609e8',
    '0x6480bd205a82c06f388d0b95f27a02a81716ac4747cc2acbe94f1cb4329e0a20',
    '0xec91e968df0b418a9c3dfa51fa05c56c975fb743da831ee0e6fff33c90095b97',
    '0xf3b4d95af6db698f60d90daeee1595a7cb464d13586c49ed8b6424838ab8e866',
    '0x44c48add24ed04ddc05d0250cc9899a51f85700b1bb9f00fd8f63ec7902f0c58',
    '0x60a7c3a7e82f3411b8d30cf3849ffae6518ae7ee432e220df532402c0292865e',
    '0x09e9b2d111c5d73863bfacdb510692ae83f47d41cc18debaff855a12297b9477',
    '0x8154c57d1a9a0ec693339487041137144262256698357804acc2f2f5264ce17f',
    '0xa30f76b36c0bb46fb73bdf20b53044d8ac30654284a7d106b5595ffcd2842514',
    '0xf0008cd498142561be458e7ca5974416ebdb9fb6b6298771a39bd3c1a005cadb',
    '0x80694a5487d516a03acfa933628dae024069bc1c26bf8a75db9cb73817315528',
    '0xfbc4fa81c483db73f2cdc0b529b10082420d261c609bf3f49fe735145571479a',
    '0x868553d90c907a0d14635811267c8ffb5aea1bc8e0fe70af52fcf1229b94c327',
    '0x797a32274db75946a15a46441f01478e1f20e1f233e0fac2c540404e45db3874',
    '0x2c0b4fe090e124280ab4d8aa0806f87ff630565b93670582ec738ed0e2bf113a',
    '0x1d2788913158ee47af9734a1bbb81c4a1e0c0d2a6cce1cc608ed9fef43b2f4f3',
    '0x3318f92d8ec31c3cd14d5e31439e599b687b936757eb4db67559591c969bd83b',
    '0x40d44ac31926c902a32472667d42d1a63c9c0d828dd832bcb0641a2c4c5d0c1e',
    '0x85904a5b159e3122310d50230040467a210bee3caad39a009f6155c815e3ef6e',
    '0x9c663ffa29471898d38272946ea74ca1e1b562f9c3bb2a01b0ff932aa66d60aa',
    '0x5ee9a1c4d62b64760b87677e70618bf4a55877442c98be20ea3503d9a6369bd5',
    '0x9a6d51bc32489d1d52aa50d6fbbe3a300b4098f535f0cb52d482f91b860ad252',
    '0xad0eebbe9b656c952695893402213263c2cdc0e13af29e91b4a37d11ff161625',
    '0xc5e2f81b7e9b0252b857299552f3d39b988175558b75d089b2bb25c96d8c60bb',
    '0x2ffa3179f7c36c28586ad04e8d01903a290cc779c4e0247f9ce6ac54906663af',
    '0x0f2efdca73c5eee986658ddcee50f3d9955ce34c6bb5f065933f6fafa4c5d4f9',
    '0x56594f891bd613a5535514af47173762e9b711d00bf869fa38c391eb1efde2b5',
    '0x8397cec988e71a744f4539ace3965762495ca9590f9887be919dbb0e61c8f89c',
    '0x3c280a17443322d07f23aa6af9dd385ff3fb45fb34fb9babe029343582f1633c',
    '0xddc9c3883e0238d0da69b8f78a07dcc26860e380e1cf223375f679dc60ba1624',
    '0x4b20684a2062a813a3e952350337f42ccad92e6df4086a669100208f943182b3',
    '0x66e1f14ce7aab21ac37872e3016a68aa73769111d4cd83745c0527684beac01d',
    '0x3b7cf8967d8780f833788552029d67288ed168cbcf2f21b6b15e32265106d6c0',
    '0xea612198d555606aeb1184d4d5ad33f4a887353dcd6a2feb159d9302bff1f0fe',
    '0x06797d9635281c034aa2be04bea20a841a895ad3c8dd1bf5e25633a505c590cc',
    '0x78b93e0b152bd32c9c910247a9cb0e11bf1d118123c4fa6b9db1f792c96e5849',
    '0xb2d3b7eca5cef3190f16f2215c554656b2cfe2907321dab4f657d620da864e3b',
    '0xeaea65f7814986d89e859522075ed98c71c95865b61fe8e9fe67efdd8831a6bf',
    '0x9429c026c3300ad24d8d9964eaa6597f18e8d3e71b1d3533e1f282c2ab8fa53e',
    '0xee7bce72110deb0fb068b5b6536a9974a6780147c607ce9b350a8ddbd2257d05',
    '0xce9347a9fbca821dbd2662a916f5abd21af5e35fb07871c5a13b4aab56e0220d',
    '0x17fe28fe23854e86d63da6d19c1730a200085f4f7fa923d75c6f3bcceeba4e95',
    '0x582e6d4eb48328095e9012dc4110cc326168eca391e0244c0165265362ea9775',
    '0xe42c53d5db7afbb8695f8bc0f37636e692898bee4c51aa4270b023bd363ca08d',
    '0xc93d474a618d6393b43ca0acc73023c38ab836b575d45a96b63f2153b4469c6c',
    '0x8fdfa555fd50fbd9c36519646102e970f6c0f27ad4fa3c9f27ea0dc96e434eab',
    '0x667f404b7b8141675df9cdc1a31ead07ff9e010e829f0bd9be14f0cea554c9e0',
    '0xab3ce22ce91c42e09686b3295ead9c2e654a6abd513d01b48d8e1a107e660316',
    '0xfd5f3aa721a32cbb06c92fa306973059e602bece3b6022e97a6302e91f68572b',
    '0x08c47b5c76ebde6e18a631667e9f4ebac9ab161ad21996c63db3b8f5d34f07f2',
    '0x9f9ab6bf2fded37f97b989f538c22164cba5dff2c54ffac13559897b758d26b1',
    '0x1a0dc73f6a5ba6fdd2999d401b906726bcebd330446e6675d87c1a01ad8faf3f',
    '0x8b9fc9ee54a7d902366eb7537e9bf4fb61099ac59e809267c25695a09e21c042',
    '0x9f812ed543f3d2d4c61f99ef11d3c0747bc7078d22f918423f4524c86b812d88',
    '0x1cd50270544fa55259070799fe834af21082dc43e4c965d9eba392f82a0d69e4',
    '0x48ddeeefd292c2868f9ce8ff1cee0d32b506f30f0a5cb0b2899fc35cbe8715ba',
    '0xc2558b9c78ad998faf7cb50ae9f738b109d7065fd57db257d759b0b7ef038a9b',
    '0x4070ed8331289b36f932082c32ded4b303f81983bb8cd70bbcc4c6b77b00e029',
    '0x8aa1d31b897fadfaf6219ccd48533fc5dc13ccfb981021b73b07252929f2ff1d',
    '0x59cf5490814d15a6e3b3099d2493e6a1ced72097bdea576a0e29c837a399a482',
    '0x4fc6be2e34393fc93d9a0ad94789d807efd5e4ff37dbb37e3ccc2e507e80fdb5',
    '0xaf2be7e18a9261263f50d32787577f3dd8895b93301cbae582827ce26588f33b',
    '0x2fef8c9780125c89785063177b0d5849cefe3de50849292899aef64ae10cfd1e',
    '0x455876fed3e4804babbacdcd64524445288ca9119d5dab5baefc3217315a574c',
    '0x54d5927085b22f004e6439c70cd993797a145e941000f18c3828a9e84a17b4ef',
    '0xe160f9da3c64d8ca6209894e80921d3fbbacff2d91a49fb3af4ee54f9da7d301',
    '0x0741ca3ddc8926fa8f8f877da24e1547965b9bf4f5dcafbad533c819807d07db',
    '0x3bb91aec96d00ff2f38a0c3265dfcd68b43a834dbea7d580b42a6359acfaf2a1',
    '0x6895f546d3f7e876042a84aca31f4c4057afb93d5ae44982516bc2200a758991',
    '0x7357702e47000ff841344ba9f01cbf31ab2a7d1993a3e62041bec2c7f3c8b707',
    '0xb8b829a1e2b72d65cb59ca0b1b251d4de4a04ce91223edcc4dff3357c927eb03',
    '0x766c9770e0080ac2080987b60eb4d6b82ba547bb8b9bcb0718870882db5d952d',
    '0x4454485054a0be7413f67fe14ed96d9cbc13a61737a333f8788e95fa4b334c25',
    '0xcbfdb3cf1e343bc46d877bb275c78a36ae6df6c85296a76baa5a574e75d62e31',
    '0x832248306b803940c0ec60472758dddc1df4f38f4a5f63a3670e7ffcb2547f1c',
    '0x8a55cfb00a22814ccdc236ea2d87b493491188bbf736c91ef8c18ddb7af9f090',
    '0xed99680ebcb5b92305a5ec0174037fb6b5e9fc238d9336a1f03a9a8dc851051b',
    '0xc578077166ca5fda6c39ab2975f99db207b629ab2d9e59a8cde0809200d0199b',
    '0x3d4d52ef5837a540e38d1109a0b0ba24577972f10da0173050be7567a490ad3d',
    '0x5d790b5c75293f120d976d95e08bc5000c13d9f04d652df01a120aa1882b089a',
    '0x5bbf3c3913cdfc1a978778c3aefb6d941fa777d86a88125954c9ece3a5d48b2f',
    '0xc40bd8708c28b92d4169b5558556571e98a45771ca7f6e2aed78ce061ddadb94',
    '0xdfbe57e75e812330bb7a1a133855391146fb395838890c14aca211c87b5a6429',
    '0x952dab45332cc940b9f5cc46478d2b7b352d12df203cbcd0574c7313eb7193ad',
    '0x19cdc8139fd92b69a3d89e57d28230bf959aca0ec38f0ba7926a06e3ee337bc1',
    '0xcce2798882158e3cae332762587898821bcd520cae669b8b315465d3bd88a863',
    '0xaa48a87e1109afcacd5bfc0be0072578ee4e0709b1e870c33c4d943cf9b9942e',
    '0xb9f7b1f3567c7380d95707ee51cfe7ed4a1d822a99b86bbf19d5542e6d4550e4',
    '0xf57de109a95f6e7f527e469f4d9766971fa6d91fb650ad8ae514101b47ac3e5e',
    '0x2574e34e8573f400bd59023a1246f254ad401946fb594065d214c6981b6c8458',
    '0xc01031eda7b539e85e1ac0796a48e9ab82bae694f3204eeb23f6581af40c4409',
    '0x2697ff1f08a6aa4d3f74038ca5028b6a6187530accbea63182382b45d0d04778',
    '0xebd0db1794d7f7110e997aa44872b515b0b9b1bf97b61c9918f60f4bdd9ef597',
    '0x940a61d1e8bcffaeda1ee6399d99cbcdaa1c0f273a808893fbbe1f653d04c2eb',
    '0xb2c0ad30d6e6b3945d3394636bd275832c2afec235f11cbdcc7afeafea811977',
    '0x82ca43fbf9f179cd61af5a2056f65e18e460beb0b756c7ec97de5b12c8d1e5b2',
    '0x59c7c27d73ef4c8caea1d834c655d5b5fe7db439c96b97d5a989f05fbbeb6779',
    '0x3cc4ecad6b3aab7d7ce3f3e7f96d43f8522b5e6161e5b0d1b2319d8cdaf85a3b',
  ];
}
