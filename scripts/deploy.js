const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Starting deployment...\n");

  const [deployer] = await hre.ethers.getSigners();
  const network = await hre.ethers.provider.getNetwork();

  console.log("📋 Deployment Details:");
  console.log("  Network:", network.name, `(Chain ID: ${network.chainId})`);
  console.log("  Deployer:", deployer.address);
  console.log("  Balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "ETH\n");

  // Deploy UserProfile
  console.log("📝 Deploying UserProfile...");
  const UserProfile = await hre.ethers.getContractFactory("UserProfile");
  const userProfile = await UserProfile.deploy();
  await userProfile.waitForDeployment();
  const userProfileAddress = await userProfile.getAddress();
  console.log("✅ UserProfile deployed to:", userProfileAddress);

  // Deploy MessageRegistry
  console.log("\n📝 Deploying MessageRegistry...");
  const MessageRegistry = await hre.ethers.getContractFactory("MessageRegistry");
  const messageRegistry = await MessageRegistry.deploy();
  await messageRegistry.waitForDeployment();
  const messageRegistryAddress = await messageRegistry.getAddress();
  console.log("✅ MessageRegistry deployed to:", messageRegistryAddress);

  // Deploy FileStorage
  console.log("\n📝 Deploying FileStorage...");
  const FileStorage = await hre.ethers.getContractFactory("FileStorage");
  const fileStorage = await FileStorage.deploy();
  await fileStorage.waitForDeployment();
  const fileStorageAddress = await fileStorage.getAddress();
  console.log("✅ FileStorage deployed to:", fileStorageAddress);

  // Save deployment info
  const deploymentInfo = {
    network: network.name,
    chainId: network.chainId.toString(),
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      UserProfile: userProfileAddress,
      MessageRegistry: messageRegistryAddress,
      FileStorage: fileStorageAddress
    },
    fees: {
      messageFee: hre.ethers.formatEther(await messageRegistry.messageFee()),
      uploadFee: hre.ethers.formatEther(await fileStorage.uploadFee()),
      registrationFee: hre.ethers.formatEther(await userProfile.registrationFee())
    }
  };

  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir);
  }

  const filename = `deployment-${network.name}-${Date.now()}.json`;
  fs.writeFileSync(
    path.join(deploymentsDir, filename),
    JSON.stringify(deploymentInfo, null, 2)
  );

  // Also save latest deployment
  fs.writeFileSync(
    path.join(deploymentsDir, `latest-${network.name}.json`),
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("\n📄 Deployment info saved to:", filename);

  // Generate frontend config
  const frontendConfig = `// Auto-generated deployment configuration
export const contracts = {
  UserProfile: "${userProfileAddress}",
  MessageRegistry: "${messageRegistryAddress}",
  FileStorage: "${fileStorageAddress}"
};

export const chainId = ${network.chainId};
export const networkName = "${network.name}";
`;

  const frontendDir = path.join(__dirname, "../chatsite/config");
  if (!fs.existsSync(frontendDir)) {
    fs.mkdirSync(frontendDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(frontendDir, "contracts.ts"),
    frontendConfig
  );

  console.log("✅ Frontend config generated\n");

  // Verification instructions
  if (network.name !== "hardhat" && network.name !== "localhost") {
    console.log("🔍 To verify contracts on Polygonscan, run:");
    console.log(`  npx hardhat verify --network ${network.name} ${userProfileAddress}`);
    console.log(`  npx hardhat verify --network ${network.name} ${messageRegistryAddress}`);
    console.log(`  npx hardhat verify --network ${network.name} ${fileStorageAddress}`);
  }

  console.log("\n✨ Deployment complete!\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
