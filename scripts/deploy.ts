import { network, ethers } from 'hardhat';

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log(
    `Deploying contracts to ${network.name} with the account:${deployer.address}`,
  );
  const balance = (await deployer.getBalance()).toNumber();
  console.log('Account balance:', balance, balance > 0);
  if (balance === 0) {
    throw `Not enough eth`;
  }
  console.log('\n====================BNS Registry====================');
  console.log('\ndeploying BNS Registry');

  const BNSRegistry = await ethers.getContractFactory('BNSRegsitry');
  const registry = await BNSRegistry.deploy();

  console.log(`\nBNS Registry deployed at ${registry.address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
