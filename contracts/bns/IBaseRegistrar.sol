// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "./BNS.sol";
import "./IBaseRegistrar.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

interface IBaseRegistrar is IERC721 {
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
     * @dev Reclaim ownership of a name in ENS, if you own it in the registrar.
     */
    function reclaim(uint256 id, address owner) external;
}
