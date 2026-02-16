import { useEffect, useMemo, useRef, useState } from 'react';
import type { SubtitleCue, SavedItem } from '../types';
import { saveItem } from '../lib/storage';

interface Props {
  currentTime: number;
  sourceCues: SubtitleCue[];
  targetCues: SubtitleCue[];
  videoSource: string;
  onSaved: () => void;
}

function findCurrentCue(
  cues: SubtitleCue[],
  time: number
): SubtitleCue | null {
  return cues.find((c) => time >= c.startTime && time <= c.endTime) || null;
}

export default function SubtitleOverlay({
  currentTime,
  sourceCues,
  targetCues,
  videoSource,
  onSaved,
}: Props) {
  const sourceCueContainerRef = useRef<HTMLDivElement>(null);
  const [selectedText, setSelectedText] = useState('');

  const sourceCue = useMemo(
    () => findCurrentCue(sourceCues, currentTime),
    [sourceCues, currentTime]
  );
  const targetCue = useMemo(
    () => findCurrentCue(targetCues, currentTime),
    [targetCues, currentTime]
  );

  useEffect(() => {
    function handleSelectionChange() {
      if (!sourceCueContainerRef.current) {
        setSelectedText('');
        return;
      }

      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
        setSelectedText('');
        return;
      }

      const range = selection.getRangeAt(0);
      if (!sourceCueContainerRef.current.contains(range.commonAncestorContainer)) {
        setSelectedText('');
        return;
      }

      const nextSelectedText = selection.toString().replace(/\s+/g, ' ').trim();
      setSelectedText(nextSelectedText);
    }

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, []);

  const selectedTextForCue = useMemo(() => {
    if (!sourceCue) return '';
    const normalizedSelection = selectedText.replace(/\s+/g, ' ').trim();
    if (!normalizedSelection) return '';

    const normalizedCue = sourceCue.text.replace(/\s+/g, ' ').trim();
    return normalizedCue.includes(normalizedSelection) ? normalizedSelection : '';
  }, [sourceCue, selectedText]);

  async function handleWordClick(word: string) {
    if (!sourceCue) return;
    if (window.getSelection()?.toString().trim()) return;

    const item: SavedItem = {
      id: crypto.randomUUID(),
      word,
      sentence: sourceCue.text,
      translation: targetCue?.text || '',
      videoSource,
      startTime: Math.max(0, sourceCue.startTime - 2),
      endTime: sourceCue.endTime + 2,
      createdAt: 0,
    };
    await saveItem(item);
    onSaved();
  }

  async function handleSaveSelection() {
    if (!sourceCue || !selectedTextForCue) return;

    const item: SavedItem = {
      id: crypto.randomUUID(),
      word: selectedTextForCue,
      sentence: sourceCue.text,
      translation: targetCue?.text || '',
      videoSource,
      startTime: Math.max(0, sourceCue.startTime - 2),
      endTime: sourceCue.endTime + 2,
      createdAt: 0,
    };
    await saveItem(item);
    onSaved();
    setSelectedText('');
    window.getSelection()?.removeAllRanges();
  }

  async function handleSaveSentence() {
    if (!sourceCue) return;

    const item: SavedItem = {
      id: crypto.randomUUID(),
      word: '',
      sentence: sourceCue.text,
      translation: targetCue?.text || '',
      videoSource,
      startTime: Math.max(0, sourceCue.startTime - 2),
      endTime: sourceCue.endTime + 2,
      createdAt: 0,
    };
    await saveItem(item);
    onSaved();
  }

  if (!sourceCue && !targetCue) return null;

  const words = sourceCue?.text.split(/\s+/) || [];

  return (
    <div className="absolute bottom-16 left-0 right-0 flex flex-col items-center gap-2 px-4 pointer-events-none">
      {/* Source language (learning) - clickable words */}
      {sourceCue && (
        <div
          ref={sourceCueContainerRef}
          className="bg-black/80 rounded-lg px-4 py-2 pointer-events-auto flex flex-wrap justify-center items-center max-w-3xl"
        >
          {words.map((word, i) => (
            <span
              key={i}
              onClick={() => {
                void handleWordClick(word);
              }}
              className="text-yellow-300 text-lg font-medium cursor-pointer hover:bg-yellow-300/20 hover:rounded px-0.5 transition-colors"
              title="Click to save this word"
            >
              {i < words.length - 1 ? `${word} ` : word}
            </span>
          ))}
          <button
            onClick={() => {
              if (selectedTextForCue) {
                void handleSaveSelection();
                return;
              }
              void handleSaveSentence();
            }}
            className="ml-2 text-xs bg-yellow-600/80 text-white px-2 py-0.5 rounded hover:bg-yellow-500 transition-colors"
            title={selectedTextForCue ? 'Save selected words' : 'Save entire sentence'}
          >
            {selectedTextForCue ? 'Save' : '+'}
          </button>
        </div>
      )}

      {/* Target language (your language) */}
      {targetCue && (
        <div className="bg-black/70 rounded-lg px-4 py-1.5 max-w-3xl">
          <p className="text-white text-base text-center">{targetCue.text}</p>
        </div>
      )}
    </div>
  );
}
