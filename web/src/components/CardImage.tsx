import React, { useState, useEffect, useRef } from 'react';

interface CardImageProps {
  cardName: string;
}

interface ScryfallCard {
  image_uris?: {
    normal: string;
    large: string;
  };
  card_faces?: Array<{
    image_uris?: {
      normal: string;
      large: string;
    };
  }>;
}

const CardImage: React.FC<CardImageProps> = ({ cardName }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let isCancelled = false;

    const fetchCardImage = async () => {
      setLoading(true);
      setError(false);

      try {
        const response = await fetch(
          `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(cardName)}`
        );
        
        if (!response.ok) {
          throw new Error('Card not found');
        }

        const data: ScryfallCard = await response.json();
        
        if (isCancelled) return;

        // Get image URL (handle double-faced cards)
        let url: string | null = null;
        if (data.image_uris) {
          url = data.image_uris.normal;
        } else if (data.card_faces && data.card_faces[0]?.image_uris) {
          url = data.card_faces[0].image_uris.normal;
        }

        if (url) {
          setImageUrl(url);
        } else {
          setError(true);
        }
      } catch (err) {
        if (!isCancelled) {
          setError(true);
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    fetchCardImage();

    return () => {
      isCancelled = true;
    };
  }, [cardName]);

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setShowPreview(true);
    }, 300);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setShowPreview(false);
  };

  if (loading || error || !imageUrl) {
    return <span className="card-name-text">{cardName}</span>;
  }

  return (
    <span 
      className="card-name-with-preview"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <span className="card-name-text hoverable">{cardName}</span>
      {showPreview && imageUrl && (
        <div className="card-preview">
          <img src={imageUrl} alt={cardName} />
        </div>
      )}
    </span>
  );
};

export default CardImage;
