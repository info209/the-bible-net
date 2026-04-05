// Songs Database with comprehensive metadata
export interface Song {
  id: string;
  title: string;
  language: 'English' | 'Telugu' | 'Hindi' | 'Tamil';
  author: string;
  album?: string;
  year?: number;
  category: string[];
  lyrics: {
    section: string; // Verse 1, Chorus, Bridge, etc.
    text: string;
  }[];
  chords?: {
    section: string;
    chords: string;
  }[];
  metadata: {
    composer?: string;
    arranger?: string;
    copyright?: string;
    ccliNumber?: string;
    key?: string;
    tempo?: string;
    timeSignature?: string;
  };
}

export const songsDatabase: Song[] = [
  // English Songs
  {
    id: 'eng-001',
    title: 'Amazing Grace',
    language: 'English',
    author: 'John Newton',
    album: 'Traditional Hymns Collection',
    year: 1779,
    category: ['Hymn', 'Classic', 'Worship'],
    lyrics: [
      {
        section: 'Verse 1',
        text: `Amazing grace! How sweet the sound
That saved a wretch like me!
I once was lost, but now am found;
Was blind, but now I see.`
      },
      {
        section: 'Verse 2',
        text: `'Twas grace that taught my heart to fear,
And grace my fears relieved;
How precious did that grace appear
The hour I first believed.`
      },
      {
        section: 'Verse 3',
        text: `Through many dangers, toils and snares,
I have already come;
'Tis grace hath brought me safe thus far,
And grace will lead me home.`
      },
      {
        section: 'Verse 4',
        text: `When we've been there ten thousand years,
Bright shining as the sun,
We've no less days to sing God's praise
Than when we'd first begun.`
      }
    ],
    chords: [
      {
        section: 'Verse 1',
        chords: 'G - G7 - C - G | G - - - Em - D | G - G7 - C - G | G - D - G -'
      }
    ],
    metadata: {
      composer: 'John Newton',
      copyright: 'Public Domain',
      key: 'G Major',
      timeSignature: '3/4'
    }
  },
  {
    id: 'eng-002',
    title: 'How Great Thou Art',
    language: 'English',
    author: 'Stuart K. Hine',
    album: 'Classic Worship Anthology',
    year: 1949,
    category: ['Hymn', 'Worship', 'Praise'],
    lyrics: [
      {
        section: 'Verse 1',
        text: `O Lord my God, when I in awesome wonder
Consider all the worlds Thy hands have made
I see the stars, I hear the rolling thunder
Thy power throughout the universe displayed`
      },
      {
        section: 'Chorus',
        text: `Then sings my soul, my Savior God, to Thee
How great Thou art, how great Thou art
Then sings my soul, my Savior God, to Thee
How great Thou art, how great Thou art`
      },
      {
        section: 'Verse 2',
        text: `When through the woods and forest glades I wander
And hear the birds sing sweetly in the trees
When I look down from lofty mountain grandeur
And hear the brook and feel the gentle breeze`
      },
      {
        section: 'Verse 3',
        text: `And when I think that God, His Son not sparing
Sent Him to die, I scarce can take it in
That on the cross, my burden gladly bearing
He bled and died to take away my sin`
      }
    ],
    metadata: {
      composer: 'Stuart K. Hine',
      copyright: '© 1949, 1953 The Stuart Hine Trust',
      key: 'A Major',
      timeSignature: '4/4'
    }
  },
  
  // Telugu Songs
  {
    id: 'tel-001',
    title: 'క్రీస్తు ప్రేమ అపారమైనది',
    language: 'Telugu',
    author: 'తెలుగు క్రైస్తవ కీర్తనలు',
    album: 'తెలుగు ఆరాధన గీతాలు',
    year: 1995,
    category: ['Worship', 'Contemporary', 'Praise'],
    lyrics: [
      {
        section: 'కీర్తన 1',
        text: `క్రీస్తు ప్రేమ అపారమైనది
అతని కృప అమూల్యమైనది
నా జీవితాన్ని మార్చిన ప్రభువు
నీ నామం మహిమ కలిగినది`
      },
      {
        section: 'సమిష్టి పాట',
        text: `స్తుతించండి ప్రభువును
ఆరాధించండి రాజులకు రాజును
స్తుతించండి ప్రభువును
మహిమపరచండి యేసును`
      },
      {
        section: 'కీర్తన 2',
        text: `నా పాపాలన్నిటినీ క్షమించిన
నా రక్షకుడు యేసయ్య
నీ ప్రేమకు ఎల్లప్పుడు కృతజ్ఞుడను
నా హృదయం నీ ఆలయం`
      }
    ],
    metadata: {
      composer: 'తెలుగు క్రైస్తవ కీర్తనలు',
      key: 'D Major',
      timeSignature: '4/4'
    }
  },
  {
    id: 'tel-002',
    title: 'దేవా నీవే నా ఆశ్రయం',
    language: 'Telugu',
    author: 'ఆరాధన సంఘం',
    album: 'ఆత్మీయ గీతాలు',
    year: 2010,
    category: ['Worship', 'Devotional'],
    lyrics: [
      {
        section: 'కీర్తన 1',
        text: `దేవా నీవే నా ఆశ్రయం
నా బలము నా రక్షణ
కష్టాల్లో నా తోడు నీవే
నిత్యం నాకు ఆధారం`
      },
      {
        section: 'సమిష్టి పాట',
        text: `నీవే నా దేవుడవు
నా జీవితపు ప్రభువు
నీవే నా రాజువు
నా హృదయం నీ ఆలయం`
      },
      {
        section: 'కీర్తన 2',
        text: `నీ వాక్యం నా పాదాలకు దీపం
నా మార్గానికి వెలుగు
నీ మాట విని నడిచిన
నా జీవితం ఆశీర్వాదమే`
      }
    ],
    metadata: {
      composer: 'ఆరాధన సంఘం',
      key: 'G Major',
      timeSignature: '4/4'
    }
  },
  
  // Hindi Songs
  {
    id: 'hin-001',
    title: 'प्रभु तेरी महिमा अपरम्पार',
    language: 'Hindi',
    author: 'हिंदी क्रिश्चियन गीत',
    album: 'आराधना गीत संग्रह',
    year: 2005,
    category: ['Worship', 'Praise', 'Contemporary'],
    lyrics: [
      {
        section: 'स्तवन 1',
        text: `प्रभु तेरी महिमा अपरम्पार है
तेरा प्रेम अद्भुत और महान है
मेरे जीवन को बदल दिया तूने
तेरे नाम की स्तुति करूँगा मैं`
      },
      {
        section: 'स्तुति गीत',
        text: `आराधना करूँगा मैं
स्तुति करूँगा तेरी
तू ही राजाओं का राजा
प्रभुओं का प्रभु यीशु`
      },
      {
        section: 'स्तवन 2',
        text: `तेरी कृपा से मैं बचा हूँ
तेरे लहू से पाप धुल गए
मेरा उद्धारकर्ता यीशु तू है
सदा तेरा धन्यवाद करूँगा`
      }
    ],
    metadata: {
      composer: 'हिंदी क्रिश्चियन गीत',
      key: 'C Major',
      timeSignature: '4/4'
    }
  },
  {
    id: 'hin-002',
    title: 'परमेश्वर मेरा शरणस्थान',
    language: 'Hindi',
    author: 'आराधना मंडली',
    album: 'भक्ति गीत',
    year: 2015,
    category: ['Worship', 'Devotional'],
    lyrics: [
      {
        section: 'स्तवन 1',
        text: `परमेश्वर मेरा शरणस्थान है
मेरा बल और मेरा उद्धार
विपत्ति में मेरा साथी वही है
सदा मेरा आधार वही`
      },
      {
        section: 'स्तुति गीत',
        text: `तू ही मेरा परमेश्वर है
मेरे जीवन का प्रभु है
तू ही मेरा राजा है
मेरा हृदय तेरा मंदिर है`
      },
      {
        section: 'स्तवन 2',
        text: `तेरा वचन मेरे पैरों का दीपक है
मेरे मार्ग का उजियाला है
तेरे वचन पर चलते हुए
मेरा जीवन आशीष भरा है`
      }
    ],
    metadata: {
      composer: 'आराधना मंडली',
      key: 'D Major',
      timeSignature: '3/4'
    }
  },
  
  // Tamil Songs
  {
    id: 'tam-001',
    title: 'கர்த்தரின் அன்பு அதிசயமானது',
    language: 'Tamil',
    author: 'தமிழ் கிறிஸ்தவ பாடல்கள்',
    album: 'ஆராதனை பாடல்கள்',
    year: 2008,
    category: ['Worship', 'Praise'],
    lyrics: [
      {
        section: 'பாடல் 1',
        text: `கர்த்தரின் அன்பு அதிசயமானது
அவரது கிருபை விலைமதிப்பற்றது
என் வாழ்க்கையை மாற்றிய இயேசு
உமது பெயர் மகிமையானது`
      },
      {
        section: 'பாடல் குழு',
        text: `துதிக்கிறேன் கர்த்தரை
ஆராதிக்கிறேன் ராஜாதி ராஜாவை
துதிக்கிறேன் கர்த்தரை
மகிமைப்படுத்துகிறேன் இயேசுவை`
      },
      {
        section: 'பாடல் 2',
        text: `என் பாவங்களை மன்னித்த
என் இரட்சகர் இயேசு
உமது அன்புக்கு என்றும் நன்றி
என் இருதயம் உமது ஆலயம்`
      }
    ],
    metadata: {
      composer: 'தமிழ் கிறிஸ்தவ பாடல்கள்',
      key: 'E Major',
      timeSignature: '4/4'
    }
  },
  {
    id: 'tam-002',
    title: 'தேவனே என் அடைக்கலம்',
    language: 'Tamil',
    author: 'ஆராதனை சபை',
    album: 'ஆன்மீக பாடல்கள்',
    year: 2012,
    category: ['Worship', 'Devotional'],
    lyrics: [
      {
        section: 'பாடல் 1',
        text: `தேவனே என் அடைக்கலம்
என் பலமும் என் இரட்சிப்பும்
துன்பத்தில் என் தோழன் அவரே
எப்போதும் என் ஆதரவு`
      },
      {
        section: 'பாடல் குழு',
        text: `நீரே என் தேவன்
என் வாழ்வின் கர்த்தர்
நீரே என் ராஜா
என் இதயம் உமது ஆலயம்`
      },
      {
        section: 'பாடல் 2',
        text: `உமது வசனம் என் கால்களுக்கு விளக்கு
என் வழிக்கு வெளிச்சம்
உமது வார்த்தையை கேட்டு நடந்தால்
என் வாழ்க்கை ஆசீர்வாதம்`
      }
    ],
    metadata: {
      composer: 'ஆராதனை சபை',
      key: 'F Major',
      timeSignature: '4/4'
    }
  }
];

