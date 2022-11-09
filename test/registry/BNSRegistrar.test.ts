import { loadFixture, time } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';

import namehash from 'eth-ens-namehash';
import utils from 'web3-utils';
const sha3 = utils.sha3;

const ZERO_HASH =
  '0x0000000000000000000000000000000000000000000000000000000000000000';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

describe('BNSRegistrar.sol', () => {
  const deployBNSRegistrar = async () => {
    const [owner, addr1, addr2, addr3] = await ethers.getSigners();
    const BNS = await ethers.getContractFactory('BNSRegistry');
    const bns = await BNS.deploy();

    const DummyReverseRegistrar = await ethers.getContractFactory(
      'ReverseRegistrar',
    );
    const dummyReverse = await DummyReverseRegistrar.deploy(bns.address);
    await bns.setSubnodeOwner(ZERO_HASH, sha3('reverse'), owner.address);
    await bns.setSubnodeOwner(
      namehash.hash('reverse'),
      sha3('addr'),
      dummyReverse.address,
    );

    const Resolver = await ethers.getContractFactory('PublicResolver');
    const resolver = await Resolver.deploy(
      bns.address,
      ZERO_ADDRESS,
      ZERO_ADDRESS,
      dummyReverse.address,
    );

    await dummyReverse.setDefaultResolver(resolver.address);

    const BNSRegistrar = await ethers.getContractFactory('BNSRegistrar');
    const registrar = await BNSRegistrar.deploy(
      bns.address,
      namehash.hash('b'),
      dummyReverse.address,
    );

    await dummyReverse.setController(registrar.address, true);
    await bns.setSubnodeOwner(ZERO_HASH, sha3('b'), registrar.address);

    return { bns, registrar, resolver, owner, addr1, addr2, addr3 };
  };

  it('should allow new registrations', async () => {
    const { bns, registrar, resolver, owner, addr1 } = await loadFixture(
      deployBNSRegistrar,
    );
    await registrar.register('testname', addr1.address, resolver.address);

    expect(await bns.owner(namehash.hash('testname.b'))).to.eql(addr1.address);
    expect(await registrar.ownerOf(sha3('testname'))).to.eql(addr1.address);
  });

  it('should allow registrations without updating the regisrty', async () => {
    const { bns, registrar, owner, resolver, addr1 } = await loadFixture(
      deployBNSRegistrar,
    );
    await registrar.registerOnly('testname', addr1.address, resolver.address);

    expect(await bns.owner(namehash.hash('testname.b'))).to.eql(ZERO_ADDRESS);
    expect(await registrar.ownerOf(sha3('testname'))).to.eql(addr1.address);
  });

  it('forbids registration of a name already registered', async () => {
    const { bns, registrar, resolver, owner, addr1, addr3 } = await loadFixture(
      deployBNSRegistrar,
    );
    await registrar.register('newname', addr3.address, resolver.address);
    await expect(registrar.register('newname', addr1.address, resolver.address))
      .to.be.reverted;
    expect(await registrar.ownerOf(sha3('newname'))).to.eql(addr3.address);
  });

  it('should permit owner to reclaim a name', async () => {
    const { bns, registrar, resolver, owner, addr2, addr3 } = await loadFixture(
      deployBNSRegistrar,
    );
    await registrar.register('newname', addr2.address, resolver.address);
    expect(await bns.owner(namehash.hash('newname.b'))).to.eql(addr2.address);
    await bns.setSubnodeOwner(ZERO_HASH, sha3('b'), owner.address);
    await bns.setSubnodeOwner(
      namehash.hash('b'),
      sha3('newname'),
      ZERO_ADDRESS,
    );
    expect(await bns.owner(namehash.hash('newname.b'))).to.eql(ZERO_ADDRESS);

    await bns.setSubnodeOwner(ZERO_HASH, sha3('b'), registrar.address);
    await registrar.connect(addr2).reclaim(sha3('newname'), addr2.address);
    expect(await bns.owner(namehash.hash('newname.b'))).to.eql(addr2.address);
  });

  it('forbids anyone else reclaiming a name', async () => {
    const { bns, registrar, resolver, owner, addr2, addr3 } = await loadFixture(
      deployBNSRegistrar,
    );
    await registrar.register('newname', addr2.address, resolver.address);
    await bns.setSubnodeOwner(ZERO_HASH, sha3('b'), owner.address);
    await bns.setSubnodeOwner(
      namehash.hash('b'),
      sha3('newname'),
      ZERO_ADDRESS,
    );
    await bns.setSubnodeOwner(ZERO_HASH, sha3('b'), registrar.address);
    await expect(
      registrar.connect(addr3).reclaim(sha3('newname'), addr3.address),
    ).to.be.reverted;
  });

  it('should permit owner to transfer a registration', async () => {
    const { bns, registrar, resolver, owner, addr1, addr3 } = await loadFixture(
      deployBNSRegistrar,
    );
    await registrar.register('newname', addr1.address, resolver.address);
    expect(await bns.owner(namehash.hash('newname.b'))).to.eql(addr1.address);
    await registrar
      .connect(addr1)
      .transferFrom(addr1.address, addr3.address, sha3('newname'));
    expect(await registrar.ownerOf(sha3('newname'))).to.eql(addr3.address);

    //Transfer does now update BNS Registry without reclaim
    expect(await bns.owner(namehash.hash('newname.b'))).to.eql(addr1.address);
    await registrar.connect(addr3).reclaim(sha3('newname'), addr3.address);
    expect(await bns.owner(namehash.hash('newname.b'))).to.eql(addr3.address);
  });

  it('forbids non-onwer from transfering', async () => {
    const { bns, registrar, resolver, owner, addr1, addr3 } = await loadFixture(
      deployBNSRegistrar,
    );
    await registrar.register('newname', addr1.address, resolver.address);
    await expect(
      registrar
        .connect(addr3)
        .transferFrom(addr1.address, addr3.address, sha3('newname')),
    ).to.be.reverted;
  });
});
