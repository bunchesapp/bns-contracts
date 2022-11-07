import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';

import namehash from 'eth-ens-namehash';
import utils from 'web3-utils';
const sha3 = utils.sha3;

const ZERO_HASH =
  '0x0000000000000000000000000000000000000000000000000000000000000000';

const EMPTY_ADDRESS = '0x0000000000000000000000000000000000000000';

describe('PublicResolver.sol', async () => {
  const deployPublicResolver = async () => {
    const [owner, addr1, addr2, controller] = await ethers.getSigners();
    const node = namehash.hash('b');

    const BNS = await ethers.getContractFactory('BNSRegistry');
    const bns = await BNS.deploy();

    const NameWrapper = await ethers.getContractFactory('DummyNameWrapper');
    const nameWrapper = await NameWrapper.deploy();

    const PublicResolver = await ethers.getContractFactory('PublicResolver');
    const resolver = await PublicResolver.deploy(
      bns.address,
      nameWrapper.address,
      controller.address,
      EMPTY_ADDRESS,
    );

    await bns.setSubnodeOwner(ZERO_HASH, sha3('b'), owner.address);

    return {
      bns,
      resolver,
      nameWrapper,
      node,
      owner,
      addr1,
      addr2,
      controller,
    };
  };

  context('fallback()', async () => {
    it('forbids calls to the fallback function with a 0 value', async () => {
      const { resolver, owner } = await loadFixture(deployPublicResolver);
      await expect(owner.sendTransaction({ to: resolver.address, value: 0 })).to
        .be.reverted;
    });

    it('forbids calls to the fallback function with a 1 value', async () => {
      const { resolver, owner } = await loadFixture(deployPublicResolver);
      await expect(owner.sendTransaction({ to: resolver.address, value: 1 })).to
        .be.reverted;
    });
  });

  context('supportsInterface()', async () => {
    it('supports known interfaces', async () => {
      const { resolver } = await loadFixture(deployPublicResolver);
      expect(await resolver.supportsInterface('0x3b3b57de')).to.be.true; //IAddrResolver
      expect(await resolver.supportsInterface('0xf1cb7e06')).to.be.true; //IAddressResolver
      expect(await resolver.supportsInterface('0x691f3431')).to.be.true; //INameresolver
      expect(await resolver.supportsInterface('0xc8690233')).to.be.true; //IPubkeyResolver
      expect(await resolver.supportsInterface('0x59d1d43c')).to.be.true; //ITextResolver
    });

    it('does NOT support a random interface', async () => {
      const { resolver } = await loadFixture(deployPublicResolver);
      expect(await resolver.supportsInterface('0x3b3b57df')).to.be.false; //IAddrResolver
    });
  });

  context('recordVersion()', async () => {
    it('permits clearing records', async () => {
      const { resolver, node } = await loadFixture(deployPublicResolver);
      await expect(resolver.clearRecords(node))
        .to.emit(resolver, 'VersionChanged')
        .withArgs(node, '1');
    });
  });

  context('addr()', async () => {
    const getResolverWithABI = async () => {
      const { resolver, owner, node, addr1, addr2 } = await loadFixture(
        deployPublicResolver,
      );
      const abi = [
        'function setAddr(bytes32, address) external',
        'function addr(bytes32) public view returns (address)',
      ];
      const PublicResolver = new ethers.Contract(resolver.address, abi, owner);

      return { PublicResolver, resolver, owner, node, addr1, addr2 };
    };
    it('permits setting address by owner', async () => {
      const { PublicResolver, resolver, node, addr1 } = await loadFixture(
        getResolverWithABI,
      );
      await expect(PublicResolver.setAddr(node, addr1.address))
        .to.emit(resolver, 'AddressChanged')
        .withArgs(node, addr1.address)
        .to.emit(resolver, 'AddrChanged')
        .withArgs(node, addr1.address);

      expect(await PublicResolver.addr(node)).to.eql(addr1.address);
    });

    it('can overwrite previously set address', async () => {
      const { PublicResolver, node, addr1, addr2 } = await loadFixture(
        getResolverWithABI,
      );

      await PublicResolver.setAddr(node, addr1.address);
      expect(await PublicResolver.addr(node)).to.eql(addr1.address);

      await PublicResolver.setAddr(node, addr2.address);
      expect(await PublicResolver.setAddr(node, addr2.address));
    });

    it('can overwrite to the same address', async () => {
      const { PublicResolver, node, addr1 } = await loadFixture(
        getResolverWithABI,
      );

      await PublicResolver.setAddr(node, addr1.address);
      expect(await PublicResolver.addr(node)).to.eql(addr1.address);

      await PublicResolver.setAddr(node, addr1.address);
      expect(await PublicResolver.addr(node)).to.eql(addr1.address);
    });

    it('forbids setting new address by non-owners', async () => {
      const { PublicResolver, node, addr1 } = await loadFixture(
        getResolverWithABI,
      );

      await expect(PublicResolver.connect(addr1).setAddr(node, addr1.address))
        .to.be.reverted;
    });

    it('forbids writing same address by non-owner', async () => {
      const { PublicResolver, node, addr1 } = await loadFixture(
        getResolverWithABI,
      );
      await PublicResolver.setAddr(node, addr1.address);

      await expect(PublicResolver.connect(addr1).setAddr(node, addr1.address))
        .to.be.reverted;
    });

    it('forbids overwriting existing address by non-owner', async () => {
      const { PublicResolver, node, owner, addr1 } = await loadFixture(
        getResolverWithABI,
      );
      await PublicResolver.setAddr(node, addr1.address);

      await expect(PublicResolver.connect(addr1).setAddr(node, owner.address))
        .to.be.reverted;
    });

    it('returns zero when fetching nonexistent addresses', async () => {
      const { PublicResolver, node } = await loadFixture(getResolverWithABI);

      expect(await PublicResolver.addr(node)).to.eql(EMPTY_ADDRESS);
    });

    it('permits setting and retrieving address for other coin types', async () => {
      const { resolver, owner, node, addr1 } = await loadFixture(
        deployPublicResolver,
      );
      const abi = [
        'function setAddr(bytes32, uint256, bytes) public',
        'function addr(bytes32, uint256) public view returns (bytes)',
      ];
      const PublicResolver = new ethers.Contract(resolver.address, abi, owner);

      await PublicResolver.setAddr(node, 123, addr1.address);
      expect(await PublicResolver.addr(node, 123)).to.eql(
        addr1.address.toLowerCase(),
      );
    });

    it('returns ETH address for coin type 60', async () => {
      const { resolver, owner, node, addr1 } = await loadFixture(
        deployPublicResolver,
      );
      const abi = [
        'function setAddr(bytes32, address) public',
        'function addr(bytes32, uint256) public view returns (bytes)',
      ];
      const PublicResolver = new ethers.Contract(resolver.address, abi, owner);

      await PublicResolver.setAddr(node, addr1.address);
      expect(await PublicResolver.addr(node, 60)).to.eql(
        addr1.address.toLowerCase(),
      );
    });

    it('setting coin type 60 updates ETH address', async () => {
      const { resolver, owner, node, addr1 } = await loadFixture(
        deployPublicResolver,
      );
      const abi = [
        'function setAddr(bytes32, uint256, bytes) public',
        'function addr(bytes32) public view returns (address)',
      ];
      const PublicResolver = new ethers.Contract(resolver.address, abi, owner);

      await expect(PublicResolver.setAddr(node, 60, addr1.address))
        .to.emit(resolver, 'AddressChanged')
        .withArgs(node, addr1.address)
        .to.emit(resolver, 'AddrChanged')
        .withArgs(node, addr1.address);

      expect(await PublicResolver.addr(node)).to.eql(addr1.address);
    });
  });

  context('name()', async () => {
    it('permits setting name by owner', async () => {
      const { resolver, node } = await loadFixture(deployPublicResolver);
      await resolver.setName(node, 'name1');
      expect(await resolver.name(node)).to.eql('name1');
    });

    it('can overwrite perviously set names', async () => {
      const { resolver, node } = await loadFixture(deployPublicResolver);
      await resolver.setName(node, 'name1');
      expect(await resolver.name(node)).to.eql('name1');

      await resolver.setName(node, 'name2');
      expect(await resolver.name(node)).to.eql('name2');
    });

    it('forbids setting names by non-owners', async () => {
      const { resolver, node, addr1 } = await loadFixture(deployPublicResolver);
      await expect(resolver.connect(addr1).setName(node, 'name1')).to.be
        .reverted;
    });

    it('returns empty when fetching nonexistent name', async () => {
      const { resolver, node } = await loadFixture(deployPublicResolver);
      expect(await resolver.name(node)).to.eql('');
    });

    it('reset record on version change', async () => {
      const { resolver, node } = await loadFixture(deployPublicResolver);
      await resolver.setName(node, 'name1');
      expect(await resolver.name(node)).to.eql('name1');

      await resolver.clearRecords(node);
      expect(await resolver.name(node)).to.eql('');
    });
  });

  context('pubkey()', async () => {
    const basicSetPubkey = async () => {
      const { resolver, node, owner, addr1, addr2 } = await loadFixture(
        deployPublicResolver,
      );
      let x =
        '0x1000000000000000000000000000000000000000000000000000000000000000';
      let y =
        '0x2000000000000000000000000000000000000000000000000000000000000000';
      await resolver.setPubkey(node, x, y);
      const result = await resolver.pubkey(node);
      expect(result[0]).to.eql(x);
      expect(result[1]).to.eql(y);

      return { resolver, node, owner, addr1, addr2 };
    };

    it('returns empty when fetching nonexistent values', async () => {
      const { resolver, node } = await loadFixture(deployPublicResolver);
      const result = await resolver.pubkey(node);
      expect(result[0]).to.eql(
        '0x0000000000000000000000000000000000000000000000000000000000000000',
      );
      expect(result[1]).to.eql(
        '0x0000000000000000000000000000000000000000000000000000000000000000',
      );
    });

    it('permits setting public key by owner', basicSetPubkey);

    it('can overwrite previously set value', async () => {
      const { resolver, node } = await basicSetPubkey();

      let x =
        '0x3000000000000000000000000000000000000000000000000000000000000000';
      let y =
        '0x4000000000000000000000000000000000000000000000000000000000000000';
      await resolver.setPubkey(node, x, y);

      const result = await resolver.pubkey(node);
      expect(result[0]).to.eql(x);
      expect(result[1]).to.eql(y);
    });

    it('can overwrite to same value', async () => {
      const { resolver, node } = await basicSetPubkey();

      let x =
        '0x1000000000000000000000000000000000000000000000000000000000000000';
      let y =
        '0x2000000000000000000000000000000000000000000000000000000000000000';
      await resolver.setPubkey(node, x, y);

      const result = await resolver.pubkey(node);
      expect(result[0]).to.eql(x);
      expect(result[1]).to.eql(y);
    });

    it('forbids setting value by non-owners', async () => {
      const { resolver, node, addr1 } = await loadFixture(deployPublicResolver);
      await expect(
        resolver
          .connect(addr1)
          .setPubkey(
            node,
            '0x1000000000000000000000000000000000000000000000000000000000000000',
            '0x2000000000000000000000000000000000000000000000000000000000000000',
          ),
      ).to.be.reverted;
    });

    it('forbids writing same value by non-owners', async () => {
      const { resolver, node, addr1 } = await basicSetPubkey();

      let x =
        '0x1000000000000000000000000000000000000000000000000000000000000000';
      let y =
        '0x2000000000000000000000000000000000000000000000000000000000000000';
      await expect(resolver.connect(addr1).setPubkey(node, x, y)).to.be
        .reverted;
    });

    it('forbids overwriting existing value by non-owners', async () => {
      const { resolver, node, addr1 } = await basicSetPubkey();

      let x =
        '0x3000000000000000000000000000000000000000000000000000000000000000';
      let y =
        '0x4000000000000000000000000000000000000000000000000000000000000000';
      await expect(resolver.connect(addr1).setPubkey(node, x, y)).to.be
        .reverted;
    });

    it('resets record on cersion change', async () => {
      const { resolver, node } = await basicSetPubkey();
      await resolver.clearRecords(node);

      const result = await resolver.pubkey(node);
      expect(result[0]).to.eql(
        '0x0000000000000000000000000000000000000000000000000000000000000000',
      );
      expect(result[1]).to.eql(
        '0x0000000000000000000000000000000000000000000000000000000000000000',
      );
    });
  });

  context('text()', async () => {
    const url = 'https://friends.bunches.xyz';
    const url2 = 'https://careers.bunches.xyz';
    const basicSetText = async () => {
      const { resolver, node, owner, addr1, addr2 } = await loadFixture(
        deployPublicResolver,
      );
      await resolver.setText(node, 'url', url);
      expect(await resolver.text(node, 'url')).to.eql(url);

      return { resolver, node, owner, addr1, addr2 };
    };

    it('permits setting text by owner', basicSetText);

    it('can overwrite precious set text', async () => {
      const { resolver, node } = await basicSetText();

      await resolver.setText(node, 'url', url2);
      expect(await resolver.text(node, 'url')).to.eql(url2);
    });

    it('can overwirte to same text', async () => {
      const { resolver, node } = await basicSetText();

      await resolver.setText(node, 'url', url);
      expect(await resolver.text(node, 'url')).to.eql(url);
    });

    it('forids setting new text by non-owners', async () => {
      const { resolver, node, addr1 } = await loadFixture(deployPublicResolver);

      await expect(resolver.connect(addr1).setText(node, 'url', url)).to.be
        .reverted;
    });

    it('forbids writing same text by non-owners', async () => {
      const { resolver, node, addr1 } = await basicSetText();

      await expect(resolver.connect(addr1).setText(node, 'url', url)).to.be
        .reverted;
    });

    it('resets record on version change', async () => {
      const { resolver, node } = await basicSetText();

      await resolver.clearRecords(node);
      expect(await resolver.text(node, 'url')).to.eql('');
    });
  });

  context('authorisations', async () => {
    it('permits authorisations to be set', async () => {
      const { resolver, owner, addr1 } = await loadFixture(
        deployPublicResolver,
      );

      await resolver.setApprovalForAll(addr1.address, true);
      expect(await resolver.isApprovedForAll(owner.address, addr1.address)).to
        .be.true;
    });

    it('permints authorised users to make changes', async () => {
      const { bns, resolver, node, addr1 } = await loadFixture(
        deployPublicResolver,
      );

      await resolver.setApprovalForAll(addr1.address, true);
      expect(
        await resolver.isApprovedForAll(await bns.owner(node), addr1.address),
      ).to.be.true;

      await resolver.connect(addr1).setName(node, 'name1');
      expect(await resolver.name(node)).to.eql('name1');
    });

    it('permits authorisations to be cleared', async () => {
      const { resolver, owner, addr1 } = await loadFixture(
        deployPublicResolver,
      );

      await resolver.setApprovalForAll(addr1.address, true);
      expect(await resolver.isApprovedForAll(owner.address, addr1.address)).to
        .be.true;

      await resolver.setApprovalForAll(addr1.address, false);
      expect(await resolver.isApprovedForAll(owner.address, addr1.address)).to
        .be.false;
    });

    it('permits non-owners to set authorisations', async () => {
      const { resolver, node, addr1, addr2 } = await loadFixture(
        deployPublicResolver,
      );

      await resolver.connect(addr1).setApprovalForAll(addr2.address, true);

      // The authorisation should have no effect, because addr1 is not the owner.
      await expect(resolver.connect(addr2).setName(node, 'name')).to.be
        .reverted;
    });

    it('checks the authorisation for the current owner', async () => {
      const { bns, resolver, node, addr1, addr2 } = await loadFixture(
        deployPublicResolver,
      );

      await resolver.connect(addr1).setApprovalForAll(addr2.address, true);

      await bns.setOwner(node, addr1.address);
      await resolver.connect(addr2).setName(node, 'name');
      expect(await resolver.name(node)).to.eql('name');
    });

    it('trusted contract can bypass authorisation', async () => {
      const { resolver, node, controller } = await loadFixture(
        deployPublicResolver,
      );

      await resolver.connect(controller).setName(node, 'name');
      expect(await resolver.name(node)).to.eql('name');
    });

    it('emits an ApprovalForAll event', async () => {
      const { resolver, owner, addr2 } = await loadFixture(
        deployPublicResolver,
      );

      await expect(resolver.setApprovalForAll(addr2.address, true))
        .to.emit(resolver, 'ApprovalForAll')
        .withArgs(owner.address, addr2.address, true);
    });

    it('reverts if attempting to approve self as an operator', async () => {
      const { resolver, addr1 } = await loadFixture(deployPublicResolver);

      await expect(
        resolver.connect(addr1).setApprovalForAll(addr1.address, true),
      ).to.be.reverted;
    });

    it('permits name wrapper owner to make changes if owner is set to name wrapper address', async () => {
      const { bns, resolver, nameWrapper, node, addr2 } = await loadFixture(
        deployPublicResolver,
      );
      const owner = bns.owner(node);
      const operator = addr2;

      await expect(resolver.connect(operator).setName(node, 'name')).to.be
        .reverted;

      await bns.setOwner(node, nameWrapper.address);
      expect(await resolver.connect(operator).setName(node, 'name'));
    });
  });

  context('multicall', async () => {
    it('allows setting multiple fields', async () => {
      const { resolver, node } = await loadFixture(deployPublicResolver);
      const ABI = [
        'function setName(bytes32, string) external',
        'function setText(bytes32, string, string) external',
      ];
      let iface = new ethers.utils.Interface(ABI);
      const nameSet = iface.encodeFunctionData('setName', [node, 'name']);
      const textSet = iface.encodeFunctionData('setText', [
        node,
        'url',
        'https://friends.bunches.xyz',
      ]);

      await expect(resolver.multicall([nameSet, textSet]))
        .to.emit(resolver, 'NameChanged')
        .withArgs(node, 'name')
        .to.emit(resolver, 'TextChanged')
        .withArgs(node, 'url', 'url', 'https://friends.bunches.xyz');

      expect(await resolver.name(node)).to.eql('name');
      expect(await resolver.text(node, 'url')).to.eql(
        'https://friends.bunches.xyz',
      );
    });

    it('allows reading multiple fields', async () => {
      const { resolver, node } = await loadFixture(deployPublicResolver);

      await resolver.setName(node, 'myname');
      await resolver.setText(node, 'url', 'https://friends.bunches.xyz');

      const ABI = [
        'function name(bytes32) external view returns (string)',
        'function text(bytes32, string) external view returns (string)',
      ];
      let iface = new ethers.utils.Interface(ABI);
      const name = iface.encodeFunctionData('name', [node]);
      const text = iface.encodeFunctionData('text', [node, 'url']);

      const results = await resolver.callStatic.multicall([name, text]);

      expect(iface.decodeFunctionResult('name', results[0])[0]).to.eql(
        'myname',
      );
      expect(iface.decodeFunctionResult('text', results[1])[0]).to.eql(
        'https://friends.bunches.xyz',
      );
    });
  });
});
