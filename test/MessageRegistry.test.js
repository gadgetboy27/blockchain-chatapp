const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("MessageRegistry", function () {
  async function deployMessageRegistryFixture() {
    const [owner, user1, user2, user3] = await ethers.getSigners();

    const MessageRegistry = await ethers.getContractFactory("MessageRegistry");
    const messageRegistry = await MessageRegistry.deploy();

    return { messageRegistry, owner, user1, user2, user3 };
  }

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      const { messageRegistry, owner } = await loadFixture(deployMessageRegistryFixture);
      expect(await messageRegistry.owner()).to.equal(owner.address);
    });

    it("Should have correct initial message fee", async function () {
      const { messageRegistry } = await loadFixture(deployMessageRegistryFixture);
      expect(await messageRegistry.messageFee()).to.equal(ethers.parseEther("0.001"));
    });
  });

  describe("Direct Messaging", function () {
    it("Should send a message successfully", async function () {
      const { messageRegistry, user1, user2 } = await loadFixture(deployMessageRegistryFixture);

      const ipfsHash = "QmXyz123abc";
      const fee = await messageRegistry.messageFee();

      await expect(
        messageRegistry.connect(user1).sendMessage(user2.address, ipfsHash, 0, { value: fee })
      )
        .to.emit(messageRegistry, "MessageSent")
        .withArgs(0, user1.address, user2.address, ipfsHash, await ethers.provider.getBlock('latest').then(b => b.timestamp + 1));

      expect(await messageRegistry.getTotalMessages()).to.equal(1);
    });

    it("Should reject message with insufficient fee", async function () {
      const { messageRegistry, user1, user2 } = await loadFixture(deployMessageRegistryFixture);

      const ipfsHash = "QmXyz123abc";
      const insufficientFee = ethers.parseEther("0.0001");

      await expect(
        messageRegistry.connect(user1).sendMessage(user2.address, ipfsHash, 0, { value: insufficientFee })
      ).to.be.revertedWith("Insufficient fee");
    });

    it("Should reject message to zero address", async function () {
      const { messageRegistry, user1 } = await loadFixture(deployMessageRegistryFixture);

      const ipfsHash = "QmXyz123abc";
      const fee = await messageRegistry.messageFee();

      await expect(
        messageRegistry.connect(user1).sendMessage(ethers.ZeroAddress, ipfsHash, 0, { value: fee })
      ).to.be.revertedWith("Invalid recipient");
    });

    it("Should reject message to self", async function () {
      const { messageRegistry, user1 } = await loadFixture(deployMessageRegistryFixture);

      const ipfsHash = "QmXyz123abc";
      const fee = await messageRegistry.messageFee();

      await expect(
        messageRegistry.connect(user1).sendMessage(user1.address, ipfsHash, 0, { value: fee })
      ).to.be.revertedWith("Cannot message yourself");
    });

    it("Should reject empty IPFS hash", async function () {
      const { messageRegistry, user1, user2 } = await loadFixture(deployMessageRegistryFixture);

      const fee = await messageRegistry.messageFee();

      await expect(
        messageRegistry.connect(user1).sendMessage(user2.address, "", 0, { value: fee })
      ).to.be.revertedWith("Invalid IPFS hash");
    });

    it("Should track sent and received messages", async function () {
      const { messageRegistry, user1, user2 } = await loadFixture(deployMessageRegistryFixture);

      const ipfsHash = "QmXyz123abc";
      const fee = await messageRegistry.messageFee();

      await messageRegistry.connect(user1).sendMessage(user2.address, ipfsHash, 0, { value: fee });

      const sentMessages = await messageRegistry.getUserSentMessages(user1.address);
      const receivedMessages = await messageRegistry.getUserReceivedMessages(user2.address);

      expect(sentMessages.length).to.equal(1);
      expect(receivedMessages.length).to.equal(1);
      expect(sentMessages[0]).to.equal(0);
      expect(receivedMessages[0]).to.equal(0);
    });

    it("Should refund excess payment", async function () {
      const { messageRegistry, user1, user2 } = await loadFixture(deployMessageRegistryFixture);

      const ipfsHash = "QmXyz123abc";
      const fee = await messageRegistry.messageFee();
      const excessPayment = fee + ethers.parseEther("0.01");

      const balanceBefore = await ethers.provider.getBalance(user1.address);
      const tx = await messageRegistry.connect(user1).sendMessage(user2.address, ipfsHash, 0, { value: excessPayment });
      const receipt = await tx.wait();
      const gasCost = receipt.gasUsed * receipt.gasPrice;
      const balanceAfter = await ethers.provider.getBalance(user1.address);

      const expectedBalance = balanceBefore - fee - gasCost;
      expect(balanceAfter).to.be.closeTo(expectedBalance, ethers.parseEther("0.0001"));
    });
  });

  describe("Channel Management", function () {
    it("Should create a channel", async function () {
      const { messageRegistry, user1 } = await loadFixture(deployMessageRegistryFixture);

      await expect(messageRegistry.connect(user1).createChannel("General", false))
        .to.emit(messageRegistry, "ChannelCreated");
    });

    it("Should add members to private channel", async function () {
      const { messageRegistry, user1, user2 } = await loadFixture(deployMessageRegistryFixture);

      const tx = await messageRegistry.connect(user1).createChannel("Private", true);
      const receipt = await tx.wait();
      const event = receipt.logs.find(log => {
        try {
          return messageRegistry.interface.parseLog(log).name === "ChannelCreated";
        } catch {
          return false;
        }
      });
      const channelId = messageRegistry.interface.parseLog(event).args[0];

      await expect(messageRegistry.connect(user1).addChannelMember(channelId, user2.address))
        .to.emit(messageRegistry, "MemberAdded")
        .withArgs(channelId, user2.address);

      expect(await messageRegistry.isChannelMember(channelId, user2.address)).to.be.true;
    });

    it("Should send group message", async function () {
      const { messageRegistry, user1, user2 } = await loadFixture(deployMessageRegistryFixture);

      const tx = await messageRegistry.connect(user1).createChannel("General", false);
      const receipt = await tx.wait();
      const event = receipt.logs.find(log => {
        try {
          return messageRegistry.interface.parseLog(log).name === "ChannelCreated";
        } catch {
          return false;
        }
      });
      const channelId = messageRegistry.interface.parseLog(event).args[0];

      const ipfsHash = "QmGroupMessage123";
      const fee = await messageRegistry.messageFee();

      await expect(
        messageRegistry.connect(user2).sendGroupMessage(channelId, ipfsHash, 0, { value: fee })
      ).to.emit(messageRegistry, "GroupMessageSent");
    });
  });

  describe("Rate Limiting", function () {
    it("Should enforce rate limiting", async function () {
      const { messageRegistry, user1, user2 } = await loadFixture(deployMessageRegistryFixture);

      const ipfsHash1 = "QmXyz123abc";
      const ipfsHash2 = "QmXyz456def";
      const fee = await messageRegistry.messageFee();

      await messageRegistry.connect(user1).sendMessage(user2.address, ipfsHash1, 0, { value: fee });

      // Should fail immediately after
      await expect(
        messageRegistry.connect(user1).sendMessage(user2.address, ipfsHash2, 0, { value: fee })
      ).to.be.revertedWith("Rate limit exceeded");
    });
  });

  describe("Admin Functions", function () {
    it("Should allow owner to update message fee", async function () {
      const { messageRegistry, owner } = await loadFixture(deployMessageRegistryFixture);

      const newFee = ethers.parseEther("0.002");
      await messageRegistry.connect(owner).updateMessageFee(newFee);

      expect(await messageRegistry.messageFee()).to.equal(newFee);
    });

    it("Should prevent non-owner from updating fee", async function () {
      const { messageRegistry, user1 } = await loadFixture(deployMessageRegistryFixture);

      const newFee = ethers.parseEther("0.002");
      await expect(
        messageRegistry.connect(user1).updateMessageFee(newFee)
      ).to.be.reverted;
    });

    it("Should allow owner to pause contract", async function () {
      const { messageRegistry, owner, user1, user2 } = await loadFixture(deployMessageRegistryFixture);

      await messageRegistry.connect(owner).pause();

      const ipfsHash = "QmXyz123abc";
      const fee = await messageRegistry.messageFee();

      await expect(
        messageRegistry.connect(user1).sendMessage(user2.address, ipfsHash, 0, { value: fee })
      ).to.be.reverted;
    });

    it("Should allow owner to withdraw fees", async function () {
      const { messageRegistry, owner, user1, user2 } = await loadFixture(deployMessageRegistryFixture);

      const ipfsHash = "QmXyz123abc";
      const fee = await messageRegistry.messageFee();

      // Send some messages to accumulate fees
      await messageRegistry.connect(user1).sendMessage(user2.address, ipfsHash, 0, { value: fee });

      const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);
      const contractBalance = await ethers.provider.getBalance(await messageRegistry.getAddress());

      const tx = await messageRegistry.connect(owner).withdrawFees();
      const receipt = await tx.wait();
      const gasCost = receipt.gasUsed * receipt.gasPrice;

      const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);

      expect(ownerBalanceAfter).to.equal(ownerBalanceBefore + contractBalance - gasCost);
    });
  });
});
