import verify from "../utils/verify"
import { HardhatRuntimeEnvironment as hre } from "hardhat/types"
import {
      developmentChains,
      networkConfig,
      VERIFICATION_BLOCK_CONFIRMATIONS,
} from "../helper-hardhat-config"
const deployNftMarketplace = async ({ getNamedAccounts, deployments, network }: hre) => {
      const { deploy, log } = deployments
      const { deployer } = await getNamedAccounts()
      const args = []
      const nftMarketplace = await deploy("NftMarketplace", {
            from: deployer,
            args: args,
            log: true,
            waitConfirmations: developmentChains.includes(network.name)
                  ? 1
                  : VERIFICATION_BLOCK_CONFIRMATIONS,
      })
      // verify the contract on etherscan
      if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
            await verify(nftMarketplace.address, args)
      }
      log("------------------------------------------------------------")
}
export default deployNftMarketplace
deployNftMarketplace.tags = ["nftMarketplace", "all"]
