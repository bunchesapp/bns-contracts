import namehash from 'eth-ens-namehash';
import utils from 'web3-utils';
const sha3 = utils.sha3;

const ZERO_HASH =
  '0x0000000000000000000000000000000000000000000000000000000000000000';
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

async function main() {
  console.log(namehash.hash('jacob.b'));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
