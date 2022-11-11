/// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "./BNS.sol";

/**
 * The BNS registry contract
 */
contract BNSRegistry is BNS {
    struct Record {
        address owner;
        address resolver;
    }

    mapping(bytes32 => Record) records;
    mapping(address => mapping(address => bool)) operators;

    // Permits modifications only by the owner of the specified node.
    modifier authorised(bytes32 _node) {
        address nodeOwner = records[_node].owner;
        require(
            nodeOwner == msg.sender || operators[nodeOwner][msg.sender],
            "Not authorised"
        );
        _;
    }

    /**
     * @dev Constructs a new BNS registry.
     */
    constructor() {
        records[0x0].owner = msg.sender;
    }

    /**
     * @dev Sets the record for a node.
     * @param _node The node to update.
     * @param _owner The address of the new owner.
     * @param _resolver The address of the resolver.
     */
    function setRecord(
        bytes32 _node,
        address _owner,
        address _resolver
    ) external virtual override {
        setOwner(_node, _owner);
        _setResolver(_node, _resolver);
    }

    /**
     * @dev Sets the record for a subnode.
     * @param _node The parent node.
     * @param _label The hash of the label specifying the subnode.
     * @param _owner The address of the new owner.
     * @param _resolver The address of the resolver.
     */
    function setSubnodeRecord(
        bytes32 _node,
        bytes32 _label,
        address _owner,
        address _resolver
    ) external virtual override {
        bytes32 subnode = setSubnodeOwner(_node, _label, _owner);
        _setResolver(subnode, _resolver);
    }

    /**
     * @dev Transfers ownership of a node to a new address. May only be called by the current owner of the node.
     * @param _node The node to transfer ownership of.
     * @param _owner The address of the new owner.
     */
    function setOwner(bytes32 _node, address _owner)
        public
        virtual
        override
        authorised(_node)
    {
        _setOwner(_node, _owner);
        emit Transfer(_node, _owner);
    }

    /**
     * @dev Transfers ownership of a subnode keccak256(node, label) to a new address. May only be called by the owner of the parent node.
     * @param _node The parent node.
     * @param _label The hash of the label specifying the subnode.
     * @param _owner The address of the new owner.
     */
    function setSubnodeOwner(
        bytes32 _node,
        bytes32 _label,
        address _owner
    ) public virtual override authorised(_node) returns (bytes32) {
        bytes32 subnode = keccak256(abi.encodePacked(_node, _label));
        _setOwner(subnode, _owner);
        emit NewOwner(_node, _label, _owner);
        return subnode;
    }

    /**
     * @dev Sets the resolver address for the specified node.
     * @param _node The node to update.
     * @param _resolver The address of the resolver.
     */
    function setResolver(bytes32 _node, address _resolver)
        public
        virtual
        override
        authorised(_node)
    {
        emit NewResolver(_node, _resolver);
        records[_node].resolver = _resolver;
    }

    /**
     * @dev Enable or disable approval for a third party ("operator") to manage
     *  all of `msg.sender`'s BNS records. Emits the ApprovalForAll event.
     * @param _operator Address to add to the set of authorized operators.
     * @param _approved True if the operator is approved, false to revoke approval.
     */
    function setApprovalForAll(address _operator, bool _approved)
        external
        virtual
        override
    {
        operators[msg.sender][_operator] = _approved;
        emit ApprovalForAll(msg.sender, _operator, _approved);
    }

    /**
     * @dev Returns the address that owns the specified node.
     * @param _node The specified node.
     * @return address of the owner.
     */
    function owner(bytes32 _node)
        public
        view
        virtual
        override
        returns (address)
    {
        address addr = records[_node].owner;
        if (addr == address(this)) {
            return address(0x0);
        }

        return addr;
    }

    /**
     * @dev Returns the address of the resolver for the specified node.
     * @param _node The specified node.
     * @return address of the resolver.
     */
    function resolver(bytes32 _node)
        public
        view
        virtual
        override
        returns (address)
    {
        return records[_node].resolver;
    }

    /**
     * @dev Returns whether a record has been imported to the registry.
     * @param _node The specified node.
     * @return Bool if record exists
     */
    function recordExists(bytes32 _node)
        public
        view
        virtual
        override
        returns (bool)
    {
        return records[_node].owner != address(0x0);
    }

    /**
     * @dev Query if an address is an authorized operator for another address.
     * @param _owner The address that owns the records.
     * @param _operator The address that acts on behalf of the owner.
     * @return True if `operator` is an approved operator for `owner`, false otherwise.
     */
    function isApprovedForAll(address _owner, address _operator)
        external
        view
        virtual
        override
        returns (bool)
    {
        return operators[_owner][_operator];
    }

    function _setOwner(bytes32 _node, address _owner) internal virtual {
        records[_node].owner = _owner;
    }

    function _setResolver(bytes32 _node, address _resolver) internal {
        if (_resolver != records[_node].resolver) {
            records[_node].resolver = _resolver;
            emit NewResolver(_node, _resolver);
        }
    }
}
