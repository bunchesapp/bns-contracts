// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "./BNS.sol";
import "./IBaseRegistrar.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract BNSRegistrar is ERC721, IBaseRegistrar, Ownable {
    // The BNS registry
    BNS public bns;
    // The namehash of the TLD this registrar owns (eg, .eth)
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

    constructor(BNS _bns, bytes32 _baseNode) ERC721("", "") {
        bns = _bns;
        baseNode = _baseNode;
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
     * @param id The token ID (keccak256 of the label).
     * @param owner The address that should own the registration.
     */
    function register(uint256 id, address owner) external override {
        _register(id, owner, true);
    }

    /**
     * @dev Register a name, without modifying the registry.
     * @param id The token ID (keccak256 of the label).
     * @param owner The address that should own the registration.
     */
    function registerOnly(uint256 id, address owner) external {
        _register(id, owner, false);
    }

    function _register(
        uint256 id,
        address owner,
        bool updateRegistry
    ) internal live {
        _mint(owner, id);
        if (updateRegistry) {
            bns.setSubnodeOwner(baseNode, bytes32(id), owner);
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
