import '@nomiclabs/hardhat-ethers';
import '@nomiclabs/hardhat-etherscan';
import '@nomiclabs/hardhat-solhint';
import '@nomiclabs/hardhat-truffle5';
import '@nomiclabs/hardhat-waffle';
import dotenv from 'dotenv';
import 'hardhat-abi-exporter';
import 'hardhat-deploy';
import 'hardhat-gas-reporter';
import { HardhatUserConfig, task } from 'hardhat/config';

import '@matterlabs/hardhat-zksync-deploy';
import '@matterlabs/hardhat-zksync-solc';

// Load environment variables from .env file. Suppress warnings using silent
// if this file is missing. dotenv will never modify any environment variables
// that have already been set.
// https://github.com/motdotla/dotenv
dotenv.config();

task('accounts', 'Prints the list of accounts', async (_, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

let real_accounts = undefined;
if (process.env.DEPLOYER_KEY) {
  real_accounts = [
    process.env.DEPLOYER_KEY,
    process.env.OWNER_KEY || process.env.DEPLOYER_KEY,
    process.env.BNS_JACOB_KEY || process.env.DEPLOYER_KEY,
  ];
}

const config: HardhatUserConfig = {
  networks: {
    hardhat: {
      saveDeployments: false,
      tags: ['test', 'legacy', 'use_root'],
      zksync: process.env.ZKSYNC_DEV === 'true', //use for zkSync dev
    },
    localhost: {
      url: 'http://127.0.0.1:8545',
      saveDeployments: false,
      tags: ['test', 'legacy', 'use_root'],
    },
    goerli: {
      url: `https://eth-goerli.g.alchemy.com/v2/${process.env.ALCHEMY_KEY}`,
      tags: ['test', 'legacy', 'use_root'],
      chainId: 5,
      accounts: real_accounts,
    },
    mainnet: {
      url: `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_KEY}`,
      tags: ['legacy', 'use_root'],
      chainId: 1,
      accounts: real_accounts,
    },
    'optimism-goerli': {
      url: `https://opt-goerli.g.alchemy.com/v2/${process.env.ALCHEMY_KEY}`,
      accounts: real_accounts,
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
  zksolc: {
    version: '1.2.0',
    compilerSource: 'binary',
    settings: {
      experimental: {
        dockerImage: 'matterlabs/zksolc',
        tag: 'v1.2.0',
      },
    },
  },
  zkSyncDeploy: {
    zkSyncNetwork: 'https://zksync2-testnet.zksync.dev',
    ethNetwork: 'goerli', // Can also be the RPC URL of the network (e.g. `https://goerli.infura.io/v3/<API_KEY>`)
  },
  mocha: {},
  gasReporter: {
    enabled: true,
    coinmarketcap: process.env.COIN_MARKET_CAP_API_KEY,
    currency: 'USD',
  },
  solidity: {
    compilers: [
      {
        version: '0.8.16',
        settings: {
          optimizer: {
            enabled: true,
            runs: 10000,
          },
        },
      },
    ],
  },
  namedAccounts: {
    deployer: {
      default: 0,
    },
    owner: {
      default: 1,
    },
  },
};

export default config;
