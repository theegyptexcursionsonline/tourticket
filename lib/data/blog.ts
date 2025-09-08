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
      <p>Luxor — often called the world's greatest open-air museum — sits on the site of ancient Thebes and stretches along both banks of the Nile. With monumental temples, royal tombs and awe-inspiring ruins, Luxor presents a continuous timeline of ancient Egyptian civilization.</p>

      <h2>The East Bank: City of the Living</h2>
      <p>The East Bank is dominated by temple complexes built for worship and ceremony. The <strong>Karnak Temple Complex</strong> is the largest religious site ever constructed, a vast ensemble of pylons, obelisks and hypostyle halls built and modified over more than a thousand years. Walking through Karnak's Hall of a Hundred Columns is a humbling experience — columns rising like a forest, each carved with hieroglyphs and colorful reliefs.</p>
      <p>The <strong>Luxor Temple</strong>, closer to the modern city, was the focus of the annual Opet Festival and remains beautifully illuminated after sunset. The Avenue of Sphinxes which once linked Luxor and Karnak has been partially restored and provides a dramatic axis you'll want to walk at dusk.</p>

      <h2>The West Bank: City of the Dead</h2>
      <p>Crossing to the West Bank, you'll find tombs carved into cliffs and hidden chambers filled with painted scenes of the afterlife. The <strong>Valley of the Kings</strong> includes tombs of pharaohs such as Tutankhamun and Ramses II; each tomb is unique and showcases different funerary texts and iconography. <strong>Deir el-Bahari</strong> contains the elegant mortuary temple of Hatshepsut, a layered colonnaded structure set into the cliffside.</p>
      <p>Smaller sites like Medinet Habu (Mortuary Temple of Ramses III) and the Ramesseum provide complementary insights into royal cults, monumental reliefs and the administrative scale of ancient projects.</p>

      <h2>Practical Tips for Visiting</h2>
      <ul>
        <li><strong>Best time to visit:</strong> October–April for cooler weather and comfortable sightseeing.</li>
        <li><strong>Timing:</strong> Visit major sites early morning or late afternoon for softer light and fewer crowds.</li>
        <li><strong>Guides:</strong> Hire a licensed Egyptologist guide at larger sites to unlock the stories behind the reliefs and floor plans.</li>
        <li><strong>Balloon rides:</strong> A sunrise hot-air balloon gives spectacular aerial views across the Nile and temple fields — book in advance.</li>
        <li><strong>Respect:</strong> Dress modestly at religious or historic sites and stay on designated paths to protect fragile remains.</li>
      </ul>

      <h2>Where to Stay and Eat</h2>
      <p>Luxor has a range of accommodations from boutique Nile-view hotels to budget guesthouses. Riverside locations offer excellent views and easy access to ferry crossings. For food, try traditional Egyptian dishes at local diners — ful, koshary and fresh grilled fish are reliable, delicious options.</p>

      <p>Luxor rewards slow, deliberate exploration. Whether you're walking the colonnades of Karnak, entering a tomb painted millennia ago, or watching the Nile glow at dusk, the city connects you directly to the long, layered history of ancient Egypt.</p>
    `,
    image: 'https://source.unsplash.com/featured/1350x700/?karnak-temple-luxor',
    fallbackImage: 'https://source.unsplash.com/1350x700/?ancient-egypt-temple',
    category: 'Culture',
    author: 'Sarah Johnson',
    authorAvatar: 'https://source.unsplash.com/400x400/?portrait-woman-archaeologist',
    publishedAt: '2024-08-25',
    readTime: 8,
    tags: ['Egypt', 'History', 'Temples', 'Ancient Civilization', 'Travel Guide'],
  },

  {
    id: 'thrilling-desert-safaris-sahara',
    title: "10 Thrilling Desert Safaris in the Sahara You Can't Miss",
    slug: 'thrilling-desert-safaris-sahara',
    excerpt:
      "Feel the adrenaline rush as you navigate the vast, golden dunes of the Sahara. Our guide to the top 10 desert safaris will help you choose the adventure of a lifetime in the world's largest hot desert.",
    content: `
      <p>The Sahara is not a single uniform landscape but a vast, varied region stretching across multiple countries. From Morocco's Erg Chebbi dunes to Namibia's red sands, each safari destination offers a unique blend of landscapes, cultures and activities.</p>

      <h2>Top Experiences</h2>
      <h3>1. Merzouga (Morocco) — Erg Chebbi</h3>
      <p>Merzouga is famous for towering dunes ideal for camel treks and overnight Berber camps. Sunset and sunrise here create incredible color contrasts and are prime photography moments. Many tours include 4x4 transfers, sandboarding and traditional music around campfires.</p>

      <h3>2. Sossusvlei (Namibia)</h3>
      <p>Home to some of the highest dunes on Earth, Sossusvlei's orange-red sands against an intense blue sky look otherworldly. Hike Dune 45 at sunrise or take a scenic hot-air balloon flight for an unforgettable view.</p>

      <h3>3. White Desert & Siwa (Egypt)</h3>
      <p>Egypt's White Desert National Park features chalk rock formations sculpted by wind — surreal shapes that glow at sunrise. Nearby Siwa Oasis brings cultural depth with historic springs, olive groves and traditional local life.</p>

      <h3>4. Ténéré & Air Mountains (Niger)</h3>
      <p>For adventurous travelers, the Ténéré's vast emptiness and ancient trade-route relics offer a profound sense of isolation. Multi-day expeditions require experienced guides and solid preparation.</p>

      <h3>5. Erg Chigaga (Morocco)</h3>
      <p>Less commercial than Merzouga, Erg Chigaga provides quieter dunes and authentic nomadic encounters. Expect long drives over sandy tracks and star-filled desert nights.</p>

      <h2>Safety & Practical Advice</h2>
      <ul>
        <li>Bring plenty of water and sun protection — temperatures can be extreme during the day and drop rapidly at night.</li>
        <li>Wear layered clothing: lightweight, breathable fabrics by day and warm layers for evenings.</li>
        <li>Use reputable operators with good safety records and local knowledge.</li>
        <li>Respect local cultures and customs, particularly in more conservative regions.</li>
        <li>Protect gear — sand is abrasive; keep cameras and electronics sealed when not in use.</li>
      </ul>

      <h2>Photography Tips</h2>
      <p>Golden hour is everything in desert photography. Use leading lines of dunes, include a human silhouette for scale, and watch for wind patterns that create ripples in the sand for texture.</p>

      <p>Whether you seek adrenaline or solitude, the Sahara's many faces deliver memorable experiences. Choose your region according to the type of adventure you want — cultural immersion, photography, high dunes or remote wilderness — and prepare properly for the climate and conditions.</p>
    `,
    image: 'https://source.unsplash.com/featured/1350x700/?sahara-desert-dunes',
    fallbackImage: 'https://source.unsplash.com/1350x700/?desert-safari-camel',
    category: 'Adventure',
    author: 'Ahmed Hassan',
    authorAvatar: 'https://source.unsplash.com/400x400/?portrait-man-desert-guide',
    publishedAt: '2024-09-01',
    readTime: 12,
    tags: ['Desert', 'Safari', 'Adventure', 'Sahara', 'Travel Tips'],
  },

  {
    id: 'taste-of-cairo-street-food',
    title: 'A Taste of Cairo: The Ultimate Street Food Guide',
    slug: 'taste-of-cairo-street-food',
    excerpt:
      "Cairo's vibrant streets are a culinary paradise waiting to be explored. Join us on a delicious journey to discover the best street food, from traditional Koshary to mouth-watering Hawawshi.",
    content: `
      <p>Cairo is both historic and hungry — its bustling markets and narrow streets are lined with vendors cooking dishes passed down through generations. Street food in Cairo is cheap, flavorful and endlessly varied.</p>

      <h2>Must-Try Dishes</h2>
      <h3>Koshary</h3>
      <p>Considered Egypt's national dish, koshary is a filling mix of rice, lentils, macaroni and chickpeas topped with spicy tomato sauce and crispy fried onions. It's vegetarian-friendly and found in almost every neighborhood.</p>

      <h3>Ful Medames</h3>
      <p>A simple but hearty breakfast of slow-cooked fava beans seasoned with oil and lemon, often eaten with warm baladi bread. It's a classic way to start the day like a local.</p>

      <h3>Hawawshi</h3>
      <p>Spiced minced meat stuffed into dough and baked until crisp — think of it as Egypt's delicious answer to a meat pie. Regional variations exist, and family recipes often differ from one vendor to the next.</p>

      <h3>Ta'meya (Egyptian falafel)</h3>
      <p>Made from fava beans rather than chickpeas, Egyptian ta'meya has a different texture and flavor profile and is usually served with tahini, salad and pickles.</p>

      <h2>Where to Eat</h2>
      <p>Head to downtown Cairo and areas around Khan el-Khalili for classic stalls. The Sayeda Zeinab and Islamic Cairo neighborhoods offer authentic family-run kitchens and a lively local dining atmosphere.</p>

      <h2>Street Food Etiquette & Safety</h2>
      <ul>
        <li>Prefer busy stalls with high turnover for the freshest food.</li>
        <li>Watch food prepared in front of you to check hygiene practices.</li>
        <li>Carry small bills — vendors rarely accept cards.</li>
        <li>Start slowly if you have a sensitive stomach and drink bottled water.</li>
      </ul>

      <p>Cairo street food is a doorway into the city's soul. Sampling different stalls is part of the adventure — you'll find every meal tells a story of neighborhoods, families and long culinary traditions.</p>
    `,
    image: 'https://source.unsplash.com/featured/1350x700/?cairo-street-food-market',
    fallbackImage: 'https://source.unsplash.com/1350x700/?egyptian-food-koshary',
    category: 'Food',
    author: 'Fatima Al-Rashid',
    authorAvatar: 'https://source.unsplash.com/400x400/?portrait-woman-chef-middle-eastern',
    publishedAt: '2024-09-03',
    readTime: 10,
    tags: ['Food', 'Cairo', 'Street Food', 'Egyptian Cuisine', 'Local Culture'],
  },

  {
    id: 'solo-travel-egypt-guide',
    title: 'Your Ultimate Guide to Solo Travel in Egypt',
    slug: 'solo-travel-egypt-guide',
    excerpt:
      "Thinking of exploring Egypt on your own? We've compiled essential tips and a step-by-step guide to ensure your solo journey through the land of pharaohs is safe, fun, and unforgettable.",
    content: `
      <p>Egypt is an excellent solo travel destination for those who plan carefully. From buzzing Cairo to serene Nubian villages and the Nile's slow-moving feluccas, solo travelers can experience a huge variety of landscapes and cultures.</p>

      <h2>Planning and Safety</h2>
      <p>Research your itinerary, book the first nights in advance, and keep digital and physical copies of important documents. Use licensed guides for archaeological sites and prefer accommodations with good reviews in central, well-trafficked areas.</p>

      <h2>Suggested Routes for First-Time Solo Travelers</h2>
      <ol>
        <li><strong>Cairo → Luxor → Aswan:</strong> The classic historical triangle, with flights or overnight trains connecting cities. Visit the Giza Plateau, Karnak, Valley of the Kings and take a Nile felucca in Aswan.</li>
        <li><strong>Sinai Coast:</strong> For beach, diving and relaxed vibes — Sharm el-Sheikh and Dahab are popular bases.</li>
        <li><strong>Western Desert & Siwa:</strong> For remote landscapes and eco-lodges; travel requires careful planning and local guides.</li>
      </ol>

      <h2>Solo Travel Tips</h2>
      <ul>
        <li>Learn simple Arabic phrases; locals appreciate the effort.</li>
        <li>Carry a portable charger and a copy of emergency contacts.</li>
        <li>Join day tours or group experiences to meet other travelers.</li>
        <li>Trust your instincts and avoid walking alone in unfamiliar areas after dark.</li>
      </ul>

      <p>With sensible planning, Egypt is a welcoming and fascinating destination for solo travelers. Its blend of ancient monuments, friendly hospitality and vibrant street life creates an endlessly rewarding journey.</p>
    `,
    image: 'https://source.unsplash.com/featured/1350x700/?solo-travel-egypt-backpacker',
    fallbackImage: 'https://source.unsplash.com/1350x700/?solo-traveler-ancient-ruins',
    category: 'Travel Tips',
    author: 'Maria Rodriguez',
    authorAvatar: 'https://source.unsplash.com/400x400/?portrait-woman-travel-blogger',
    publishedAt: '2024-09-02',
    readTime: 15,
    tags: ['Solo Travel', 'Egypt', 'Safety Tips', 'Travel Guide', 'Independent Travel'],
  },

  {
    id: 'secrets-of-pyramids',
    title: 'The Secrets of the Pyramids: Mysteries Beyond Giza',
    slug: 'secrets-of-pyramids',
    excerpt:
      "Beyond the famous Giza Plateau, Egypt's pyramids hold countless mysteries and fascinating secrets. Our in-depth exploration uncovers lesser-known facts and recent discoveries about these iconic ancient structures.",
    content: `
      <p>While the Giza pyramids are the most famous, Egypt is home to more than one hundred pyramid structures built across centuries. Each site reveals a different phase of architectural innovation and shifting funerary practices.</p>

      <h2>Early Experiments & the Step Pyramid</h2>
      <p>The Step Pyramid of Djoser at Saqqara, designed by the architect Imhotep, represents the first large-scale stone construction. The step-like terraces show an experimental approach to monumental tomb building that predates the smooth-sided pyramids.</p>

      <h2>Engineering Theories</h2>
      <p>Scholars continue to debate the exact construction techniques. Recent research points to a combination of ramps, careful workforce organization and advanced stone-cutting. Evidence of worker villages suggests large, organized labor forces rather than a slave workforce.</p>

      <h2>Recent Discoveries</h2>
      <p>Modern tools like muon tomography and ground-penetrating radar have revealed hidden voids and internal anomalies, hinting at unexplored chambers. Such findings keep archaeological interest high and demonstrate how technology continues to evolve our understanding.</p>

      <h2>Visiting Lesser-Known Pyramid Fields</h2>
      <p>Sites like Dahshur (Red Pyramid and Bent Pyramid), Meidum and Abu Sir provide quieter experiences and valuable insight into the experimentation that led to Giza's engineering perfection. These fields are ideal for visitors who want to step off the beaten tourist track.</p>

      <p>Whether you're fascinated by construction techniques, religious symbolism or the social organization behind the monuments, Egypt's pyramids remain an enduring testament to ancient ingenuity and ambition.</p>
    `,
    image: 'https://source.unsplash.com/featured/1350x700/?pyramid-giza-egypt-ancient',
    fallbackImage: 'https://source.unsplash.com/1350x700/?egyptian-pyramid-architecture',
    category: 'History',
    author: 'Dr. Zahi Hawass',
    authorAvatar: 'https://source.unsplash.com/400x400/?portrait-man-archaeologist-professor',
    publishedAt: '2024-08-30',
    readTime: 14,
    tags: ['Pyramids', 'Ancient Egypt', 'Archaeology', 'History', 'Mysteries'],
  },

  {
    id: 'discovering-western-desert-oases',
    title: "Discovering the Oases of Egypt's Western Desert",
    slug: 'discovering-western-desert-oases',
    excerpt:
      "Escape the bustling cities and find tranquility in Egypt's Western Desert oases. We guide you through Siwa, Bahariya, and Farafra—natural havens that offer unique cultural experiences and breathtaking landscapes.",
    content: `
      <p>The Western Desert's oases are living pockets of green within the Sahara's expanse. Each oasis has a distinct character: Siwa's salt lakes and oracle temple, Bahariya's gateway to the Black and White Deserts, Farafra's access to chalk formations and stunning night skies.</p>

      <h2>Siwa Oasis</h2>
      <p>Siwa is known for its salt lakes, olive groves and the ancient Oracle Temple where Alexander the Great sought validation. The local Siwi culture has preserved unique dialects and customs — visiting offers both natural beauty and cultural immersion.</p>

      <h2>Bahariya & the Black/White Desert</h2>
      <p>Bahariya is the gateway to dramatic desert scenes: the White Desert's sculpted chalk formations appear almost lunar, while the Black Desert is speckled with dark volcanic stones. Multi-day 4x4 trips from Bahariya are common and offer camping under brilliant stars.</p>

      <h2>Farafra & Dakhla</h2>
      <p>Farafra provides solitude and access to remote geological formations while Dakhla and Kharga contain important historical and religious sites, including Roman and medieval Islamic architecture, plus small local museums.</p>

      <h2>Sustainable & Responsible Travel</h2>
      <p>Oases are fragile ecosystems; choose eco-conscious operators, respect local traditions and minimize single-use plastics. Local communities benefit directly when tourism is planned thoughtfully, so opt for guided experiences that share revenue locally.</p>

      <p>From birdlife-filled salt lakes to surreal limestone sculptures, the Western Desert oases offer a striking contrast to Egypt's urban bustle and are perfect for travelers seeking natural beauty and cultural connections.</p>
    `,
    image: 'https://source.unsplash.com/featured/1350x700/?siwa-oasis-egypt-desert',
    fallbackImage: 'https://source.unsplash.com/1350x700/?desert-oasis-palms-water',
    category: 'Nature',
    author: 'Omar Farouk',
    authorAvatar: 'https://source.unsplash.com/400x400/?portrait-man-nature-guide-bedouin',
    publishedAt: '2024-08-28',
    readTime: 16,
    tags: ['Desert', 'Oases', 'Nature', 'Adventure', 'Sustainable Tourism'],
  },
];

export const getBlogPostById = (id: string): BlogPost | undefined => {
  return blogPosts.find((post) => post.id === id || post.slug === id);
};

export const getBlogPostsByCategory = (category: string): BlogPost[] => {
  return blogPosts.filter((post) => post.category.toLowerCase() === category.toLowerCase());
};

export const getFeaturedBlogPosts = (limit: number = 3): BlogPost[] => {
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
export const getImageWithFallback = (primaryImage: string, fallbackImage: string): string => {
  return primaryImage || fallbackImage || 'https://source.unsplash.com/1350x700/?travel-egypt-default';
};