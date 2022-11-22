import { network, ethers } from 'hardhat';
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

  console.log('\n=====================.b Registrar=====================\n');
  console.log('\nDeploying .b Registrar ...');
  const BNSRegistry = await ethers.getContractFactory('BNSRegistry');
  const registry = BNSRegistry.attach(
    '0x840E870459A2C960d70EDE14D6DAf212c37429C6',
  );
  // const PublicResolver = await ethers.getContractFactory('PublicResolver');
  // const resolver = PublicResolver.attach(
  //   '0x53bd73C3f3895667333aD410cbCF3E67e03778f8',
  // );
  const ReverseRegistrar = await ethers.getContractFactory('ReverseRegistrar');
  const reverseRegistrar = ReverseRegistrar.attach(
    '0xC4532C12F9112496ca995E783d72731C25Af4f33',
  );
  // const BNSRegistrar = await ethers.getContractFactory('BNSRegistrar');
  // const registrar = await BNSRegistrar.deploy(
  //   '0x42045d69524b66374b93c87f631cf29f0fa41b0d',
  //   namehash.hash('b'),
  //   '0x7abaeaebaab5f3bcb97233bee980f2dc618b22f3',
  // );
  // console.log(registrar);

  // console.log('\nCreating new subnode for ".b"...');
  // await registry
  //   .connect(owner)
  //   .setSubnodeRecord(
  //     ZERO_HASH,
  //     sha3('b'),
  //     registrar.address,
  //     resolver.address,
  //   );

  // console.log(`\nSetting .b Registrar as contoller for Reverse Registrar`);
  // await reverseRegistrar.setController(registrar.address, true);

  console.log('\nDeploying Public Resolver...');
  const PublicResolver = await ethers.getContractFactory('PublicResolver');
  const resolver = await PublicResolver.deploy(
    registry.address,
    ZERO_ADDRESS,
    ZERO_ADDRESS,
    reverseRegistrar.address,
  );

  console.log(`\nPublic Resolver deployed at: ${resolver.address}`);

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

  console.log('\n=====================Deployments======================');
  // console.log(`\n.b Registrar deployed at: ${registrar.address}`);

  console.log('\n======================================================\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
