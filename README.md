<br/>
<p align="center">
<a href="https://debridge.finance/" target="_blank">
<img src="https://github.com/user-attachments/assets/e7f6f6b3-cc6d-4003-bd1c-8d7c882ea995" width="225" alt="logo">
</a>
</p>
<br/>

[deBridge](https://debridge.finance/) — cross-chain interoperability
 and liquidity transfer protocol that allows the truly decentralized transfer of data and assets between various blockchains. deBridge protocol is an infrastructure platform and a hooking service which aims to become a standard for:
- cross-chain composability of smart contracts
- cross-chain swaps
- bridging of any arbitrary asset
- interoperability and bridging of NFTs

More information about the project can be also found in the [documentation portal](https://docs.debridge.finance/)

deBridge node is a software that is run by deBridge validators who were elected by the protocol governance and perform validation of all cross-chain transactions passed through the protocol. All active validators are listening for events emitted by transactions that pass through deBridge smart contract and once an event achieves its finality validator signs the unique id of the event by private key and stores signature to Bundlr. In order to have transaction executed in the target chain user or arbitrary keeper needs to collect minimal required signatures of deBridge validators from IPFS and pass them alongside all transaction parameters to the deBridge smart contract in the target chain. The smart contract will validate all signatures and execute message/data passed in the transaction

In order to set up the validation node, the following steps should be performed:


## Install prerequisite packages on your server:

  1. docker
    - https://docs.docker.com/engine/install/ubuntu/
  2. docker-compose
    - https://docs.docker.com/compose/install/
  3. nodejs
    - https://github.com/nodesource/distributions/blob/master/README.md
  5. psql
    ``` sudo apt-get install postgresql-client```

### Check that your version of docker-compose not older than

```
docker-compose --version
docker-compose version 1.29.2
```

## Set up the blockchain infrastructure:
1. Install full mainnet nodes
  - [Ethereum](https://ethereum.org/en/developers/docs/nodes-and-clients/run-a-node/)
  - [BSC](https://docs.binance.org/smart-chain/developer/fullnode.html)
  - [HECO](https://docs.hecochain.com/#/en-us/dev/deploy)
  - Arbitrum
  - [Polygon](https://docs.polygon.technology/docs/validate/technical-requirements/)
  - Avalanche
  - Fantom
  - Solana


2. Update configs
   1. Make a copy of the default config:
    ```shell
    cp ./config/chains_config_default.json ./config/chains_config.json
    ```
   2. Update HTTP RPC URL in /config/chains_config.json (solana config needs no change)

3. Copy `.default.env` file and rename it to `.env`. Change default POSTGRES_PASSWORD, POSTGRES_USER credentials in .env file. During the first run (point 9) Postgres database will be automatically created with these credentials.
deBridge node has an embedded API through which node operator can authorize, query last scanned blocks, or rescan blockchain from the specific block. By default deBridge node is deployed on DEBRIDGE_NODE_PORT from .env file. Update JWT_SECRET, API_LOGIN, API_PASSWORD to randomly generated ones. If you use sentry to track any errors of the node, please update SENTRY_DSN/SOLANA_DATA_READER_API_SENTRY_DSN at .env file.
Set DEBRIDGE_PK, SETTINGS_PK in .env (ask deBridge team to get mainnet programs addresses)
Set SOLANA_RPC in .env to your solana RPC
Set API_BASE_URL (ask deBridge team to get mainnet URL)

4. Create a keystore file for the validation node. Script from `generate-keystore` folder can be used. To start generating new keystore info:
  - npm i
  - node index.js

The script will show the newly generated Ethereum address, private key, password for keystore, and keystore info. Copy password to `.env KEYSTORE_PASSWORD`, keystore info to /`secrets/keystore.json`

5. Put the keystore file under `secrets/keystore.json`.
6. Paste the password from `keystore` file into KEYSTORE_PASSWORD field of .env file
7. Contact deBridge team  to make your wallet address to be whitelisted by deBridge governance
8. Run the command `docker-compose up --build -d`.
9. If there is a need to start multiple instances of the node (e.g. one for testnet and one for mainnet) on one server you can:
  - checkout or copy repo to the new directory
  - change DOCKER_ID variable in .env
  - start as described above
10. debridge_node allow to save signatures in the arweave. To enable this feature need to generate arweave wallet and fill balance. 
Generate [arweave](https://www.arweave.org/) wallet
```
cd generate-arweave-wallet
npm i
node index.js
```
Copy private key to secrets/bundlr_wallet.json

## Update debridge node to the latest version
```shell
# Get latest changes from git
git pull

# Run debridge node
docker-compose up -d --remove-orphans
```

# [Changelog](./changelog.md)


# Config

## Working with multi-rpc nodes config

1. For each RPC node in the list:
    * Try to get the last block from the RPC node.
    * If the operation succeeds, return the RPC node.
    * Otherwise, mark the RPC node as not working and move it to the end of the list.
2. If we reach this point, all RPC nodes are not working.
    * Raise an exception.

This function first iterates over the list of RPC nodes. For each RPC node, it tries to get the last block from the node. If the operation succeeds, the function returns the RPC node. Otherwise, the function marks the RPC node as not working and moves it to the end of the list.
If the function reaches the end of the list without finding a working RPC node, it raises an exception. This indicates that all RPC nodes are not working.
![Working with multi-rpc nodes config](https://github.com/debridge-finance/debridge-node/assets/98714075/64bbf9ef-b838-4e8b-9eab-8519c645e568)


