import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#1b1916",
          color: "#f6f1ea",
          fontSize: 18,
          fontWeight: 650,
          borderRadius: 8,
        }}
      >
        A
      </div>
    ),
    size
  );
}
