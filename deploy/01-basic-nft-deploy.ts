import { HardhatRuntimeEnvironment as hre } from "hardhat/types"
import {
      developmentChains,
      networkConfig,
      VERIFICATION_BLOCK_CONFIRMATIONS,
} from "../helper-hardhat-config"
const deployBasicNft = async ({ getNamedAccounts, deployments, network }: hre) => {
      const { deploy, log } = deployments
      const { deployer } = await getNamedAccounts()
      const args: any = []
      await deploy("BasicNft", {
            from: deployer,
            args: args,
            log: true,
            waitConfirmations: developmentChains.includes(network.name)
                  ? 1
                  : VERIFICATION_BLOCK_CONFIRMATIONS,
      })
      log("------------------------------------------------------------")
}
export default deployBasicNft
deployBasicNft.tags = ["basicNft", "all"]
