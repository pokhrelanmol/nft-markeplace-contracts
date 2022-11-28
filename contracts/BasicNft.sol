// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;
import "../node_modules/@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "../node_modules/hardhat/console.sol";

contract BasicNft is ERC721 {
    event NftMinted(uint256 tokenId);
    uint256 private s_counter;
    string public constant TOKEN_URI =
        "ipfs://bafybeig37ioir76s7mg5oobetncojcm3c3hxasyd4rvid4jqhy4gkaheg4/?filename=0-PUG.json";

    constructor() ERC721("DOGGIE", "DOG") {
        s_counter = 0;
    }

    function mintNft() public {
        _safeMint(msg.sender, s_counter);
        emit NftMinted(s_counter);
        s_counter++;
    }

    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        return TOKEN_URI;
    }

    function getCounter() external view returns (uint256) {
        return s_counter;
    }
}
