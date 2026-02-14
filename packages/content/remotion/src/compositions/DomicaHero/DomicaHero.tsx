/**
 * DomicaHero — animated hero matching the Figma Website design.
 *
 * Layout (1920x700):
 * - Background: very light gradient with subtle wave lines at top
 * - Left: Vertical property card (Domica's real layout) with magnifying glass
 * - Right: Large headline, search bar with button, app store badges
 * - Floating: DomicaMarker location pins, glass bubbles scattered
 */

import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { DomicaWatermark } from "@domica/ui-web";
import { springProgress, clampedInterpolate } from "../../lib";
import { MagnifyingGlass } from "./elements/MagnifyingGlass";
import { LocationPin } from "./elements/LocationPin";
import { DecorativeBubble } from "./elements/DecorativeBubble";

/** Animated wrapper */
const AnimateIn: React.FC<{
  delay: number;
  from?: "left" | "right" | "bottom" | "top";
  distance?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ delay, from = "bottom", distance = 80, children, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = springProgress(frame, fps, "smooth", delay);
  const opacity = clampedInterpolate(frame - delay, [0, 12], [0, 1]);
  const directionMap = {
    left: `translateX(${-distance * (1 - progress)}px)`,
    right: `translateX(${distance * (1 - progress)}px)`,
    top: `translateY(${-distance * (1 - progress)}px)`,
    bottom: `translateY(${distance * (1 - progress)}px)`,
  };
  return (
    <div style={{ opacity, transform: directionMap[from], ...style }}>
      {children}
    </div>
  );
};

/** App Store badge — h-48, w-144, black rounded rect */
const AppStoreBadge: React.FC = () => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 10,
      width: 144,
      height: 48,
      padding: "0 14px",
      borderRadius: 8,
      background: "#111827",
      color: "white",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
    }}
  >
    <svg width="22" height="26" viewBox="0 0 24 24" fill="white">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
    <div>
      <div style={{ fontSize: 9, lineHeight: 1, opacity: 0.8 }}>הורידו מ-</div>
      <div style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.3 }}>App Store</div>
    </div>
  </div>
);

/** Google Play badge — h-48, w-161, black rounded rect */
const GooglePlayBadge: React.FC = () => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 10,
      width: 161,
      height: 48,
      padding: "0 14px",
      borderRadius: 8,
      background: "#111827",
      color: "white",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
    }}
  >
    <svg width="22" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M3 20.5V3.5C3 2.91 3.34 2.39 3.84 2.15L13.69 12L3.84 21.85C3.34 21.6 3 21.09 3 20.5Z" fill="#4285F4" />
      <path d="M16.81 15.12L6.05 21.34L13.69 12L16.81 15.12Z" fill="#EA4335" />
      <path d="M20.16 10.81C20.5 11.08 20.5 11.64 20.5 12C20.5 12.36 20.33 12.69 20.05 12.86L17.24 14.58L13.69 12L17.24 9.42L20.16 10.81Z" fill="#FBBC04" />
      <path d="M6.05 2.66L16.81 8.88L13.69 12L6.05 2.66Z" fill="#34A853" />
    </svg>
    <div>
      <div style={{ fontSize: 9, lineHeight: 1, opacity: 0.8 }}>זמין ב-</div>
      <div style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.3 }}>Google Play</div>
    </div>
  </div>
);

/** Domica PropertyCard — matches real Card.tsx layout exactly.
 *  Vertical: image top (~60%), price+address bottom. Scaled up for hero prominence. */
