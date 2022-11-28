// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;
import "../node_modules/@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "../node_modules/@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "hardhat/console.sol";

error NftMarketplace__PriceMustBeAboveZero();
error NftMarketplace__NotApprovedForMarketplace();
error NftMarketplace__AlreadyListed(address nftAddress, uint256 tokenId);
error NftMarketplace__NotOwner();
error NftMarketplace__NotListed(address nftAddress, uint256 tokenId);
error NftMarketplace__PriceNotMet(address nftAddress, uint256 tokenId, uint256 price);
error NftMarketplace__NoProceed();
error NftMarketplace__TransferFail();

contract NftMarketplace is ReentrancyGuard {
    event ItemListed(
        address indexed seller,
        address indexed nftAddress,
        uint256 indexed tokenId,
        uint256 price
    );
    event ItemBought(
        address indexed buyer,
        address indexed nftAddress,
        uint256 indexed tokenId,
        uint256 price
    );

    event ItemCanceled(address indexed seller, address indexed nftAddress, uint256 indexed tokenId);
    struct Listing {
        address payable seller;
        uint256 price;
    }
    // NFT address => NFT ID => listing
    mapping(address => mapping(uint256 => Listing)) private s_listings;
    //   Seller => amountEarned
    mapping(address => uint256) private s_proceeds;

    /*************
     * MODIFIERS *
     *************/
    modifier notAlreadyListed(address nftAddress, uint256 tokenId) {
        Listing memory listing = s_listings[nftAddress][tokenId];
        if (listing.price > 0) {
            revert NftMarketplace__AlreadyListed(nftAddress, tokenId);
        }
        _;
    }
    modifier isOwner(
        address nftAddress,
        uint256 tokenId,
        address owner
    ) {
        if (IERC721(nftAddress).ownerOf(tokenId) != owner) {
            revert NftMarketplace__NotOwner();
        }
        _;
    }

    modifier isListed(address nftAddress, uint256 tokenId) {
        Listing memory listing = s_listings[nftAddress][tokenId];
        if (listing.price <= 0) {
            revert NftMarketplace__NotListed(nftAddress, tokenId);
        }
        _;
    }

    /*****************
     * MAIN FUNCTION *
     *****************/

    /**
     * @notice Method to list an NFT for sale on the marketplace
     * @param nftAddress The address of the NFT
     * @param tokenId The ID of the NFT to list
     * @param price The price of the NFT
     */

    function listItem(
        address nftAddress,
        uint256 tokenId,
        uint256 price
    ) external notAlreadyListed(nftAddress, tokenId) isOwner(nftAddress, tokenId, msg.sender) {
        //list item
        if (price <= 0) {
            revert NftMarketplace__PriceMustBeAboveZero();
        }

        /* - Owner can hold the nft and give marketplace approval to sold those nft - */

        address operator = IERC721(nftAddress).getApproved(tokenId);
        if (operator != address(this)) revert NftMarketplace__NotApprovedForMarketplace();
        /* -------------------------------- what data structrure should we use? ------------------------------- */
        s_listings[nftAddress][tokenId] = Listing({seller: payable(msg.sender), price: price});
        emit ItemListed(msg.sender, nftAddress, tokenId, price);
    }

    function buyItem(
        address nftAddress,
        uint256 tokenId
    ) external payable nonReentrant isListed(nftAddress, tokenId) {
        Listing memory listedItem = s_listings[nftAddress][tokenId];
        if (msg.value < listedItem.price) {
            revert NftMarketplace__PriceNotMet(nftAddress, tokenId, listedItem.price);
        }
        // we are not transfering the money to the seller, we are just updating the mapping, seller can withdraw the money later
        s_proceeds[listedItem.seller] = s_proceeds[listedItem.seller] + msg.value; // appending the value to the seller's proceeds
        delete (s_listings[nftAddress][tokenId]); // deleting the listing
        IERC721(nftAddress).safeTransferFrom(listedItem.seller, msg.sender, tokenId); // transferring the nft to the buyer
        emit ItemBought(msg.sender, nftAddress, tokenId, listedItem.price);
    }

    function cancelListing(
        address nftAddress,
        uint256 tokenId
    ) external isOwner(nftAddress, tokenId, msg.sender) isListed(nftAddress, tokenId) {
        delete (s_listings[nftAddress][tokenId]);
        emit ItemCanceled(msg.sender, nftAddress, tokenId);
    }

    function updateListing(
        address nftAddress,
        uint256 tokenId,
        uint256 newPrice
    ) external isOwner(nftAddress, tokenId, msg.sender) isListed(nftAddress, tokenId) {
        s_listings[nftAddress][tokenId].price = newPrice;
        emit ItemListed(msg.sender, nftAddress, tokenId, newPrice);
    }

    function withdrawProceed() external nonReentrant {
        uint256 amount = s_proceeds[msg.sender];
        if (amount <= 0) revert NftMarketplace__NoProceed();
        s_proceeds[msg.sender] = 0;
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        if (!success) {
            revert NftMarketplace__TransferFail();
        }
    }

    /*******************
     * GETTER FUNCTIONS *
     *******************/

    function getProceeds(address seller) external view returns (uint256) {
        return s_proceeds[seller];
    }

    function getListing(
        address nftAddress,
        uint256 tokenId
    ) external view returns (address seller, uint256 price) {
        Listing memory listing = s_listings[nftAddress][tokenId];
        return (listing.seller, listing.price);
    }
}
