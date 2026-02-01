import React, { useState, useRef, useEffect } from 'react';

interface CardImageProps {
  cardName: string;
  imageCache: { [key: string]: string | null };
}

const CardImage: React.FC<CardImageProps> = ({ cardName, imageCache }) => {
  const [showPreview, setShowPreview] = useState(false);
  const [previewPosition, setPreviewPosition] = useState({ top: 0, left: 0 });
  const spanRef = useRef<HTMLSpanElement>(null);
  const imageUrl = imageCache[cardName];

  const updatePreviewPosition = () => {
    if (spanRef.current) {
      const rect = spanRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const previewWidth = 250; // Match the CSS width
      
      // Position to the right of the card name by default
      let left = rect.right + 20;
      
      // If it would overflow the viewport, position to the left instead
      if (left + previewWidth > viewportWidth) {
        left = rect.left - previewWidth - 20;
      }
      
      // Ensure it doesn't go off the left edge
      if (left < 10) {
        left = 10;
      }
      
      setPreviewPosition({
        top: rect.top,
        left: left
      });
    }
  };

  const handleMouseEnter = () => {
    setShowPreview(true);
    updatePreviewPosition();
  };

  const handleMouseLeave = () => {
    setShowPreview(false);
  };

  useEffect(() => {
    if (showPreview) {
      const handleScroll = () => {
        updatePreviewPosition();
      };
      
      window.addEventListener('scroll', handleScroll, true);
      return () => window.removeEventListener('scroll', handleScroll, true);
    }
  }, [showPreview]);

  if (!imageUrl) {
    return <span className="card-name-text">{cardName}</span>;
  }

  return (
    <span 
      ref={spanRef}
      className="card-name-with-preview"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <span className="card-name-text hoverable">{cardName}</span>
      {showPreview && (
        <div 
          className="card-preview"
          style={{
            top: `${previewPosition.top}px`,
            left: `${previewPosition.left}px`
          }}
        >
          <img src={imageUrl} alt={cardName} loading="lazy" />
        </div>
      )}
    </span>
  );
};

export default CardImage;
