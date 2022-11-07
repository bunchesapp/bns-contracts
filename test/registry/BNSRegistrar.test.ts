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

    const BNSRegistrar = await ethers.getContractFactory('BNSRegistrar');
    const registrar = await BNSRegistrar.deploy(
      bns.address,
      namehash.hash('b'),
    );

    await bns.setSubnodeOwner(ZERO_HASH, sha3('b'), registrar.address);

    return { bns, registrar, owner, addr1, addr2, addr3 };
  };

  it('should allow new registrations', async () => {
    const { bns, registrar, owner, addr1 } = await loadFixture(
      deployBNSRegistrar,
    );
    await registrar.register(sha3('testname'), addr1.address);

    expect(await bns.owner(namehash.hash('testname.b'))).to.eql(addr1.address);
    expect(await registrar.ownerOf(sha3('testname'))).to.eql(addr1.address);
  });

  it('should allow registrations without updating the regisrty', async () => {
    const { bns, registrar, owner, addr1 } = await loadFixture(
      deployBNSRegistrar,
    );
    await registrar.registerOnly(sha3('testname'), addr1.address);

    expect(await bns.owner(namehash.hash('testname.b'))).to.eql(ZERO_ADDRESS);
    expect(await registrar.ownerOf(sha3('testname'))).to.eql(addr1.address);
  });
});
