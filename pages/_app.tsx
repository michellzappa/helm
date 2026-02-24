import type { AppProps } from "next/app";
import Head from "next/head";
import "@/styles/globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { CountsProvider } from "@/lib/counts-context";
import { SettingsProvider } from "@/lib/settings-context";
import { ThemeColorApplier } from "@/components/ThemeColorApplier";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <title>Mission Control</title>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        {/* Apply theme based on OS preference to prevent flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                document.documentElement.classList.add('dark');
              }
            `,
          }}
        />
      </Head>
      <ThemeProvider>
        <SettingsProvider>
          <ThemeColorApplier />
          <CountsProvider>
            <Component {...pageProps} />
          </CountsProvider>
        </SettingsProvider>
      </ThemeProvider>
    </>
  );
}
