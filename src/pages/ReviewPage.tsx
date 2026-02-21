import { useState, useEffect } from 'react';
import type { SavedItem } from '../types';
import { getSavedItems, deleteItem } from '../lib/storage';
import FlashCard from '../components/FlashCard';

interface Props {
  onReturnToPlayer?: () => void;
}

export default function ReviewPage({ onReturnToPlayer }: Props) {
  const [items, setItems] = useState<SavedItem[]>([]);

  useEffect(() => {
    let isMounted = true;
    void getSavedItems()
      .then((savedItems) => {
        if (isMounted) setItems(savedItems);
      })
      .catch(() => {
        if (isMounted) setItems([]);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  function handleDelete(id: string) {
    void deleteItem(id).then(() => {
      setItems((prev) => prev.filter((item) => item.id !== id));
    });
  }

  if (items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        {onReturnToPlayer && (
          <div className="mb-6">
            <button
              onClick={onReturnToPlayer}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              &larr; Back to movie
            </button>
          </div>
        )}
        <p className="text-gray-400 text-lg">No saved words yet.</p>
        <p className="text-gray-600 text-sm mt-2">
          Watch a video and click on words to save them for review.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-white">
          Review ({items.length} items)
        </h2>
        {onReturnToPlayer && (
          <button
            onClick={onReturnToPlayer}
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            &larr; Back to movie
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {items.map((item) => (
          <FlashCard key={item.id} item={item} onDelete={handleDelete} />
        ))}
      </div>
    </div>
  );
}
