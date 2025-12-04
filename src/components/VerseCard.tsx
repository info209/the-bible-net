// src/components/VerseCard.tsx
'use client';
import Image from 'next/image';
import { useState } from 'react';
import { FaRegHeart, FaRegComment } from "react-icons/fa";
import { RiShareForwardLine } from "react-icons/ri";
import { GrExpand } from "react-icons/gr";




type Props = {
  id?: string;
  tag: string;
  title: string;
  verseText: string;
  bg: string; // path to background image in /public
  variant?: 'blue' | 'pink' | 'neutral';
  stats?: { likes: string; comments: string; shares: string };
};

export default function VerseCard({
  tag,
  title,
  verseText,
  bg,
  variant = 'blue',
  stats = { likes: '100k', comments: '100k', shares: '100k' },
}: Props) {
  const [liked, setLiked] = useState(false);

  // Colors per variant (adjust hexes to taste)
  const textColor = variant === 'pink' ? 'text-[#31393A]' : 'text-[#31393A]';
  const verseColor = variant === 'blue' ? 'text-[#E7B0D3]' : variant === 'pink' ? 'text-[#E17A8B]' : 'text-[#444]';
  const overlayFrom = variant === 'blue' ? 'from-transparent' : 'from-transparent';
  const overlayTo = variant === 'blue' ? 'to-white/40' : 'to-white/30';
  const bibleIconColor =
        variant === 'blue'
        ? '#006A6F'
        : variant === 'pink'
        ? '#E17A8B'
        : '#444';

  return (
    <article className="relative overflow-hidden rounded-xl shadow-card bg-white min-h-[280px]">
      {/* Background image (fill) */}
      <div className="absolute inset-0">
        <Image
          src={bg}
          alt=""
          fill
          sizes="(max-width:768px) 100vw, (max-width:1280px) 50vw, 33vw"
          style={{ objectFit: 'cover' }}
          priority={false}
        />
        {/* overlay — the `to` side slightly white to keep content legible */}
        <div className={`absolute inset-0 bg-gradient-to-b ${overlayFrom} ${overlayTo}`} />
      </div>

      <div className="relative p-6 md:p-8">
        <div className="flex flex-col items-center mb-2">
          <div className="text-base">Today</div>
          <div className="mt-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#BCC6C6]" />
            <span className="w-2 h-2 rounded-full bg-[#BCC6C6]" />
            <span className="w-2 h-2 rounded-full bg-[#BCC6C6]" />
            <span className="w-2 h-2 rounded-full bg-[#BCC6C6]" />
            <span className="w-2 h-2 rounded-full bg-[#BCC6C6]" />
            <span className="w-8 h-2 rounded bg-white" />
          </div>
        </div>

        <div className="text-sm text-[rgba(49,57,58,0.6)] mb-1">{tag}</div>
        <h3 className={`text-[18px] leading-8 font-semibold ${textColor}`}>{title}</h3>

        <p className={`mt-4 text-[16px] leading-7 ${verseColor}`}>
          <span className="text-[#E17A8B] mr-2">3</span>
          {verseText}
        </p>

      
        <div className="mt-6 flex items-center gap-6 border-t border-white/30 pt-3">
          <button onClick={() => setLiked(s => !s)} className="flex flex-col items-center text-sm">
            <div className="w-9 h-9 rounded-full bg-[#E6F0F1] flex items-center justify-center">
                        {/* <BiBible className="text-xl text-[#31393A]" /> */}
                        <FaRegHeart className="text-xl" style={{ color: bibleIconColor }} />
            </div>
              {/* <div className="mt-2 text-xs text-[rgba(49,57,58,0.8)]">Bible</div> */}
            <div className="mt-2 text-xs text-[rgba(49,57,58,0.8)]">{stats.likes}</div>
          </button>

          <div className="flex flex-col items-center text-sm">
            <div className="w-9 h-9 rounded-full bg-[#E6F0F1] flex items-center justify-center">
            <FaRegComment className="text-xl" style={{ color: bibleIconColor }} />

            </div>
            <div className="mt-2 text-xs text-[rgba(49,57,58,0.8)]">{stats.comments}</div>
          </div>

          <div className="flex flex-col items-center text-sm">
            <div className="w-9 h-9 rounded-full bg-[#E6F0F1] flex items-center justify-center">
              <RiShareForwardLine className="text-xl" style={{ color: bibleIconColor }} />
            </div>
            <div className="mt-2 text-xs text-[rgba(49,57,58,0.8)]">{stats.shares}</div>
          </div>

          <div className="flex-1" />
          <button className="flex flex-col items-center text-sm text-[rgba(49,57,58,0.8)]">
            <div className="w-9 h-9 rounded-full bg-[#E6F0F1] flex items-center justify-center">
            <GrExpand className="text-l" style={{ color: bibleIconColor }} />
            </div>
            <div className="text-xs">Expand</div>
          </button>
        </div>
      </div>
    </article>
  );
}