// Helper function to get songs by language
export const getSongsByLanguage = (language: string) => {
  if (language === 'All') return songsDatabase;
  return songsDatabase.filter(song => song.language === language);
};

// Helper function to search songs
export const searchSongs = (query: string, language: string = 'All') => {
  const songs = getSongsByLanguage(language);
  const lowerQuery = query.toLowerCase();
  
  return songs.filter(song => 
    song.title.toLowerCase().includes(lowerQuery) ||
    song.author.toLowerCase().includes(lowerQuery) ||
    song.lyrics.some(lyric => lyric.text.toLowerCase().includes(lowerQuery))
  );
};

// Helper function to get alphabetically grouped songs
export const getGroupedSongs = (language: string = 'All') => {
  const songs = getSongsByLanguage(language);
  const grouped: { [key: string]: Song[] } = {};
  
  songs.forEach(song => {
    const firstChar = song.title.charAt(0).toUpperCase();
    if (!grouped[firstChar]) {
      grouped[firstChar] = [];
    }
    grouped[firstChar].push(song);
  });
  
  // Sort each group
  Object.keys(grouped).forEach(key => {
    grouped[key].sort((a, b) => a.title.localeCompare(b.title));
  });
  
  return grouped;
};

// Get all unique alphabets from songs
export const getAlphabets = (language: string = 'All') => {
  const songs = getSongsByLanguage(language);
  const alphabets = new Set<string>();
  
  songs.forEach(song => {
    alphabets.add(song.title.charAt(0).toUpperCase());
  });
  
  return Array.from(alphabets).sort();
};
