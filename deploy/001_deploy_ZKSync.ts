import namehash from 'eth-ens-namehash';
import { ethers } from 'hardhat';
import { default as web3 } from 'web3-utils';
const sha3 = web3.sha3;

import { Wallet, Provider, utils, Web3Provider, Signer } from 'zksync-web3';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { Deployer } from '@matterlabs/hardhat-zksync-deploy';

import dotenv from 'dotenv';
dotenv.config();

const ZERO_HASH =
  '0x0000000000000000000000000000000000000000000000000000000000000000';
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

export default async function (hre: HardhatRuntimeEnvironment) {
  // const [deployer, owner] = await ethers.getSigners();

  // Initialize the wallet.
  const provider = new Provider(hre.userConfig.zkSyncDeploy?.zkSyncNetwork);
  const deployerWallet = new Wallet(process.env.DEPLOYER_KEY || '');
  const owner = new Wallet(process.env.OWNER_KEY || '', provider);
  const tome = new Wallet(process.env.BNS_JACOB_KEY || '', provider);

  const deployer = new Deployer(hre, deployerWallet);

  console.log('\n=====================BNS Registry=====================');
  console.log('\nDeploying BNS Registry...');

  const BNSRegistry = await deployer.loadArtifact('BNSRegistry');
  const registry = await deployer.deploy(BNSRegistry);

  console.log(`\nSetting owner as owner of root node...`);
  await registry.setOwner(ZERO_HASH, owner.address);
  console.log('\n✅ Success');
  console.log(`\nBNS Registry deployed at: ${registry.address}`);

  console.log('\n===================Reverse Resolver===================\n');
  console.log('Deploying Reverse Registrar...');
  const ReverseRegistrar = await deployer.loadArtifact('ReverseRegistrar');
  const reverseRegistrar = await deployer.deploy(ReverseRegistrar, [
    registry.address,
  ]);

  console.log(
    '\nSetting Reverse Registrar as owner of "addr.reverse" subnode...',
  );
  console.log('\n✅ Success');
  console.log(`\nReverse Registrar deployed at: ${reverseRegistrar.address}`);

  console.log('\n===================Public Resolver====================');
  console.log('\nDeploying Public Resolver...');
  const PublicResolver = await deployer.loadArtifact('PublicResolver');
  const resolver = await deployer.deploy(PublicResolver, [
    registry.address,
    ZERO_ADDRESS,
    ZERO_ADDRESS,
    reverseRegistrar.address,
  ]);

  console.log(
    '\nSetting Public Resolver as defaultResolver for Reverse Registrar...',
  );
  await reverseRegistrar.setDefaultResolver(resolver.address);
  await registry
    .connect(owner)
    .setSubnodeOwner(ZERO_HASH, sha3('reverse'), owner.address);
  await registry
    .connect(owner)
    .setSubnodeRecord(
      namehash.hash('reverse'),
      sha3('addr'),
      reverseRegistrar.address,
      resolver.address,
    );
  console.log('\n✅ Success');
  console.log(`\nPublic Resolver deployed at: ${resolver.address}`);

  console.log('\n=====================.b Registrar=====================\n');
  console.log('\nDeploying .b Registrar ...');
  const BNSRegistrar = await deployer.loadArtifact('BNSRegistrar');
  const registrar = await deployer.deploy(BNSRegistrar, [
    registry.address,
    namehash.hash('b'),
    reverseRegistrar.address,
  ]);

  console.log('\nCreating new subnode for ".b"...');
  await registry
    .connect(owner)
    .setSubnodeRecord(
      ZERO_HASH,
      sha3('b'),
      registrar.address,
      resolver.address,
    );

  console.log(`\nSetting .b Registrar as contoller for Reverse Registrar`);
  await reverseRegistrar.setController(registrar.address, true);

  console.log('\n✅ Success');
  console.log(`\n.b Registrar deployed at: ${registrar.address}`);

  console.log('\n=====================Deployments======================');
  console.log(`\nBNS Registry deployed at: ${registry.address}`);
  console.log(`\nReverse Registrar deployed at: ${reverseRegistrar.address}`);
  console.log(`\nPublic Resolver deployed at: ${resolver.address}`);
  console.log(`\n.b Registrar deployed at: ${registrar.address}`);

  console.log('\n======================================================\n');

  console.log('\n==================Testing Deployment==================');
  console.log(`\nTesting with accounts\ntome: ${tome.address}`);

  console.log('\n==========================tome========================\n');

  console.log('\nRegistering tome on .b Registrar...');
  const node = namehash.hash('tome.b');
  const ABI = [
    'function setAddr(bytes32, address) external',
    'function setText(bytes32, string, string) external',
  ];
  let iface = new ethers.utils.Interface(ABI);
  const addrSet = iface.encodeFunctionData('setAddr', [node, tome.address]);
  const textSet = iface.encodeFunctionData('setText', [
    node,
    'url',
    'https://friends.bunches.xyz',
  ]);
  await resolver.connect(tome).setApprovalForAll(registrar.address, true);
  await registrar
    .connect(tome)
    .register('tome', tome.address, [addrSet, textSet], resolver.address);

  console.log(
    `\nBalance of ${tome.address}: ${await registrar.balanceOf(tome.address)}`,
  );
  console.log(`\nToken ID \n${sha3('tome')}`);
  console.log(`\nOwner of Token ID \n${await registrar.ownerOf(sha3('tome'))}`);
  console.log(
    `\nOwner of tome.b node on BNS Registry\n${await registry.owner(
      namehash.hash('tome.b'),
    )}`,
  );
  console.log(
    `\ntome.b resolver address: ${await registry.resolver(namehash.hash('b'))}`,
  );

  let reverseNode = namehash.hash(
    '90F79bf6EB2c4f870365E785982E1f101E93b906.addr.reverse',
  );
  console.log(
    `\nOwner of reverse node for tome.b \n${await registry.owner(reverseNode)}`,
  );
  console.log(
    `\nPublic resolver name() for reverseNode gives back\n${await resolver.name(
      reverseNode,
    )}`,
  );

  console.log(
    `\nPublic Resolver addr() for tome.b node gives back:\n${await resolver[
      'addr(bytes32)'
    ](namehash.hash('tome.b'))}`,
  );
  console.log(
    `\nPublic Resolver text() for tome.b node gives back:\n${await resolver.text(
      namehash.hash('tome.b'),
      'url',
    )}`,
  );

  console.log('\n======================================================\n');
}
