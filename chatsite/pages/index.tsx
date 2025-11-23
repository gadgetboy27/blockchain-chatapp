import { useState, useEffect } from 'react';
import Head from 'next/head';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useWalletClient } from 'wagmi';
import { MessageSquare, Upload, Users, Shield, Lock, Zap } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Home() {
  const { address, isConnected } = useAccount();
  const [hasProfile, setHasProfile] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-indigo-950 dark:to-purple-950">
      <Head>
        <title>Blockchain ChatApp - Decentralized Immutable Messaging</title>
        <meta name="description" content="Secure, censorship-resistant messaging on the blockchain" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <MessageSquare className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
              <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Blockchain ChatApp
              </h1>
            </div>
            <ConnectButton />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {!isConnected ? (
          <WelcomeScreen />
        ) : (
          <Dashboard address={address!} />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-sm text-gray-600 dark:text-gray-400">
            <p>Decentralized • Immutable • Censorship-Resistant</p>
            <p className="mt-2">Built with Ethereum, IPFS, and end-to-end encryption</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function WelcomeScreen() {
  return (
    <div className="text-center">
      <div className="animate-fade-in">
        <h2 className="text-5xl font-extrabold text-gray-900 dark:text-white sm:text-6xl">
          <span className="block">Decentralized</span>
          <span className="block bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Immutable Messaging
          </span>
        </h2>
        <p className="mt-6 max-w-2xl mx-auto text-xl text-gray-600 dark:text-gray-300">
          Send messages and share files that can never be taken down. Built on blockchain technology
          with end-to-end encryption and IPFS storage.
        </p>

        <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
          <FeatureCard
            icon={<Shield className="w-12 h-12 text-green-500" />}
            title="Censorship-Resistant"
            description="Messages stored on IPFS and blockchain - impossible to censor or delete"
          />
          <FeatureCard
            icon={<Lock className="w-12 h-12 text-blue-500" />}
            title="End-to-End Encrypted"
            description="Your messages are encrypted before leaving your device. Only you and recipient can read them"
          />
          <FeatureCard
            icon={<Zap className="w-12 h-12 text-purple-500" />}
            title="Low-Cost Transactions"
            description="Deployed on Polygon for pennies per message. Pay-per-use model prevents spam"
          />
          <FeatureCard
            icon={<Upload className="w-12 h-12 text-orange-500" />}
            title="Immutable File Storage"
            description="Upload files to IPFS - permanent storage that exists as long as the internet does"
          />
          <FeatureCard
            icon={<Users className="w-12 h-12 text-pink-500" />}
            title="Group Channels"
            description="Create public or private channels for community discussions"
          />
          <FeatureCard
            icon={<MessageSquare className="w-12 h-12 text-indigo-500" />}
            title="Your Identity, Your Data"
            description="Blockchain-based profiles. You own your identity and reputation"
          />
        </div>

        <div className="mt-12">
          <ConnectButton.Custom>
            {({ openConnectModal }) => (
              <button
                onClick={openConnectModal}
                className="px-8 py-4 text-lg font-semibold rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 transform transition hover:scale-105 shadow-lg"
              >
                Connect Wallet to Get Started
              </button>
            )}
          </ConnectButton.Custom>
        </div>
      </div>

      <div className="mt-20 max-w-4xl mx-auto">
        <h3 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-8">
          How It Works
        </h3>
        <div className="space-y-6">
          <Step
            number="1"
            title="Connect Your Wallet"
            description="Use MetaMask or any Web3 wallet. Your wallet is your identity - no email or password needed."
          />
          <Step
            number="2"
            title="Create Your Profile"
            description="Set up your on-chain profile with a username. This costs a small one-time fee to prevent spam."
          />
          <Step
            number="3"
            title="Send Messages & Files"
            description="Messages are encrypted and stored on IPFS. Only a small hash goes on-chain, keeping costs low. Each message costs ~$0.001 on Polygon."
          />
          <Step
            number="4"
            title="Truly Immutable"
            description="Once sent, messages and files exist forever. No central server can censor, delete, or modify your data."
          />
        </div>
      </div>
    </div>
  );
}

function Dashboard({ address }: { address: string }) {
  return (
    <div className="animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Welcome Back!
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          Connected as: <span className="font-mono text-sm">{address}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
            Messages
          </h3>
          <div className="flex items-center justify-center h-64 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
            <div className="text-center">
              <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                Create a profile to start messaging
              </p>
              <button className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition">
                Create Profile
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              Quick Stats
            </h3>
            <div className="space-y-3">
              <Stat label="Messages Sent" value="0" />
              <Stat label="Files Uploaded" value="0" />
              <Stat label="Reputation" value="0" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-xl p-6 text-white">
            <h3 className="text-lg font-bold mb-2">Gas Fees</h3>
            <p className="text-sm opacity-90 mb-4">
              Using Polygon for ultra-low transaction costs
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Message:</span>
                <span className="font-bold">~$0.001</span>
              </div>
              <div className="flex justify-between">
                <span>File Upload:</span>
                <span className="font-bold">~$0.002</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg hover:shadow-xl transition transform hover:-translate-y-1">
      <div className="flex flex-col items-center text-center">
        <div className="mb-4">{icon}</div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{title}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-300">{description}</p>
      </div>
    </div>
  );
}

function Step({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div className="flex items-start space-x-4">
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold">
        {number}
      </div>
      <div>
        <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{title}</h4>
        <p className="text-gray-600 dark:text-gray-300">{description}</p>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-gray-600 dark:text-gray-400">{label}</span>
      <span className="text-2xl font-bold text-gray-900 dark:text-white">{value}</span>
    </div>
  );
}
