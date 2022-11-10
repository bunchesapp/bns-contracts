// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "./BNS.sol";
import "./IBaseRegistrar.sol";
import "./ReverseRegistrar.sol";
import {PublicResolver} from "./PublicResolver.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract BNSRegistrar is ERC721, IBaseRegistrar, Ownable {
    // The BNS registry
    BNS public bns;
    // The Reverse Registrar
    ReverseRegistrar public immutable reverseRegistrar;

    // The namehash of the TLD this registrar owns (eg, .b)
    bytes32 public baseNode;
    bytes4 private constant INTERFACE_META_ID =
        bytes4(keccak256("supportsInterface(bytes4)"));
    bytes4 private constant ERC721_ID =
        bytes4(
            keccak256("balanceOf(address)") ^
                keccak256("ownerOf(uint256)") ^
                keccak256("approve(address,uint256)") ^
                keccak256("getApproved(uint256)") ^
                keccak256("setApprovalForAll(address,bool)") ^
                keccak256("isApprovedForAll(address,address)") ^
                keccak256("transferFrom(address,address,uint256)") ^
                keccak256("safeTransferFrom(address,address,uint256)") ^
                keccak256("safeTransferFrom(address,address,uint256,bytes)")
        );
    bytes4 private constant RECLAIM_ID =
        bytes4(keccak256("reclaim(uint256,address)"));

    constructor(
        BNS _bns,
        bytes32 _baseNode,
        ReverseRegistrar _reverseRegistrar
    ) ERC721("", "") {
        bns = _bns;
        baseNode = _baseNode;
        reverseRegistrar = _reverseRegistrar;
    }

    modifier live() {
        require(bns.owner(baseNode) == address(this));
        _;
    }

    // Set the resolver for the TLD this registrar manages.
    function setResolver(address resolver) external override onlyOwner {
        bns.setResolver(baseNode, resolver);
    }

    /**
     * @dev Register a name.
     * @param name The label to be registered and used for ID (keccak256(name)).
     * @param owner The address that should own the registration.
     * @param data used for multicall on public resolver to set records
     * @param resolver The address of the resolver.
     */
    function register(
        string calldata name,
        address owner,
        bytes[] calldata data,
        address resolver
    ) external override {
        _register(name, owner, data, resolver, true, true);
    }

    /**
     * @dev Register a name, without modifying the registry.
     * @param name The label to be registered and used for ID (keccak256(name))
     * @param owner The address that should own the registration.
     * @param data used for multicall on public resolver to set records
     * @param resolver The address of the resolver.
     */
    function registerOnly(
        string calldata name,
        address owner,
        bytes[] calldata data,
        address resolver
    ) external {
        _register(name, owner, data, resolver, false, false);
    }

    function _register(
        string calldata name,
        address owner,
        bytes[] calldata data,
        address resolver,
        bool updateRegistry,
        bool reverseRecord
    ) internal live {
        uint256 id = uint256(keccak256(abi.encodePacked(name)));
        _mint(owner, id);
        if (updateRegistry) {
            bns.setSubnodeOwner(baseNode, bytes32(id), owner);
        }
        if (data.length > 0) {
            _setRecords(resolver, name, data);
        }
        if (reverseRecord) {
            _setReverseRecord(name, resolver, msg.sender);
        }

        emit NameRegistered(id, owner);
    }

    /**
     * @dev Reclaim ownership of a name in BNS, if you own it in the registrar.
     */
    function reclaim(uint256 id, address owner) external override live {
        require(_isApprovedOrOwner(msg.sender, id));
        bns.setSubnodeOwner(baseNode, bytes32(id), owner);
    }

    function _setRecords(
        address resolverAddress,
        string calldata label,
        bytes[] calldata data
    ) internal {
        bytes32 nodehash = keccak256(abi.encodePacked(baseNode, label));
        PublicResolver resolver = PublicResolver(resolverAddress);
        resolver.multicallWithNodeCheck(nodehash, data);
    }

    function _setReverseRecord(
        string memory name,
        address resolver,
        address owner
    ) internal {
        reverseRegistrar.setNameForAddr(
            msg.sender,
            owner,
            resolver,
            string.concat(name, ".b")
        );
    }

    function supportsInterface(bytes4 interfaceID)
        public
        pure
        override(ERC721, IERC165)
        returns (bool)
    {
        return
            interfaceID == INTERFACE_META_ID ||
            interfaceID == ERC721_ID ||
            interfaceID == RECLAIM_ID;
    }
}
