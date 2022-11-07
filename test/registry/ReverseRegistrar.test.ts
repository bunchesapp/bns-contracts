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

describe('ReverseRegistrar.sol', () => {
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
    const defaultResolverABI = [
      'function name(bytes32) external view returns (string)',
    ];
    const defaultResolver = new ethers.Contract(
      await registrar.defaultResolver(),
      defaultResolverABI,
      ethers.provider,
    );
    const dummyOwnable = await ReverseRegistrar.deploy(bns.address);
    const dummyOwnableReverseNode = getReverseNode(dummyOwnable.address);

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
      dummyOwnable,
      dummyOwnableReverseNode,
      defaultResolver,
    };
  };

  it('should calculate node hash correctly', async () => {
    const { registrar, owner, node } = await loadFixture(
      deployReverseRegistrar,
    );
    expect(await registrar.node(owner.address)).to.eql(node);
  });

  context('claim()', () => {
    it('allows an account to claim its address', async () => {
      const { bns, registrar, addr1, node } = await loadFixture(
        deployReverseRegistrar,
      );
      registrar.claim(addr1.address);
      expect(await bns.owner(node)).to.eql(addr1.address);
    });

    it('event ReveseClaimed is emitted', async () => {
      const { registrar, owner, addr1, node } = await loadFixture(
        deployReverseRegistrar,
      );
      await expect(registrar.claim(addr1.address))
        .to.emit(registrar, 'ReverseClaimed')
        .withArgs(owner.address, node);
    });
  });

  context('claimForAddr()', () => {
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

      await expect(
        registrar.claimForAddr(owner.address, addr1.address, resolver.address),
      )
        .to.emit(registrar, 'ReverseClaimed')
        .withArgs(owner.address, node);
    });

    it('forbids an account to claim another address', async () => {
      const { resolver, registrar, owner, addr1 } = await loadFixture(
        deployReverseRegistrar,
      );
      await expect(
        registrar.claimForAddr(addr1.address, owner.address, resolver.address),
      ).to.be.reverted;
    });

    it('allows an authorised account to claim a different address', async () => {
      const { bns, resolver, registrar, owner, addr1, addr2, node2 } =
        await loadFixture(deployReverseRegistrar);
      await bns.connect(addr1).setApprovalForAll(owner.address, true);
      await registrar.claimForAddr(
        addr1.address,
        addr2.address,
        resolver.address,
      );
      expect(await bns.owner(node2)).to.eql(addr2.address);
    });

    it('allows a controller to claim a different address', async () => {
      const { bns, resolver, registrar, owner, addr1, addr2, node2 } =
        await loadFixture(deployReverseRegistrar);
      await registrar.setController(owner.address, true);
      await registrar.claimForAddr(
        addr1.address,
        addr2.address,
        resolver.address,
      );

      expect(await bns.owner(node2)).to.eql(addr2.address);
    });

    it('allows an onwer() of a contract to claim the reverse node of that contract', async () => {
      const {
        bns,
        resolver,
        registrar,
        owner,
        dummyOwnable,
        dummyOwnableReverseNode,
      } = await loadFixture(deployReverseRegistrar);
      await registrar.claimForAddr(
        dummyOwnable.address,
        owner.address,
        resolver.address,
      );
      expect(await bns.owner(dummyOwnableReverseNode)).to.eql(owner.address);
    });
  });

  context('claimWithResolver()', () => {
    it('allows an account to specify resolver', async () => {
      const { bns, registrar, addr1, addr2, node } = await loadFixture(
        deployReverseRegistrar,
      );
      await registrar.claimWithResolver(addr1.address, addr2.address);
      expect(await bns.owner(node)).to.eql(addr1.address);
      expect(await bns.resolver(node)).to.eql(addr2.address);
    });

    it('event ReverseClaimed', async () => {
      const { registrar, owner, addr1, addr2, node } = await loadFixture(
        deployReverseRegistrar,
      );
      await expect(registrar.claimWithResolver(addr1.address, addr2.address))
        .to.emit(registrar, 'ReverseClaimed')
        .withArgs(owner.address, node);
    });
  });

  context('setName()', () => {
    it('sets name records', async () => {
      const { bns, registrar, defaultResolver, node } = await loadFixture(
        deployReverseRegistrar,
      );
      await registrar.setName('testname');

      expect(await bns.resolver(node)).to.eql(defaultResolver.address);
      expect(await defaultResolver.name(node)).to.eql('testname');
    });

    it('event ReverseClaimed is emitted', async () => {
      const { registrar, owner, node } = await loadFixture(
        deployReverseRegistrar,
      );
      await expect(registrar.setName('testname'))
        .to.emit(registrar, 'ReverseClaimed')
        .withArgs(owner.address, node);
    });
  });

  context('setNameForAddr()', () => {
    it('allows controller to set name records for other accounts', async () => {
      const { bns, registrar, resolver, owner, addr1, node2 } =
        await loadFixture(deployReverseRegistrar);
      await registrar.setController(owner.address, true);
      await registrar.setNameForAddr(
        addr1.address,
        owner.address,
        resolver.address,
        'testname',
      );

      expect(await bns.resolver(node2)).to.eql(resolver.address);
      expect(await resolver.name(node2)).to.eql('testname');
    });

    it('event ReverseClaimed is emitted', async () => {
      const { resolver, registrar, owner, addr1, node } = await loadFixture(
        deployReverseRegistrar,
      );
      await expect(
        registrar.setNameForAddr(
          owner.address,
          owner.address,
          resolver.address,
          'testname',
        ),
      )
        .to.emit(registrar, 'ReverseClaimed')
        .withArgs(owner.address, node);
    });

    it('forbids non-controller if address is different from sender and not authorized', async () => {
      const { resolver, registrar, owner, addr1, node } = await loadFixture(
        deployReverseRegistrar,
      );
      await expect(
        registrar.setNameForAddr(
          addr1.address,
          owner.address,
          resolver.address,
          'testname',
        ),
      ).to.be.reverted;
    });

    it('allows name to be set for an address if the sender is the address', async () => {
      const { bns, resolver, registrar, owner, node } = await loadFixture(
        deployReverseRegistrar,
      );
      await registrar.setNameForAddr(
        owner.address,
        owner.address,
        resolver.address,
        'testname',
      );

      expect(await bns.resolver(node)).to.eql(resolver.address);
      expect(await resolver.name(node)).to.eql('testname');
    });

    it('allows name to be set for an adderss if the sender is authorized', async () => {
      const { bns, resolver, registrar, owner, addr1, node } =
        await loadFixture(deployReverseRegistrar);
      await bns.setApprovalForAll(addr1.address, true);
      await registrar
        .connect(addr1)
        .setNameForAddr(
          owner.address,
          owner.address,
          resolver.address,
          'testname',
        );

      expect(await bns.resolver(node)).to.eql(resolver.address);
      expect(await resolver.name(node)).to.eql('testname');
    });

    it('allows an owner() of a contract to claimWithResolverForAddr on behalf of the contract', async () => {
      const {
        bns,
        resolver,
        registrar,
        owner,
        addr1,
        node,
        dummyOwnable,
        dummyOwnableReverseNode,
      } = await loadFixture(deployReverseRegistrar);
      await registrar.setNameForAddr(
        dummyOwnable.address,
        owner.address,
        resolver.address,
        'dummyownable.eth',
      );

      expect(await bns.owner(dummyOwnableReverseNode)).to.eql(owner.address);
      expect(await resolver.name(dummyOwnableReverseNode)).to.eql(
        'dummyownable.eth',
      );
    });
  });

  context('setController()', () => {
    it('forbid non-onwer from setting a conroller', async () => {
      const { bns, resolver, registrar, owner, addr1, node } =
        await loadFixture(deployReverseRegistrar);
      await expect(registrar.connect(addr1).setController(addr1.address, true))
        .to.be.reverted;
    });
  });
});
