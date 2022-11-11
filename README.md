# BNS

For documentation of the ENS system, see [docs.ens.domains](https://docs.ens.domains/).

## BNSRegistry

The BNS registry is the core contract that lies at the heart of BNS resolution. All BNS lookups start by querying the registry. The registry maintains a list of domains, recording the owner, resolver, and TTL for each, and allows the owner of a domain to make changes to that data. It also includes some generic registrars.

### BNS.sol

Interface of the BNS Registry.

### FIFSRegistrar

Implementation of a simple first-in-first-served registrar, which issues (sub-)domains to the first account to request them.

### ReverseRegistrar

Implementation of the reverse registrar responsible for managing reverse resolution via the .addr.reverse special-purpose TLD.

## BNSRegistrar

Implementation of the registrar that is responsible for registation of '.b' names.

BNSRegistrar is the contract that owns the TLD in the BNS registry. This contract implements a minimal set of functionality:

- The owner of the registrar may add and remove controllers.
- Name owners may reclaim ownership in the BNS registry if they have lost it.
- Implements ERC721 interface and is transferable

## Resolvers

Resolver implements a general-purpose BNS resolver that is suitable for most standard BNS use cases. The public resolver permits updates to BNS records by the owner of the corresponding name.

PublicResolver includes the following profiles that implements different EIPs.

- ABIResolver = EIP 205 - ABI support (`ABI()`).
- AddrResolver = EIP 137 - Contract address interface. EIP 2304 - Multicoin support (`addr()`).
- ContentHashResolver = EIP 1577 - Content hash support (`contenthash()`).
- InterfaceResolver = EIP 165 - Interface Detection (`supportsInterface()`).
- NameResolver = EIP 181 - Reverse resolution (`name()`).
- PubkeyResolver = EIP 619 - SECP256k1 public keys (`pubkey()`).
- TextResolver = EIP 634 - Text records (`text()`).

**NOT_IMPLEMENTED_YET**

- DNSResolver = Experimental support is available for hosting DNS domains on the Ethereum blockchain via BNS. [The more detail](https://veox-ens.readthedocs.io/en/latest/dns.html) is on the old ENS doc.

## Developer guide

### How to setup

```
yarn install
yarn build
```

### How to run tests

```
yarn test
```

### How deploy

```
yarn deploy --network <NETWORK_NAME>
```
