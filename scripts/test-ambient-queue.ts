import { useAmbientMusicStore, AmbientMusicTrack, RepeatMode, MusicLoopMode } from '../src/stores/useAmbientMusicStore';

// Mock DOM Audio if in node environment
if (typeof window === 'undefined') {
  (global as any).window = {
    addEventListener: () => {},
    removeEventListener: () => {},
  };
  (global as any).localStorage = {
    _data: {} as Record<string, string>,
    getItem(key: string) { return this._data[key] || null; },
    setItem(key: string, val: string) { this._data[key] = val; },
    removeItem(key: string) { delete this._data[key]; },
    clear() { this._data = {}; }
  };
  (global as any).Audio = class {
    src = '';
    currentTime = 0;
    duration = 100;
    preload = 'metadata';
    private listeners: Record<string, Function[]> = {};

    addEventListener(event: string, cb: Function) {
      this.listeners[event] = this.listeners[event] || [];
      this.listeners[event].push(cb);
    }
    removeEventListener(event: string, cb: Function) {
      if (this.listeners[event]) {
        this.listeners[event] = this.listeners[event].filter(l => l !== cb);
      }
    }
    dispatchEvent(event: string) {
      (this.listeners[event] || []).forEach(cb => cb());
    }
    load() {}
    play() {
      this.dispatchEvent('play');
      return Promise.resolve();
    }
    pause() {
      this.dispatchEvent('pause');
    }
  };
  try {
    Object.defineProperty(globalThis, 'navigator', {
      value: {
        onLine: true,
        mediaSession: {
          setActionHandler: () => {},
          metadata: null,
        }
      },
      configurable: true,
      writable: true,
    });
  } catch (e) {
    (globalThis as any).navigator.onLine = true;
  }
  (global as any).indexedDB = null;
}

