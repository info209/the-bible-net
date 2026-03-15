"use client";
import { useEffect, useState } from 'react';

interface ChapterContentProps {
  book: string;
  chapter: number;
  font: string;
  fontSize: number;
  version?: string; // Add version parameter
  scrollToVerse?: number | null; // Add scroll to verse parameter
  readingVerse?: number | null; // Verse currently being read aloud
  theme: {
    bg: string;
    text: string;
    verseNumber: string;
  };
}

import { teluguBible, hindiBible } from './BibleData';

// Mock Bible content by book and chapter (English)
export const mockBibleContent: { [key: string]: { [key: number]: { title: string; verses: { number: number; text: string }[] } } } = {
  'Genesis': {
    1: {
      title: 'The History of Creation',
      verses: [
        { number: 1, text: "In the beginning God created the heavens and the earth." },
        { number: 2, text: "The earth was without form, and void; and darkness was on the face of the deep. And the Spirit of God was hovering over the face of the waters." },
        { number: 3, text: "Then God said, 'Let there be light'; and there was light." },
        { number: 4, text: "And God saw the light, that it was good; and God divided the light from the darkness." },
        { number: 5, text: "God called the light Day, and the darkness He called Night. So the evening and the morning were the first day." },
        { number: 6, text: "Then God said, 'Let there be a firmament in the midst of the waters, and let it divide the waters from the waters.'" },
        { number: 7, text: "Thus God made the firmament, and divided the waters which were under the firmament from the waters which were above the firmament; and it was so." },
        { number: 8, text: "And God called the firmament Heaven. So the evening and the morning were the second day." },
        { number: 9, text: "Then God said, 'Let the waters under the heavens be gathered together into one place, and let the dry land appear'; and it was so." },
        { number: 10, text: "And God called the dry land Earth, and the gathering together of the waters He called Seas. And God saw that it was good." },
        { number: 11, text: "Then God said, 'Let the earth bring forth grass, the herb that yields seed, and the fruit tree that yields fruit according to its kind, whose seed is in itself, on the earth'; and it was so." },
        { number: 12, text: "And the earth brought forth grass, the herb that yields seed according to its kind, and the tree that yields fruit, whose seed is in itself according to its kind. And God saw that it was good." },
        { number: 13, text: "So the evening and the morning were the third day." },
        { number: 14, text: "Then God said, 'Let there be lights in the firmament of the heavens to divide the day from the night; and let them be for signs and seasons, and for days and years;'" },
        { number: 15, text: "and let them be for lights in the firmament of the heavens to give light on the earth'; and it was so." },
        { number: 16, text: "Then God made two great lights: the greater light to rule the day, and the lesser light to rule the night. He made the stars also." },
        { number: 17, text: "God set them in the firmament of the heavens to give light on the earth," },
        { number: 18, text: "and to rule over the day and over the night, and to divide the light from the darkness. And God saw that it was good." },
        { number: 19, text: "So the evening and the morning were the fourth day." },
        { number: 20, text: "Then God said, 'Let the waters abound with an abundance of living creatures, and let birds fly above the earth across the face of the firmament of the heavens.'" },
        { number: 21, text: "So God created great sea creatures and every living thing that moves, with which the waters abounded, according to their kind, and every winged bird according to its kind. And God saw that it was good." },
        { number: 22, text: "And God blessed them, saying, 'Be fruitful and multiply, and fill the waters in the seas, and let birds multiply on the earth.'" },
        { number: 23, text: "So the evening and the morning were the fifth day." },
        { number: 24, text: "Then God said, 'Let the earth bring forth the living creature according to its kind: cattle and creeping thing and beast of the earth, each according to its kind'; and it was so." },
        { number: 25, text: "And God made the beast of the earth according to its kind, cattle according to its kind, and everything that creeps on the earth according to its kind. And God saw that it was good." },
        { number: 26, text: "Then God said, 'Let Us make man in Our image, according to Our likeness; let them have dominion over the fish of the sea, over the birds of the air, and over the cattle, over all the earth and over every creeping thing that creeps on the earth.'" },
        { number: 27, text: "So God created man in His own image; in the image of God He created him; male and female He created them." },
        { number: 28, text: "Then God blessed them, and God said to them, 'Be fruitful and multiply; fill the earth and subdue it; have dominion over the fish of the sea, over the birds of the air, and over every living thing that moves on the earth.'" },
        { number: 29, text: "And God said, 'See, I have given you every herb that yields seed which is on the face of all the earth, and every tree whose fruit yields seed; to you it shall be for food.'" },
        { number: 30, text: "Also, to every beast of the earth, to every bird of the air, and to everything that creeps on the earth, in which there is life, I have given every green herb for food'; and it was so." },
        { number: 31, text: "Then God saw everything that He had made, and indeed it was very good. So the evening and the morning were the sixth day." }
      ]
    },
    2: {
      title: 'Life in God\'s Garden',
      verses: [
        { number: 1, text: "Thus the heavens and the earth, and all the host of them, were finished." },
        { number: 2, text: "And on the seventh day God ended His work which He had done, and He rested on the seventh day from all His work which He had done." },
        { number: 3, text: "Then God blessed the seventh day and sanctified it, because in it He rested from all His work which God had created and made." },
        { number: 4, text: "This is the history of the heavens and the earth when they were created, in the day that the LORD God made the earth and the heavens," },
        { number: 5, text: "before any plant of the field was in the earth and before any herb of the field had grown. For the LORD God had not caused it to rain on the earth, and there was no man to till the ground;" },
        { number: 6, text: "but a mist went up from the earth and watered the whole face of the ground." },
        { number: 7, text: "And the LORD God formed man of the dust of the ground, and breathed into his nostrils the breath of life; and man became a living being." },
        { number: 8, text: "The LORD God planted a garden eastward in Eden, and there He put the man whom He had formed." },
        { number: 9, text: "And out of the ground the LORD God made every tree grow that is pleasant to the sight and good for food. The tree of life was also in the midst of the garden, and the tree of the knowledge of good and evil." },
        { number: 10, text: "Now a river went out of Eden to water the garden, and from there it parted and became four riverheads." },
        { number: 11, text: "The name of the first is Pishon; it is the one which skirts the whole land of Havilah, where there is gold." },
        { number: 12, text: "And the gold of that land is good. Bdellium and the onyx stone are there." },
        { number: 13, text: "The name of the second river is Gihon; it is the one which goes around the whole land of Cush." },
        { number: 14, text: "The name of the third river is Hiddekel; it is the one which goes toward the east of Assyria. The fourth river is the Euphrates." },
        { number: 15, text: "Then the LORD God took the man and put him in the garden of Eden to tend and keep it." },
        { number: 16, text: "And the LORD God commanded the man, saying, 'Of every tree of the garden you may freely eat;'" },
        { number: 17, text: "but of the tree of the knowledge of good and evil you shall not eat, for in the day that you eat of it you shall surely die.'" },
        { number: 18, text: "And the LORD God said, 'It is not good that man should be alone; I will make him a helper comparable to him.'" },
        { number: 19, text: "Out of the ground the LORD God formed every beast of the field and every bird of the air, and brought them to Adam to see what he would call them. And whatever Adam called each living creature, that was its name." },
        { number: 20, text: "So Adam gave names to all cattle, to the birds of the air, and to every beast of the field. But for Adam there was not found a helper comparable to him." },
        { number: 21, text: "And the LORD God caused a deep sleep to fall on Adam, and he slept; and He took one of his ribs, and closed up the flesh in its place." },
        { number: 22, text: "Then the rib which the LORD God had taken from man He made into a woman, and He brought her to the man." },
        { number: 23, text: "And Adam said: 'This is now bone of my bones And flesh of my flesh; She shall be called Woman, Because she was taken out of Man.'" },
        { number: 24, text: "Therefore a man shall leave his father and mother and be joined to his wife, and they shall become one flesh." },
        { number: 25, text: "And they were both naked, the man and his wife, and were not ashamed." }
      ]
    },
    3: {
      title: 'The Temptation and Fall of Man',
      verses: [
        { number: 1, text: "Now the serpent was more cunning than any beast of the field which the LORD God had made. And he said to the woman, 'Has God indeed said, You shall not eat of every tree of the garden?'" },
        { number: 2, text: "And the woman said unto the serpent, Of the fruit of the trees of the garden we may eat:" },
        { number: 3, text: "but of the fruit of the tree which is in the midst of the garden, God hath said, Ye shall not eat of it, neither shall ye touch it, lest ye die." },
        { number: 4, text: "And the serpent said unto the woman, Ye shall not surely die:" },
        { number: 5, text: "for God doth know that in the day ye eat thereof, then your eyes shall be opened, and ye shall be as God, knowing good and evil." },
        { number: 6, text: "And when the woman saw that the tree was good for food, and that it was a delight to the eyes, and that the tree was to be desired to make one wise, she took of the fruit thereof, and did eat; and she gave also unto her husband with her, and he did eat." },
        { number: 7, text: "And the eyes of them both were opened, and they knew that they were naked; and they sewed fig-leaves together, and made themselves aprons." },
        { number: 8, text: "And they heard the voice of Jehovah God walking in the garden in the cool of the day: and the man and his wife hid themselves from the presence of Jehovah God amongst the trees of the garden." },
        { number: 9, text: "And Jehovah God called unto the man, and said unto him, Where art thou?" },
        { number: 10, text: "And he said, I heard thy voice in the garden, and I was afraid, because I was naked; and I hid myself." },
        { number: 11, text: "And he said, Who told thee that thou wast naked? Hast thou eaten of the tree, whereof I commanded thee that thou shouldest not eat?" },
        { number: 12, text: "And the man said, The woman whom thou gavest to be with me, she gave me of the tree, and I did eat." },
        { number: 13, text: "And Jehovah God said unto the woman, What is this thou hast done? And the woman said, The serpent beguiled me, and I did eat." },
        { number: 14, text: "And Jehovah God said unto the serpent, Because thou hast done this, cursed art thou above all cattle, and above every beast of the field; upon thy belly shalt thou go, and dust shalt thou eat all the days of thy life:" },
        { number: 15, text: "and I will put enmity between thee and the woman, and between thy seed and her seed: he shall bruise thy head, and thou shalt bruise his heel." },
        { number: 16, text: "Unto the woman he said, I will greatly multiply thy pain and thy conception; in pain thou shalt bring forth children; and thy desire shall be to thy husband, and he shall rule over thee." },
        { number: 17, text: "And unto Adam he said, Because thou hast hearkened unto the voice of thy wife, and hast eaten of the tree, of which I commanded thee, saying, Thou shalt not eat of it: cursed is the ground for thy sake; in toil shalt thou eat of it all the days of thy life;" },
        { number: 18, text: "thorns also and thistles shall it bring forth to thee; and thou shalt eat the herb of the field;" },
        { number: 19, text: "in the sweat of thy face shalt thou eat bread, till thou return unto the ground; for out of it wast thou taken: for dust thou art, and unto dust shalt thou return." },
        { number: 20, text: "And the man called his wife\'s name Eve; because she was the mother of all living." },
        { number: 21, text: "And Jehovah God made for Adam and for his wife coats of skins, and clothed them." },
        { number: 22, text: "And Jehovah God said, Behold, the man is become as one of us, to know good and evil; and now, lest he put forth his hand, and take also of the tree of life, and eat, and live for ever—" },
        { number: 23, text: "therefore Jehovah God sent him forth from the garden of Eden, to till the ground from whence he was taken." },
        { number: 24, text: "So he drove out the man; and he placed at the east of the garden of Eden the Cherubim, and the flame of a sword which turned every way, to keep the way of the tree of life." }
      ]
    },
    4: {
      title: 'Cain and Abel',
      verses: [
        { number: 1, text: "And the man knew Eve his wife; and she conceived, and bare Cain, and said, I have gotten a man with the help of Jehovah." },
        { number: 2, text: "And again she bare his brother Abel. And Abel was a keeper of sheep, but Cain was a tiller of the ground." },
        { number: 3, text: "And in process of time it came to pass, that Cain brought of the fruit of the ground an offering unto Jehovah." },
        { number: 4, text: "And Abel, he also brought of the firstlings of his flock and of the fat thereof. And Jehovah had respect unto Abel and to his offering:" },
        { number: 5, text: "but unto Cain and to his offering he had not respect. And Cain was very wroth, and his countenance fell." },
        { number: 6, text: "And Jehovah said unto Cain, Why art thou wroth? and why is thy countenance fallen?" },
        { number: 7, text: "If thou doest well, shall it not be lifted up? and if thou doest not well, sin coucheth at the door: and unto thee shall be its desire, but do thou rule over it." },
        { number: 8, text: "And Cain told Abel his brother. And it came to pass, when they were in the field, that Cain rose up against Abel his brother, and slew him." },
        { number: 9, text: "And Jehovah said unto Cain, Where is Abel thy brother? And he said, I know not: am I my brother\'s keeper?" },
        { number: 10, text: "And he said, What hast thou done? the voice of thy brother\'s blood crieth unto me from the ground." },
        { number: 11, text: "And now cursed art thou from the ground, which hath opened its mouth to receive thy brother\'s blood from thy hand;" },
        { number: 12, text: "when thou tillest the ground, it shall not henceforth yield unto thee its strength; a fugitive and a wanderer shalt thou be in the earth." },
        { number: 13, text: "And Cain said unto Jehovah, My punishment is greater than I can bear." },
        { number: 14, text: "Behold, thou hast driven me out this day from the face of the ground; and from thy face shall I be hid; and I shall be a fugitive and a wanderer in the earth; and it will come to pass, that whosoever findeth me will slay me." },
        { number: 15, text: "And Jehovah said unto him, Therefore whosoever slayeth Cain, vengeance shall be taken on him sevenfold. And Jehovah appointed a sign for Cain, lest any finding him should smite him." },
        { number: 16, text: "And Cain went out from the presence of Jehovah, and dwelt in the land of Nod, on the east of Eden." },
        { number: 17, text: "And Cain knew his wife; and she conceived, and bare Enoch: and he builded a city, and called the name of the city, after the name of his son, Enoch." },
        { number: 18, text: "And unto Enoch was born Irad: and Irad begat Mehujael: and Mehujael begat Methushael; and Methushael begat Lamech." },
        { number: 19, text: "And Lamech took unto him two wives: the name of the one was Adah, and the name of the other Zillah." },
        { number: 20, text: "And Adah bare Jabal: he was the father of such as dwell in tents and have cattle." },
        { number: 21, text: "And his brother\'s name was Jubal: he was the father of all such as handle the harp and pipe." },
        { number: 22, text: "And Zillah, she also bare Tubal-cain, the forger of every cutting instrument of brass and iron: and the sister of Tubal-cain was Naamah." },
        { number: 23, text: "And Lamech said unto his wives: Adah and Zillah, hear my voice; Ye wives of Lamech, hearken unto my speech: For I have slain a man for wounding me, And a young man for bruising me:" },
        { number: 24, text: "If Cain shall be avenged sevenfold, Truly Lamech seventy and sevenfold." },
        { number: 25, text: "And Adam knew his wife again; and she bare a son, and called his name Seth: For, said she, God hath appointed me another seed instead of Abel; for Cain slew him." },
        { number: 26, text: "And to Seth, to him also there was born a son; and he called his name Enosh. Then began men to call upon the name of Jehovah." }
      ]
    },
    5: {
      title: 'Adam\'s Descendants to Noah',
      verses: [
        { number: 1, text: "This is the book of the generations of Adam. In the day that God created man, in the likeness of God made he him;" },
        { number: 2, text: "male and female created he them, and blessed them, and called their name Adam, in the day when they were created." },
        { number: 3, text: "And Adam lived a hundred and thirty years, and begat a son in his own likeness, after his image; and called his name Seth:" },
        { number: 4, text: "and the days of Adam after he begat Seth were eight hundred years: and he begat sons and daughters." },
        { number: 5, text: "And all the days that Adam lived were nine hundred and thirty years: and he died." },
        { number: 6, text: "And Seth lived a hundred and five years, and begat Enosh:" },
        { number: 7, text: "and Seth lived after he begat Enosh eight hundred and seven years, and begat sons and daughters:" },
        { number: 8, text: "and all the days of Seth were nine hundred and twelve years: and he died." },
        { number: 9, text: "And Enosh lived ninety years, and begat Kenan:" },
        { number: 10, text: "and Enosh lived after he begat Kenan eight hundred and fifteen years, and begat sons and daughters:" },
        { number: 11, text: "and all the days of Enosh were nine hundred and five years: and he died." },
        { number: 12, text: "And Kenan lived seventy years, and begat Mahalalel:" },
        { number: 13, text: "and Kenan lived after he begat Mahalalel eight hundred and forty years, and begat sons and daughters:" },
        { number: 14, text: "and all the days of Kenan were nine hundred and ten years: and he died." },
        { number: 15, text: "And Mahalalel lived sixty and five years, and begat Jared:" },
        { number: 16, text: "And Mahalalel lived after he begat Jared eight hundred and thirty years, and begat sons and daughters:" },
        { number: 17, text: "and all the days of Mahalalel were eight hundred ninety and five years: and he died." },
        { number: 18, text: "And Jared lived a hundred sixty and two years, and begat Enoch:" },
        { number: 19, text: "and Jared lived after he begat Enoch eight hundred years, and begat sons and daughters:" },
        { number: 20, text: "And all the days of Jared were nine hundred sixty and two years: and he died." },
        { number: 21, text: "And Enoch lived sixty and five years, and begat Methuselah:" },
        { number: 22, text: "and Enoch walked with God after he begat Methuselah three hundred years, and begat sons and daughters:" },
        { number: 23, text: "and all the days of Enoch were three hundred sixty and five years:" },
        { number: 24, text: "and Enoch walked with God: and he was not; for God took him." },
        { number: 25, text: "And Methuselah lived a hundred eighty and seven years, and begat Lamech:" },
        { number: 26, text: "and Methuselah lived after he begat Lamech seven hundred eighty and two years, and begat sons and daughters:" },
        { number: 27, text: "And all the days of Methuselah were nine hundred sixty and nine years: and he died." },
        { number: 28, text: "And Lamech lived a hundred eighty and two years, and begat a son:" },
        { number: 29, text: "and he called his name Noah, saying, This same shall comfort us in our work and in the toil of our hands, which cometh because of the ground which Jehovah hath cursed." },
        { number: 30, text: "And Lamech lived after he begat Noah five hundred ninety and five years, and begat sons and daughters:" },
        { number: 31, text: "And all the days of Lamech were seven hundred seventy and seven years: and he died." },
        { number: 32, text: "And Noah was five hundred years old: And Noah begat Shem, Ham, and Japheth." }
      ]
    },
    6: {
      title: 'Increasing Corruption on Earth',
      verses: [
        { number: 1, text: "And it came to pass, when men began to multiply on the face of the ground, and daughters were born unto them," },
        { number: 2, text: "that the sons of God saw the daughters of men that they were fair; and they took them wives of all that they chose." },
        { number: 3, text: "And Jehovah said, My spirit shall not strive with man for ever, for that he also is flesh: yet shall his days be a hundred and twenty years." },
        { number: 4, text: "The Nephilim were in the earth in those days, and also after that, when the sons of God came unto the daughters of men, and they bare children to them: the same were the mighty men that were of old, the men of renown." },
        { number: 5, text: "And Jehovah saw that the wickedness of man was great in the earth, and that every imagination of the thoughts of his heart was only evil continually." },
        { number: 6, text: "And it repented Jehovah that he had made man on the earth, and it grieved him at his heart." },
        { number: 7, text: "And Jehovah said, I will destroy man whom I have created from the face of the ground; both man, and beast, and creeping things, and birds of the heavens; for it repenteth me that I have made them." },
        { number: 8, text: "But Noah found favor in the eyes of Jehovah." },
        { number: 9, text: "These are the generations of Noah. Noah was a righteous man, and perfect in his generations: Noah walked with God." },
        { number: 10, text: "And Noah begat three sons, Shem, Ham, and Japheth." },
        { number: 11, text: "And the earth was corrupt before God, and the earth was filled with violence." },
        { number: 12, text: "And God saw the earth, and, behold, it was corrupt; for all flesh had corrupted their way upon the earth." },
        { number: 13, text: "And God said unto Noah, The end of all flesh is come before me; for the earth is filled with violence through them; and, behold, I will destroy them with the earth." },
        { number: 14, text: "Make thee an ark of gopher wood; rooms shalt thou make in the ark, and shalt pitch it within and without with pitch." },
        { number: 15, text: "And this is how thou shalt make it: the length of the ark three hundred cubits, the breadth of it fifty cubits, and the height of it thirty cubits." },
        { number: 16, text: "A light shalt thou make to the ark, and to a cubit shalt thou finish it upward; and the door of the ark shalt thou set in the side thereof; with lower, second, and third stories shalt thou make it." },
        { number: 17, text: "And I, behold, I do bring the flood of waters upon this earth, to destroy all flesh, wherein is the breath of life, from under heaven; everything that is in the earth shall die." },
        { number: 18, text: "But I will establish my covenant with thee; and thou shalt come into the ark, thou, and thy sons, and thy wife, and thy sons\' wives with thee." },
        { number: 19, text: "And of every living thing of all flesh, two of every sort shalt thou bring into the ark, to keep them alive with thee; they shall be male and female." },
        { number: 20, text: "Of the birds after their kind, and of the cattle after their kind, of every creeping thing of the ground after its kind, two of every sort shall come unto thee, to keep them alive." },
        { number: 21, text: "And take thou unto thee of all food that is eaten, and gather it to thee; and it shall be for food for thee, and for them." },
        { number: 22, text: "Thus did Noah; according to all that God commanded him, so did he." }
      ]
    }
  },
  'Matthew': {
    1: {
      title: 'The Genealogy of Jesus Christ',
      verses: [
        { number: 1, text: "The book of the genealogy of Jesus Christ, the Son of David, the Son of Abraham:" },
        { number: 2, text: "Abraham begat Isaac; and Isaac begat Jacob; and Jacob begat Judah and his brethren;" },
        { number: 3, text: "and Judah begat Perez and Zerah of Tamar; and Perez begat Hezron; and Hezron begat Ram;" },
        { number: 4, text: "and Ram begat Amminadab; and Amminadab begat Nahshon; and Nahshon begat Salmon;" },
        { number: 5, text: "and Salmon begat Boaz of Rahab; and Boaz begat Obed of Ruth; and Obed begat Jesse;" },
        { number: 6, text: "and Jesse begat David the king. And David begat Solomon of her that had been the wife of Uriah;" },
        { number: 7, text: "and Solomon begat Rehoboam; and Rehoboam begat Abijah; and Abijah begat Asa;" },
        { number: 8, text: "and Asa begat Jehoshaphat; and Jehoshaphat begat Joram; and Joram begat Uzziah;" },
        { number: 9, text: "and Uzziah begat Jotham; and Jotham begat Ahaz; and Ahaz begat Hezekiah;" },
        { number: 10, text: "and Hezekiah begat Manasseh; and Manasseh begat Amon; and Amon begat Josiah;" },
        { number: 11, text: "and Josiah begat Jechoniah and his brethren, at the time of the carrying away to Babylon." },
        { number: 12, text: "And after the carrying away to Babylon, Jechoniah begat Shealtiel; and Shealtiel begat Zerubbabel;" },
        { number: 13, text: "and Zerubbabel begat Abiud; and Abiud begat Eliakim; and Eliakim begat Azor;" },
        { number: 14, text: "and Azor begat Sadoc; and Sadoc begat Achim; and Achim begat Eliud;" },
        { number: 15, text: "and Eliud begat Eleazar; and Eleazar begat Matthan; and Matthan begat Jacob;" },
        { number: 16, text: "and Jacob begat Joseph the husband of Mary, of whom was born Jesus, who is called Christ." },
        { number: 17, text: "So all the generations from Abraham unto David are fourteen generations; and from David unto the carrying away to Babylon fourteen generations; and from the carrying away to Babylon unto the Christ fourteen generations." },
        { number: 18, text: "Now the birth of Jesus Christ was on this wise: When his mother Mary had been betrothed to Joseph, before they came together she was found with child of the Holy Spirit." },
        { number: 19, text: "And Joseph her husband, being a righteous man, and not willing to make her a public example, was minded to put her away privily." },
        { number: 20, text: "But when he thought on these things, behold, an angel of the Lord appeared unto him in a dream, saying, Joseph, thou son of David, fear not to take unto thee Mary thy wife: for that which is conceived in her is of the Holy Spirit." },
        { number: 21, text: "And she shall bring forth a son; and thou shalt call his name JESUS; for it is he that shall save his people from their sins." },
        { number: 22, text: "Now all this is come to pass, that it might be fulfilled which was spoken by the Lord through the prophet, saying," },
        { number: 23, text: "Behold, the virgin shall be with child, and shall bring forth a son, And they shall call his name Immanuel; which is, being interpreted, God with us." },
        { number: 24, text: "And Joseph arose from his sleep, and did as the angel of the Lord commanded him, and took unto him his wife;" },
        { number: 25, text: "and knew her not till she had brought forth a son: and he called his name JESUS." }
      ]
    },
    2: {
      title: 'The Visit of the Wise Men',
      verses: [
        { number: 1, text: "Now when Jesus was born in Bethlehem of Judaea in the days of Herod the king, behold, Wise-men from the east came to Jerusalem, saying," },
        { number: 2, text: "Where is he that is born King of the Jews? for we saw his star in the east, and are come to worship him." },
        { number: 3, text: "And when Herod the king heard it, he was troubled, and all Jerusalem with him." },
        { number: 4, text: "And gathering together all the chief priests and scribes of the people, he inquired of them where the Christ should be born." },
        { number: 5, text: "And they said unto him, In Bethlehem of Judaea: for thus it is written through the prophet," },
        { number: 6, text: "And thou Bethlehem, land of Judah, Art in no wise least among the princes of Judah: For out of thee shall come forth a governor, Who shall be shepherd of my people Israel." },
        { number: 7, text: "Then Herod privily called the Wise-men, and learned of them exactly what time the star appeared." },
        { number: 8, text: "And he sent them to Bethlehem, and said, Go and search out exactly concerning the young child; and when ye have found him, bring me word, that I also may come and worship him." },
        { number: 9, text: "And they, having heard the king, went their way; and lo, the star, which they saw in the east, went before them, till it came and stood over where the young child was." },
        { number: 10, text: "And when they saw the star, they rejoiced with exceeding great joy." },
        { number: 11, text: "And they came into the house and saw the young child with Mary his mother; and they fell down and worshipped him; and opening their treasures they offered unto him gifts, gold and frankincense and myrrh." },
        { number: 12, text: "And being warned of God in a dream that they should not return to Herod, they departed into their own country another way." },
        { number: 13, text: "Now when they were departed, behold, an angel of the Lord appeareth to Joseph in a dream, saying, Arise and take the young child and his mother, and flee into Egypt, and be thou there until I tell thee: for Herod will seek the young child to destroy him." },
        { number: 14, text: "And he arose and took the young child and his mother by night, and departed into Egypt;" },
        { number: 15, text: "and was there until the death of Herod: that it might be fulfilled which was spoken by the Lord through the prophet, saying, Out of Egypt did I call my son." },
        { number: 16, text: "Then Herod, when he saw that he was mocked of the Wise-men, was exceeding wroth, and sent forth, and slew all the male children that were in Bethlehem, and in all the borders thereof, from two years old and under, according to the time which he had exactly learned of the Wise-men." },
        { number: 17, text: "Then was fulfilled that which was spoken through Jeremiah the prophet, saying," },
        { number: 18, text: "A voice was heard in Ramah, Weeping and great mourning, Rachel weeping for her children; And she would not be comforted, because they are not." },
        { number: 19, text: "But when Herod was dead, behold, an angel of the Lord appeareth in a dream to Joseph in Egypt, saying," },
        { number: 20, text: "Arise and take the young child and his mother, and go into the land of Israel: for they are dead that sought the young child\'s life." },
        { number: 21, text: "And he arose and took the young child and his mother, and came into the land of Israel." },
        { number: 22, text: "But when he heard that Archelaus was reigning over Judaea in the room of his father Herod, he was afraid to go thither; and being warned of God in a dream, he withdrew into the parts of Galilee," },
        { number: 23, text: "and came and dwelt in a city called Nazareth; that it might be fulfilled which was spoken through the prophets, that he should be called a Nazarene." }
      ]
    },
    3: {
      title: 'John the Baptist Prepares the Way',
      verses: [
        { number: 1, text: "And in those days cometh John the Baptist, preaching in the wilderness of Judaea, saying," },
        { number: 2, text: "Repent ye; for the kingdom of heaven is at hand." },
        { number: 3, text: "For this is he that was spoken of through Isaiah the prophet, saying, The voice of one crying in the wilderness, Make ye ready the way of the Lord, Make his paths straight." },
        { number: 4, text: "Now John himself had his raiment of camel\'s hair, and a leathern girdle about his loins; and his food was locusts and wild honey." },
        { number: 5, text: "Then went out unto him Jerusalem, and all Judaea, and all the region round about the Jordan;" },
        { number: 6, text: "and they were baptized of him in the river Jordan, confessing their sins." },
        { number: 7, text: "But when he saw many of the Pharisees and Sadducees coming to his baptism, he said unto them, Ye offspring of vipers, who warned you to flee from the wrath to come?" },
        { number: 8, text: "Bring forth therefore fruit worthy of repentance:" },
        { number: 9, text: "and think not to say within yourselves, We have Abraham to our father: for I say unto you, that God is able of these stones to raise up children unto Abraham." },
        { number: 10, text: "And even now the axe lieth at the root of the trees: every tree therefore that bringeth not forth good fruit is hewn down, and cast into the fire." },
        { number: 11, text: "I indeed baptize you in water unto repentance: but he that cometh after me is mightier than I, whose shoes I am not worthy to bear: he shall baptize you in the Holy Spirit and in fire:" },
        { number: 12, text: "whose fan is in his hand, and he will thoroughly cleanse his threshing-floor; and he will gather his wheat into the garner, but the chaff he will burn up with unquenchable fire." },
        { number: 13, text: "Then cometh Jesus from Galilee to the Jordan unto John, to be baptized of him." },
        { number: 14, text: "But John would have hindered him, saying, I have need to be baptized of thee, and comest thou to me?" },
        { number: 15, text: "But Jesus answering said unto him, Suffer it now: for thus it becometh us to fulfil all righteousness. Then he suffereth him." },
        { number: 16, text: "And Jesus when he was baptized, went up straightway from the water: and lo, the heavens were opened unto him, and he saw the Spirit of God descending as a dove, and coming upon him;" },
        { number: 17, text: "and lo, a voice out of the heavens, saying, This is my beloved Son, in whom I am well pleased." }
      ]
    },
    4: {
      title: 'The Temptation of Jesus',
      verses: [
        { number: 1, text: "Then was Jesus led up of the Spirit into the wilderness to be tempted of the devil." },
        { number: 2, text: "And when he had fasted forty days and forty nights, he afterward hungered." },
        { number: 3, text: "And the tempter came and said unto him, If thou art the Son of God, command that these stones become bread." },
        { number: 4, text: "But he answered and said, It is written, Man shall not live by bread alone, but by every word that proceedeth out of the mouth of God." },
        { number: 5, text: "Then the devil taketh him into the holy city; and he set him on the pinnacle of the temple," },
        { number: 6, text: "and saith unto him, If thou art the Son of God, cast thyself down: for it is written, He shall give his angels charge concerning thee: and, On their hands they shall bear thee up, Lest haply thou dash thy foot against a stone." },
        { number: 7, text: "Jesus said unto him, Again it is written, Thou shalt not make trial of the Lord thy God." },
        { number: 8, text: "Again, the devil taketh him unto an exceeding high mountain, and showeth him all the kingdoms of the world, and the glory of them;" },
        { number: 9, text: "and he said unto him, All these things will I give thee, if thou wilt fall down and worship me." },
        { number: 10, text: "Then saith Jesus unto him, Get thee hence, Satan: for it is written, Thou shalt worship the Lord thy God, and him only shalt thou serve." },
        { number: 11, text: "Then the devil leaveth him; and behold, angels came and ministered unto him." },
        { number: 12, text: "Now when he heard that John was delivered up, he withdrew into Galilee;" },
        { number: 13, text: "and leaving Nazareth, he came and dwelt in Capernaum, which is by the sea, in the borders of Zebulun and Naphtali:" },
        { number: 14, text: "that it might be fulfilled which was spoken through Isaiah the prophet, saying," },
        { number: 15, text: "The land of Zebulun and the land of Naphtali, Toward the sea, beyond the Jordan, Galilee of the Gentiles," },
        { number: 16, text: "The people that sat in darkness Saw a great light, And to them that sat in the region and shadow of death, To them did light spring up." },
        { number: 17, text: "From that time began Jesus to preach, and to say, Repent ye; for the kingdom of heaven is at hand." },
        { number: 18, text: "And walking by the sea of Galilee, he saw two brethren, Simon who is called Peter, and Andrew his brother, casting a net into the sea; for they were fishers." },
        { number: 19, text: "And he saith unto them, Come ye after me, and I will make you fishers of men." },
        { number: 20, text: "And they straightway left the nets, and followed him." },
        { number: 21, text: "And going on from thence he saw two other brethren, James the son of Zebedee, and John his brother, in the boat with Zebedee their father, mending their nets; and he called them." },
        { number: 22, text: "And they straightway left the boat and their father, and followed him." },
        { number: 23, text: "And Jesus went about in all Galilee, teaching in their synagogues, and preaching the gospel of the kingdom, and healing all manner of disease and all manner of sickness among the people." },
        { number: 24, text: "And the report of him went forth into all Syria: and they brought unto him all that were sick, holden with divers diseases and torments, possessed with demons, and epileptic, and palsied; and he healed them." },
        { number: 25, text: "And there followed him great multitudes from Galilee and Decapolis and Jerusalem and Judaea and from beyond the Jordan." }
      ]
    },
    5: {
      title: 'The Sermon on the Mount',
      verses: [
        { number: 1, text: "And seeing the multitudes, he went up into the mountain: and when he had sat down, his disciples came unto him:" },
        { number: 2, text: "and he opened his mouth and taught them, saying," },
        { number: 3, text: "Blessed are the poor in spirit: for theirs is the kingdom of heaven." },
        { number: 4, text: "Blessed are they that mourn: for they shall be comforted." },
        { number: 5, text: "Blessed are the meek: for they shall inherit the earth." },
        { number: 6, text: "Blessed are they that hunger and thirst after righteousness: for they shall be filled." },
        { number: 7, text: "Blessed are the merciful: for they shall obtain mercy." },
        { number: 8, text: "Blessed are the pure in heart: for they shall see God." },
        { number: 9, text: "Blessed are the peacemakers: for they shall be called sons of God." },
        { number: 10, text: "Blessed are they that have been persecuted for righteousness\' sake: for theirs is the kingdom of heaven." },
        { number: 11, text: "Blessed are ye when men shall reproach you, and persecute you, and say all manner of evil against you falsely, for my sake." },
        { number: 12, text: "Rejoice, and be exceeding glad: for great is your reward in heaven: for so persecuted they the prophets that were before you." },
        { number: 13, text: "Ye are the salt of the earth: but if the salt have lost its savor, wherewith shall it be salted? it is thenceforth good for nothing, but to be cast out and trodden under foot of men." },
        { number: 14, text: "Ye are the light of the world. A city set on a hill cannot be hid." },
        { number: 15, text: "Neither do men light a lamp, and put it under the bushel, but on the stand; and it shineth unto all that are in the house." },
        { number: 16, text: "Even so let your light shine before men; that they may see your good works, and glorify your Father who is in heaven." },
        { number: 17, text: "Think not that I came to destroy the law or the prophets: I came not to destroy, but to fulfil." },
        { number: 18, text: "For verily I say unto you, Till heaven and earth pass away, one jot or one tittle shall in no wise pass away from the law, till all things be accomplished." },
        { number: 19, text: "Whosoever therefore shall break one of these least commandments, and shall teach men so, shall be called least in the kingdom of heaven: but whosoever shall do and teach them, he shall be called great in the kingdom of heaven." },
        { number: 20, text: "For I say unto you, that except your righteousness shall exceed the righteousness of the scribes and Pharisees, ye shall in no wise enter into the kingdom of heaven." },
        { number: 21, text: "Ye have heard that it was said to them of old time, Thou shalt not kill; and whosoever shall kill shall be in danger of the judgment:" },
        { number: 22, text: "but I say unto you, that every one who is angry with his brother shall be in danger of the judgment; and whosoever shall say to his brother, Raca, shall be in danger of the council; and whosoever shall say, Thou fool, shall be in danger of the hell of fire." },
        { number: 23, text: "If therefore thou art offering thy gift at the altar, and there rememberest that thy brother hath aught against thee," },
        { number: 24, text: "leave there thy gift before the altar, and go thy way, first be reconciled to thy brother, and then come and offer thy gift." },
        { number: 25, text: "Agree with thine adversary quickly, while thou art with him in the way; lest haply the adversary deliver thee to the judge, and the judge deliver thee to the officer, and thou be cast into prison." },
        { number: 26, text: "Verily I say unto thee, thou shalt by no means come out thence, till thou have paid the last farthing." },
        { number: 27, text: "Ye have heard that it was said, Thou shalt not commit adultery:" },
        { number: 28, text: "but I say unto you, that every one that looketh on a woman to lust after her hath committed adultery with her already in his heart." },
        { number: 29, text: "And if thy right eye causeth thee to stumble, pluck it out, and cast it from thee: for it is profitable for thee that one of thy members should perish, and not thy whole body be cast into hell." },
        { number: 30, text: "And if thy right hand causeth thee to stumble, cut it off, and cast it from thee: for it is profitable for thee that one of thy members should perish, and not thy whole body go into hell." },
        { number: 31, text: "It was said also, Whosoever shall put away his wife, let him give her a writing of divorcement:" },
        { number: 32, text: "but I say unto you, that every one that putteth away his wife, saving for the cause of fornication, maketh her an adulteress: and whosoever shall marry her when she is put away committeth adultery." },
        { number: 33, text: "Again, ye have heard that it was said to them of old time, Thou shalt not forswear thyself, but shalt perform unto the Lord thine oaths:" },
        { number: 34, text: "but I say unto you, swear not at all; neither by the heaven, for it is the throne of God;" },
        { number: 35, text: "nor by the earth, for it is the footstool of his feet; nor by Jerusalem, for it is the city of the great King." },
        { number: 36, text: "Neither shalt thou swear by thy head, for thou canst not make one hair white or black." },
        { number: 37, text: "But let your speech be, Yea, yea; Nay, nay: and whatsoever is more than these is of the evil one." },
        { number: 38, text: "Ye have heard that it was said, An eye for an eye, and a tooth for a tooth:" },
        { number: 39, text: "but I say unto you, resist not him that is evil: but whosoever smiteth thee on thy right cheek, turn to him the other also." },
        { number: 40, text: "And if any man would go to law with thee, and take away thy coat, let him have thy cloak also." },
        { number: 41, text: "And whosoever shall compel thee to go one mile, go with him two." },
        { number: 42, text: "Give to him that asketh thee, and from him that would borrow of thee turn not thou away." },
        { number: 43, text: "Ye have heard that it was said, Thou shalt love thy neighbor, and hate thine enemy:" },
        { number: 44, text: "but I say unto you, love your enemies, and pray for them that persecute you;" },
        { number: 45, text: "that ye may be sons of your Father who is in heaven: for he maketh his sun to rise on the evil and the good, and sendeth rain on the just and the unjust." },
        { number: 46, text: "For if ye love them that love you, what reward have ye? do not even the publicans the same?" },
        { number: 47, text: "And if ye salute your brethren only, what do ye more than others? do not even the Gentiles the same?" },
        { number: 48, text: "Ye therefore shall be perfect, as your heavenly Father is perfect." }
      ]
    },
    6: {
      title: 'Teaching About Giving',
      verses: [
        { number: 1, text: "Take heed that ye do not your righteousness before men, to be seen of them: else ye have no reward with your Father who is in heaven." },
        { number: 2, text: "When therefore thou doest alms, sound not a trumpet before thee, as the hypocrites do in the synagogues and in the streets, that they may have glory of men. Verily I say unto you, They have received their reward." },
        { number: 3, text: "But when thou doest alms, let not thy left hand know what thy right hand doeth:" },
        { number: 4, text: "that thine alms may be in secret: and thy Father who seeth in secret shall recompense thee." },
        { number: 5, text: "And when ye pray, ye shall not be as the hypocrites: for they love to stand and pray in the synagogues and in the corners of the streets, that they may be seen of men. Verily I say unto you, They have received their reward." },
        { number: 6, text: "But thou, when thou prayest, enter into thine inner chamber, and having shut thy door, pray to thy Father who is in secret, and thy Father who seeth in secret shall recompense thee." },
        { number: 7, text: "And in praying use not vain repetitions, as the Gentiles do: for they think that they shall be heard for their much speaking." },
        { number: 8, text: "Be not therefore like unto them: for your Father knoweth what things ye have need of, before ye ask him." },
        { number: 9, text: "After this manner therefore pray ye. Our Father who art in heaven, Hallowed be thy name." },
        { number: 10, text: "Thy kingdom come. Thy will be done, as in heaven, so on earth." },
        { number: 11, text: "Give us this day our daily bread." },
        { number: 12, text: "And forgive us our debts, as we also have forgiven our debtors." },
        { number: 13, text: "And bring us not into temptation, but deliver us from the evil one." },
        { number: 14, text: "For if ye forgive men their trespasses, your heavenly Father will also forgive you." },
        { number: 15, text: "But if ye forgive not men their trespasses, neither will your Father forgive your trespasses." },
        { number: 16, text: "Moreover when ye fast, be not, as the hypocrites, of a sad countenance: for they disfigure their faces, that they may be seen of men to fast. Verily I say unto you, They have received their reward." },
        { number: 17, text: "But thou, when thou fastest, anoint thy head, and wash thy face;" },
        { number: 18, text: "that thou be not seen of men to fast, but of thy Father who is in secret: and thy Father, who seeth in secret, shall recompense thee." },
        { number: 19, text: "Lay not up for yourselves treasures upon the earth, where moth and rust consume, and where thieves break through and steal:" },
        { number: 20, text: "but lay up for yourselves treasures in heaven, where neither moth nor rust doth consume, and where thieves do not break through nor steal:" },
        { number: 21, text: "for where thy treasure is, there will thy heart be also." },
        { number: 22, text: "The lamp of the body is the eye: if therefore thine eye be single, thy whole body shall be full of light." },
        { number: 23, text: "But if thine eye be evil, thy whole body shall be full of darkness. If therefore the light that is in thee be darkness, how great is the darkness!" },
        { number: 24, text: "No man can serve two masters; for either he will hate the one, and love the other; or else he will hold to one, and despise the other. Ye cannot serve God and mammon." },
        { number: 25, text: "Therefore I say unto you, be not anxious for your life, what ye shall eat, or what ye shall drink; nor yet for your body, what ye shall put on. Is not the life more than the food, and the body than the raiment?" },
        { number: 26, text: "Behold the birds of the heaven, that they sow not, neither do they reap, nor gather into barns; and your heavenly Father feedeth them. Are not ye of much more value than they?" },
        { number: 27, text: "And which of you by being anxious can add one cubit unto the measure of his life?" },
        { number: 28, text: "And why are ye anxious concerning raiment? Consider the lilies of the field, how they grow; they toil not, neither do they spin:" },
        { number: 29, text: "yet I say unto you, that even Solomon in all his glory was not arrayed like one of these." },
        { number: 30, text: "But if God doth so clothe the grass of the field, which to-day is, and to-morrow is cast into the oven, shall he not much more clothe you, O ye of little faith?" },
        { number: 31, text: "Be not therefore anxious, saying, What shall we eat? or, What shall we drink? or, Wherewithal shall we be clothed?" },
        { number: 32, text: "For after all these things do the Gentiles seek; for your heavenly Father knoweth that ye have need of all these things." },
        { number: 33, text: "But seek ye first his kingdom, and his righteousness; and all these things shall be added unto you." },
        { number: 34, text: "Be not therefore anxious for the morrow: for the morrow will be anxious for itself. Sufficient unto the day is the evil thereof." }
      ]
    }
  }
};

