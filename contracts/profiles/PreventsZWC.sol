// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

abstract contract PreventsZWC {
    modifier preventZWC(string memory _name) {
        bytes memory nameinbytes = bytes(_name);
        for (uint256 i; i < nameinbytes.length; i++) {
            if (nameinbytes[i] == 0xe2) {
                //check for U+200A - U+200F
                if (nameinbytes[i + 1] == 0x80) {
                    if (nameinbytes[i + 2] <= 0x8f) {
                        revert("Name cannot contain zero width characters");
                    }
                }
                //check for U+205F - U+206F
                if (nameinbytes[i + 1] == 0x81) {
                    if (
                        nameinbytes[i + 2] >= 0x9f && nameinbytes[i + 2] <= 0xaf
                    ) revert("Name cannot contain zero width characters");
                }
            }
            //check for U+FEFF
            if (nameinbytes[i] == 0xef) {
                if (nameinbytes[i + 1] == 0xbb) {
                    if (nameinbytes[i + 2] == 0xbf)
                        revert("Name cannot contain zero width characters");
                }
            }
            //check for U+1D173 - U+1D17A
            if (nameinbytes[i] == 0xf0) {
                if (nameinbytes[i + 1] == 0x9d) {
                    if (nameinbytes[i + 2] == 0x85) {
                        if (
                            nameinbytes[i + 3] >= 0xb3 &&
                            nameinbytes[i + 3] <= 0xba
                        ) revert("Name cannot contain zero width characters");
                    }
                }
            }
        }
        _;
    }
}
