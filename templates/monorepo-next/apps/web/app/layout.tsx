export const metadata = {
  title: 'Solana Wallet & DeFi App',
  description: 'A wallet application for Solana blockchain with swap and stake features',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, backgroundColor: '#f5f7fa' }}>
        {children}
      </body>
    </html>
  )
}
