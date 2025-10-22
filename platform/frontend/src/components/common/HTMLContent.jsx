import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import { useEffect } from "react";

export default function HTMLContent({ 
  value = 100,
  duration = 2,
  className = "",
  style = {}
}) {
    const count = useMotionValue(0);
    const rounded = useTransform(count, latest => Math.round(latest));

    useEffect(() => {
        const controls = animate(count, value, { 
            duration: duration,
            ease: "easeOut" 
        });
        return () => controls.stop();
    }, [value, duration]);

    return (
        <motion.span 
            className={className} 
            style={{ ...style }}
        >
            {rounded}
        </motion.span>
    );
}

/**
 * ==============   Styles   ================
 */

const text = {
    fontSize: 64,
    color: "#8df0cc",
}
