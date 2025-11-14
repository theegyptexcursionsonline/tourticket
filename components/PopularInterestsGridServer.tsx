// components/PopularInterestsGridServer.tsx
import React from 'react';
import dbConnect from '@/lib/dbConnect';
import Category from '@/lib/models/Category';
import Tour from '@/lib/models/Tour';
import AttractionPage from '@/lib/models/AttractionPage';
import PopularInterestsGrid from '@/components/PopularInterestsGrid';

interface Interest {
  _id: string;
  type: 'category' | 'attraction';
  name: string;
  slug: string;
  products: number;
  featured?: boolean;
  image?: string;
}

interface PopularInterestsGridServerProps {
  limit?: number;
  showFeaturedOnly?: boolean;
  title?: string;
  subtitle?: string;
  columns?: 2 | 3 | 4 | 5 | 6;
}

async function getInterests(): Promise<Interest[]> {
  try {
    await dbConnect();

    // Fetch all categories and attraction pages
    const [categories, attractionPages] = await Promise.all([
      Category.find({}).lean(),
      AttractionPage.find({ isPublished: true, pageType: 'attraction' }).lean(),
    ]);

    // Calculate tour counts for categories
    const categoriesWithCounts = await Promise.all(
      categories.map(async (category: any) => {
        const tourCount = await Tour.countDocuments({
          category: category._id,
          isPublished: true,
        });
        return {
          type: 'category' as const,
          name: category.name,
          slug: category.slug,
          products: tourCount,
          _id: JSON.parse(JSON.stringify(category._id)),
          image: category.heroImage,
          featured: category.featured,
        };
      })
    );

    // Calculate tour counts for attractions
    const attractionsWithCounts = await Promise.all(
      attractionPages.map(async (page: any) => {
        let tourCount = 0;
        const searchQueries = [];

        if (page.title) {
          searchQueries.push({ title: { $regex: page.title, $options: 'i' } });
        }

        if (page.keywords && Array.isArray(page.keywords)) {
          const validKeywords = page.keywords.filter(
            (k: string) => k && k.trim().length > 0
          );
          if (validKeywords.length > 0) {
            searchQueries.push({
              tags: { $in: validKeywords.map((k: string) => new RegExp(k, 'i')) },
            });
            validKeywords.forEach((keyword: string) => {
              searchQueries.push({ title: { $regex: keyword, $options: 'i' } });
            });
          }
        }

        if (searchQueries.length > 0) {
          tourCount = await Tour.countDocuments({
            isPublished: true,
            $or: searchQueries,
          });
        }

        return {
          type: 'attraction' as const,
          name: page.title,
          slug: page.slug,
          products: tourCount,
          _id: JSON.parse(JSON.stringify(page._id)),
          featured: page.featured,
          image: page.heroImage,
        };
      })
    );

    // Combine and return
    const allInterests = [...categoriesWithCounts, ...attractionsWithCounts];
    return allInterests;
  } catch (error) {
    console.error('Error fetching interests:', error);
    return [];
  }
}

export default async function PopularInterestsGridServer({
  limit = 12,
  showFeaturedOnly = false,
  title = 'Popular Interests',
  subtitle = 'Discover the most popular experiences chosen by travelers',
  columns = 4,
}: PopularInterestsGridServerProps) {
  const interests = await getInterests();

  return (
    <PopularInterestsGrid
      initialInterests={interests}
      limit={limit}
      showFeaturedOnly={showFeaturedOnly}
      title={title}
      subtitle={subtitle}
      columns={columns}
    />
  );
}
