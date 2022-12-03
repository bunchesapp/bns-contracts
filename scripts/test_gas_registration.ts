import { ethers } from 'hardhat';
import namehash from 'eth-ens-namehash';
import utils from 'web3-utils';
const sha3 = utils.sha3;

const bnsAddress = '0x17dB907ECa3AB89f67E6238bD54BAe82b26e533C';
const reverseAddress = '0x42045d69524B66374B93c87f631cF29f0fA41B0D';
const resolverAddress = '0x7ABAEaebAAb5F3bCB97233Bee980F2dc618b22F3';
const registrarAddress = '0xC4532C12F9112496ca995E783d72731C25Af4f33';

async function main() {
  const [_, __, jacob] = await ethers.getSigners();
  const { bns, resolver, registrar } = await getBNSContracts();

  console.log('\n==================Testing Deployment==================');

  console.log('\n=======================jacob========================');

  console.log('\nRegistering jacob on .b Registrar...');
  const node = namehash.hash('jacob1.b');
  const ABI = [
    'function setAddr(bytes32, address) external',
    'function setText(bytes32, string, string) external',
  ];
  let iface = new ethers.utils.Interface(ABI);
  const addrSet = iface.encodeFunctionData('setAddr', [node, jacob.address]);
  const textSet = iface.encodeFunctionData('setText', [
    node,
    'url',
    'https://friends.bunches.xyz',
  ]);
  await resolver.connect(jacob).setApprovalForAll(registrar.address, true);
  await registrar
    .connect(jacob)
    .register('jacob', jacob.address, [addrSet, textSet], resolver.address);

  console.log(
    `\nBalance of ${jacob.address}: ${await registrar.balanceOf(
      jacob.address,
    )}`,
  );
  console.log(`\nToken ID \n${sha3('jacob')}`);
  console.log(
    `\nOwner of Token ID \n${await registrar.ownerOf(sha3('jacob'))}`,
  );
  console.log(
    `\nOwner of jacob.b node on BNS Registry\n${await bns.owner(
      namehash.hash('jacob.b'),
    )}`,
  );
  console.log(
    `\njacob.b resolver address: ${await bns.resolver(namehash.hash('b'))}`,
  );

  let reverseNode = namehash.hash(
    'b164F1E4b02d1910a53395514DAEC6941C971bAb.addr.reverse',
  );
  console.log(
    `\nOwner of reverse node for jacob.b \n${await bns.owner(reverseNode)}`,
  );
  console.log(
    `\nPublic resolver name() for reverseNode gives back\n${await resolver.name(
      reverseNode,
    )}`,
  );

  console.log(
    `\nPublic Resolver addr() for jacob.b node gives back:\n${await resolver[
      'addr(bytes32)'
    ](namehash.hash('jacob.b'))}`,
  );
  console.log(
    `\nPublic Resolver text() for jacob.b node gives back:\n${await resolver.text(
      namehash.hash('jacob.b'),
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
