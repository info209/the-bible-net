import sys

def modify_bible_reader():
    with open('src/app/components/BibleReaderPage.tsx', 'r', encoding='utf-8') as f:
        lines = f.readlines()

    lines.insert(19, "import FontsSettingsModal, { ThemeType, TransitionType } from './FontsSettingsModal';\n")
    lines.insert(20, "import AudioFloatingPlayer from './AudioFloatingPlayer';\n")

    settings_start = -1
    settings_end = -1
    for i, line in enumerate(lines):
        if '{/* Settings Menu */}' in line:
            settings_start = i
            break

    for i in range(settings_start, len(lines)):
        if '{/* Main Reading Content */}' in lines[i]:
            settings_end = i - 1
            break

    if settings_start != -1 and settings_end != -1:
        replacement_settings = """      {/* Settings Menu */}
      <FontsSettingsModal
        isOpen={showSettingsMenu}
        onClose={() => setShowSettingsMenu(false)}
        selectedFont={selectedFont}
        onFontChange={setSelectedFont}
        fontSize={fontSize}
        onFontSizeChange={setFontSize}
        selectedTheme={selectedTheme}
        onThemeChange={setSelectedTheme}
        pageTransition={pageTransition as any}
        onPageTransitionChange={(t: any) => setPageTransition(t)}
      />

"""
        lines[settings_start:settings_end+1] = [replacement_settings]

    audio_start = -1
    audio_end = -1
    for i, line in enumerate(lines):
        if '{/* Audio Controls - MOVES UP/DOWN WITH SCROLL */}' in line:
            audio_start = i
            break

    orig_end = audio_start
    if audio_start != -1:
        for i in range(audio_start, len(lines)):
            if '{/* Side Menu Overlay */}' in lines[i]:
                audio_end = i - 1
                while lines[audio_end].strip() == '':
                    audio_end -= 1
                audio_end += 1
                break

    if audio_start != -1 and audio_end != -1:
        replacement_audio = """      {/* Audio Controls Floating Button */}
      {showAudioControls && (
        <AudioFloatingPlayer
          isPlaying={audioPlaying}
          progress={audioDuration > 0 ? audioCurrentTime / audioDuration : 0}
          onPlayPause={() => {
            if (audioPlaying) {
               stopNarration();
               setAudioPlaying(false);
            } else {
               startNarration(selectedVerse || 1);
            }
          }}
          onNext={handleNext}
          onPrev={handlePrevious}
          className={isReadingMode ? 'mb-4' : 'mb-20'}
        />
      )}

"""
        lines[audio_start:audio_end+1] = [replacement_audio]

    with open('src/app/components/BibleReaderPage.tsx', 'w', encoding='utf-8') as f:
        f.writelines(lines)

if __name__ == '__main__':
    modify_bible_reader()
