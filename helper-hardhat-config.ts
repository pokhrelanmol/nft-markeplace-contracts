import { ethers } from "hardhat"
interface NetworkConfigType {
      [key: number]: {
            name: string
      }
}
export const networkConfig: NetworkConfigType = {
      31337: {
            name: "localhost",
      },
      5: {
            name: "goerli",
      },
}

export const developmentChains = ["hardhat", "localhost"]
export const VERIFICATION_BLOCK_CONFIRMATIONS = 6
// export const frontEndContractsFile = "../nextjs-smartcontract-lottery-fcc/constants/contractAddresses.json"
