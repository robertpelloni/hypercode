'use client';

import { WagmiProvider, createConfig, http } from 'wagmi';
import { mainnet, sepolia, polygon, arbitrum, optimism, base } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { injected, walletConnect } from 'wagmi/connectors';

// WalletConnect Project ID - get yours at https://cloud.walletconnect.com
const WALLETCONNECT_PROJECT_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'demo-project-id';

const config = createConfig({
  chains: [mainnet, sepolia, polygon, arbitrum, optimism, base],
  connectors: [
    injected(),
    walletConnect({
      projectId: WALLETCONNECT_PROJECT_ID,
      metadata: {
<<<<<<< HEAD:archive/ts-legacy/packages/ui/src/components/providers/web3-provider.tsx
        name: 'HyperCode Dashboard',
        description: 'HyperCode - AI Operating System - Bobcoin Wallet',
        url: 'https://hypercode.local',
        icons: ['https://hypercode.local/icon.png'],
=======
        name: 'borg Dashboard',
        description: 'borg - AI Operating System - Bobcoin Wallet',
        url: 'https://borg.local',
        icons: ['https://borg.local/icon.png'],
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/ui/src/components/providers/web3-provider.tsx
      },
      showQrModal: true,
    }),
  ],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
    [polygon.id]: http(),
    [arbitrum.id]: http(),
    [optimism.id]: http(),
    [base.id]: http(),
  },
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      gcTime: 1000 * 60 * 5, // 5 minutes (previously cacheTime)
    },
  },
});

export function Web3Provider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export { config };
