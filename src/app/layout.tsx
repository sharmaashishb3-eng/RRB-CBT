import type { Metadata, Viewport } from 'next';
import '@/styles/globals.css';

export const metadata: Metadata = {
    title: 'RRB JE CS/IT CBT Platform',
    description: 'AI-powered question paper generation for RRB Junior Engineer CS/IT exam preparation',
    keywords: ['RRB JE', 'CS IT', 'CBT', 'exam preparation', 'question paper', 'railway recruitment'],
    authors: [{ name: 'AIMCenter' }],
    openGraph: {
        title: 'RRB JE CS/IT CBT Platform',
        description: 'Practice with AI-generated question papers',
        type: 'website',
    },
};

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: 'cover',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link
                    href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap"
                    rel="stylesheet"
                />
            </head>
            <body>
                <main>{children}</main>
            </body>
        </html>
    );
}
