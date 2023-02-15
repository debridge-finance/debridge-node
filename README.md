<br/>
<p align="center">
<a href="https://debridge.finance/" target="_blank">
<img src="https://user-images.githubusercontent.com/10200871/137014801-40decb80-0595-4f0f-8ee5-f0f1ab5c0380.png" width="225" alt="logo">
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

deBridge node is a software that is run by deBridge validators who were elected by the protocol governance and perform validation of all cross-chain transactions passed through the protocol. All active validators are listening for events emitted by transactions that pass through deBridge smart contract and once an event achieves its finality validator signs the unique id of the event by private key and stores signature to Orbitdb -  public IPFS database. In order to have transaction executed in the target chain user or arbitrary keeper needs to collect minimal required signatures of deBridge validators from IPFS and pass them alongside all transaction parameters to the deBridge smart contract in the target chain. The smart contract will validate all signatures and execute message/data passed in the transaction

In order to set up the validation node, the following steps should be performed:


# [Changelog](./changelog.md)