// Fallback content for books/chapters not in the mock data
const defaultContent = {
  title: 'Sample Chapter Content',
  verses: [
    { number: 1, text: "In the beginning God created the heaven and the earth." },
    { number: 2, text: "And the earth was without form, and void; and darkness was upon the face of the deep. And the Spirit of God moved upon the face of the waters." },
    { number: 3, text: "And God said, Let there be light: and there was light." },
    { number: 4, text: "And God saw the light, that it was good: and God divided the light from the darkness." },
    { number: 5, text: "And God called the light Day, and the darkness he called Night. And the evening and the morning were the first day." },
    { number: 6, text: "And God said, Let there be a firmament in the midst of the waters, and let it divide the waters from the waters." },
    { number: 7, text: "And God made the firmament, and divided the waters which were under the firmament from the waters which were above the firmament: and it was so." },
    { number: 8, text: "And God called the firmament Heaven. And the evening and the morning were the second day." },
    { number: 9, text: "And God said, Let the waters under the heaven be gathered together unto one place, and let the dry land appear: and it was so." },
    { number: 10, text: "And God called the dry land Earth; and the gathering together of the waters called he Seas: and God saw that it was good." },
    { number: 11, text: "And God said, Let the earth bring forth grass, the herb yielding seed, and the fruit tree yielding fruit after his kind, whose seed is in itself, upon the earth: and it was so." },
    { number: 12, text: "And the earth brought forth grass, and herb yielding seed after his kind, and the tree yielding fruit, whose seed was in itself, after his kind: and God saw that it was good." },
    { number: 13, text: "And the evening and the morning were the third day." },
    { number: 14, text: "And God said, Let there be lights in the firmament of the heaven to divide the day from the night; and let them be for signs, and for seasons, and for days, and years:" },
    { number: 15, text: "And let them be for lights in the firmament of the heaven to give light upon the earth: and it was so." },
    { number: 16, text: "And God made two great lights; the greater light to rule the day, and the lesser light to rule the night: he made the stars also." },
    { number: 17, text: "And God set them in the firmament of the heaven to give light upon the earth," },
    { number: 18, text: "And to rule over the day and over the night, and to divide the light from the darkness: and God saw that it was good." },
    { number: 19, text: "And the evening and the morning were the fourth day." },
    { number: 20, text: "And God said, Let the waters bring forth abundantly the moving creature that hath life, and fowl that may fly above the earth in the open firmament of heaven." },
    { number: 21, text: "And God created great whales, and every living creature that moveth, which the waters brought forth abundantly, after their kind, and every winged fowl after his kind: and God saw that it was good." },
    { number: 22, text: "And God blessed them, saying, Be fruitful, and multiply, and fill the waters in the seas, and let fowl multiply in the earth." },
    { number: 23, text: "And the evening and the morning were the fifth day." },
    { number: 24, text: "And God said, Let the earth bring forth the living creature after his kind, cattle, and creeping thing, and beast of the earth after his kind: and it was so." },
    { number: 25, text: "And God made the beast of the earth after his kind, and cattle after their kind, and every thing that creepeth upon the earth after his kind: and God saw that it was good." },
    { number: 26, text: "And God said, Let us make man in our image, after our likeness: and let them have dominion over the fish of the sea, and over the fowl of the air, and over the cattle, and over all the earth, and over every creeping thing that creepeth upon the earth." },
    { number: 27, text: "So God created man in his own image, in the image of God created he him; male and female created he them." },
    { number: 28, text: "And God blessed them, and God said unto them, Be fruitful, and multiply, and replenish the earth, and subdue it: and have dominion over the fish of the sea, and over the fowl of the air, and over every living thing that moveth upon the earth." },
    { number: 29, text: "And God said, Behold, I have given you every herb bearing seed, which is upon the face of all the earth, and every tree, in the which is the fruit of a tree yielding seed; to you it shall be for meat." },
    { number: 30, text: "And to every beast of the earth, and to every fowl of the air, and to every thing that creepeth upon the earth, wherein there is life, I have given every green herb for meat: and it was so." },
    { number: 31, text: "And God saw every thing that he had made, and, behold, it was very good. And the evening and the morning were the sixth day." }
  ]
};

