const fs = require('fs');
const path = require('path');

const targetFile = 'c:\\Users\\Pranjal Singh\\OneDrive\\Desktop\\Projects\\the-bible-net-prod\\src\\app\\components\\BibleReaderPage.tsx';

let content = fs.readFileSync(targetFile, 'utf8');

// The replacement bounds:
// From: {/* ── TTS SETTINGS POPUP ─────────────────────────────── */}
// To: {/* Side Menu Overlay */}

const startMarker = '{/* ── TTS SETTINGS POPUP ─────────────────────────────── */}';
const endMarker = '{/* Side Menu Overlay */}';

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex === -1 || endIndex === -1) {
  console.error("Markers not found");
  process.exit(1);
}

const replacementContent = `${startMarker}
      {/* ── AUDIO CONTROL PANEL (BOTTOM SHEET) ──────────────── */}
      <AnimatePresence>
        {isControlPanelOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1100] bg-black/40 backdrop-blur-sm"
            onClick={() => setIsControlPanelOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: "100%" }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: "100%" }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute bottom-0 left-0 right-0 w-full max-w-2xl mx-auto bg-white/95 backdrop-blur-2xl rounded-t-[32px] overflow-hidden shadow-[0_-8px_32px_rgba(0,0,0,0.12)] border-t border-white/40 pb-safe z-[1110]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drag Handle & Header */}
              <div className="flex flex-col items-center pt-3 pb-4">
                <div className="w-12 h-1.5 bg-gray-300 rounded-full mb-4" />
                <h3 className="text-lg font-bold text-[#31393a]">
                  {displayBookName} {selectedChapter} {currentVerse ? \`:\${currentVerse}\` : ''}
                </h3>
                <p className="text-sm font-medium text-[var(--color-primary-teal)] mt-1">
                  {displayVersionName}
                </p>
              </div>

              <div className="px-6 py-2 space-y-8">
                {/* Main Playback Controls */}
                <div className="flex items-center justify-center gap-8">
                  <button
                    onClick={(e) => { e.stopPropagation(); handlePrevVerse(); }}
                    className="p-3 text-[#31393a] hover:text-[var(--color-primary-teal)] transition-colors active:scale-95 rounded-full hover:bg-black/5"
                  >
                    <SkipBack className="size-8 fill-current" />
                  </button>

                  <button
                    onClick={(e) => { e.stopPropagation(); toggleTTS(); }}
                    className="size-20 rounded-full bg-[var(--color-primary-teal)] flex items-center justify-center text-white shadow-[0_8px_24px_rgba(0,106,111,0.3)] hover:scale-105 active:scale-95 transition-all"
                  >
                    {ttsPlaying && !ttsPaused ? (
                      <Pause className="size-10 fill-current" />
                    ) : (
                      <Play className="size-10 fill-current translate-x-1" />
                    )}
                  </button>

                  <button
                    onClick={(e) => { e.stopPropagation(); handleNextVerse(); }}
                    className="p-3 text-[#31393a] hover:text-[var(--color-primary-teal)] transition-colors active:scale-95 rounded-full hover:bg-black/5"
                  >
                    <SkipForward className="size-8 fill-current" />
                  </button>
                </div>

                {/* Auxiliary Controls Grid */}
                <div className="grid grid-cols-5 bg-gray-50 rounded-2xl p-2 max-w-sm mx-auto">
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleRepeatMode(); }}
                    className={\`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl transition-colors \${repeatMode !== 'none' ? 'text-[var(--color-primary-teal)] bg-[var(--color-primary-teal)]/10' : 'text-[#31393a]/60 hover:bg-gray-200/50'}\`}
                  >
                    <RotateCw className="size-5" />
                    <span className="text-[10px] uppercase font-bold tracking-wider">{repeatMode === 'verse' ? 'Verse' : repeatMode === 'chapter' ? 'Chap' : 'None'}</span>
                  </button>

                  <div className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl text-[#31393a]/60 relative group cursor-pointer hover:bg-gray-200/50">
                    <Volume2 className="size-5" />
                    <span className="text-[10px] uppercase font-bold tracking-wider">{Math.round(ttsVolume * 100)}%</span>
                  </div>

                  <div className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl text-[#31393a]/60 relative group cursor-pointer hover:bg-gray-200/50">
                    <Gauge className="size-5" />
                    <span className="text-[10px] uppercase font-bold tracking-wider">{ttsRate}x</span>
                  </div>

                  <button className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl text-[#31393a]/60 hover:bg-gray-200/50">
                    <Timer className="size-5" />
                    <span className="text-[10px] uppercase font-bold tracking-wider">Sleep</span>
                  </button>

                  <button className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl text-[#31393a]/60 hover:bg-gray-200/50">
                    <Download className="size-5" />
                    <span className="text-[10px] uppercase font-bold tracking-wider">Down</span>
                  </button>
                </div>
                
                {/* Sliders Below (Volume and Speed sliders) */}
                <div className="px-4 py-2 space-y-4 max-w-sm mx-auto">
                   <div className="flex items-center gap-3">
                      <Volume2 className="size-4 text-[#31393a]/40" />
                      <input
                        type="range"
                        min="0" max="1" step="0.05"
                        value={ttsVolume}
                        onChange={(e) => setTtsVolume(Number(e.target.value))}
                        className="flex-1 h-2 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#31393a]"
                        style={{ background: \`linear-gradient(to right, #31393a \${ttsVolume*100}%, #e5e7e7 \${ttsVolume*100}%)\` }}
                      />
                   </div>
                   <div className="flex items-center gap-3">
                      <Gauge className="size-4 text-[#31393a]/40" />
                      <input
                        type="range"
                        min="0.5" max="2" step="0.25"
                        value={ttsRate}
                        onChange={(e) => setTtsRate(Number(e.target.value))}
                        className="flex-1 h-2 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#31393a]"
                        style={{ background: \`linear-gradient(to right, #31393a \${((ttsRate-0.5)/1.5)*100}%, #e5e7e7 \${((ttsRate-0.5)/1.5)*100}%)\` }}
                      />
                   </div>
                </div>

                <div className="h-6" /> {/* Bottom safe padding */}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── NARRATION CONTROLS (Always Visible) ─────────────────────────────── */}
      <div
        className="fixed left-0 right-0 z-[1000] pointer-events-none"
        style={{ bottom: showBottomNav ? '88px' : '10px' }}
      >
        <div className="max-w-3xl mx-auto px-6 relative h-16 flex items-center justify-center">

          {/* Previous Chapter Button */}
          {(!isFirstChapterOfBible) && (
            <motion.button
              type="button"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              onClick={(e) => { e.preventDefault(); handlePrevious(); }}
              className="absolute left-6 pointer-events-auto size-14 rounded-full bg-white shadow-[0_4px_12px_rgba(0,0,0,0.1)] flex items-center justify-center text-[#31393a] hover:scale-105 active:scale-95 transition-all"
              title="Previous Chapter"
            >
              <ChevronLeft className="size-7" />
            </motion.button>
          )}

          {/* Center: Single Play Button */}
          <div className="pointer-events-auto relative flex flex-col items-center gap-0">
            <div className="relative flex items-center gap-3">
              {/* Main play/pause circle button */}
              <button
                type="button"
                onMouseDown={handlePlaybackPressStart}
                onMouseUp={handlePlaybackPressEnd}
                onMouseLeave={handlePlaybackPressCancel}
                onTouchStart={handlePlaybackPressStart}
                onTouchEnd={handlePlaybackPressEnd}
                onTouchCancel={handlePlaybackPressCancel}
                onContextMenu={(e) => e.preventDefault()}
                className="relative size-16 group pointer-events-auto select-none touch-manipulation"
                title="Tap to Play/Pause, Hold for Controls"
                style={{
                  transform: isControlPanelOpen ? 'scale(0)' : 'scale(1)',
                  opacity: isControlPanelOpen ? 0 : 1,
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
              >
                <svg className="absolute inset-0 size-full -rotate-90 pointer-events-none">
                  <circle cx="32" cy="32" r="30" fill="white" className="shadow-[0_4px_12px_rgba(0,0,0,0.1)]" />
                  <motion.circle
                    cx="32" cy="32" r="30"
                    fill="transparent"
                    stroke="var(--color-primary-teal)"
                    strokeWidth="3"
                    strokeDasharray={2 * Math.PI * 30}
                    animate={{
                      strokeDashoffset: 2 * Math.PI * 30 * (1 - ((ttsPlaying || ttsPaused) ? (ttsCurrentVerseIndex + 1) / (currentChapterVerses.length || 1) : 0))
                    }}
                    transition={{ type: 'spring', stiffness: 50, damping: 20 }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="size-12 flex items-center justify-center transition-transform group-hover:scale-110 pointer-events-none">
                    {ttsPlaying && !ttsPaused ? (
                      <Pause className="size-6 text-[var(--color-primary-teal)] fill-current pointer-events-none" />
                    ) : (
                      <Play className="size-6 text-[var(--color-primary-teal)] fill-current translate-x-0.5 pointer-events-none" />
                    )}
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Next Chapter Button */}
          {(!isLastChapterOfBible) && (
            <motion.button
              type="button"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              onClick={(e) => { e.preventDefault(); handleNext(); }}
              className="absolute right-6 pointer-events-auto size-14 rounded-full bg-white shadow-[0_4px_12px_rgba(0,0,0,0.1)] flex items-center justify-center text-[#31393a] hover:scale-105 active:scale-95 transition-all"
              title="Next Chapter"
            >
              <ChevronRight className="size-7" />
            </motion.button>
          )}
        </div>
      </div>

      `;

const newContent = content.substring(0, startIndex) + replacementContent + content.substring(endIndex);

fs.writeFileSync(targetFile, newContent, 'utf8');
console.log('Successfully updated UI!');
