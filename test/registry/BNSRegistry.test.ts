import { loadFixture, time } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { ethers, upgrades } from 'hardhat';

import namehash from 'eth-ens-namehash';
import utils from 'web3-utils';
const sha3 = utils.sha3;

const EMPTY_ADDRESS = '0x0000000000000000000000000000000000000000';

const ZERO_HASH =
  '0x0000000000000000000000000000000000000000000000000000000000000000';

const ARBITRARY_HASH =
  '0x4f5b812789fc606be1b3b16908db13fc7a9adf7ca72641f84d75b47069d3d7f0';

describe('BNSRegistry.sol', async () => {
  const deployBNSRegistry = async () => {
    const [owner, addr1, addr2, addr3] = await ethers.getSigners();
    const BNS = await ethers.getContractFactory('BNSRegistry');
    const bns = await upgrades.deployProxy(BNS);

    const Resolver = await ethers.getContractFactory('PublicResolver');
    const resolver = await upgrades.deployProxy(Resolver, [
      bns.address,
      EMPTY_ADDRESS,
      EMPTY_ADDRESS,
      EMPTY_ADDRESS,
    ]);

    return { bns, resolver, owner, addr1, addr2, addr3 };
  };

  it('should allow ownership transfers', async () => {
    const { bns, addr1 } = await loadFixture(deployBNSRegistry);

    await expect(bns.setOwner(ZERO_HASH, addr1.address))
      .to.emit(bns, 'Transfer')
      .withArgs(ZERO_HASH, addr1.address);

    expect(await bns.owner(ZERO_HASH)).to.eql(addr1.address);
  });

  it('should prohibit transfers by non-owners', async () => {
    const { bns, addr1 } = await loadFixture(deployBNSRegistry);

    await expect(bns.setOwner(ARBITRARY_HASH, addr1.address)).to.be.reverted;
  });

  it('should allow setting resolvers', async () => {
    const { bns, addr1 } = await loadFixture(deployBNSRegistry);

    await expect(bns.setResolver(ZERO_HASH, addr1.address))
      .to.emit(bns, 'NewResolver')
      .withArgs(ZERO_HASH, addr1.address);
    expect(await bns.resolver(ZERO_HASH)).to.eql(addr1.address);
  });

  it('should prevent setting resolvers by non-owners', async () => {
    const { bns, addr1 } = await loadFixture(deployBNSRegistry);
    await expect(bns.setResolver(ARBITRARY_HASH, addr1.address)).to.be.reverted;
  });

  it('should allow the creation of subnodes', async () => {
    const { bns, addr1 } = await loadFixture(deployBNSRegistry);

    await expect(bns.setSubnodeOwner(ZERO_HASH, sha3('b'), addr1.address))
      .to.emit(bns, 'NewOwner')
      .withArgs(ZERO_HASH, sha3('b'), addr1.address);

    expect(await bns.owner(namehash.hash('b'))).to.eql(addr1.address);
  });

  it('should prohibit subnode creation by non-owners', async () => {
    const { bns, addr1 } = await loadFixture(deployBNSRegistry);
    await expect(bns.setSubnodeOwner(ARBITRARY_HASH, sha3('b'), addr1.address))
      .to.be.reverted;
  });

  context('Records', () => {
    it('should allow owner of node to create subnode records', async () => {
      const { bns, resolver, owner } = await loadFixture(deployBNSRegistry);
      await bns.setSubnodeRecord(
        ZERO_HASH,
        sha3('b'),
        owner.address,
        resolver.address,
      );
      expect(await bns.owner(namehash.hash('b'))).to.eql(owner.address);
      expect(await bns.resolver(namehash.hash('b'))).to.eql(resolver.address);
    });

    it('should allow owner of contract to set the record for an existing node', async () => {
      const { bns, resolver, owner, addr1 } = await loadFixture(
        deployBNSRegistry,
      );
      await bns.setSubnodeOwner(ZERO_HASH, sha3('b'), owner.address);
      expect(await bns.owner(namehash.hash('b'))).to.eql(owner.address);
      expect(await bns.resolver(namehash.hash('b'))).to.eql(EMPTY_ADDRESS);

      await bns.setRecord(namehash.hash('b'), addr1.address, resolver.address);
      expect(await bns.owner(namehash.hash('b'))).to.eql(addr1.address);
      expect(await bns.resolver(namehash.hash('b'))).to.eql(resolver.address);
    });

    it('forbids non-owners to create subnode records', async () => {
      const { bns, resolver, owner, addr1 } = await loadFixture(
        deployBNSRegistry,
      );
      await expect(
        bns
          .connect(addr1)
          .setSubnodeRecord(
            ZERO_HASH,
            sha3('b'),
            addr1.address,
            resolver.address,
          ),
      ).to.be.reverted;
    });

    it('forbids non-owners to set records for existing node', async () => {
      const { bns, resolver, owner, addr1 } = await loadFixture(
        deployBNSRegistry,
      );
      await bns.setSubnodeOwner(ZERO_HASH, sha3('b'), owner.address);

      await expect(
        bns
          .connect(addr1)
          .setRecord(namehash.hash('b'), addr1.address, resolver.address),
      ).to.be.reverted;
    });
  });
});
