import { loadFixture, time } from '@nomicfoundation/hardhat-network-helpers'
import { expect } from 'chai'
import { ethers } from 'hardhat'

import namehash from 'eth-ens-namehash'
import utils from 'web3-utils'
const sha3 = utils.sha3

function getReverseNode(addr: string): string {
  return namehash.hash(addr.slice(2).toLowerCase() + '.addr.reverse')
}

const ZERO_HASH =
  '0x0000000000000000000000000000000000000000000000000000000000000000'

const ARBITRARY_HASH =
  '0x4f5b812789fc606be1b3b16908db13fc7a9adf7ca72641f84d75b47069d3d7f0'

describe('ReverseRegistrar.sol', async () => {
  const deployReverseRegistrar = async () => {
    const [owner, addr1, addr2, addr3] = await ethers.getSigners()
    const BNS = await ethers.getContractFactory('BNSRegistry')
    const bns = await BNS.deploy()

    const FIFSRegistrar = await ethers.getContractFactory('FIFSRegistrar')
    const registrar = await FIFSRegistrar.deploy(bns.address, ZERO_HASH)

    await bns.setOwner(ZERO_HASH, registrar.address)

    return { bns, registrar, owner, addr1, addr2, addr3 }
  }
})