export default function ChapterContent({ book, chapter, font, fontSize, version = 'NKJV', scrollToVerse, readingVerse, theme }: ChapterContentProps) {
  const [apiContent, setApiContent] = useState<{ title: string; verses: { number: number; text: string }[] } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch Bible content from API
  useEffect(() => {
    let isMounted = true;

    const fetchContent = async () => {
      if (!book || !chapter || book === 'undefined' || !version) {
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        console.log("Bible request:", book, chapter, version);
        const response = await fetch(`/api/v1/bible/${encodeURIComponent(version)}/${encodeURIComponent(book)}/${chapter}`);
        const result = await response.json();

        if (isMounted) {
          if (result.success) {
            // Map API data to the format used by the component
            const data = result.data;
            setApiContent({
              title: `${data.book.name} ${data.chapter.number}`,
              verses: data.verses
            });
          } else {
            setError(result.error || 'Failed to fetch content');
            setApiContent(null);
          }
        }
      } catch (err) {
        if (isMounted) {
          setError('An error occurred while fetching content');
          setApiContent(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchContent();

    return () => {
      isMounted = false;
    };
  }, [book, chapter, version]);

  // Select the appropriate Bible content
  // Fallback to mock data if API call fails or is loading
  const content = apiContent; // || (mockBibleContent[book]?.[chapter]);

  // Scroll to specific verse when scrollToVerse changes
  useEffect(() => {
    if (scrollToVerse && scrollToVerse >= 1 && content?.verses?.length && content.verses.length > 0) {
      // Use a longer timeout to ensure the DOM and transitions are ready
      const timer = setTimeout(() => {
        const verseElement = document.getElementById(`verse-${book}-${chapter}-${scrollToVerse}`);
        if (verseElement) {
          // Get the scroll container (the main scrollable area)
          const scrollContainer = document.querySelector('[class*="overflow-y-auto"]');

          if (scrollContainer) {
            // Calculate position with offset for sticky header (approximately 100px)
            const elementTop = verseElement.getBoundingClientRect().top;
            const containerTop = scrollContainer.getBoundingClientRect().top;
            const currentScroll = scrollContainer.scrollTop;
            const targetScroll = currentScroll + elementTop - containerTop - 100; // 100px offset for header

            // Smooth scroll to position
            scrollContainer.scrollTo({
              top: targetScroll,
              behavior: 'smooth'
            });
          } else {
            // Fallback to scrollIntoView
            verseElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [scrollToVerse, book, chapter, content]);

  if (error && !content) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] px-6 text-center">
        <div className="size-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
          <svg className="size-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">Failed to load content</h3>
        <p className="text-gray-500 max-w-xs">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-6 px-6 py-2 bg-[#006a6f] text-white rounded-full font-medium shadow-lg shadow-[#006a6f]/20 hover:bg-[#005a5f] transition-all"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (isLoading || !book || !version || book === 'undefined' || !apiContent) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--color-primary-teal)]"></div>
        <p className="text-sm font-medium text-gray-500 animate-pulse">Loading Bible content...</p>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 py-4 sm:py-6 pb-[180px]">
      <div className="max-w-2xl mx-auto">
        {/* Chapter title */}
        <div className="mb-8">
          <h2
            className="text-xl font-bold mb-8"
            style={{ color: theme?.text }}
          >
            {content?.title}
          </h2>
        </div>

        {/* Bible text */}
        <div className="space-y-1.5 text-justify leading-7">
          {content?.verses?.map(verse => (
            <p
              key={verse.number}
              id={`verse-${book}-${chapter}-${verse.number}`}
              className="transition-all duration-500 rounded px-2 py-1"
              style={{
                fontFamily: font,
                fontSize: `${fontSize}px`,
                color: theme?.text,
                backgroundColor: readingVerse === verse.number ? '#fbebee' : 'transparent'
              }}
            >
              <sup
                className="font-bold mr-1"
                style={{ color: theme?.verseNumber }}
              >
                {verse?.number}
              </sup>
              {verse?.text}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}