const mockTracks: AmbientMusicTrack[] = [
  { id: 'track-1', label: 'Track 1', file_path: '/t1.mp3', url: 'https://example.com/1.mp3' },
  { id: 'track-2', label: 'Track 2', file_path: '/t2.mp3', url: 'https://example.com/2.mp3' },
  { id: 'track-3', label: 'Track 3', file_path: '/t3.mp3', url: 'https://example.com/3.mp3' },
  { id: 'track-4', label: 'Track 4', file_path: '/t4.mp3', url: 'https://example.com/4.mp3' },
];

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASS: ${message}`);
}

async function runTests() {
  console.log('\n--- Starting Ambient Music Queue & Controls Tests ---\n');

  const store = useAmbientMusicStore.getState();

  // Load tracks into store
  useAmbientMusicStore.setState({ tracks: mockTracks });

  // 1. Test Sequential Mode (repeat-all)
  console.log('\n[Test 1: Sequential Mode (repeat-all)]');
  store.setMusicLoopMode('repeat-all');
  assert(useAmbientMusicStore.getState().isShuffle === false, 'isShuffle should be false');
  assert(useAmbientMusicStore.getState().repeatMode === 'repeat-all', 'repeatMode should be repeat-all');

  store.play(mockTracks[0]);
  assert(useAmbientMusicStore.getState().currentTrack?.id === 'track-1', 'Playing track-1');

  store.playNext();
  assert(useAmbientMusicStore.getState().currentTrack?.id === 'track-2', 'Next is track-2');

  store.playNext();
  assert(useAmbientMusicStore.getState().currentTrack?.id === 'track-3', 'Next is track-3');

  store.playNext();
  assert(useAmbientMusicStore.getState().currentTrack?.id === 'track-4', 'Next is track-4');

  // Track 4 ended or next should wrap to track-1
  store.playNext();
  assert(useAmbientMusicStore.getState().currentTrack?.id === 'track-1', 'Wraps to track-1 on repeat-all');

  // 2. Test Sequential Mode (repeat-off)
  console.log('\n[Test 2: Sequential Mode (repeat-off)]');
  useAmbientMusicStore.getState().setRepeatMode('off');
  useAmbientMusicStore.getState().play(mockTracks[3]); // last track
  assert(useAmbientMusicStore.getState().currentTrack?.id === 'track-4', 'Playing track-4 (last track)');

  // Track ended event (natural end)
  useAmbientMusicStore.getState().playNext(false);
  assert(useAmbientMusicStore.getState().isPlaying === false, 'Playback stops when queue reaches end with repeat-off');

  // 3. Test Repeat One
  console.log('\n[Test 3: Repeat One Mode]');
  useAmbientMusicStore.getState().setMusicLoopMode('repeat-one');
  assert(useAmbientMusicStore.getState().repeatMode === 'repeat-one', 'repeatMode is repeat-one');
  useAmbientMusicStore.getState().play(mockTracks[1]);

  // Natural track ended in repeat-one
  useAmbientMusicStore.getState().playNext(false);
  assert(useAmbientMusicStore.getState().currentTrack?.id === 'track-2', 'Replays track-2 when track ends');

  // Manual next in repeat-one
  useAmbientMusicStore.getState().playNext(true);
  assert(useAmbientMusicStore.getState().currentTrack?.id === 'track-3', 'Manual skip advances to track-3 even if repeat-one is on');

  // 4. Test Shuffle Mode (no immediate repeat, all tracks played in a cycle)
  console.log('\n[Test 4: Shuffle Mode]');
  useAmbientMusicStore.getState().setMusicLoopMode('shuffle');
  assert(useAmbientMusicStore.getState().isShuffle === true, 'isShuffle is true');
  assert(useAmbientMusicStore.getState().repeatMode === 'repeat-all', 'repeatMode is repeat-all in shuffle mode');

  useAmbientMusicStore.getState().play(mockTracks[0]);
  const playedTracks = ['track-1'];

  for (let i = 0; i < 3; i++) {
    useAmbientMusicStore.getState().playNext();
    const curr = useAmbientMusicStore.getState().currentTrack!.id;
    assert(!playedTracks.includes(curr), `Track ${curr} was not previously played in this cycle`);
    playedTracks.push(curr);
  }

  assert(playedTracks.length === 4, 'All 4 tracks played in shuffle cycle');

  // 5. Test Shuffle + Repeat All cycle transition (next cycle avoids immediate duplicate)
  console.log('\n[Test 5: Shuffle Cycle Boundary]');
  const lastTrackInCycle = useAmbientMusicStore.getState().currentTrack!.id;
  useAmbientMusicStore.getState().playNext();
  const firstTrackInNextCycle = useAmbientMusicStore.getState().currentTrack!.id;
  assert(firstTrackInNextCycle !== lastTrackInCycle, `First track in new cycle (${firstTrackInNextCycle}) is not the same as last track (${lastTrackInCycle})`);

  // 6. Test Shuffle + Repeat Off
  console.log('\n[Test 6: Shuffle with Repeat Off]');
  useAmbientMusicStore.getState().setShuffle(true);
  useAmbientMusicStore.getState().setRepeatMode('off');
  useAmbientMusicStore.getState().play(mockTracks[0]);

  // Exhaust all 3 remaining tracks
  useAmbientMusicStore.getState().playNext(false);
  useAmbientMusicStore.getState().playNext(false);
  useAmbientMusicStore.getState().playNext(false);
  assert(useAmbientMusicStore.getState().isPlaying === true, 'Playing 4th track in shuffle queue');

  // 5th playNext on natural end should stop because repeat is off!
  useAmbientMusicStore.getState().playNext(false);
  assert(useAmbientMusicStore.getState().isPlaying === false, 'Stops playback when shuffle queue is exhausted and repeat is off');

  // 7. Test Single-Track Playlist
  console.log('\n[Test 7: Single-Track Playlist]');
  const singleTrackList = [mockTracks[0]];
  useAmbientMusicStore.setState({ tracks: singleTrackList });

  useAmbientMusicStore.getState().setMusicLoopMode('repeat-all');
  useAmbientMusicStore.getState().play(singleTrackList[0]);
  useAmbientMusicStore.getState().playNext(false);
  assert(useAmbientMusicStore.getState().currentTrack?.id === 'track-1', 'Single-track repeats on repeat-all');

  useAmbientMusicStore.getState().setRepeatMode('off');
  useAmbientMusicStore.getState().playNext(false);
  assert(useAmbientMusicStore.getState().isPlaying === false, 'Single-track stops on repeat-off');

  useAmbientMusicStore.getState().setMusicLoopMode('shuffle');
  useAmbientMusicStore.getState().play(singleTrackList[0]);
  useAmbientMusicStore.getState().playNext(false);
  assert(useAmbientMusicStore.getState().currentTrack?.id === 'track-1', 'Single-track plays safely in shuffle mode');

  // Restore tracks
  useAmbientMusicStore.setState({ tracks: mockTracks });

  // 8. Test Mode toggling mid-playback
  console.log('\n[Test 8: Mode Toggling During Playback]');
  useAmbientMusicStore.getState().setMusicLoopMode('repeat-all');
  useAmbientMusicStore.getState().play(mockTracks[1]); // track 2
  assert(useAmbientMusicStore.getState().currentTrack?.id === 'track-2', 'Current track is track-2');

  // Toggle to shuffle immediately
  useAmbientMusicStore.getState().setMusicLoopMode('shuffle');
  assert(useAmbientMusicStore.getState().isShuffle === true, 'Shuffle active');
  assert(!useAmbientMusicStore.getState().unplayedShuffleIds.includes('track-2'), 'Current track-2 excluded from unplayed shuffle pool');

  useAmbientMusicStore.getState().playNext();
  assert(useAmbientMusicStore.getState().currentTrack?.id !== 'track-2', 'Next track after toggling shuffle is a different track');

  // 9. Manual track selection
  console.log('\n[Test 9: Manual Track Selection]');
  useAmbientMusicStore.getState().setMusicLoopMode('shuffle');
  useAmbientMusicStore.getState().play(mockTracks[2]); // select track-3
  assert(useAmbientMusicStore.getState().currentTrack?.id === 'track-3', 'Track-3 selected');
  assert(!useAmbientMusicStore.getState().unplayedShuffleIds.includes('track-3'), 'Track-3 excluded from unplayed shuffle pool');

  // 10. Previous track controls
  console.log('\n[Test 10: Previous Track Controls]');
  useAmbientMusicStore.getState().setMusicLoopMode('repeat-all');
  useAmbientMusicStore.getState().play(mockTracks[0]);
  useAmbientMusicStore.getState().play(mockTracks[1]);
  assert(useAmbientMusicStore.getState().currentTrack?.id === 'track-2', 'Playing track-2');

  useAmbientMusicStore.getState().playPrevious();
  assert(useAmbientMusicStore.getState().currentTrack?.id === 'track-1', 'Previous track returns to track-1 from history');

  // 11. Offline Playable Tracks Filtering
  console.log('\n[Test 11: Offline Playable Tracks Filtering]');
  try {
    (navigator as any).onLine = false;
  } catch {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
  }
  useAmbientMusicStore.setState({ offlinePlayableTrackIds: ['track-2', 'track-4'] });
  useAmbientMusicStore.getState().setMusicLoopMode('repeat-all');
  useAmbientMusicStore.getState().play(mockTracks[1]); // track-2 is offline playable

  useAmbientMusicStore.getState().playNext();
  assert(useAmbientMusicStore.getState().currentTrack?.id === 'track-4', 'Next offline track skips non-downloaded tracks to track-4');

  try {
    (navigator as any).onLine = true;
  } catch {
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
  }
  useAmbientMusicStore.setState({ offlinePlayableTrackIds: [] });

  // 12. Cycle mode test
  console.log('\n[Test 12: Cycle Mode]');
  useAmbientMusicStore.getState().setMusicLoopMode('shuffle');
  useAmbientMusicStore.getState().cycleMusicLoopMode();
  assert(useAmbientMusicStore.getState().musicLoopMode === 'repeat-all', 'Cycles from shuffle to repeat-all');
  useAmbientMusicStore.getState().cycleMusicLoopMode();
  assert(useAmbientMusicStore.getState().musicLoopMode === 'repeat-one', 'Cycles from repeat-all to repeat-one');
  useAmbientMusicStore.getState().cycleMusicLoopMode();
  assert(useAmbientMusicStore.getState().musicLoopMode === 'shuffle', 'Cycles from repeat-one to shuffle');

  // 13. Route navigation return test (restoreSession preserves active playback)
  console.log('\n[Test 13: Route Return Preserves Playback]');
  useAmbientMusicStore.getState().play(mockTracks[0]);
  assert(useAmbientMusicStore.getState().isPlaying === true, 'Track is playing before route return');
  assert(useAmbientMusicStore.getState().currentTrack?.id === 'track-1', 'Playing track-1');

  // Simulate Bible page remounting and calling restoreSession
  await useAmbientMusicStore.getState().restoreSession();
  assert(useAmbientMusicStore.getState().isPlaying === true, 'Track continues playing after restoreSession on route return');
  assert(useAmbientMusicStore.getState().currentTrack?.id === 'track-1', 'Remains on track-1 without reloading');

  console.log('\n🎉 ALL 13 TEST SUITES PASSED!\n');
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
