// lib/data/blog.ts
import { BlogPost } from '@/types';

export const blogPosts: BlogPost[] = [
  {
    id: 'exploring-ancient-wonders-luxor',
    title: 'Exploring the Ancient Wonders of Luxor: A Journey Through Time',
    slug: 'exploring-ancient-wonders-luxor',
    excerpt:
      "Step back in time as we explore the magnificent temples and tombs of ancient Egypt's capital. From the Valley of the Kings to Karnak Temple, Luxor is a treasure trove of history waiting to be discovered.",
    content: `
      <p>Luxor—often called the world's greatest open-air museum—sits on the site of ancient Thebes and stretches along both banks of the Nile. With monumental temples, royal tombs, and awe-inspiring ruins, Luxor presents a continuous timeline of ancient Egyptian civilization.</p>

      <h2>The East Bank: City of the Living</h2>
      <p>The East Bank is dominated by temple complexes built for worship and ceremony. The <strong>Karnak Temple Complex</strong> is the largest religious site ever constructed, a vast ensemble of pylons, obelisks, and hypostyle halls built and modified over more than a thousand years. Walking through Karnak's Hall of a Hundred Columns is a humbling experience—columns rising like a forest, each carved with hieroglyphs and colorful reliefs.</p>
      <p>The <strong>Luxor Temple</strong>, closer to the modern city, was the focus of the annual Opet Festival and remains beautifully illuminated after sunset. The Avenue of Sphinxes which once linked Luxor and Karnak has been partially restored and provides a dramatic axis you'll want to walk at dusk.</p>

      <h2>The West Bank: City of the Dead</h2>
      <p>Crossing to the West Bank, you'll find tombs carved into cliffs and hidden chambers filled with painted scenes of the afterlife. The <strong>Valley of the Kings</strong> includes tombs of pharaohs such as Tutankhamun and Ramses II; each tomb is unique and showcases different funerary texts and iconography. <strong>Deir el-Bahari</strong> contains the elegant mortuary temple of Hatshepsut, a layered colonnaded structure set into the cliffside.</p>
      <p>Smaller sites like Medinet Habu (Mortuary Temple of Ramses III) and the Ramesseum provide complementary insights into royal cults, monumental reliefs, and the administrative scale of ancient projects.</p>

      <h2>Practical Tips for Visiting</h2>
      <ul>
        <li><strong>Best time to visit:</strong> October–April for cooler weather and comfortable sightseeing.</li>
        <li><strong>Timing:</strong> Visit major sites early morning or late afternoon for softer light and fewer crowds.</li>
        <li><strong>Guides:</strong> Hire a licensed Egyptologist guide at larger sites to unlock the stories behind the reliefs and floor plans.</li>
        <li><strong>Balloon rides:</strong> A sunrise hot-air balloon gives spectacular aerial views across the Nile and temple fields—book in advance.</li>
        <li><strong>Respect:</strong> Dress modestly at religious or historic sites and stay on designated paths to protect fragile remains.</li>
      </ul>

      <h2>Where to Stay and Eat</h2>
      <p>Luxor has a range of accommodations from boutique Nile-view hotels to budget guesthouses. Riverside locations offer excellent views and easy access to ferry crossings. For food, try traditional Egyptian dishes at local diners—ful, koshary and fresh grilled fish are reliable, delicious options.</p>

      <p>Luxor rewards slow, deliberate exploration. Whether you're walking the colonnades of Karnak, entering a tomb painted millennia ago, or watching the Nile glow at dusk, the city connects you directly to the long, layered history of ancient Egypt.</p>
    `,
    image: 'https://images.unsplash.com/photo-1627997972413-8a6a6a0942e1?ixlib=rb-4.0.3&auto=format&fit=crop&w=1350&q=80',
    fallbackImage: 'https://source.unsplash.com/1350x700/?ancient-egypt-temple',
    category: 'Culture',
    author: 'Sarah Johnson',
    authorAvatar: 'https://source.unsplash.com/400x400/?portrait-woman-archaeologist',
    publishedAt: '2024-08-25',
    readTime: 8,
    tags: ['Egypt', 'History', 'Temples', 'Ancient Civilization', 'Travel Guide'],
  },
  {
    id: 'taste-of-cairo-street-food',
    title: 'A Taste of Cairo: The Ultimate Street Food Guide',
    slug: 'taste-of-cairo-street-food',
    excerpt:
      "Cairo's vibrant streets are a culinary paradise waiting to be explored. Join us on a delicious journey to discover the best street food, from traditional Koshary to mouth-watering Hawawshi.",
    content: `
      <p>Cairo is both historic and hungry—its bustling markets and narrow streets are lined with vendors cooking dishes passed down through generations. Street food in Cairo is cheap, flavorful, and endlessly varied.</p>

      <h2>Must-Try Dishes</h2>
      <h3>Koshary</h3>
      <p>Considered Egypt's national dish, koshary is a filling mix of rice, lentils, macaroni, and chickpeas topped with spicy tomato sauce and crispy fried onions. It's vegetarian-friendly and found in almost every neighborhood.</p>

      <h3>Ful Medames</h3>
      <p>A simple but hearty breakfast of slow-cooked fava beans seasoned with oil and lemon, often eaten with warm baladi bread. It's a classic way to start the day like a local.</p>

      <h3>Hawawshi</h3>
      <p>Spiced minced meat stuffed into dough and baked until crisp—think of it as Egypt's delicious answer to a meat pie. Regional variations exist, and family recipes often differ from one vendor to the next.</p>

      <h3>Ta'meya (Egyptian falafel)</h3>
      <p>Made from fava beans rather than chickpeas, Egyptian ta'meya has a different texture and flavor profile and is usually served with tahini, salad, and pickles.</p>

      <h2>Where to Eat</h2>
      <p>Head to downtown Cairo and areas around Khan el-Khalili for classic stalls. The Sayeda Zeinab and Islamic Cairo neighborhoods offer authentic family-run kitchens and a lively local dining atmosphere.</p>

      <h2>Street Food Etiquette & Safety</h2>
      <ul>
        <li>Prefer busy stalls with high turnover for the freshest food.</li>
        <li>Watch food prepared in front of you to check hygiene practices.</li>
        <li>Carry small bills—vendors rarely accept cards.</li>
        <li>Start slowly if you have a sensitive stomach and drink bottled water.</li>
      </ul>

      <p>Cairo street food is a doorway into the city's soul. Sampling different stalls is part of the adventure—you’ll find every meal tells a story of neighborhoods, families, and long culinary traditions.</p>
    `,
    image: 'https://images.unsplash.com/photo-1628169229891-b9b5f4c51c6c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1350&q=80',
    fallbackImage: 'https://source.unsplash.com/1350x700/?egyptian-food-koshary',
    category: 'Food',
    author: 'Fatima Al-Rashid',
    authorAvatar: 'https://source.unsplash.com/400x400/?portrait-woman-chef-middle-eastern',
    publishedAt: '2024-09-03',
    readTime: 10,
    tags: ['Food', 'Cairo', 'Street Food', 'Egyptian Cuisine', 'Local Culture'],
  },
  {
    id: 'kyoto-cherry-blossoms-and-temples',
    title: 'Kyoto in Bloom: Cherry Blossoms, Temples & Slow Travel',
    slug: 'kyoto-cherry-blossoms-and-temples',
    excerpt:
      "Experience Kyoto’s serene shrines, seasonal cherry blossom petals, and tea-house culture. A slow-travel guide to get the most out of Japan’s ancient capital.",
    content: `
      <p>Kyoto blends timeless tradition and seasonal beauty. From early spring’s cherry blossoms to quiet autumnal maple hues, the city's temples, gardens and teahouses create a meditative travel experience.</p>

      <h2>Top Sights & Experiences</h2>
      <ul>
        <li><strong>Fushimi Inari Taisha:</strong> Walk the famous torii gate tunnels early morning to avoid crowds.</li>
        <li><strong>Kiyomizu-dera:</strong> Enjoy panoramic views over Kyoto and the surrounding hills.</li>
        <li><strong>Arashiyama Bamboo Grove:</strong> Visit at dawn for soft light and fewer people.</li>
      </ul>

      <h2>Slow Travel Tips</h2>
      <p>Spend time in a single neighborhood, visit a tea ceremony, stroll temple gardens slowly, and use Kyoto as a place to unwind rather than tick off landmarks.</p>

      <h2>When to Visit</h2>
      <p>Cherry blossom season (late March–early April) and autumn foliage (mid-November) are peak—book accommodations early.</p>
    `,
    image: 'https://images.unsplash.com/photo-1549692520-acc6669e2f0c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1350&q=80',
    fallbackImage: 'https://images.unsplash.com/photo-1456484692191-ff3ad6f1c9e6?ixlib=rb-4.0.3&auto=format&fit=crop&w=1350&q=80',
    category: 'Culture',
    author: 'Hiro Tanaka',
    authorAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=60',
    publishedAt: '2024-10-10',
    readTime: 7,
    tags: ['Japan', 'Kyoto', 'Cherry Blossoms', 'Temples', 'Slow Travel'],
  },
  {
    id: 'patagonia-trek-guide',
    title: 'Patagonia Trekking: Torres del Paine & Beyond',
    slug: 'patagonia-trek-guide',
    excerpt:
      "An essential guide to trekking the dramatic landscapes of Patagonia—route options, packing list, and the best viewpoints in Torres del Paine.",
    content: `
      <p>Patagonia is raw, windy and spectacular. Treks range from day hikes to multi-day circuits across glaciers, turquoise lakes and jagged peaks.</p>

      <h2>Popular Routes</h2>
      <ul>
        <li><strong>W Circuit:</strong> The classic multi-day hike through Torres del Paine's best scenery.</li>
        <li><strong>O Circuit:</strong> For those wanting more solitude and varied terrain.</li>
      </ul>

      <h2>Packing Essentials</h2>
      <p>Windproof layers, sturdy boots, waterproof shells, warm base layers, and a reliable tent/hostel bookings during high season.</p>

      <h2>Wildlife & Conservation</h2>
      <p>Respect fragile ecosystems, keep distance from wildlife, and follow Leave No Trace. Many local operators support conservation and community programs.</p>
    `,
    image: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?ixlib=rb-4.0.3&auto=format&fit=crop&w=1350&q=80',
    fallbackImage: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?ixlib=rb-4.0.3&auto=format&fit=crop&w=1350&q=80',
    category: 'Adventure',
    author: 'Sofia Martinez',
    authorAvatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=60',
    publishedAt: '2024-11-03',
    readTime: 14,
    tags: ['Patagonia', 'Trekking', 'Torres del Paine', 'Hiking', 'Adventure Travel'],
  },
  {
    id: 'santorini-sunsets-and-seaside-villages',
    title: 'Santorini: Sunsets, Clifftop Villages & Volcanic Shores',
    slug: 'santorini-sunsets-and-seaside-villages',
    excerpt:
      "How to enjoy Santorini beyond the postcards: best sunset spots, local food, boat trips to volcanic isles, and quiet neighborhoods away from the crowds.",
    content: `
      <p>Santorini’s iconic whitewashed villages and sunsets draw visitors from around the world. Explore lesser-known viewpoints, local tavernas and coastal hikes for a richer experience.</p>

      <h2>Where to Watch the Sunset</h2>
      <p>Oia remains famous but try Imerovigli or a small boat from Ammoudi Bay for unobstructed views.</p>

      <h2>Local Flavors</h2>
      <p>Try capers, fava, fresh seafood and local wines produced from volcanic soils.</p>

      <h2>Off-Peak Tips</h2>
      <p>Visit in shoulder seasons (May or September) to avoid crowds and hot midday sun, and book ferries early.</p>
    `,
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=1350&q=80',
    fallbackImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=1350&q=80',
    category: 'Culture',
    author: 'Eleni Papadopoulos',
    authorAvatar: 'https://images.unsplash.com/photo-1545996124-9b0f6b2b9d18?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=60',
    publishedAt: '2024-09-21',
    readTime: 6,
    tags: ['Greece', 'Santorini', 'Sunset', 'Islands', 'Food'],
  },
  {
    id: 'machu-picchu-trek-planner',
    title: 'Machu Picchu: Trekking the Inca Trail & Altitude Tips',
    slug: 'machu-picchu-trek-planner',
    excerpt:
      "Planning an Inca Trail trek or a faster route to Machu Picchu? This planner covers permits, acclimatisation, packing and the best viewpoints on the citadel.",
    content: `
      <p>Visiting Machu Picchu is the culmination of Andean landscapes, history and trekking culture. The Inca Trail requires permits and planning, while rail options offer a quicker arrival.</p>

      <h2>Permit & Seasonal Notes</h2>
      <p>Book Inca Trail permits well ahead (limited daily). Dry season (May–September) is popular but expect colder nights.</p>

      <h2>Altitude & Health</h2>
      <p>Acclimatize gradually in Cusco, stay hydrated, and avoid heavy exertion the first day. Consider coca tea and follow local medical guidance if needed.</p>

      <h2>Best Views & Photography</h2>
      <p>Sunrise at the Sun Gate provides dramatic backlighting; late afternoon can offer softer tones on the terraces.</p>
    `,
    image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1350&q=80',
    fallbackImage: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1350&q=80',
    category: 'Adventure',
    author: 'Diego Alvarez',
    authorAvatar: 'https://images.unsplash.com/photo-1543269865-cbf427effbad?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=60',
    publishedAt: '2024-10-02',
    readTime: 11,
    tags: ['Peru', 'Machu Picchu', 'Inca Trail', 'Trekking', 'Altitude'],
  },
  {
    id: 'iceland-road-trip-guide',
    title: 'Iceland Road Trip: Waterfalls, Glaciers & Ring Road Tips',
    slug: 'iceland-road-trip-guide',
    excerpt:
      "A practical road trip guide around Iceland’s Ring Road—where to stop, driving tips, weather prep and how to photograph dramatic waterfalls and glaciers.",
    content: `
      <p>Iceland’s Ring Road stitches together waterfalls, black-sand beaches, glaciers and remote highlands. Good preparation is essential for changing weather and remote stretches.</p>

      <h2>Must-See Stops</h2>
      <ul>
        <li><strong>Seljalandsfoss & Skógafoss:</strong> Iconic waterfalls requiring short detours from the main road.</li>
        <li><strong>Jökulsárlón:</strong> Glacier lagoon with floating icebergs—boat tours run seasonally.</li>
        <li><strong>Vík:</strong> Black sand beaches and impressive basalt columns.</li>
      </ul>

      <h2>Driving & Safety</h2>
      <p>Check F-roads conditions, pack a spare fuel can in remote areas, and respect parking & conservation rules at natural sites.</p>
    `,
    image: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?ixlib=rb-4.0.3&auto=format&fit=crop&w=1350&q=80',
    fallbackImage: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?ixlib=rb-4.0.3&auto=format&fit=crop&w=1350&q=80',
    category: 'Nature',
    author: 'Ingrid Olafsdottir',
    authorAvatar: 'https://images.unsplash.com/photo-1556157382-97eda2d62296?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=60',
    publishedAt: '2024-11-12',
    readTime: 13,
    tags: ['Iceland', 'Road Trip', 'Waterfalls', 'Glaciers', 'Photography'],
  },
  {
    id: 'hanoi-street-food-and-riverside-alleys',
    title: 'Hanoi Street Food & Riverside Alleys: A Local\'s Guide',
    slug: 'hanoi-street-food-and-riverside-alleys',
    excerpt:
      "Navigate Hanoi’s energetic streets for pho, bun cha and coffee rituals. This guide highlights evening markets, lakeside walks and respectful street-eating tips.",
    content: `
      <p>Hanoi’s small streets reward curious walkers: fragrant bowls of pho, scooters threading lanes, and lakeside neighborhoods where daily life unfolds publicly.</p>

      <h2>Must-Try Dishes</h2>
      <ul>
        <li><strong>Pho:</strong> Rich bone broths with thin rice noodles and fresh herbs.</li>
        <li><strong>Bun Cha:</strong> Grilled pork served with dipping sauce and rice noodles.</li>
        <li><strong>Egg Coffee:</strong> A creamy, sweet rebel against the usual black coffee.</li>
      </ul>

      <h2>Tips for Street Eating</h2>
      <p>Favor busy stalls, ask for recommendations, and carry hand sanitizer. Embrace sitting on small plastic stools like the locals—it’s part of the experience!</p>
    `,
    image: 'https://images.unsplash.com/photo-1514513870930-3bfb3df4b2b7?ixlib=rb-4.0.3&auto=format&fit=crop&w=1350&q=80',
    fallbackImage: 'https://images.unsplash.com/photo-1514513870930-3bfb3df4b2b7?ixlib=rb-4.0.3&auto=format&fit=crop&w=1350&q=80',
    category: 'Food',
    author: 'Linh Nguyen',
    authorAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=60',
    publishedAt: '2024-10-22',
    readTime: 9,
    tags: ['Vietnam', 'Hanoi', 'Street Food', 'Markets', 'Local Culture'],
  },
];

