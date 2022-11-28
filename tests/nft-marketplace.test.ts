import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { expect, assert } from "chai"
import { deployments, ethers, getNamedAccounts, network } from "hardhat"
import { developmentChains } from "../helper-hardhat-config"
import { BasicNft, NftMarketplace } from "../typechain-types"
!developmentChains.includes(network.name)
    ? describe.skip
    : describe("NFT Marketplace", () => {
          let basicNft: BasicNft
          let nftMarketplace: NftMarketplace
          let deployer: string
          let player: SignerWithAddress
          const PRICE = ethers.utils.parseEther("0.1")
          const TOKEN_ID = 0
          beforeEach(async () => {
              await deployments.fixture(["all"])
              basicNft = await ethers.getContract("BasicNft")
              nftMarketplace = await ethers.getContract("NftMarketplace")
              ;({ deployer } = await getNamedAccounts())
              player = (await ethers.getSigners())[1]
              await basicNft.mintNft()
              await basicNft.approve(nftMarketplace.address, TOKEN_ID)
          })
          describe("List Nft", () => {
              it("Emit ItemListed Event", async () => {
                  await expect(nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE))
                      .to.emit(nftMarketplace, "ItemListed")
                      .withArgs(deployer, basicNft.address, TOKEN_ID, PRICE)
              })
              it("Revert if nft is already listed", async () => {
                  await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                  const error = `NftMarketplace__AlreadyListed(${basicNft.address}, ${TOKEN_ID})`
                  await expect(
                      nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                  ).to.be.revertedWithCustomError(nftMarketplace, "NftMarketplace__AlreadyListed")
              })
              it("Revert of lister is not owner of nft", async () => {
                  await expect(
                      nftMarketplace.connect(player).listItem(basicNft.address, TOKEN_ID, PRICE)
                  ).to.be.revertedWithCustomError(nftMarketplace, "NftMarketplace__NotOwner")
              })
              it("Reverts if price is 0 or less", async () => {
                  await expect(
                      nftMarketplace.listItem(basicNft.address, TOKEN_ID, 0)
                  ).to.be.revertedWithCustomError(
                      nftMarketplace,
                      "NftMarketplace__PriceMustBeAboveZero"
                  )
              })
              it("revert if marketplace is not approved", async () => {
                  await basicNft.approve(ethers.constants.AddressZero, TOKEN_ID)
                  await expect(
                      nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                  ).to.be.revertedWithCustomError(
                      nftMarketplace,
                      "NftMarketplace__NotApprovedForMarketplace"
                  )
              })
              it("Update Listing with seller and price ", async () => {
                  await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                  const { seller, price } = await nftMarketplace.getListing(
                      basicNft.address,
                      TOKEN_ID
                  )
                  assert.equal(seller, deployer)
                  assert.equal(price.toString(), PRICE.toString())
              })
          })
          describe("Buy Nft", () => {
              it("Emit ItemSold Event", async () => {
                  await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                  await expect(
                      nftMarketplace
                          .connect(player)
                          .buyItem(basicNft.address, TOKEN_ID, { value: PRICE })
                  )
                      .to.emit(nftMarketplace, "ItemBought")
                      .withArgs(player.address, basicNft.address, TOKEN_ID, PRICE)
              })
              it("Reverts if Price is less than listed price", async () => {
                  await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                  await expect(
                      nftMarketplace
                          .connect(player)
                          .buyItem(basicNft.address, TOKEN_ID, { value: PRICE.sub(1) })
                  ).to.be.revertedWithCustomError(nftMarketplace, "NftMarketplace__PriceNotMet")
              })
              it("Reverts if Nft is not listed", async () => {
                  await expect(
                      nftMarketplace
                          .connect(player)
                          .buyItem(basicNft.address, TOKEN_ID, { value: PRICE })
                  ).to.be.revertedWithCustomError(nftMarketplace, "NftMarketplace__NotListed")
              })
              it("Increase seller Proceeds", async () => {
                  await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                  await nftMarketplace
                      .connect(player)
                      .buyItem(basicNft.address, TOKEN_ID, { value: PRICE })
                  const proceeds = await nftMarketplace.getProceeds(deployer)
                  assert.equal(proceeds.toString(), PRICE.toString())
              })
              it("should delete listing after purchase", async () => {
                  await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                  await nftMarketplace
                      .connect(player)
                      .buyItem(basicNft.address, TOKEN_ID, { value: PRICE })
                  const { seller, price } = await nftMarketplace.getListing(
                      basicNft.address,
                      TOKEN_ID
                  )
                  assert.equal(seller, ethers.constants.AddressZero)
                  assert.equal(price.toString(), "0")
              })
              it("Change the owner of the NFT", async () => {
                  await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                  await nftMarketplace
                      .connect(player)
                      .buyItem(basicNft.address, TOKEN_ID, { value: PRICE })
                  const owner = await basicNft.ownerOf(TOKEN_ID)
                  assert.equal(owner, player.address)
              })
          })
          describe("Cancel Listing", () => {
              it("should emit ItemCanceled event", async () => {
                  await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                  await expect(nftMarketplace.cancelListing(basicNft.address, TOKEN_ID))
                      .to.emit(nftMarketplace, "ItemCanceled")
                      .withArgs(deployer, basicNft.address, TOKEN_ID)
              })
              it("should revert if not owner", async () => {
                  await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                  await expect(
                      nftMarketplace.connect(player).cancelListing(basicNft.address, TOKEN_ID)
                  ).to.be.revertedWithCustomError(nftMarketplace, "NftMarketplace__NotOwner")
              })
              it("should revert if not listed", async () => {
                  await expect(
                      nftMarketplace.cancelListing(basicNft.address, TOKEN_ID)
                  ).to.be.revertedWithCustomError(nftMarketplace, "NftMarketplace__NotListed")
              })
              it("should delete listing", async () => {
                  await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                  await nftMarketplace.cancelListing(basicNft.address, TOKEN_ID)
                  const { seller, price } = await nftMarketplace.getListing(
                      basicNft.address,
                      TOKEN_ID
                  )
                  assert.equal(seller, ethers.constants.AddressZero)
                  assert.equal(price.toString(), "0")
              })
          })
          describe("Update Listing", () => {
              it("should emit ItemListed event", async () => {
                  await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                  await expect(
                      nftMarketplace.updateListing(basicNft.address, TOKEN_ID, PRICE.add(1))
                  )
                      .to.emit(nftMarketplace, "ItemListed")
                      .withArgs(deployer, basicNft.address, TOKEN_ID, PRICE.add(1))
              })
              it("should revert if not owner", async () => {
                  await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                  await expect(
                      nftMarketplace
                          .connect(player)
                          .updateListing(basicNft.address, TOKEN_ID, PRICE.add(1))
                  ).to.be.revertedWithCustomError(nftMarketplace, "NftMarketplace__NotOwner")
              })
              it("should revert if not listed", async () => {
                  await expect(
                      nftMarketplace.updateListing(basicNft.address, TOKEN_ID, PRICE.add(1))
                  ).to.be.revertedWithCustomError(nftMarketplace, "NftMarketplace__NotListed")
              })
              it("should update listing", async () => {
                  await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                  await nftMarketplace.updateListing(basicNft.address, TOKEN_ID, PRICE.add(1))
                  const { seller, price } = await nftMarketplace.getListing(
                      basicNft.address,
                      TOKEN_ID
                  )
                  assert.equal(seller, deployer)
                  assert.equal(price.toString(), PRICE.add(1).toString())
              })
          })
          describe("Withdraw Proceeds", () => {
              it("should revert if no proceeds", async () => {
                  await expect(nftMarketplace.withdrawProceed()).to.be.revertedWithCustomError(
                      nftMarketplace,
                      "NftMarketplace__NoProceed"
                  )
              })
              it("should transfer proceeds to owner", async () => {
                  await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                  await nftMarketplace
                      .connect(player)
                      .buyItem(basicNft.address, TOKEN_ID, { value: PRICE })
                  await nftMarketplace.withdrawProceed()
                  const proceed = await nftMarketplace.getProceeds(deployer)
                  assert.equal(proceed.toString(), "0")
              })
          })
      })