const HeroPropertyCard: React.FC<{ style?: React.CSSProperties }> = ({ style }) => (
  <div
    style={{
      width: 740,
      height: 480,
      borderRadius: 16,
      overflow: "hidden",
      background: "white",
      boxShadow: "0px 1px 8px rgba(0,0,0,0.2), 0 20px 60px rgba(37,99,235,0.12)",
      display: "flex",
      flexDirection: "column",
      ...style,
    }}
  >
    {/* Image Section — ~60% height, real apartment photo */}
    <div
      style={{
        width: "100%",
        height: "62%",
        position: "relative",
        overflow: "hidden",
        borderRadius: "16px 16px 0 0",
      }}
    >
      {/* Real apartment interior photo */}
      <Img
        src={staticFile("images/apartment-interior.png")}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "center",
        }}
      />

      {/* Glass-style tags — bottom start, matching real PropertyCard */}
      <div style={{ position: "absolute", bottom: 16, left: 16, display: "flex", gap: 10 }} dir="rtl">
        <span style={{ padding: "8px 14px", borderRadius: 10, background: "rgba(255,255,255,0.85)", fontSize: 20, lineHeight: "22px", fontWeight: 500, color: "#111827", fontFamily: "Ploni, sans-serif" }}>
          3 חדרים
        </span>
        <span style={{ padding: "8px 14px", borderRadius: 10, background: "rgba(255,255,255,0.85)", fontSize: 20, lineHeight: "22px", fontWeight: 500, color: "#111827", fontFamily: "Ploni, sans-serif" }}>
          78 מ״ר
        </span>
      </div>

      {/* Save/heart button — top end */}
      <div
        style={{
          position: "absolute",
          top: 14,
          right: 14,
          width: 42,
          height: 42,
          borderRadius: 10,
          background: "rgba(255,255,255,0.85)",
          border: "0.5px solid #D3E0FB",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      </div>
    </div>

    {/* Content Section — Price & Address, matching real PropertyCard */}
    <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "18px 20px" }} dir="rtl">
      <div style={{ fontSize: 28, fontWeight: 600, color: "#111827", lineHeight: "32px", fontFamily: "Ploni, sans-serif" }}>
        ₪6,500
      </div>
      <div style={{ fontSize: 20, color: "#6B7280", lineHeight: "26px", fontFamily: "Ploni, sans-serif" }}>
        רוטשילד 22, תל אביב - יפו
      </div>
    </div>
  </div>
);


