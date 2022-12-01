// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "./BNS.sol";
import "./IBaseRegistrar.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721Upgradeable.sol";

interface IBaseRegistrar is IERC721Upgradeable {
    event NameMigrated(uint256 indexed id, address indexed owner);
    event NameRegistered(uint256 indexed id, address indexed owner);

    // Set the resolver for the TLD this registrar manages.
    function setResolver(address resolver) external;

    /**
     * @dev Register a name.
     */
    function register(
        string calldata name,
        address owner,
        bytes[] calldata data,
        address resolver
    ) external;

    /**
     * @dev Reclaim ownership of a name in BNS, if you own it in the registrar.
     */
    function reclaim(uint256 id, address owner) external;
}
