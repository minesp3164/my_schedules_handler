import { ScrollViewStyleReset } from 'expo-router/html';

// This file is web-only and used to configure the root HTML for every
// web page during static rendering.
// The contents of this function only run in Node.js environments and
// do not have access to the DOM or browser APIs.
export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="theme-color" content="#F7F7F2" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <script defer src="/register-sw.js" />

        {/*
          This viewport disables scaling which makes the mobile website act more like a native app.
          However this does reduce built-in accessibility. If you want to enable scaling, use this instead:
            <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
        */}
        <meta
          name="viewport"
          content="width=device-width,initial-scale=1,minimum-scale=1,maximum-scale=1.00001,viewport-fit=cover,interactive-widget=resizes-content"
        />
        {/*
          Disable body scrolling on web. This makes ScrollView components work closer to how they do on native.
          However, body scrolling is often nice to have for mobile web. If you want to enable it, remove this line.
        */}
        <ScrollViewStyleReset />

        {/* Using raw CSS styles as an escape-hatch to ensure the background color never flickers in dark-mode. */}
        <style dangerouslySetInnerHTML={{ __html: responsiveBackground }} />
        {/* Add any additional <head> elements that you want globally available on web... */}
      </head>
      <body>{children}</body>
    </html>
  );
}

const responsiveBackground = `
body { background-color: #F7F7F2; }

@media (hover: hover) and (pointer: fine) {
  .r-cursor-1loqt21,
  [role='button'],
  [role='switch'],
  [role='tab'],
  [role='link'] {
    transition: transform 150ms ease, opacity 150ms ease, filter 150ms ease;
  }

  .r-cursor-1loqt21:hover,
  [role='button']:hover,
  [role='switch']:hover,
  [role='tab']:hover,
  [role='link']:hover {
    transform: translateY(-1px);
    filter: brightness(0.96);
  }

  .r-cursor-1loqt21:active,
  [role='button']:active,
  [role='switch']:active,
  [role='tab']:active,
  [role='link']:active {
    transform: translateY(0);
    filter: brightness(0.91);
  }
}
`;
