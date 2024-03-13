# Selfkey ID Soul Bound NFT Token (ERC721) Contract

## Overview
Selfkey ID soulbound NFT token (SBT NFT)

## Development

All smart contracts are implemented in Solidity `^0.8.19`, using [Hardhat](https://hardhat.org/) as the Solidity development framework.

### Prerequisites

* [NodeJS](htps://nodejs.org), v16.1.0+
* [Hardhat](https://hardhat.org/), which is a comprehensive framework for Ethereum development.

### Initialization

    `npm install`

### Testing

    `npx hardhat test`

## API

* `setAuthorizationContractAddress(address _newContractAddress)` _onlyOwners_: allows owners to change authorization contract address
* `setBaseURI(string calldata _newURI)` _onlyOwners_: allows owners to change NFT metadata base URI
* `transferFrom(address from, address to, uint256 tokenId)` _onlyOwners_: transfers NFT
* `burn(uint256 tokenId)`: Burns Selfkey.ID NFT
* `balanceOf(address owner)`: Returns NFT balance for a specific address
* `ownerOf(uint256 tokenId)`: Returns address that owns tokenId
* `tokenURI(uint256 tokenId)`: Returns tokenURI for tokenId
* `tokenOfOwnerByIndex(address owner, uint256 index)`: Returns token ID for owner by index
* `mint(address to, bytes32 param, uint timestamp, address signer, bytes memory signature)`: Mints new token

## Contributing
Please see the [contributing notes](CONTRIBUTING.md).

## Copyright
Copyright SelfKey DAO Foundation 2024. All rights reserved.
