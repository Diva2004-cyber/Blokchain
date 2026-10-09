import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  console.log("====================================================");
  console.log("Deploying CredentialRegistry Contract (Milestone M2)");
  console.log("====================================================");
  console.log("Deployer Address:", deployer.address);
  console.log("Network Chain ID:", network.chainId.toString());
  console.log("Deployer Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");

  const RegistryFactory = await ethers.getContractFactory("CredentialRegistry");
  const registry = await RegistryFactory.deploy();
  await registry.waitForDeployment();

  const registryAddress = await registry.getAddress();
  const deploymentTx = registry.deploymentTransaction();

  console.log("CredentialRegistry Deployed to:", registryAddress);
  console.log("Deployment Tx Hash:", deploymentTx?.hash);
  console.log("Contract Admin:", await registry.admin());
  console.log("====================================================");
}

main().catch((error) => {
  console.error("Deployment failed:", error);
  process.exitCode = 1;
});
