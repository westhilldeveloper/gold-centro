'use client';
import { AuthProvider } from './context/AuthContext';
import './globals.css';
import MobileContainer from './components/MobileContainer';
import { SocketBoot } from './components/SocketBoot'; 

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-gray-100 antialiased">
        <AuthProvider>
          <SocketBoot /> 
          <MobileContainer>
            {children}
          </MobileContainer>
        </AuthProvider>
      </body>
    </html>
  );
}