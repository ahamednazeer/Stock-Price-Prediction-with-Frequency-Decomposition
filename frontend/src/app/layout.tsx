import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SuperTokensProvider } from "@/components/SuperTokensProvider";

const inter = Inter({
    variable: "--font-inter",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "StockFreq AI — Stock Price Prediction with Frequency Decomposition",
    description: "Industry-standard stock price prediction dashboard using Deep Learning (CNN-LSTM) and Frequency Decomposition (EMD/CEEMD) with live market data.",
};

export const viewport: Viewport = {
    themeColor: "#0f172a",
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <SuperTokensProvider>
                <body className={`${inter.variable} font-sans antialiased`}>
                    {children}
                </body>
            </SuperTokensProvider>
        </html>
    );
}
