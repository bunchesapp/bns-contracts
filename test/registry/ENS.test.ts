import { loadFixture, time } from '@nomicfoundation/hardhat-network-helpers'
import { expect } from 'chai'
import { ethers } from 'hardhat'

import namehash from 'eth-ens-namehash'
import utils from 'web3-utils'
const sha3 = utils.sha3

const ZERO_HASH =
  '0x0000000000000000000000000000000000000000000000000000000000000000'

const ARBITRARY_HASH =
  '0x4f5b812789fc606be1b3b16908db13fc7a9adf7ca72641f84d75b47069d3d7f0'

describe('BNSRegistry.sol', async () => {
  const deployBNSRegistry = async () => {
    const [owner, addr1, addr2, addr3] = await ethers.getSigners()
    const BNS = await ethers.getContractFactory('BNSRegistry')
    const bns = await BNS.deploy()

    return { bns, owner, addr1, addr2, addr3 }
  }

  it('should allow ownership transfers', async () => {
    const { bns, addr1 } = await loadFixture(deployBNSRegistry)

    await bns.setOwner(ZERO_HASH, addr1.address)

    expect(await bns.owner(ZERO_HASH)).to.eql(addr1.address)
  })

  it('should prohibit transfers by non-owners', async () => {
    const { bns, owner, addr1 } = await loadFixture(deployBNSRegistry)

    await expect(bns.setOwner(ARBITRARY_HASH, addr1.address)).to.be.reverted
  })
})
