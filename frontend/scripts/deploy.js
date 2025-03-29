const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  const HostelAllocation = await hre.ethers.getContractFactory("HostelAllocation");
  const hostelAllocation = await HostelAllocation.deploy();
  await hostelAllocation.waitForDeployment();

  const address = await hostelAllocation.getAddress();
  console.log("HostelAllocation deployed to:", address);

  const fs = require("fs");
  const abi = HostelAllocation.interface.formatJson();
  fs.writeFileSync("./src/HostelAllocationABI.json", abi);
  console.log("ABI copied to src/HostelAllocationABI.json");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});