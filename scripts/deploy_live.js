const { ethers, upgrades } = require('hardhat');

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

     // FIXME: change for live mode
     const authorizationContract = "0x29a51eba5470E52586e8CB13c6E284AdD567dDB2";
     const base_uri = 'https://service.selfkey.org/avatar/metadata/';

     const contractFactory = await hre.ethers.getContractFactory("SelfkeyIdSoulboundNFT");
     const contract = await upgrades.deployProxy(contractFactory, ['Selfkey ID Soulbound NFT', 'SKIDNFT', base_uri, authorizationContract]);
     await contract.deployed();
     console.log("Deployed Selfkey.ID NFT contract address:", contract.address);

    // INFO: verify contract after deployment
    // npx hardhat verify --network mumbai 0x6364637c0fBA791BC92F82dE4C41D99A741C586e
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
