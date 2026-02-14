import { Composition } from "remotion";
import { DomicaHero } from "./compositions/DomicaHero/DomicaHero";
import "./style.css";

export const Root: React.FC = () => {
  return (
    <>
      <Composition
        id="DomicaHero"
        component={DomicaHero}
        durationInFrames={300}
        fps={30}
        width={1920}
        height={700}
      />
    </>
  );
};
