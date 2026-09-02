interface Props {
  src: string;
  alt: string;
}

export default function ImageViewer({ src, alt }: Props) {
  return (
    <div className="image-viewer">
      <img src={src} alt={alt} />
    </div>
  );
}