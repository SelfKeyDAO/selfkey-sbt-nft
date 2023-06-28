const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("Selfkey.ID Soulbound NFT Tests", function () {

    let contract;
    let authorizationContract;

    let owner;
    let addr1;
    let addr2;
    let addrs;

    const ZERO_ADDRESS       = '0x0000000000000000000000000000000000000000';
    const DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000';
    const CONTROLLER_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('CONTROLLER_ROLE'));

    const base_uri = 'https://selfkey.id/avatar/metadata/';

    beforeEach(async function () {
        [owner, addr1, addr2, signer, ...addrs] = await ethers.getSigners();

        let authorizationContractFactory = await ethers.getContractFactory("SelfkeyIdAuthorization");
        authorizationContract = await authorizationContractFactory.deploy(signer.address);

        let selfkeyIdNftContractFactory = await ethers.getContractFactory("SelfkeyIdSoulboundNFT");
        contract = await upgrades.deployProxy(selfkeyIdNftContractFactory, ['Selfkey.ID Soulbound NFT', 'SKIDNFT', base_uri, authorizationContract.address]);
        await contract.deployed();
    });

    describe("Deployment", function () {
        it("Should correctly set Token name", async function () {
            expect(await contract.name()).to.equal('Selfkey.ID Soulbound NFT');
        });

        it("Should correctly set Token symbol", async function () {
            expect(await contract.symbol()).to.equal('SKIDNFT');
        });
    });

    describe("Signing", function() {
        it("Can sign payloads", async function() {
            const signer = addr1;
            const _from = contract.address;
            const _to = addr1.address;
            const _amount = 1;
            const _scope = 'mint';
            const _timestamp = 900;
            const _param = ethers.utils.hexZeroPad(0, 32);

            const hash = await authorizationContract.getMessageHash(_from, _to, _amount, _scope, _param, _timestamp);
            const sig = await signer.signMessage(ethers.utils.arrayify(hash));
            const ethHash = await authorizationContract.getEthSignedMessageHash(hash);

            const recoverSigner = await authorizationContract.recoverSigner(ethHash, sig);
            expect(signer.address).to.equal(recoverSigner);
        });
    });

    describe("Authorization Contract Address", function () {
        it("Random wallet cannot change authorization contract address", async function () {
            await expect(contract.connect(addr1).setAuthorizationContractAddress(ZERO_ADDRESS, { from: addr1.address }))
                .to.be.revertedWith('Ownable: caller is not the owner');
        });

        it("Controller can change authorization contract address", async function () {
            await expect(contract.connect(owner).setAuthorizationContractAddress(ZERO_ADDRESS, { from: owner.address }))
                .to.emit(contract, 'AuthorizationContractAddressChanged')
                .withArgs(ZERO_ADDRESS);
        });
    });

    describe("Minting", function () {
        let expiration = 9999999999;
        it("Should create a deadline in seconds based on last block timestamp", async function () {
            const provider = ethers.getDefaultProvider()
            const lastBlockNumber = await provider.getBlockNumber()
            const lastBlock = await provider.getBlock(lastBlockNumber)
            expiration = lastBlock.timestamp + 300
        });

        it('User can mint new NFT tokens', async function () {
            // Authorization payload
            const _from = contract.address;
            const _to = addr1.address;
            const _amount = 1;
            const _scope = 'mint';
            const _param = ethers.utils.hexZeroPad(0, 32);
            const _timestamp = expiration;

            const hash = await authorizationContract.getMessageHash(_from, _to, _amount, _scope, _param, _timestamp);
            const sig = await signer.signMessage(ethers.utils.arrayify(hash))

            let tokenId = 0;
            await expect(contract.connect(addr1).mint(addr1.address, _param, _timestamp, signer.address, sig, { from: addr1.address }))
                .to.emit(contract, 'Transfer')
                .withArgs(ZERO_ADDRESS, addr1.address, tokenId);

            expect(await contract.balanceOf(addr1.address)).to.equal('1');
            expect(await contract.ownerOf(tokenId)).to.equal(addr1.address);
            expect(await contract.tokenURI(tokenId)).to.equal(base_uri + tokenId);
        });


        it('Contract owner cannot mint NFT tokens for other people', async function () {
            // Authorization payload
            const _from = contract.address;
            const _to = addr1.address;
            const _scope = 'mint';
            const _amount = 1;
            const _param = ethers.utils.hexZeroPad(0, 32);
            const _timestamp = expiration;

            const hash = await authorizationContract.getMessageHash(_from, _to, _amount, _scope, _param, _timestamp);
            const sig = await signer.signMessage(ethers.utils.arrayify(hash))

            await expect(contract.connect(owner).mint(addr1.address, _param, _timestamp, signer.address, sig, { from: owner.address }))
                .to.be.revertedWith('Invalid subject');
        });

        it('Can only mint 1 NFT per wallet address', async function() {
            // Authorization payload
            let _from = contract.address;
            let _to = addr1.address;
            let _scope = 'mint';
            const _amount = 1;
            const _param = ethers.utils.hexZeroPad(0, 32);
            let _timestamp = expiration;

            const hash = await authorizationContract.getMessageHash(_from, _to, _amount, _scope, _param, _timestamp);
            const sig = await signer.signMessage(ethers.utils.arrayify(hash))

            let tokenId = 0;
            await expect(contract.connect(addr1).mint(addr1.address, _param, _timestamp, signer.address, sig, { from: addr1.address }))
                .to.emit(contract, 'Transfer')
                .withArgs(ZERO_ADDRESS, addr1.address, tokenId);

            expect(await contract.balanceOf(addr1.address)).to.equal('1');
            expect(await contract.ownerOf(tokenId)).to.equal(addr1.address);
            expect(await contract.tokenURI(tokenId)).to.equal(base_uri + tokenId);

            // Authorization payload
            _from = contract.address;
            _to = addr1.address;
            _scope = 'mint';

            _timestamp = expiration + 1;
            const _hash = await authorizationContract.getMessageHash(_from, _to, _amount, _scope, _param, _timestamp);
            const _sig = await signer.signMessage(ethers.utils.arrayify(_hash))

            tokenId = 1;
            await expect(contract.connect(addr1).mint(addr1.address, _param, _timestamp, signer.address, _sig, { from: addr1.address }))
                .to.be.revertedWith('Address already has a Selfkey.ID NFT');
        });
    });

    describe("Transfering", function() {
        let expiration = 9999999999;
        it("Should create a deadline in seconds based on last block timestamp", async function () {
            const provider = ethers.getDefaultProvider()
            const lastBlockNumber = await provider.getBlockNumber()
            const lastBlock = await provider.getBlock(lastBlockNumber)
            expiration = lastBlock.timestamp + 300
        });

        it('Holder can\'t transfer soulbound NFT', async function () {
            // Authorization payload
            const _from = contract.address;
            const _to = addr1.address;
            const _scope = 'mint';
            const _timestamp = expiration;
            const _amount = 1;
            const _param = ethers.utils.hexZeroPad(0, 32);

            const hash = await authorizationContract.getMessageHash(_from, _to, _amount, _scope, _param, _timestamp);
            const sig = await signer.signMessage(ethers.utils.arrayify(hash))

            let tokenId = 0;
            await expect(contract.connect(addr1).mint(addr1.address, _param, _timestamp, signer.address, sig, { from: addr1.address }))
                .to.emit(contract, 'Transfer')
                .withArgs(ZERO_ADDRESS, addr1.address, tokenId);

            expect(await contract.balanceOf(addr1.address)).to.equal('1');

            await expect(
                contract.connect(addr1).transferFrom(addr1.address, addr2.address, "0", { from: addr1.address })
            ).to.be.revertedWith('Selfkey.ID Soulbound NFT is not transferable');
        });

        it('Holder can\'t safe transfer soulbound NFT', async function () {
            // Authorization payload
            const _from = contract.address;
            const _to = addr1.address;
            const _scope = 'mint';
            const _timestamp = expiration;
            const _amount = 1;
            const _param = ethers.utils.hexZeroPad(0, 32);

            const hash = await authorizationContract.getMessageHash(_from, _to, _amount, _scope, _param, _timestamp);
            const sig = await signer.signMessage(ethers.utils.arrayify(hash))

            let tokenId = 0;
            await expect(contract.connect(addr1).mint(addr1.address, _param, _timestamp, signer.address, sig    , { from: addr1.address }))
                .to.emit(contract, 'Transfer')
                .withArgs(ZERO_ADDRESS, addr1.address, tokenId);

            expect(await contract.balanceOf(addr1.address)).to.equal('1');

            await expect(
                contract.connect(addr1)["safeTransferFrom(address,address,uint256)"](addr1.address, addr2.address, 0, { from: addr1.address })
            ).to.be.revertedWith('Selfkey.ID Soulbound NFT is not transferable');

        });

        it('Owner wallet can\'t transfer soulbound NFT', async function () {
            // Authorization payload
            const _from = contract.address;
            const _to = addr1.address;
            const _scope = 'mint';
            const _amount = 1;
            const _timestamp = expiration;
            const _param = ethers.utils.hexZeroPad(0, 32);

            const hash = await authorizationContract.getMessageHash(_from, _to, _amount, _scope, _param, _timestamp);
            const sig = await signer.signMessage(ethers.utils.arrayify(hash));

            let tokenId = 0;
            await expect(contract.connect(addr1).mint(addr1.address, _param, _timestamp, signer.address, sig, { from: addr1.address }))
                .to.emit(contract, 'Transfer')
                .withArgs(ZERO_ADDRESS, addr1.address, tokenId);

            expect(await contract.balanceOf(addr1.address)).to.equal("1");

            await expect(contract.connect(owner).transferFrom(addr1.address, addr2.address, "0", { from: owner.address }))
                .to.be.revertedWith('Caller is not token owner nor approved');

            expect(await contract.balanceOf(addr1.address)).to.equal("1");
        });

        it('Controller wallet can transfer soulbound NFT', async function () {
            // Authorization payload
            const _from = contract.address;
            const _to = addr1.address;
            const _scope = 'mint';
            const _amount = 1;
            const _timestamp = expiration;
            const _param = ethers.utils.hexZeroPad(0, 32);

            const hash = await authorizationContract.getMessageHash(_from, _to, _amount, _scope, _param, _timestamp);
            const sig = await signer.signMessage(ethers.utils.arrayify(hash));

            let tokenId = 0;
            await expect(contract.connect(addr1).mint(addr1.address, _param, _timestamp, signer.address, sig, { from: addr1.address }))
                .to.emit(contract, 'Transfer')
                .withArgs(ZERO_ADDRESS, addr1.address, tokenId);

            expect(await contract.balanceOf(addr1.address)).to.equal("1");

            await contract.connect(owner).setController(owner.address);

            await expect(contract.connect(owner).transferFrom(addr1.address, addr2.address, "0", { from: owner.address }))
                .to.emit(contract, 'Transfer').
                withArgs(addr1.address, addr2.address, tokenId);

            expect(await contract.balanceOf(addr1.address)).to.equal("0");
        });


    });

    describe('Burning', function () {
        let expiration = 9999999999;
        it("Should create a deadline in seconds based on last block timestamp", async function () {
            const provider = ethers.getDefaultProvider()
            const lastBlockNumber = await provider.getBlockNumber()
            const lastBlock = await provider.getBlock(lastBlockNumber)
            expiration = lastBlock.timestamp + 300
        });

        it('Holder can\'t burn soulbound NFT', async function () {
            // Authorization payload
            const _from = contract.address;
            const _to = addr1.address;
            const _scope = 'mint';
            const _timestamp = expiration;
            const _amount = 1;
            const _param = ethers.utils.hexZeroPad(0, 32);

            const hash = await authorizationContract.getMessageHash(_from, _to, _amount, _scope, _param, _timestamp);
            const sig = await signer.signMessage(ethers.utils.arrayify(hash));

            let tokenId = 0;
            await expect(contract.connect(addr1).mint(addr1.address, _param, _timestamp, signer.address, sig, { from: addr1.address }))
                .to.emit(contract, 'Transfer')
                .withArgs(ZERO_ADDRESS, addr1.address, tokenId);

            await expect(
                contract.connect(addr1).burn(tokenId, { from: addr1.address })
            ).to.be.revertedWith('Selfkey.ID Soulbound NFT is not burnable');
        });

        it('Controller wallet can burn a soulbound NFT', async function () {
            // Authorization payload
            const _from = contract.address;
            const _to = addr1.address;
            const _scope = 'mint';
            const _timestamp = expiration;
            const _amount = 1;
            const _param = ethers.utils.hexZeroPad(0, 32);

            const hash = await authorizationContract.getMessageHash(_from, _to, _amount, _scope, _param, _timestamp);
            const sig = await signer.signMessage(ethers.utils.arrayify(hash));

            let tokenId = 0;
            await contract.connect(owner).setController(addr2.address);

            await expect(contract.connect(addr1).mint(addr1.address, _param,  _timestamp, signer.address, sig, { from: addr1.address }))
                .to.emit(contract, 'Transfer')
                .withArgs(ZERO_ADDRESS, addr1.address, tokenId);

            await expect(contract.connect(addr2).burn(tokenId, { from: addr2.address }))
                .to.emit(contract, 'Transfer').withArgs(addr1.address, ZERO_ADDRESS, tokenId);

        });

        it('Non-controller wallet can\'t burn a soulbound NFT', async function () {
            // Authorization payload
            const _from = contract.address;
            const _to = addr1.address;
            const _scope = 'mint';
            const _timestamp = expiration;
            const _amount = 1;
            const _param = ethers.utils.hexZeroPad(0, 32);

            const hash = await authorizationContract.getMessageHash(_from, _to, _amount, _scope, _param, _timestamp);
            const sig = await signer.signMessage(ethers.utils.arrayify(hash));

            let tokenId = 0;

            await expect(contract.connect(addr1).mint(addr1.address, _param, _timestamp, signer.address, sig, { from: addr1.address }))
                .to.emit(contract, 'Transfer')
                .withArgs(ZERO_ADDRESS, addr1.address, tokenId);

            await expect(contract.connect(addr2).burn(tokenId, { from: addr2.address }))
                .to.be.revertedWith('Caller is not token owner nor approved');

        });

    });

    describe('Roles', function() {
        it('Owner can grant and revoke controller roles', async function () {
            await expect(contract.connect(owner).setController(addr2.address)).to.emit(contract, 'ControllerChanged')
        });
    });

    describe('Enumerable', function() {
        let expiration = 9999999999;
        it("Should create a deadline in seconds based on last block timestamp", async function () {
            const provider = ethers.getDefaultProvider()
            const lastBlockNumber = await provider.getBlockNumber()
            const lastBlock = await provider.getBlock(lastBlockNumber)
            expiration = lastBlock.timestamp + 300
        });

        it('Total supply should indicate total minted tokens', async function () {
            // Authorization payload
            const _from = contract.address;
            const _to = addr1.address;
            const _scope = 'mint';
            const _timestamp = expiration;
            const _amount = 1;
            const _param = ethers.utils.hexZeroPad(0, 32);

            const hash = await authorizationContract.getMessageHash(_from, _to, _amount, _scope, _param, _timestamp);
            const sig = await signer.signMessage(ethers.utils.arrayify(hash));

            let tokenId = 0;
            await expect(contract.connect(addr1).mint(addr1.address, _param, _timestamp, signer.address, sig, { from: addr1.address }))
                .to.emit(contract, 'Transfer')
                .withArgs(ZERO_ADDRESS, addr1.address, tokenId);

            expect(await contract.totalSupply()).to.equal(1);
        });

        it('Should get tokenId by owner address', async function () {
            // Authorization payload
            let _from = contract.address;
            let _to = addr1.address;
            let _scope = 'mint';
            let _timestamp = expiration;
            let _amount = 1;
            let _param = ethers.utils.hexZeroPad(0, 32);

            let hash = await authorizationContract.getMessageHash(_from, _to, _amount, _scope, _param, _timestamp);
            let sig = await signer.signMessage(ethers.utils.arrayify(hash));

            let tokenId = 0;
            await expect(contract.connect(addr1).mint(addr1.address, _param, _timestamp, signer.address, sig, { from: addr1.address }))
                .to.emit(contract, 'Transfer')
                .withArgs(ZERO_ADDRESS, addr1.address, tokenId);

            _from = contract.address;
            _to = addr2.address;
            _scope = 'mint';
            _timestamp = expiration + 900;

            hash = await authorizationContract.getMessageHash(_from, _to, _amount, _scope, _param, _timestamp);
            sig = await signer.signMessage(ethers.utils.arrayify(hash));

            await expect(contract.connect(addr2).mint(addr2.address, _param, _timestamp, signer.address, sig, { from: addr2.address }))
                .to.emit(contract, 'Transfer')
                .withArgs(ZERO_ADDRESS, addr2.address, 1);

            expect(await contract.tokenOfOwnerByIndex(addr1.address, 0)).to.equal(0);
            expect(await contract.tokenOfOwnerByIndex(addr2.address, 0)).to.equal(1);
        });

        it('Should get tokenId by index', async function () {
            // Authorization payload
            let _from = contract.address;
            let _to = addr1.address;
            let _scope = 'mint';
            let _amount = 1;
            let _timestamp = expiration;
            let _param = ethers.utils.hexZeroPad(0, 32);

            let hash = await authorizationContract.getMessageHash(_from, _to, _amount, _scope, _param, _timestamp);
            let sig = await signer.signMessage(ethers.utils.arrayify(hash));

            let tokenId = 0;
            await expect(contract.connect(addr1).mint(addr1.address, _param, _timestamp, signer.address, sig, { from: addr1.address }))
                .to.emit(contract, 'Transfer')
                .withArgs(ZERO_ADDRESS, addr1.address, tokenId);

            _from = contract.address;
            _to = addr2.address;
            _scope = 'mint';
            _timestamp = expiration + 900;
            hash = await authorizationContract.getMessageHash(_from, _to, _amount, _scope, _param, _timestamp);
            sig = await signer.signMessage(ethers.utils.arrayify(hash));

            await expect(contract.connect(addr2).mint(addr2.address, _param, _timestamp, signer.address, sig, { from: addr2.address }))
                .to.emit(contract, 'Transfer')
                .withArgs(ZERO_ADDRESS, addr2.address, 1);

            expect(await contract.tokenByIndex(0)).to.equal(0);
            expect(await contract.tokenByIndex(1)).to.equal(1);
        })


    });

});
