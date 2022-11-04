import { loadFixture, time } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';

import namehash from 'eth-ens-namehash';
import utils from 'web3-utils';
import { BADHINTS } from 'dns';
const sha3 = utils.sha3;

function getReverseNode(addr: string): string {
  return namehash.hash(addr.slice(2).toLowerCase() + '.addr.reverse');
}

const EMPTY_ADDRESS = '0x0000000000000000000000000000000000000000';
const ZERO_HASH =
  '0x0000000000000000000000000000000000000000000000000000000000000000';

describe('ReverseRegistrar.sol', async () => {
  const deployReverseRegistrar = async () => {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const node = getReverseNode(owner.address);
    const node2 = getReverseNode(addr1.address);
    const node3 = getReverseNode(addr2.address);

    const BNS = await ethers.getContractFactory('BNSRegistry');
    const bns = await BNS.deploy();

    const NameWrapper = await ethers.getContractFactory('DummyNameWrapper');
    const nameWrapper = await NameWrapper.deploy();

    const ReverseRegistrar = await ethers.getContractFactory(
      'ReverseRegistrar',
    );
    const registrar = await ReverseRegistrar.deploy(bns.address);

    const PublicResolver = await ethers.getContractFactory('PublicResolver');
    const resolver = await PublicResolver.deploy(
      bns.address,
      nameWrapper.address,
      '0x0000000000000000000000000000000000000000',
      registrar.address,
    );
    await registrar.setDefaultResolver(resolver.address);

    await bns.setSubnodeOwner(ZERO_HASH, sha3('reverse'), owner.address);
    await bns.setSubnodeOwner(
      namehash.hash('reverse'),
      sha3('addr'),
      registrar.address,
    );

    return {
      bns,
      registrar,
      resolver,
      owner,
      node,
      node2,
      node3,
      addr1,
      addr2,
    };
  };

  it('should calculate node hash correctly', async () => {
    const { registrar, owner, node } = await loadFixture(
      deployReverseRegistrar,
    );
    expect(await registrar.node(owner.address)).to.eql(node);
  });

  context('claim', async () => {
    it('allows an account to claim its address', async () => {
      const { bns, registrar, addr1, node } = await loadFixture(
        deployReverseRegistrar,
      );
      registrar.claim(addr1.address);
      expect(await bns.owner(node)).to.eql(addr1.address);
    });

    it('event ReveseClaimed is emitted0', async () => {
      const { registrar, addr1, node } = await loadFixture(
        deployReverseRegistrar,
      );
      expect(await registrar.claim(addr1.address))
        .to.emit(registrar, 'ReverseClaimed')
        .withArgs(addr1.address, node);
    });
  });

  context('claimForAddr', async () => {
    it('allows an account to claim its address', async () => {
      const { bns, resolver, registrar, owner, addr1, node } =
        await loadFixture(deployReverseRegistrar);

      await registrar.claimForAddr(
        owner.address,
        addr1.address,
        resolver.address,
      );

      expect(await bns.owner(node)).to.eql(addr1.address);
    });

    it('event ReverseClaimed is emitted', async () => {
      const { bns, resolver, registrar, owner, addr1, node } =
        await loadFixture(deployReverseRegistrar);

      expect(
        await registrar.claimForAddr(
          owner.address,
          addr1.address,
          resolver.address,
        ),
      )
        .to.emit(registrar, 'ReverseClaimed')
        .withArgs(addr1.address, node);
    });
  });
});
