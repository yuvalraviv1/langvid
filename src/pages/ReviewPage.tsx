import { useState, useEffect } from 'react';
import type { SavedItem } from '../types';
import { getSavedItems, deleteItem } from '../lib/storage';
import FlashCard from '../components/FlashCard';

export default function ReviewPage() {
  const [items, setItems] = useState<SavedItem[]>([]);

  useEffect(() => {
    setItems(getSavedItems());
  }, []);

  function handleDelete(id: string) {
    deleteItem(id);
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  if (items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <p className="text-gray-400 text-lg">No saved words yet.</p>
        <p className="text-gray-600 text-sm mt-2">
          Watch a video and click on words to save them for review.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <h2 className="text-xl font-bold text-white mb-6">
        Review ({items.length} items)
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {items.map((item) => (
          <FlashCard key={item.id} item={item} onDelete={handleDelete} />
        ))}
      </div>
    </div>
  );
}
