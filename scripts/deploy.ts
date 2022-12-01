import { network, ethers, upgrades } from 'hardhat';
import namehash from 'eth-ens-namehash';
import utils from 'web3-utils';
const sha3 = utils.sha3;

const ZERO_HASH =
  '0x0000000000000000000000000000000000000000000000000000000000000000';
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

async function main() {
  const [deployer, owner] = await ethers.getSigners();

  console.log('\n=================Bunches Name Service=================');
  console.log(
    `\nDeploying contracts to *${network.name} network* \n\nUsing the deployer account:${deployer.address}`,
  );

  console.log('\n=====================BNS Registry=====================');
  console.log('\nDeploying BNS Registry...');

  const BNSRegistry = await ethers.getContractFactory('BNSRegistry');
  const registry = await upgrades.deployProxy(BNSRegistry);

  console.log(`\nSetting owner as owner of root node...`);
  await registry.setOwner(ZERO_HASH, owner.address);
  console.log('\n✅ Success');
  console.log(`\nBNS Registry deployed at: ${registry.address}`);

  console.log('\n===================Reverse Resolver===================\n');
  console.log('Deploying Reverse Registrar...');
  const ReverseRegistrar = await ethers.getContractFactory('ReverseRegistrar');
  const reverseRegistrar = await upgrades.deployProxy(ReverseRegistrar, [
    registry.address,
  ]);

  console.log(
    '\nSetting Reverse Registrar as owner of "addr.reverse" subnode...',
  );
  console.log('\n✅ Success');
  console.log(`\nReverse Registrar deployed at: ${reverseRegistrar.address}`);

  console.log('\n===================Public Resolver====================');
  console.log('\nDeploying Public Resolver...');
  const PublicResolver = await ethers.getContractFactory('PublicResolver');
  const resolver = await upgrades.deployProxy(PublicResolver, [
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
  const BNSRegistrar = await ethers.getContractFactory('BNSRegistrar');

  const registrar = await upgrades.deployProxy(BNSRegistrar, [
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
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