export const DomicaHero: React.FC = () => {
  const frame = useCurrentFrame();

  // Floating animation for the card
  const floatY = Math.sin(frame * 0.025) * 8;
  const floatR = Math.sin(frame * 0.015) * 1;

  return (
    <AbsoluteFill>
      {/* Background: 77deg from white to light blue */}
      <AbsoluteFill
        style={{
          background: "linear-gradient(77deg, #FFFFFF 15%, #F1F5FE 85%)",
        }}
      />

      {/* Subtle wave lines at top */}
      <svg
        style={{ position: "absolute", top: 0, left: 0, width: "100%", height: 200, opacity: 0.12 }}
        viewBox="0 0 1920 200"
        preserveAspectRatio="none"
      >
        <path d="M0 80 Q480 20 960 80 T1920 80" stroke="#2563EB" strokeWidth="1.5" fill="none" />
        <path d="M0 120 Q480 60 960 120 T1920 120" stroke="#2563EB" strokeWidth="1" fill="none" />
        <path d="M0 150 Q480 100 960 150 T1920 150" stroke="#93C5FD" strokeWidth="0.8" fill="none" />
      </svg>

      {/* Watermark */}
      <div
        style={{
          position: "absolute",
          left: "calc(83.33% + 110px)",
          top: 491,
          width: 213,
          height: 213,
          opacity: 0.06,
          transform: "rotate(-38deg)",
        }}
      >
        <DomicaWatermark color="blue" opacity={1} />
      </div>

      {/* ===== LEFT SIDE: Property card + decorative elements ===== */}

      {/* Deepest background card — furthest behind */}
      <AnimateIn delay={0} from="left" distance={180}>
        <div
          style={{
            position: "absolute",
            left: 60,
            top: 40,
            width: 840,
            height: 540,
            borderRadius: 22,
            background: "rgba(255,255,255,0.35)",
            border: "1.5px solid rgba(211,224,251,0.4)",
            boxShadow: "0 4px 24px rgba(37,99,235,0.04)",
          }}
        />
      </AnimateIn>

      {/* Background skeleton card — wider, behind main card */}
      <AnimateIn delay={1} from="left" distance={160}>
        <div
          style={{
            position: "absolute",
            left: 100,
            top: 60,
            width: 820,
            height: 520,
            borderRadius: 20,
            background: "rgba(255,255,255,0.6)",
            border: "2px solid rgba(211,224,251,0.6)",
            boxShadow: "0 8px 40px rgba(37,99,235,0.06)",
            padding: "28px 24px",
            display: "flex",
            flexDirection: "row",
            gap: 24,
          }}
          dir="rtl"
        >
          {/* Placeholder image area */}
          <div style={{ width: 300, height: "100%", borderRadius: 14, background: "rgba(211,224,251,0.25)" }} />
          {/* Placeholder text bars */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14, paddingTop: 16 }}>
            <div style={{ width: "90%", height: 18, borderRadius: 8, background: "rgba(37,99,235,0.12)" }} />
            <div style={{ width: "70%", height: 18, borderRadius: 8, background: "rgba(37,99,235,0.12)" }} />
            <div style={{ width: "60%", height: 14, borderRadius: 8, background: "rgba(107,114,128,0.1)" }} />
            <div style={{ width: "80%", height: 14, borderRadius: 8, background: "rgba(107,114,128,0.1)" }} />
            <div style={{ marginTop: "auto", display: "flex", gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(211,224,251,0.4)" }} />
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(211,224,251,0.4)" }} />
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(211,224,251,0.4)" }} />
            </div>
          </div>
        </div>
      </AnimateIn>

      {/* Main property card — tilted, floating above background card */}
      <AnimateIn delay={3} from="left" distance={140}>
        <div
          style={{
            position: "absolute",
            left: 160,
            top: 80,
            transform: `rotate(-6deg) translateY(${floatY}px) rotate(${floatR}deg)`,
            transformOrigin: "center center",
          }}
        >
          <HeroPropertyCard />
        </div>
      </AnimateIn>

      {/* Map snippet — 40% screen height, centered between card and text */}
      <AnimateIn delay={18} from="bottom" distance={60}>
        <div
          style={{
            position: "absolute",
            left: 940,
            top: 100,
            width: 220,
            height: 220,
            borderRadius: 16,
            overflow: "hidden",
            boxShadow:
              "0 4px 20px rgba(0,0,0,0.1), 0 8px 40px rgba(37,99,235,0.08)",
            border: "2px solid rgba(255,255,255,0.8)",
          }}
        >
          <Img
            src={staticFile("images/map-telaviv.png")}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "center",
            }}
          />
          {/* Pin on the map */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
            }}
          >
            <LocationPin x={100} y={120} delay={22} size={44} />
          </div>
        </div>
      </AnimateIn>

      {/* Magnifying glass — large, overlapping card bottom-right */}
      <MagnifyingGlass x={590} y={310} delay={22} size={220} />

      {/* Glass bubbles scattered */}
      <DecorativeBubble x={250} y={15} delay={33} size={10} amplitude={6} speed={0.016} />
      <DecorativeBubble x={420} y={8} delay={35} size={14} amplitude={8} speed={0.014} />
      <DecorativeBubble x={550} y={25} delay={37} size={8} amplitude={5} speed={0.02} />
      <DecorativeBubble x={650} y={60} delay={39} size={11} amplitude={7} speed={0.017} />
      <DecorativeBubble x={720} y={160} delay={40} size={7} amplitude={5} speed={0.022} />
      <DecorativeBubble x={180} y={520} delay={42} size={12} amplitude={9} speed={0.013} />
      <DecorativeBubble x={400} y={560} delay={44} size={9} amplitude={6} speed={0.019} />
      <DecorativeBubble x={760} y={380} delay={46} size={6} amplitude={4} speed={0.025} />

      {/* ===== RIGHT SIDE ===== */}
      <div
        style={{
          position: "absolute",
          right: 80,
          top: 186,
          width: 580,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 40,
        }}
        dir="rtl"
      >
        {/* Headline */}
        <AnimateIn delay={5} from="right" distance={80}>
          <div
            style={{
              fontSize: 64,
              fontFamily: "'PloniMLv2AAA-D-Bold', Ploni, sans-serif",
              fontWeight: 700,
              color: "#0C4AD1",
              letterSpacing: -3.2,
              lineHeight: 1,
              textAlign: "center",
              whiteSpace: "nowrap",
            }}
          >
            מחפשים דירה - מוצאים בית
          </div>
        </AnimateIn>

        {/* Search bar — RTL: Input on RIGHT, Button on LEFT */}
        <AnimateIn delay={15} from="bottom" distance={40}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, width: "100%" }}>
            {/* Input — first in DOM → RIGHT in RTL */}
            <div
              style={{
                flex: 1,
                height: 56,
                borderRadius: 12,
                background: "white",
                border: "1px solid #D3E0FB",
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                padding: "0 20px",
                gap: 8,
              }}
            >
              <div
                style={{
                  flex: 1,
                  fontSize: 17,
                  fontFamily: "'PloniMLv2AAA-Regular', Ploni, sans-serif",
                  color: "#111827",
                  textAlign: "right",
                }}
              >
                חפש רחוב / עיר / שכונה / מיקוד
              </div>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
            {/* Button — second in DOM → LEFT in RTL */}
            <div
              style={{
                height: 56,
                padding: "0 24px",
                borderRadius: 12,
                background: "#2563EB",
                border: "1px solid #2563EB",
                color: "white",
                fontSize: 20,
                fontFamily: "'PloniMLv2AAA-Medium', Ploni, sans-serif",
                fontWeight: 500,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              התחילו לחפש חכם
            </div>
          </div>
        </AnimateIn>

        {/* App store badges */}
        <AnimateIn delay={28} from="bottom" distance={30}>
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <AppStoreBadge />
            <GooglePlayBadge />
          </div>
        </AnimateIn>
      </div>
    </AbsoluteFill>
  );
};
