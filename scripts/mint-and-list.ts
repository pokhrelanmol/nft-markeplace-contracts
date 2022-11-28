import { ethers, network } from "hardhat"
import { BasicNft, NftMarketplace } from "../typechain-types"

const mintAndList = async () => {
    const basicNft: BasicNft = await ethers.getContract("BasicNft")
    const nftMarketplace: NftMarketplace = await ethers.getContract("NftMarketplace")
    const PRICE = ethers.utils.parseEther("0.1")
    // Mint
    console.log("Minting NFT...")
    const mintTx = await basicNft.mintNft()
    const mintTxReceipt = await mintTx.wait(1)
    const tokenId = mintTxReceipt.events![0].args?.tokenId
    //     Approve
    console.log("Approving NFT For Marketplace...")
    await basicNft.approve(nftMarketplace.address, tokenId)
    // List
    console.log("Listing NFT...")
    const tx = await nftMarketplace.listItem(basicNft.address, tokenId, PRICE)
    await tx.wait(1)

    console.log("Done!")
}
mintAndList()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
