import React, { useState } from 'react';

interface CardImageProps {
  cardName: string;
  imageCache: { [key: string]: string | null };
}

const CardImage: React.FC<CardImageProps> = ({ cardName, imageCache }) => {
  const [showPreview, setShowPreview] = useState(false);
  const imageUrl = imageCache[cardName];

  const handleMouseEnter = () => {
    setShowPreview(true);
  };

  const handleMouseLeave = () => {
    setShowPreview(false);
  };

  if (!imageUrl) {
    return <span className="card-name-text">{cardName}</span>;
  }

  return (
    <span 
      className="card-name-with-preview"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <span className="card-name-text hoverable">{cardName}</span>
      {showPreview && (
        <div className="card-preview">
          <img src={imageUrl} alt={cardName} loading="lazy" />
        </div>
      )}
    </span>
  );
};

export default CardImage;
