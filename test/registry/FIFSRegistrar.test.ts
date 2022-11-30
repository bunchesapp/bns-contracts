import { loadFixture, time } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { ethers, upgrades } from 'hardhat';

import namehash from 'eth-ens-namehash';
import utils from 'web3-utils';
const sha3 = utils.sha3;

const ZERO_HASH =
  '0x0000000000000000000000000000000000000000000000000000000000000000';

const ARBITRARY_HASH =
  '0x4f5b812789fc606be1b3b16908db13fc7a9adf7ca72641f84d75b47069d3d7f0';

describe('FIFSRegistrar.sol', async () => {
  const deployFIFSRegistrar = async () => {
    const [owner, addr1, addr2, addr3] = await ethers.getSigners();
    const BNS = await ethers.getContractFactory('BNSRegistry');
    const bns = await upgrades.deployProxy(BNS);

    const FIFSRegistrar = await ethers.getContractFactory('FIFSRegistrar');
    const registrar = await FIFSRegistrar.deploy(bns.address, ZERO_HASH);

    await bns.setOwner(ZERO_HASH, registrar.address);

    return { bns, registrar, owner, addr1, addr2, addr3 };
  };

  it('should allow registration of names', async () => {
    const { bns, registrar, owner } = await loadFixture(deployFIFSRegistrar);

    await expect(registrar.register(sha3('b'), owner.address))
      .to.emit(bns, 'NewOwner')
      .withArgs(ZERO_HASH, sha3('b'), owner.address);

    expect(await bns.owner(ZERO_HASH)).to.eql(registrar.address);

    expect(await bns.owner(namehash.hash('b'))).to.eql(owner.address);
  });

  context('transferring names', async () => {
    it('should allow transferring name to your own', async () => {
      const { bns, registrar, owner, addr1 } = await loadFixture(
        deployFIFSRegistrar,
      );

      await registrar.register(sha3('b'), owner.address);

      await expect(registrar.register(sha3('b'), addr1.address))
        .to.emit(bns, 'NewOwner')
        .withArgs(ZERO_HASH, sha3('b'), addr1.address);

      expect(await bns.owner(namehash.hash('b'))).to.eql(addr1.address);
    });

    it('forbids transferring the name you do not own', async () => {
      const { bns, registrar, owner, addr1 } = await loadFixture(
        deployFIFSRegistrar,
      );

      await registrar.register(sha3('b'), owner.address);

      await expect(registrar.connect(addr1).register(sha3('b'), addr1.address))
        .to.be.reverted;
    });
  });
});
