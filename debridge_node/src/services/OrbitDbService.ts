import { Injectable, Logger } from '@nestjs/common';

import config from '../config/ipfs_client_config.json';
const IPFS = require("ipfs-http-client");
const OrbitDB = require('orbit-db')

@Injectable()
export class OrbitDbService {
    private readonly logger = new Logger(OrbitDbService.name);
    private orbitLogsDb;
    private orbitDocsDb;

    async init() {
        this.logger.log(`OrbitDbService init`);
        const ipfs = IPFS.create(config.IPFSNodeAddress);
        await ipfs.bootstrap.add(
            "/ip4/139.59.164.64/tcp/4002/p2p/QmNN6JwFwEyhTALAphnuLNmUsD1VNLiiQheGoXbLp226xE"
        );
        // await ipfs.swarm.connect(PINNER_ADDRESS);
        const orbitdb = await OrbitDB.createInstance(ipfs,
            {
                directory: "./orbitdb",
            });
        const options = {
            // Give write access to ourselves
            accessController: {
                write: [orbitdb.identity.id],
            },
            overwrite: false, // whether we should overwrite the existing database if it exists
        };
        this.orbitLogsDb = await orbitdb.eventlog("debridgeLogs", options);
        await this.orbitLogsDb.load();
        this.logger.log(`OrbitDB logs started at: ${this.orbitLogsDb.address}`);

        this.orbitDocsDb = await orbitdb.docs("debridgeDocs", options);
        await this.orbitDocsDb.load();
        this.logger.log(`OrbitDB docs started at: ${this.orbitDocsDb.address}`);
    }

    async addSignedSubmission(submissionId: string, signature: string, sendEvent: any): Promise<[string, string]> {
        this.logger.log(`addSignedSubmission start submissionId: ${submissionId}, signature: ${signature}`);
        const logHash = await this.addLogSignedSubmission(submissionId, signature, sendEvent);
        const docsHash = await this.addDocsSignedSubmission(submissionId, signature, sendEvent);
        return [logHash, docsHash];
    }

    async addConfirmNewAssets(deployId: string, signature: string, sendEvent: any): Promise<[string, string]> {
        this.logger.log(`addConfirmNewAssets start deployId: ${deployId}, signature: ${signature}`);
        const logHash = await this.addLogConfirmNewAssets(deployId, signature, sendEvent);
        const docsHash = await this.addDocsConfirmNewAssets(deployId, signature, sendEvent);
        return [logHash, docsHash];
    }

    async addLogSignedSubmission(submissionId: string, signature: string, sendEvent: any): Promise<string> {
        const value = {
            id: submissionId,
            signature: signature,
            event: sendEvent,
            type: "submission"
        };
        this.logger.verbose(value);
        let hash = await this.orbitLogsDb.add(value, { pin: true });//, { pin: true });
        this.logger.log(`addLogSignedSubmission hash: ${hash}`);
        return hash;
    }

    async addLogConfirmNewAssets(deployId: string, signature: string, sendEvent: any): Promise<string> {
        const value = {
            id: deployId,
            signature: signature,
            event: sendEvent,
            type: "confirmNewAsset"
        };
        this.logger.verbose(value);
        let hash = await this.orbitLogsDb.add(value, { pin: true });//, { pin: true });
        this.logger.log(`addLogConfirmNewAssets hash: ${hash}`);
        return hash;
    }

    async addDocsSignedSubmission(submissionId: string, signature: string, sendEvent: any): Promise<string> {
        const value = {
            _id: submissionId,
            signature: signature,
            event: sendEvent,
            type: "submission"
        };
        this.logger.verbose(value);
        // await db.put({ _id: 'test', name: 'test-doc-db', category: 'distributed' })
        let hash = await this.orbitDocsDb.put(value, { pin: true });//, { pin: true });
        this.logger.log(`addDocsSignedSubmission hash: ${hash}`);
        return hash;
    }

    async addDocsConfirmNewAssets(deployId: string, signature: string, sendEvent: any): Promise<string> {
        const value = {
            _id: deployId,
            signature: signature,
            event: sendEvent,
            type: "confirmNewAsset"
        };
        this.logger.verbose(value);
        // await db.put({ _id: 'test', name: 'test-doc-db', category: 'distributed' })
        let hash = await this.orbitDocsDb.put(value, { pin: true });//, { pin: true });
        this.logger.log(`addDocsConfirmNewAssets hash: ${hash}`);
        return hash;
    }
}
