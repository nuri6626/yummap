import "./globals.css";
import Script from "next/script";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        <title>YumMap</title>
      </head>
      <body>
        {children}
        <Script
          src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=9135b1f141c68a3e3aee32f5e5d81344&autoload=false"
          strategy="beforeInteractive"
        />
      </body>
    </html>
  );
}