export const getBlogPostById = (id: string): BlogPost | undefined => {
  return blogPosts.find((post) => post.id === id || post.slug === id);
};

export const getBlogPostsByCategory = (category: string): BlogPost[] => {
  return blogPosts.filter((post) => post.category.toLowerCase() === category.toLowerCase());
};

export const getFeaturedBlogPosts = (limit: number = 2): BlogPost[] => {
  return blogPosts.slice(0, limit);
};

export const getAllBlogPosts = (): BlogPost[] => {
  // return a new array sorted by publishedAt descending
  return [...blogPosts].sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
};

export const getBlogCategories = (): string[] => {
  const categories = blogPosts.map((post) => post.category);
  return [...new Set(categories)];
};

export const searchBlogPosts = (query: string): BlogPost[] => {
  const searchTerm = query.toLowerCase();
  return blogPosts.filter(
    (post) =>
      post.title.toLowerCase().includes(searchTerm) ||
      post.excerpt.toLowerCase().includes(searchTerm) ||
      post.content.toLowerCase().includes(searchTerm) ||
      post.tags.some((tag) => tag.toLowerCase().includes(searchTerm))
  );
};

// Utility function to get image with fallback
export const getImageWithFallback = (primaryImage: string | undefined, fallbackImage: string | undefined): string => {
  if (primaryImage && primaryImage.trim() !== '') return primaryImage;
  if (fallbackImage && fallbackImage.trim() !== '') return fallbackImage;
  return 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?ixlib=rb-4.0.3&auto=format&fit=crop&w=1350&q=80';
};