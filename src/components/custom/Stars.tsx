import { useEffect, useState } from "react";

type Star = {
  x: number;
  y: number;
  z: number;
  size: number;
};

const STAR_COUNT = 100;
const SPEED = 0.001;

export default function Starfield() {
  const [stars, setStars] = useState<Star[]>([]);

  useEffect(() => {
    const initStars = (): Star[] =>
      Array.from({ length: STAR_COUNT }, () => ({
        x: Math.random() * 2 - 1,
        y: Math.random() * 2 - 1,
        z: Math.random(),
        size: Math.random() * 10, // 1px to 3px
      }));

    let starData = initStars();

    const animate = () => {
      starData = starData.map((star) => {
        let z = star.z - SPEED;
        if (z <= 0) {
          return {
            x: Math.random() * 2 - 1,
            y: Math.random() * 2 - 1,
            z: 1,
            size: Math.random() * 2 + 1,
          };
        }
        return { ...star, z };
      });

      setStars([...starData]);
      requestAnimationFrame(animate);
    };

    animate();
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden z-0">
      {stars.map((star, index) => {
        const scale = 500;
        const x = star.x / star.z;
        const y = star.y / star.z;
        const screenX = `calc(50% + ${x * scale}px)`;
        const screenY = `calc(50% + ${y * scale}px)`;
        const size = star.size * (1 - star.z);

        return (
          <span
            key={index}
            className="absolute bg-white rounded-full opacity-70"
            style={{
              left: screenX,
              top: screenY,
              width: `${size}px`,
              height: `${size}px`,
            }}
          />
        );
      })}
    </div>
  );
}
