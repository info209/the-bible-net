// Sample seed data for Bible Plans
// Run this once to populate your database with sample plans

import { Plan } from '@/models/Plan';
import { User } from '@/models/User';

const samplePlans = [
  {
    title: 'Becoming a Person of Welcome',
    description: `Welcome is more than a word—it's a way of life. This 5-day plan explores what it truly means to welcome others as Jesus did. Through Scripture and reflection, you'll discover how to transform your home, your church, and your relationships into spaces where everyone feels valued and loved.

Each day includes Scripture passages that show Jesus's radical welcome, practical devotionals about embodying hospitality, and reflection questions to help you apply these principles to your own life. By the end of this plan, you'll have a deeper understanding of how to become a beacon of God's welcome in a world that often feels divided and unwelcoming.`,
    duration: 5,
    category: 'spiritual-growth',
    difficulty: 'beginner',
    author: 'Bible.com Team',
    days: [
      {
        dayNumber: 1,
        title: 'The Heart of Welcome',
        description: 'Understanding what welcome truly means in God\'s kingdom',
        scripture: 'Matthew 25:31-46 NIV',
        devotional: `Jesus concludes the Sermon on the Mount with a powerful teaching about judgment and the kingdom of heaven. In this passage, Jesus describes the final judgment where He separates people like a shepherd separates sheep from goats. The basis for this judgment isn't knowledge, eloquence, or power—it's how we treated "the least of these."

This profound truth should reshape how we view welcome. Jesus is saying that when we welcome the stranger, clothe the naked, feed the hungry, and visit the prisoner, we're welcoming Him. Welcome isn't merely about saying hello; it's about radical hospitality that reflects God's love and justice.

Today, reflect on this question: Who are the "least of these" in your community? How might Jesus be asking you to welcome them?`,
        reflection: `What does it mean to welcome "the least of these"?
How does Jesus's teaching challenge your current understanding of hospitality?
Who has made you feel truly welcomed? What did they do?`,
      },
      {
        dayNumber: 2,
        title: 'Jesus\'s Model of Welcome',
        description: 'Learning from Jesus\'s interactions with unlikely people',
        scripture: 'Luke 15:1-7 NIV',
        devotional: `The Pharisees and teachers of the law criticize Jesus because "he welcomes sinners and eats with them." This accusation was meant as a condemnation, but it reveals something beautiful about Jesus\'s mission.

In response, Jesus tells the parable of the lost sheep. A shepherd with 100 sheep loses one and leaves the 99 to find it. When found, the shepherd throws a celebration. Jesus applies this parable directly: "There will be more rejoicing in heaven over one sinner who repents than over ninety-nine righteous persons who do not need to repent."

This is Jesus\'s model of welcome: exhaustive search, joyful finding, and extravagant celebration. He doesn\'t wait for people to clean themselves up or prove their worth. He seeks them out and celebrates their return.`,
        reflection: `How does the shepherd's search challenge your understanding of welcome?
Are there people you\'ve written off whom Jesus would pursue?
How can you embody this radical, seeking kind of welcome?`,
      },
      {
        dayNumber: 3,
        title: 'Breaking Down Barriers',
        description: 'Overcoming the cultural and personal walls to genuine welcome',
        scripture: 'John 4:1-42 NIV',
        devotional: `Jesus meets a Samaritan woman at a well—this encounter violates multiple social norms of the time. Jews and Samaritans didn\'t associate with each other. Men didn\'t speak publicly with women. Yet Jesus initiates a conversation with this woman, asks for water, and offers her living water.

As their conversation deepens, Jesus reveals He knows about her past—her five husbands and current living situation. Rather than judgment, Jesus offers truth and grace. The woman becomes a believer and brings her entire village to Jesus.

This account shows that welcome means breaking through cultural barriers, personal prejudices, and social conventions. It means seeing the person in front of you, not the labels society has placed on them.`,
        reflection: `What barriers prevent you from welcoming certain people?
How can you follow Jesus\'s example and break through social conventions?
What prejudices do you need to examine in your own heart?`,
      },
      {
        dayNumber: 4,
        title: 'Welcome in Your Home',
        description: 'Practical ways to extend hospitality in daily life',
        scripture: '1 Peter 4:8-10 NIV',
        devotional: `Peter writes: "Above all, love each other deeply, because love covers a multitude of sins. Offer hospitality to one another without grumbling. Each of you should use whatever gift you have received to serve others."

Hospitality begins with love—deep, sacrificial love. It continues without grumbling—our welcome shouldn't be performed with reluctance or resentment. And it utilizes our gifts to serve.

Hospitality doesn\'t require a perfect home or gourmet meals. It requires a willing heart. Whether you\'re hosting dinner, offering a place to stay, or simply making space for someone in your life, hospitality reflects God\'s character. When we welcome others, we participate in God\'s welcoming nature.`,
        reflection: `Who needs hospitality in your life right now?
What gift or ability can you use to serve and welcome others?
How can you offer hospitality without grumbling?`,
      },
      {
        dayNumber: 5,
        title: 'Becoming a Person of Welcome',
        description: 'Taking the next steps in your welcome journey',
        scripture: 'Hebrews 13:1-3 NIV',
        devotional: `As we conclude this plan, Hebrews reminds us: "Keep on loving each other as brothers and sisters. Do not forget to show hospitality to strangers, for by so doing some people have shown hospitality to angels without knowing it."

Being a person of welcome is a lifestyle, not a one-time action. It\'s keeping on, continuing faithfully, choosing again and again to open your heart and your life to others.

The beautiful promise of Scripture is that when we welcome, we might be entertaining angels—that is, we\'re serving Christ Himself. Our welcome matters eternally. It impacts not just those we receive but also the kingdom of God.

As you move forward from this plan, remember: welcome is always a choice. Choose it today. Choose it tomorrow. Become the person who makes others feel valued, loved, and seen.`,
        reflection: `What is one concrete way you\'ll become a person of welcome this week?
Who can you commit to welcoming in the coming month?
How has your understanding of welcome changed through this plan?`,
      },
    ],
    totalLikes: 245,
    totalRatings: 38,
    averageRating: 4.8,
    isPublished: true,
  },
  {
    title: 'Finding Peace in Anxiety',
    description: `In our fast-paced world, anxiety has become a constant companion for many. This 7-day plan offers Scripture-based guidance and practical tools for finding peace in the midst of life\'s storms.

Through daily devotionals rooted in biblical wisdom, you\'ll learn to replace anxious thoughts with God\'s truth, practice spiritual disciplines that promote peace, and discover the transforming power of faith. Each day includes a relevant Scripture passage, a devotional reflection, and practical action steps.`,
    duration: 7,
    category: 'mental-wellness',
    difficulty: 'beginner',
    author: 'Praying Life',
    days: Array.from({ length: 7 }, (_, i) => ({
      dayNumber: i + 1,
      title: `Day ${i + 1}: Peace in Uncertainty`,
      description: 'Learning to trust God in uncertain times',
      scripture: 'Philippians 4:6-7 NIV',
      devotional:
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.',
      reflection: `How does uncertainty affect your faith?
What practical steps can you take today to reduce anxiety?`,
    })),
    totalLikes: 189,
    totalRatings: 28,
    averageRating: 4.6,
    isPublished: true,
  },
  {
    title: 'The Beatitudes: Pathway to Blessing',
    description:
      'Explore the eight beatitudes from Matthew 5 and discover the counter-cultural values of God\'s kingdom. This 8-day plan guides you through each beatitude, revealing how true blessedness comes through humility, mercy, purity of heart, and peacemaking.',
    duration: 8,
    category: 'biblical-studies',
    difficulty: 'intermediate',
    author: 'Bible Study Tools',
    days: Array.from({ length: 8 }, (_, i) => ({
      dayNumber: i + 1,
      title: `Beatitude ${i + 1}`,
      description: 'Deep dive into kingdom values',
      scripture: 'Matthew 5:3-12 NIV',
      devotional:
        'As we explore the beatitudes, remember that Jesus is describing the character of those who belong to His kingdom. These aren\'t just nice suggestions—they\'re invitations to transformation.',
      reflection: `Which beatitude challenges you most?
How can you live out this beatitude today?`,
    })),
    totalLikes: 156,
    totalRatings: 22,
    averageRating: 4.7,
    isPublished: true,
  },
];

export async function seedPlans() {
  try {
    // Get the first user (or create a default one)
    let adminUser = await User.findOne({ role: 'admin' });

    if (!adminUser) {
      console.log('No admin user found. Creating seed data without user reference.');
      return;
    }

    // Insert plans
    for (const planData of samplePlans) {
      const existingPlan = await Plan.findOne({ title: planData.title });

      if (!existingPlan) {
        const plan = new Plan({
          ...planData,
          createdBy: adminUser._id,
        });

        await plan.save();
        console.log(`Created plan: ${plan.title}`);
      } else {
        console.log(`Plan already exists: ${planData.title}`);
      }
    }

    console.log('Seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding data:', error);
    throw error;
  }
}
