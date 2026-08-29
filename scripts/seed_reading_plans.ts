import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import mongoose from 'mongoose';
import connectDB from '../src/lib/db';
import { Plan } from '../src/models/Plan';
import { User } from '../src/models/User';

async function seedReadingPlans() {
  try {
    await connectDB();
    console.log('Connected to MongoDB for seeding reading plans...');

    // Find or create admin user
    let adminUser = await User.findOne({ role: { $in: ['SUPER_ADMIN', 'SUB_ADMIN'] } });
    if (!adminUser) {
      adminUser = await User.findOne({});
    }

    const adminId = adminUser ? adminUser._id : new mongoose.Types.ObjectId();

    // Check existing plans count
    const existingCount = await Plan.countDocuments({});
    if (existingCount > 0) {
      console.log(`Found ${existingCount} existing plans in database. Refreshing seed data...`);
    }

    const samplePlans = [
      {
        title: 'Finding Peace in Difficult Times',
        description: 'A 5-day journey exploring God’s promises of peace, comfort, and unwavering hope when life feels overwhelming.',
        duration: 5,
        category: 'Peace & Comfort',
        difficulty: 'beginner',
        imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1000',
        thumbnailUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400',
        author: 'The Bible Net Team',
        isPublished: true,
        createdBy: adminId,
        days: [
          {
            dayId: 'peace_day_1',
            dayNumber: 1,
            title: 'The Gift of Peace',
            description: 'Understanding God’s peace which surpasses all human understanding.',
            items: [
              {
                itemId: 'peace_day_1_item_1',
                type: 'devotional',
                title: 'Devotional: Peace Beyond Circumstances',
                devotionalText: 'Peace is not the absence of trouble; peace is the presence of God. When Jesus promised peace to His disciples, He knew they would face persecution, fear, and uncertainty. Yet He offered them a peace that the world could never give or take away.',
                mediaUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
              },
              {
                itemId: 'peace_day_1_item_2',
                type: 'scripture',
                title: 'Philippians 4:6–7 NIV',
                scriptureRef: 'Philippians 4:6-7',
                bibleVersion: 'NIV',
              },
              {
                itemId: 'peace_day_1_item_3',
                type: 'scripture',
                title: 'John 14:27 NIV',
                scriptureRef: 'John 14:27',
                bibleVersion: 'NIV',
              },
            ],
          },
          {
            dayId: 'peace_day_2',
            dayNumber: 2,
            title: 'Trusting in the Storm',
            description: 'Fixing your heart on the One who stills the storm.',
            items: [
              {
                itemId: 'peace_day_2_item_1',
                type: 'devotional',
                title: 'Devotional: Anchor for the Soul',
                devotionalText: 'When storm clouds gather and waves rise around us, where do we place our trust? True peace comes when we choose to focus on God’s character rather than the height of our storms.',
              },
              {
                itemId: 'peace_day_2_item_2',
                type: 'scripture',
                title: 'Isaiah 26:3 NIV',
                scriptureRef: 'Isaiah 26:3',
                bibleVersion: 'NIV',
              },
              {
                itemId: 'peace_day_2_item_3',
                type: 'scripture',
                title: 'Psalm 46:10 NIV',
                scriptureRef: 'Psalm 46:10',
                bibleVersion: 'NIV',
              },
            ],
          },
          {
            dayId: 'peace_day_3',
            dayNumber: 3,
            title: 'Casting Your Cares',
            description: 'Surrendering heavy burdens to the Lord.',
            items: [
              {
                itemId: 'peace_day_3_item_1',
                type: 'devotional',
                title: 'Devotional: Unburdening Your Heart',
                devotionalText: 'You were never meant to carry your worries alone. God invites us to come to Him with every care, small or large, and exchange our weariness for His gentle rest.',
              },
              {
                itemId: 'peace_day_3_item_2',
                type: 'scripture',
                title: '1 Peter 5:7 NIV',
                scriptureRef: '1 Peter 5:7',
                bibleVersion: 'NIV',
              },
              {
                itemId: 'peace_day_3_item_3',
                type: 'scripture',
                title: 'Matthew 11:28–30 NIV',
                scriptureRef: 'Matthew 11:28-30',
                bibleVersion: 'NIV',
              },
            ],
          },
          {
            dayId: 'peace_day_4',
            dayNumber: 4,
            title: 'Walking in Stillness',
            description: 'Practicing quiet reflection in God’s presence.',
            items: [
              {
                itemId: 'peace_day_4_item_1',
                type: 'devotional',
                title: 'Devotional: Be Still and Know',
                devotionalText: 'In our fast-paced world, stillness is a discipline. Taking time to be quiet before God allows His voice to clarify our minds and calm our hearts.',
              },
              {
                itemId: 'peace_day_4_item_2',
                type: 'scripture',
                title: 'Psalm 23:1–3 NIV',
                scriptureRef: 'Psalm 23:1-3',
                bibleVersion: 'NIV',
              },
            ],
          },
          {
            dayId: 'peace_day_5',
            dayNumber: 5,
            title: 'Shining His Peace to Others',
            description: 'Becoming peacemakers in a troubled world.',
            items: [
              {
                itemId: 'peace_day_5_item_1',
                type: 'devotional',
                title: 'Devotional: Ambassadors of Peace',
                devotionalText: 'As we receive God’s peace, we become channels through which His love and peace reach those around us.',
              },
              {
                itemId: 'peace_day_5_item_2',
                type: 'scripture',
                title: 'Matthew 5:9 NIV',
                scriptureRef: 'Matthew 5:9',
                bibleVersion: 'NIV',
              },
              {
                itemId: 'peace_day_5_item_3',
                type: 'scripture',
                title: 'Romans 15:13 NIV',
                scriptureRef: 'Romans 15:13',
                bibleVersion: 'NIV',
              },
            ],
          },
        ],
      },
      {
        title: 'The Story of Jesus: Gospel Walk',
        description: 'A 7-day walk through key moments in the life, teachings, death, and triumphant resurrection of Jesus Christ.',
        duration: 7,
        category: 'Jesus & Gospels',
        difficulty: 'beginner',
        imageUrl: 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?w=1000',
        thumbnailUrl: 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?w=400',
        author: 'Dr. David Miller',
        isPublished: true,
        createdBy: adminId,
        days: [
          {
            dayId: 'jesus_day_1',
            dayNumber: 1,
            title: 'The Word Made Flesh',
            description: 'The incarnation of Christ and eternal hope.',
            items: [
              {
                itemId: 'jesus_day_1_item_1',
                type: 'devotional',
                title: 'Devotional: Light in the Darkness',
                devotionalText: 'John introduces Jesus not just as a historical teacher, but as the eternal Word through whom all creation was made.',
              },
              {
                itemId: 'jesus_day_1_item_2',
                type: 'scripture',
                title: 'John 1:1–14 NIV',
                scriptureRef: 'John 1:1-14',
                bibleVersion: 'NIV',
              },
            ],
          },
          {
            dayId: 'jesus_day_2',
            dayNumber: 2,
            title: 'The Sermon on the Mount',
            description: 'Kingdom principles for living.',
            items: [
              {
                itemId: 'jesus_day_2_item_1',
                type: 'devotional',
                title: 'Devotional: The Beatitudes',
                devotionalText: 'Jesus upside-down kingdom turns human values on their head, blessing the poor in spirit, the meek, and peacemakers.',
              },
              {
                itemId: 'jesus_day_2_item_2',
                type: 'scripture',
                title: 'Matthew 5:1–12 NIV',
                scriptureRef: 'Matthew 5:1-12',
                bibleVersion: 'NIV',
              },
            ],
          },
          {
            dayId: 'jesus_day_3',
            dayNumber: 3,
            title: 'Miracles and Compassion',
            description: 'Jesus heals and sets free.',
            items: [
              {
                itemId: 'jesus_day_3_item_1',
                type: 'devotional',
                title: 'Devotional: Touched by Grace',
                devotionalText: 'Every miracle of Jesus reveals His heart of compassion for those who are suffering and cast aside.',
              },
              {
                itemId: 'jesus_day_3_item_2',
                type: 'scripture',
                title: 'Mark 4:35–41 NIV',
                scriptureRef: 'Mark 4:35-41',
                bibleVersion: 'NIV',
              },
            ],
          },
          {
            dayId: 'jesus_day_4',
            dayNumber: 4,
            title: 'The Good Shepherd',
            description: 'Knowing the voice of the Saviour.',
            items: [
              {
                itemId: 'jesus_day_4_item_1',
                type: 'devotional',
                title: 'Devotional: He Calls Us By Name',
                devotionalText: 'A good shepherd lays down his life for the sheep. Jesus knows us intimately and guides us faithfully.',
              },
              {
                itemId: 'jesus_day_4_item_2',
                type: 'scripture',
                title: 'John 10:11–18 NIV',
                scriptureRef: 'John 10:11-18',
                bibleVersion: 'NIV',
              },
            ],
          },
          {
            dayId: 'jesus_day_5',
            dayNumber: 5,
            title: 'The Upper Room & Lord’s Supper',
            description: 'Love and humility demonstrated.',
            items: [
              {
                itemId: 'jesus_day_5_item_1',
                type: 'devotional',
                title: 'Devotional: Washing Feet and New Commandment',
                devotionalText: 'On the night He was betrayed, Jesus showed the ultimate expression of servant leadership by washing His disciples feet.',
              },
              {
                itemId: 'jesus_day_5_item_2',
                type: 'scripture',
                title: 'John 13:1–17 NIV',
                scriptureRef: 'John 13:1-17',
                bibleVersion: 'NIV',
              },
            ],
          },
          {
            dayId: 'jesus_day_6',
            dayNumber: 6,
            title: 'The Cross of Calvary',
            description: 'Redemption accomplished.',
            items: [
              {
                itemId: 'jesus_day_6_item_1',
                type: 'devotional',
                title: 'Devotional: It Is Finished',
                devotionalText: 'At the cross, God’s justice and mercy met in perfect harmony. Our debt was paid in full.',
              },
              {
                itemId: 'jesus_day_6_item_2',
                type: 'scripture',
                title: 'Luke 23:32–47 NIV',
                scriptureRef: 'Luke 23:32-47',
                bibleVersion: 'NIV',
              },
            ],
          },
          {
            dayId: 'jesus_day_7',
            dayNumber: 7,
            title: 'He Is Risen!',
            description: 'Victory over death and new life.',
            items: [
              {
                itemId: 'jesus_day_7_item_1',
                type: 'devotional',
                title: 'Devotional: The Empty Tomb',
                devotionalText: 'Resurrection morning changed human history forever. Death was defeated, and everlasting hope was secured!',
              },
              {
                itemId: 'jesus_day_7_item_2',
                type: 'scripture',
                title: 'Matthew 28:1–10 NIV',
                scriptureRef: 'Matthew 28:1-10',
                bibleVersion: 'NIV',
              },
            ],
          },
        ],
      },
      {
        title: 'Unshakeable Faith: 5 Days to Stronger Belief',
        description: 'Strengthen your spiritual foundation and learn to stand firm when doubts and trials arise.',
        duration: 5,
        category: 'Faith Building',
        difficulty: 'intermediate',
        imageUrl: 'https://images.unsplash.com/photo-1490730141103-6cac27aaab94?w=1000',
        thumbnailUrl: 'https://images.unsplash.com/photo-1490730141103-6cac27aaab94?w=400',
        author: 'Pastor Sarah Jenkins',
        isPublished: true,
        createdBy: adminId,
        days: [
          {
            dayId: 'faith_day_1',
            dayNumber: 1,
            title: 'What Is Faith?',
            description: 'Assurance of things hoped for.',
            items: [
              {
                itemId: 'faith_day_1_item_1',
                type: 'devotional',
                title: 'Devotional: Faith Defined',
                devotionalText: 'Faith is not blind wishful thinking; it is active trust based on God’s proven faithfulness.',
              },
              {
                itemId: 'faith_day_1_item_2',
                type: 'scripture',
                title: 'Hebrews 11:1–6 NIV',
                scriptureRef: 'Hebrews 11:1-6',
                bibleVersion: 'NIV',
              },
            ],
          },
          {
            dayId: 'faith_day_2',
            dayNumber: 2,
            title: 'Faith in Action',
            description: 'Living out your beliefs daily.',
            items: [
              {
                itemId: 'faith_day_2_item_1',
                type: 'devotional',
                title: 'Devotional: Faith Without Works',
                devotionalText: 'Real faith produces real action. How we treat others and make decisions reflects what we truly believe.',
              },
              {
                itemId: 'faith_day_2_item_2',
                type: 'scripture',
                title: 'James 2:14–26 NIV',
                scriptureRef: 'James 2:14-26',
                bibleVersion: 'NIV',
              },
            ],
          },
          {
            dayId: 'faith_day_3',
            dayNumber: 3,
            title: 'Overcoming Doubt',
            description: 'Turning questions into deeper trust.',
            items: [
              {
                itemId: 'faith_day_3_item_1',
                type: 'devotional',
                title: 'Devotional: Lord, I Believe',
                devotionalText: 'Doubt is not the opposite of faith; it can be a stepping stone to a deeper, more mature trust in God.',
              },
              {
                itemId: 'faith_day_3_item_2',
                type: 'scripture',
                title: 'Mark 9:20–24 NIV',
                scriptureRef: 'Mark 9:20-24',
                bibleVersion: 'NIV',
              },
            ],
          },
          {
            dayId: 'faith_day_4',
            dayNumber: 4,
            title: 'The Shield of Faith',
            description: 'Standing firm in spiritual battles.',
            items: [
              {
                itemId: 'faith_day_4_item_1',
                type: 'devotional',
                title: 'Devotional: Extinguishing Fiery Darts',
                devotionalText: 'When fear, discouragement, or temptation strike, faith acts as our protective shield.',
              },
              {
                itemId: 'faith_day_4_item_2',
                type: 'scripture',
                title: 'Ephesians 6:10–18 NIV',
                scriptureRef: 'Ephesians 6:10-18',
                bibleVersion: 'NIV',
              },
            ],
          },
          {
            dayId: 'faith_day_5',
            dayNumber: 5,
            title: 'Walking by Faith, Not by Sight',
            description: 'Living with eternity in view.',
            items: [
              {
                itemId: 'faith_day_5_item_1',
                type: 'devotional',
                title: 'Devotional: An Eternal Perspective',
                devotionalText: 'We fix our eyes not on what is seen, but on what is unseen. What is seen is temporary, but what is unseen is eternal.',
              },
              {
                itemId: 'faith_day_5_item_2',
                type: 'scripture',
                title: '2 Corinthians 5:1–10 NIV',
                scriptureRef: '2 Corinthians 5:1-10',
                bibleVersion: 'NIV',
              },
            ],
          },
        ],
      },
    ];

    for (const planData of samplePlans) {
      await Plan.findOneAndUpdate(
        { title: planData.title },
        planData,
        { upsert: true, new: true }
      );
    }

    console.log('Reading plans successfully seeded!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding reading plans:', error);
    process.exit(1);
  }
}

seedReadingPlans();
