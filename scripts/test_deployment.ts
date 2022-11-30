import { ethers } from 'hardhat';
import namehash from 'eth-ens-namehash';
import utils from 'web3-utils';
const sha3 = utils.sha3;

const ZERO_HASH =
  '0x0000000000000000000000000000000000000000000000000000000000000000';
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

const bnsAddress = '0x5FC8d32690cc91D4c39d9d3abcBD16989F875707';
const reverseAddress = '0xa513E6E4b8f2a923D98304ec87F64353C4D5C853';
const resolverAddress = '0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6';
const registrarAddress = '0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0';

async function main() {
  const [deployer, owner, jacobvs, tome] = await ethers.getSigners();
  const { bns, resolver, registrar } = await getBNSContracts();

  console.log('\n==================Testing Deployment==================');
  console.log(`\nTesting with accounts\ntome: ${tome.address}`);

  console.log('\n=======================jacobvs========================');

  console.log('\nRegistering jacobvs on .b Registrar...');
  await registrar
    .connect(jacobvs)
    .register('jacobvs', jacobvs.address, [], resolver.address);
  await resolver
    .connect(jacobvs)
    ['setAddr(bytes32,address)'](namehash.hash('jacobvs.b'), jacobvs.address);
  await resolver
    .connect(jacobvs)
    .setName(namehash.hash('jacobvs.b'), 'jacobvs.b');

  console.log(
    `\nBalance of ${jacobvs.address}: ${await registrar.balanceOf(
      jacobvs.address,
    )}`,
  );

  console.log(`\nToken ID \n${sha3('jacobvs')}`);
  console.log(
    `\nOwner of Token ID \n${await registrar.ownerOf(sha3('jacobvs'))}`,
  );
  console.log(
    `\nOwner of jacobvs.b node on BNS Registry\n${await bns.owner(
      namehash.hash('jacobvs.b'),
    )}`,
  );
  console.log(
    `\njacobvs.b resolver address: ${await bns.resolver(namehash.hash('b'))}`,
  );

  let reverseNode = namehash.hash(
    '3C44CdDdB6a900fa2b585dd299e03d12FA4293BC.addr.reverse',
  );
  console.log(
    `\nOwner of reverse node for jacobvs.b \n${await bns.owner(reverseNode)}`,
  );
  console.log(
    `\nPublic resolver name() for reverseNode gives back\n${await resolver.name(
      reverseNode,
    )}`,
  );

  console.log(
    `\nPublic Resolver addr() for jacobvs.b node gives back:\n${await resolver[
      'addr(bytes32)'
    ](namehash.hash('jacobvs.b'))}`,
  );
  console.log(
    `\nPublic Resolver name() for jacobvs.b node gives back:\n${await resolver.name(
      namehash.hash('jacobvs.b'),
    )}`,
  );

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
    `\nOwner of tome.b node on BNS Registry\n${await bns.owner(
      namehash.hash('tome.b'),
    )}`,
  );
  console.log(
    `\ntome.b resolver address: ${await bns.resolver(namehash.hash('b'))}`,
  );

  reverseNode = namehash.hash(
    '90F79bf6EB2c4f870365E785982E1f101E93b906.addr.reverse',
  );
  console.log(
    `\nOwner of reverse node for tome.b \n${await bns.owner(reverseNode)}`,
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

async function getBNSContracts() {
  const BNS = await ethers.getContractFactory('BNSRegistry');
  const ReverseRegistrar = await ethers.getContractFactory('ReverseRegistrar');
  const PublicResolver = await ethers.getContractFactory('PublicResolver');
  const BNSRegistrar = await ethers.getContractFactory('BNSRegistrar');

  const bns = BNS.attach(bnsAddress);
  const reverse = ReverseRegistrar.attach(reverseAddress);
  const resolver = PublicResolver.attach(resolverAddress);
  const registrar = BNSRegistrar.attach(registrarAddress);

  return { bns, reverse, resolver, registrar };
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
